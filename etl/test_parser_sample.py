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

pdf_files = sorted(list(pdf_dir.glob('*.pdf')))

epic_pattern = re.compile(r'\b([A-Za-z]{3}\s*[\dO0I1lS5Z2B8]{7})\b')

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

for pdf_path in pdf_files:
    print(f"\n--- Testing {pdf_path.name} ---")
    doc = pymupdf.open(pdf_path)
    extracted_records = []
    
    # Check first 20 pages
    for page_idx in range(min(20, len(doc))):
        page = doc[page_idx]
        text = page.get_text("text")
        if not text.strip():
            continue
            
        part_match = re.search(r'Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+)', text, re.IGNORECASE)
        part_no = part_match.group(1) if part_match else "1"
        
        # Find EPICs
        for m in epic_pattern.finditer(text):
            raw_epic = m.group(1)
            epic = clean_ocr_epic(raw_epic)
            if len(epic) == 10:
                extracted_records.append({
                    'epic_number': epic,
                    'part_number': part_no,
                    'page': page_idx + 1
                })
                
    doc.close()
    print(f"Extracted {len(extracted_records)} EPICs from first 20 pages of {pdf_path.name}")
    if extracted_records:
        print("Sample:", extracted_records[:3])
