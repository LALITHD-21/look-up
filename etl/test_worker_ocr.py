import pymupdf
import numpy as np
import sys
import time
from pathlib import Path
from rapidocr_onnxruntime import RapidOCR

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

pdf_dir = Path('../pdf-ocr made')
if not pdf_dir.exists():
    pdf_dir = Path('pdf-ocr made')

_engine = None
def get_ocr_engine():
    global _engine
    if _engine is None:
        _engine = RapidOCR()
    return _engine

def test_page_ocr(pdf_name, page_num):
    pdf_path = pdf_dir / pdf_name
    doc = pymupdf.open(pdf_path)
    page = doc[page_num]
    pix = page.get_pixmap(dpi=150)
    img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img_np = img_np[:, :, :3]
    doc.close()
    
    engine = get_ocr_engine()
    res, t = engine(img_np)
    return len(res) if res else 0

t0 = time.time()
r = test_page_ocr("chikkabala.pdf", 2)
print(f"OCR test completed in {time.time()-t0:.2f}s, found {r} text boxes.")
