import pymupdf
import re
import sys
import pandas as pd
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

pdf_dir = Path('../pdf-ocr made')
if not pdf_dir.exists():
    pdf_dir = Path('pdf-ocr made')

def clean_ocr_epic(raw_epic: str) -> str:
    ep = raw_epic.strip().upper()
    ep = re.sub(r'\s+', '', ep)
    if len(ep) >= 10:
        prefix = ep[:3]
        digits = ep[3:10]
        digits = digits.replace('O', '0').replace('Q', '0').replace('I', '1').replace('L', '1').replace('S', '5').replace('Z', '2').replace('B', '8')
        prefix = re.sub(r'[^A-Z]', 'X', prefix)
        return prefix + digits[:7]
    return ep

epic_regex = re.compile(r'\b([A-Za-z]{3}\s*[\dO0I1lS5Z2B8]{7})\b')

def parse_page_by_line_sequence(text, part_no_default="1", source_filename=""):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    
    m_part = re.search(r'Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+)', text, re.IGNORECASE)
    part_no = m_part.group(1) if m_part else part_no_default
    
    # Find all line indices containing EPIC numbers
    epic_indices = []
    for idx, line in enumerate(lines):
        m = epic_regex.search(line)
        if m:
            epic = clean_ocr_epic(m.group(1))
            if len(epic) == 10:
                epic_indices.append((idx, epic))
                
    if not epic_indices:
        return []
        
    voters = []
    last_end_idx = 0
    
    for i, (epic_idx, epic) in enumerate(epic_indices):
        # Find start of block for this voter
        # Usually starts after previous EPIC / "Photo Available" or after header
        start_idx = last_end_idx
        while start_idx < epic_idx:
            l_lower = lines[start_idx].lower()
            if "photo" in l_lower or "available" in l_lower or "part no" in l_lower or "sl no" in l_lower or "name of" in l_lower or "qualification" in l_lower or "address" in l_lower or "epic" in l_lower:
                start_idx += 1
            else:
                break
                
        block_lines = lines[start_idx:epic_idx]
        
        # Check if age/sex line is right before EPIC or inside block
        age = 30
        sex = 'M'
        qual = None
        occ = None
        sno = None
        
        cleaned_block = []
        for bl in block_lines:
            if bl.isdigit() and len(bl) <= 3:
                val = int(bl)
                if 18 <= val <= 120 and age == 30:
                    age = val
                elif val < 5000 and sno is None:
                    sno = val
                continue
            elif bl.upper() in ('M', 'F', 'MALE', 'FEMALE'):
                sex = 'M' if 'M' in bl.upper() else 'F'
                continue
            cleaned_block.append(bl)
            
        name = cleaned_block[0] if len(cleaned_block) > 0 else f"Voter {epic}"
        rel_name = cleaned_block[1] if len(cleaned_block) > 1 else None
        
        # Determine address, qual, occ from remaining lines
        rem = cleaned_block[2:]
        address_parts = []
        for r_line in rem:
            r_up = r_line.upper()
            if any(q in r_up for q in ['BA', 'BE', 'BSC', 'BCOM', 'MA', 'MSC', 'MCOM', 'MPE', 'BCA', 'MCA', 'BED', 'LLB', 'PUC', 'SSLC', 'DIPLOMA', 'PHD', 'MBBS', 'BDS', 'ME', 'MTECH']):
                if qual is None:
                    qual = r_line
                    continue
            if any(o in r_up for o in ['TEACHER', 'BUSINESS', 'EMPLOYEE', 'ACCOUNTANT', 'ENGINEER', 'ENGINEEAR', 'LECTURER', 'ADVOCATE', 'DIRECTOR', 'STUDENT', 'AGRICULTURE', 'FARMER', 'HOUSEWIFE', 'DOCTOR', 'PROFESSOR', 'HEAD']):
                if occ is None:
                    occ = r_line
                    continue
            address_parts.append(r_line)
            
        address = ", ".join(address_parts) if address_parts else "Karnataka"
        
        voters.append({
            'serial_number': sno,
            'epic_number': epic,
            'name': name,
            'relative_name': rel_name,
            'address': address,
            'qualification': qual,
            'occupation': occ,
            'age': age,
            'sex': sex,
            'part_number': part_no,
            'source_file': source_filename
        })
        
        last_end_idx = epic_idx + 1
        
    return voters

# Test on page 3 and 4 of chikkaballapur...
doc = pymupdf.open(pdf_dir / "chikkaballapur nandi & kasba hobli 2026_ocred.pdf")
v3 = parse_page_by_line_sequence(doc[2].get_text("text"), source_filename="chikkaballapur.pdf")
v4 = parse_page_by_line_sequence(doc[3].get_text("text"), source_filename="chikkaballapur.pdf")
doc.close()

print(f"Extracted {len(v3)} voters from Page 3:")
df3 = pd.DataFrame(v3)
print(df3[['epic_number', 'name', 'relative_name', 'qualification', 'occupation', 'age', 'part_number']])

print(f"\nExtracted {len(v4)} voters from Page 4:")
df4 = pd.DataFrame(v4)
print(df4[['epic_number', 'name', 'relative_name', 'qualification', 'occupation', 'age', 'part_number']])
