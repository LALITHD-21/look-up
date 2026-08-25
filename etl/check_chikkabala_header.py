import fitz
import numpy as np
from pathlib import Path
from rapidocr_onnxruntime import RapidOCR
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

pdf_dir = Path('../pdf-ocr made')
if not pdf_dir.exists():
    pdf_dir = Path('pdf-ocr made')

engine = RapidOCR()

doc = fitz.open(pdf_dir / "chikkabala.pdf")
print("=== RapidOCR on chikkabala.pdf Page 1 ===")
pix1 = doc[0].get_pixmap(dpi=150)
img1 = np.frombuffer(pix1.samples, dtype=np.uint8).reshape(pix1.height, pix1.width, pix1.n)
if pix1.n == 4: img1 = img1[:, :, :3]
res1, _ = engine(img1)
if res1: print("\n".join([r[1] for r in res1]))

print("\n=== RapidOCR on chikkabala.pdf Page 2 ===")
pix2 = doc[1].get_pixmap(dpi=150)
img2 = np.frombuffer(pix2.samples, dtype=np.uint8).reshape(pix2.height, pix2.width, pix2.n)
if pix2.n == 4: img2 = img2[:, :, :3]
res2, _ = engine(img2)
if res2: print("\n".join([r[1] for r in res2]))

doc.close()
