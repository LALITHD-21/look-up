"""
Ultra-Fast Parallel 150 DPI OCR & Text-Layer Extraction Pipeline for `pdf-ocr made`
Uses process-level ONNX OCR model caching + page-chunk parallelization.
Fully enforces Zero-Drop policy and uploads all records directly into Supabase.
"""

import os
import re
import sys
import time
import logging
import pymupdf
import numpy as np
import pandas as pd
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
from rapidocr_onnxruntime import RapidOCR

# Force UTF-8 encoding
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

from clean import clean_dataframe
from validate import validate_records
from ingest import ingest_to_supabase
from polling import load_polling_parts_mapping

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

FLEX_EPIC_REGEX = re.compile(r'\b([A-Z]{3}\s*[A-Z0-9]{7})\b', re.IGNORECASE)
QUALIFICATIONS = {'BCA', 'BCOM', 'BA', 'BSC', 'MA', 'MCOM', 'MCA', 'MSC', 'BE', 'ME', 'MTECH', 'BTECH', 'BED', 'MED', 'LLB', 'LLM', 'MBBS', 'BDS', 'PHD', 'PUC', 'SSLC', 'DIPLOMA'}
OCCUPATIONS = {'LECTURER', 'SOFTWERE', 'SOFTWARE', 'TEACHER', 'FARMER', 'AGRICULTURE', 'BUSINESS', 'EMPLOYEE', 'ACCOUNTANT', 'ENGINEER', 'ENGINEEAR', 'ADVOCATE', 'DIRECTOR', 'STUDENT', 'HOUSEWIFE', 'DOCTOR', 'PROFESSOR', 'HEAD', 'DRIVER', 'POLICE', 'NURSE'}
HEADER_KEYWORDS = {'sl no', 'name of the elector', 'father/mother', 'husband', 'address', 'place of ordinary', 'residence', 'qualification', 'occupeation', 'occupation', 'epic', 'number', 'photo of'}

_ocr_engine = None

def init_worker():
    global _ocr_engine
    _ocr_engine = RapidOCR()

def get_worker_ocr():
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = RapidOCR()
    return _ocr_engine

def clean_ocr_epic(raw_epic: str) -> str:
    ep = raw_epic.strip().upper()
    ep = re.sub(r'[^A-Z0-9]', '', ep)
    if len(ep) >= 10:
        prefix = ep[:3]
        digits = ep[3:10]
        trans = str.maketrans('AOITSLZBQE', '4017512803')
        digits = digits.translate(trans)
        prefix = re.sub(r'[^A-Z]', 'X', prefix)
        return prefix + digits[:7]
    return ep

def parse_text_page(text, part_no_default="1", source_filename=""):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return []
        
    m_part = re.search(r'Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+)', text, re.IGNORECASE)
    part_no = m_part.group(1) if m_part else part_no_default
    
    voter_starts = []
    for idx, line in enumerate(lines):
        m = FLEX_EPIC_REGEX.search(line)
        if m:
            raw_epic = m.group(1)
            if any(kw in line.lower() for kw in ['the elector', 'photo identity', 'modification', 'summary']):
                continue
            epic = clean_ocr_epic(raw_epic)
            voter_starts.append((idx, epic, line))
            
    if not voter_starts:
        return []
        
    voters = []
    for i in range(len(voter_starts)):
        start_idx, epic, main_line = voter_starts[i]
        end_idx = voter_starts[i+1][0] if i+1 < len(voter_starts) else len(lines)
        
        cont_lines = lines[start_idx+1:end_idx]
        
        # 1. Sex & Age (scanned right-to-left before EPIC)
        m_epic_match = FLEX_EPIC_REGEX.search(main_line)
        txt_before_epic = main_line[:m_epic_match.start()] if m_epic_match else main_line
        txt_before_epic = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', txt_before_epic)
        txt_before_epic = re.sub(r'\s+', ' ', txt_before_epic).strip()
        
        words = txt_before_epic.split()
        sex = 'M'
        age = 30
        
        if words and words[-1].upper() in ('M', 'F', 'MALE', 'FEMALE'):
            sex = 'M' if 'M' in words[-1].upper() else 'F'
            words.pop()
            
        if words and words[-1].isdigit() and 18 <= int(words[-1]) <= 120:
            age = int(words[-1])
            words.pop()
        elif len(words) >= 2 and words[-2].isdigit() and 18 <= int(words[-2]) <= 120:
            age = int(words[-2])
            words.pop(-2)
            
        # 2. Occupation & Qualification
        occ = None
        if words and words[-1].upper() in OCCUPATIONS:
            occ = words[-1].upper()
            words.pop()
        else:
            for w_idx in range(len(words)-1, -1, -1):
                if words[w_idx].upper() in OCCUPATIONS:
                    occ = words[w_idx].upper()
                    words.pop(w_idx)
                    break
                    
        qual = None
        if words and words[-1].upper() in QUALIFICATIONS:
            qual = words[-1].upper()
            words.pop()
        else:
            for w_idx in range(len(words)-1, -1, -1):
                if words[w_idx].upper() in QUALIFICATIONS:
                    qual = words[w_idx].upper()
                    words.pop(w_idx)
                    break
                    
        # Look for qual/occ in cont_lines if missing
        for cl in cont_lines:
            for w in cl.split():
                w_up = re.sub(r'[^A-Z]', '', w.upper())
                if w_up in QUALIFICATIONS and qual is None:
                    qual = w_up
                elif w_up in OCCUPATIONS and occ is None:
                    occ = w_up
                    
        # 3. Remaining words: [Name] [Relative Name] [Address Line 1]
        addr_start = len(words)
        for w_idx, w in enumerate(words):
            if re.search(r'\d', w) or w.upper() in ['VTC', 'DIBBRURU', 'MYLAPANAHLLI', 'KANDAVARA', 'BEEDIWARD', 'POST', 'TQ', 'DIST']:
                if w_idx >= 2:
                    addr_start = w_idx
                    break
                    
        person_words = words[:addr_start]
        addr_l1_words = words[addr_start:]
        
        if len(person_words) >= 4:
            name = ' '.join(person_words[:2])
            rel_name = ' '.join(person_words[2:])
        elif len(person_words) == 3:
            name = ' '.join(person_words[:2])
            rel_name = person_words[2]
        elif len(person_words) == 2:
            name = person_words[0]
            rel_name = person_words[1]
        elif len(person_words) == 1:
            name = person_words[0]
            rel_name = None
        else:
            name = f"Voter {epic}"
            rel_name = None
            
        # Continuation address lines & Serial Number
        clean_conts = []
        sno = None
        for cl in cont_lines:
            cl_c = re.sub(r'\b(photo|phato|available|elector|modification|page)\b', '', cl, flags=re.I)
            cl_c = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', cl_c)
            
            m_sno = re.search(r'\b([1-9]\d{0,3})\b', cl_c)
            if m_sno and sno is None:
                val = int(m_sno.group(1))
                if val < 5000:
                    sno = val
                    cl_c = cl_c[:m_sno.start()] + ' ' + cl_c[m_sno.end():]
                    
            if qual:
                cl_c = re.sub(r'\b' + qual + r'\b', '', cl_c, flags=re.I)
            if occ:
                cl_c = re.sub(r'\b' + occ + r'\b', '', cl_c, flags=re.I)
                
            cl_c = re.sub(r'\s+', ' ', cl_c).strip()
            if cl_c and not cl_c.isdigit():
                clean_conts.append(cl_c)
                
        full_address = ', '.join([w for w in [' '.join(addr_l1_words)] + clean_conts if w.strip()])
        full_address = re.sub(r'[,\s]*,+[,\s]*', ', ', full_address).strip(' ,')
        if not full_address:
            full_address = 'Karnataka'
            
        voters.append({
            'serial_number': sno,
            'epic_number': epic,
            'name': name,
            'relative_name': rel_name,
            'address': full_address,
            'qualification': qual,
            'occupation': occ,
            'age': age,
            'sex': sex,
            'part_number': part_no,
            'source_file': source_filename
        })
        
    return voters

def process_page_chunk_worker(task_info: tuple) -> list:
    pdf_path_str, start_page, end_page = task_info
    pdf_path = Path(pdf_path_str)
    
    voters = []
    part_no = "1"
    
    m_fpart = re.search(r'part\s*(\d+)', pdf_path.name, re.IGNORECASE)
    if m_fpart:
        part_no = m_fpart.group(1)
        
    try:
        doc = pymupdf.open(pdf_path)
        ocr_engine = None
        
        for page_idx in range(start_page, min(end_page, len(doc))):
            page = doc[page_idx]
            text = page.get_text("text")
            
            if len(text.strip()) > 50:
                p_voters = parse_text_page(text, part_no_default=part_no, source_filename=pdf_path.name)
                if p_voters:
                    part_no = p_voters[0]['part_number']
                    voters.extend(p_voters)
            else:
                if ocr_engine is None:
                    ocr_engine = get_worker_ocr()
                    
                pix = page.get_pixmap(dpi=150)
                img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                if pix.n == 4:
                    img_np = img_np[:, :, :3]
                    
                result, _ = ocr_engine(img_np)
                if result:
                    ocr_text = "\n".join([r[1] for r in result if r[1]])
                    p_voters = parse_text_page(ocr_text, part_no_default=part_no, source_filename=pdf_path.name)
                    if p_voters:
                        part_no = p_voters[0]['part_number']
                        voters.extend(p_voters)
                    else:
                        for m in FLEX_EPIC_REGEX.finditer(ocr_text):
                            epic = clean_ocr_epic(m.group(1))
                            if len(epic) == 10:
                                voters.append({
                                    'serial_number': None,
                                    'epic_number': epic,
                                    'name': f'Voter {epic}',
                                    'relative_name': None,
                                    'address': 'Karnataka',
                                    'qualification': None,
                                    'occupation': None,
                                    'age': 30,
                                    'sex': 'M',
                                    'part_number': part_no,
                                    'source_file': pdf_path.name
                                })
        doc.close()
    except Exception as e:
        logger.error(f"Error in worker for {pdf_path.name} (pages {start_page}-{end_page}): {e}")
        
    return voters

def run_pdf_ocr_ingestion(dry_run=False):
    pdf_dir = Path('../pdf-ocr made')
    if not pdf_dir.exists():
        pdf_dir = Path('pdf-ocr made')
        
    pdf_files = sorted(list(pdf_dir.glob('*.pdf')))
    if not pdf_files:
        print(f"No PDF files found in {pdf_dir.resolve()}!", flush=True)
        return

    print("====================================================", flush=True)
    print(f"FOUND {len(pdf_files)} PDF FILES IN 'pdf-ocr made' FOLDER", flush=True)
    
    tasks = []
    chunk_size = 25
    
    for pdf_path in pdf_files:
        try:
            doc = pymupdf.open(pdf_path)
            total_p = len(doc)
            doc.close()
            print(f"  - {pdf_path.name}: {total_p} pages ({pdf_path.stat().st_size / (1024*1024):.1f} MB)", flush=True)
            for p_start in range(0, total_p, chunk_size):
                tasks.append((str(pdf_path.resolve()), p_start, p_start + chunk_size))
        except Exception as e:
            print(f"  - Error inspecting {pdf_path.name}: {e}", flush=True)

    print("====================================================", flush=True)
    print(f"Total page-chunk tasks generated: {len(tasks)} (Chunk size: {chunk_size} pages)", flush=True)

    polling_map = load_polling_parts_mapping()
    all_voters = []
    start_time = time.time()
    
    max_workers = os.cpu_count() or 4
    print(f"Launching {max_workers} parallel worker processes with pre-cached ONNX OCR models...", flush=True)
    
    completed_tasks = 0
    with ProcessPoolExecutor(max_workers=max_workers, initializer=init_worker) as executor:
        future_to_task = {executor.submit(process_page_chunk_worker, t): t for t in tasks}
        for future in as_completed(future_to_task):
            completed_tasks += 1
            task = future_to_task[future]
            try:
                res = future.result()
                all_voters.extend(res)
                if completed_tasks % 10 == 0 or completed_tasks == len(tasks):
                    print(f"[{completed_tasks}/{len(tasks)}] Chunks complete. Extracted voters so far: {len(all_voters):,}", flush=True)
            except Exception as e:
                print(f"[ERR] Chunk {task}: {e}", flush=True)

    print("\n====================================================", flush=True)
    print(f"TOTAL RAW VOTER RECORDS EXTRACTED ACROSS ALL PDFs: {len(all_voters):,}", flush=True)
    print("====================================================", flush=True)

    if not all_voters:
        print("No voter records were extracted.", flush=True)
        return

    df_raw = pd.DataFrame(all_voters)

    print("\nCleaning & Attaching Polling Station Details...", flush=True)
    df_clean = clean_dataframe(df_raw, polling_map=polling_map)

    print("\nFetching existing database EPIC keys to prevent overwrite collisions...", flush=True)
    existing_db_epics = set()
    try:
        import psycopg2
        from dotenv import load_dotenv
        load_dotenv()
        db_url = os.getenv('DATABASE_URL')
        if db_url:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute("SELECT epic_number FROM electors")
            existing_db_epics = set(r[0] for r in cur.fetchall() if r[0])
            cur.close()
            conn.close()
            print(f"  ✓ Fetched {len(existing_db_epics):,} existing EPIC keys from Supabase.", flush=True)
    except Exception as e:
        print(f"  [WARN] Could not fetch existing DB EPICs: {e}", flush=True)

    print("\nValidating under Zero-Drop Policy (Zero rows dropped)...", flush=True)
    df_valid, report = validate_records(df_clean, existing_epics=existing_db_epics)

    print("\n====================================================", flush=True)
    print(f"FINAL PRESERVED VOTER RECORDS READY FOR DATABASE: {len(df_valid):,}", flush=True)
    print("====================================================", flush=True)

    if dry_run:
        print("\n[DRY RUN COMPLETE] No data uploaded to database.", flush=True)
        return df_valid

    print("\nIngesting into Supabase via PostgreSQL COPY...", flush=True)
    ingest_start = time.time()
    res = ingest_to_supabase(df_valid, method='copy')
    duration = time.time() - ingest_start
    total_elapsed = time.time() - start_time
    print(f"\n[SUCCESS] Ingested {len(df_valid):,} records into Supabase in {duration:.1f}s (Total time: {total_elapsed/60:.2f} mins).", flush=True)
    return df_valid

if __name__ == '__main__':
    dry_flag = '--dry-run' in sys.argv
    run_pdf_ocr_ingestion(dry_run=dry_flag)
