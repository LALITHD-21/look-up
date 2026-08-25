import fitz
from pathlib import Path
import sys
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

pdf_dir = Path('../pdf-ocr made')
if not pdf_dir.exists():
    pdf_dir = Path('pdf-ocr made')

# Inspect page 3 of chikkaballapur...
doc1 = fitz.open(pdf_dir / "chikkaballapur nandi & kasba hobli 2026_ocred.pdf")
print("=================== CHIKKABALLAPUR PAGE 3 ===================")
print(doc1[2].get_text("text"))
print("=================== CHIKKABALLAPUR PAGE 4 ===================")
print(doc1[3].get_text("text"))
doc1.close()

# Inspect page 3 of chit.pdf
doc2 = fitz.open(pdf_dir / "chit.pdf")
print("=================== CHITRADURGA (chit.pdf) PAGE 3 ===================")
print(doc2[2].get_text("text"))
doc2.close()

# Inspect page 3 of kolar...
doc3 = fitz.open(pdf_dir / "kolar entire kasba hobli - 2026 (3)_ocred.pdf")
print("=================== KOLAR PAGE 3 ===================")
print(doc3[2].get_text("text"))
doc3.close()
