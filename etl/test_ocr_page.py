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

# Test page 3 of chikkabala.pdf
doc = fitz.open(pdf_dir / "chikkabala.pdf")
print("=== RapidOCR on chikkabala.pdf Page 3 (150 DPI) ===")
pix = doc[2].get_pixmap(dpi=150)
img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
if pix.n == 4:
    img_np = img_np[:, :, :3]
result, _ = engine(img_np)
if result:
    ocr_text = "\n".join([r[1] for r in result if r[1]])
    print(ocr_text[:1500])
doc.close()
