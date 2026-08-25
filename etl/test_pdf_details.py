import fitz
from pathlib import Path
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

pdf_dir = Path('../pdf-ocr made')
if not pdf_dir.exists():
    pdf_dir = Path('pdf-ocr made')

pdf_files = sorted(list(pdf_dir.glob('*.pdf')))
print(f"Found {len(pdf_files)} PDF files in {pdf_dir.resolve()}:")

epic_pattern = re.compile(r'\b([A-Z]{3}\s*\d{7})\b', re.IGNORECASE)

for pdf_path in pdf_files:
    print(f"\n==================================================")
    print(f"File: {pdf_path.name}")
    print(f"Size: {pdf_path.stat().st_size / (1024*1024):.2f} MB")
    
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"Total pages: {total_pages}")
    
    text_pages = 0
    empty_pages = 0
    total_epics = 0
    sample_epics = []
    
    for i in range(total_pages):
        page_text = doc[i].get_text("text")
        if len(page_text.strip()) > 30:
            text_pages += 1
            epics = epic_pattern.findall(page_text)
            total_epics += len(epics)
            if len(sample_epics) < 5 and epics:
                sample_epics.extend(epics[:5 - len(sample_epics)])
        else:
            empty_pages += 1
            
    print(f"Pages with text layer: {text_pages}/{total_pages}")
    print(f"Pages without text (scanned image only): {empty_pages}/{total_pages}")
    print(f"Total EPIC numbers extracted via text layer: {total_epics}")
    print(f"Sample EPICs: {sample_epics[:5]}")
    doc.close()
