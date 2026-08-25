import fitz
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
    """Normalize OCR noisy character substitutions in EPIC numbers."""
    ep = raw_epic.strip().upper()
    ep = re.sub(r'\s+', '', ep)
    if len(ep) >= 10:
        prefix = ep[:3]
        digits = ep[3:10]
        # Fix common OCR noise in digits section
        digits = digits.replace('O', '0').replace('Q', '0').replace('I', '1').replace('L', '1').replace('S', '5').replace('Z', '2').replace('B', '8')
        prefix = re.sub(r'[^A-Z]', 'X', prefix)
        return prefix + digits[:7]
    return ep

# Let's inspect page 3 of chikkaballapur
doc = fitz.open(pdf_dir / "chikkaballapur nandi & kasba hobli 2026_ocred.pdf")
page = doc[2] # page 3
text = page.get_text("text")

print("=== RAW TEXT PAGE 3 ===")
lines = [l.strip() for l in text.splitlines() if l.strip()]
for idx, line in enumerate(lines):
    print(f"{idx:03d}: {line}")

doc.close()
