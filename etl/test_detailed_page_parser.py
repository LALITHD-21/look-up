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

doc = pymupdf.open(pdf_dir / "chikkaballapur nandi & kasba hobli 2026_ocred.pdf")
page = doc[2] # Page 3 (1-indexed page 3)
text = page.get_text("text")

print("=== RAW TEXT OF PAGE 3 ===")
lines = [l.strip() for l in text.splitlines() if l.strip()]

# Let's inspect line positions or blocks
blocks = page.get_text("blocks")
print(f"Total blocks: {len(blocks)}")
for idx, b in enumerate(blocks):
    print(f"Block {idx:02d} (x0={b[0]:.1f}, y0={b[1]:.1f}, x1={b[2]:.1f}, y1={b[3]:.1f}): {repr(b[4][:80])}")

doc.close()
