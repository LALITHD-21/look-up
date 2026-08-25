import fitz
from pathlib import Path
import re

pdf_dir = Path('../pdf-ocr made')
if not pdf_dir.exists():
    pdf_dir = Path('pdf-ocr made')

pdf_files = list(pdf_dir.glob('*.pdf'))
print(f"Found {len(pdf_files)} PDF files in {pdf_dir.resolve()}:")

for pdf_path in pdf_files:
    print(f"\n--- File: {pdf_path.name} ---")
    print(f"Size: {pdf_path.stat().st_size / (1024*1024):.2f} MB")
    try:
        doc = fitz.open(pdf_path)
        print(f"Total pages: {len(doc)}")
        
        # Sample text from first 5 pages
        text_samples = []
        for i in range(min(5, len(doc))):
            text = doc[i].get_text("text")
            text_samples.append((i+1, text))
            
        has_text = any(len(t[1].strip()) > 50 for t in text_samples)
        print(f"Has embedded text layer (direct PyMuPDF text extraction): {has_text}")
        
        if has_text:
            print("\nSample Page 1 & 2 Text Snippet:")
            for p_num, text in text_samples[:3]:
                print(f"=== Page {p_num} ===")
                print(text[:400] if text else "[EMPTY PAGE TEXT]")
        else:
            print("No significant embedded text found on first 5 pages.")
            
        doc.close()
    except Exception as e:
        print(f"Error reading {pdf_path.name}: {e}")
