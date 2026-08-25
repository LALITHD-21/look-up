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

def parse_page_by_y_blocks(page, part_no_default="1", source_filename=""):
    blocks = page.get_text("blocks")
    if not blocks:
        return []
        
    page_text = page.get_text("text")
    m_part = re.search(r'Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+)', page_text, re.IGNORECASE)
    part_no = m_part.group(1) if m_part else part_no_default
    
    epic_regex = re.compile(r'\b([A-Za-z]{3}\s*[\dO0I1lS5Z2B8]{7})\b')
    
    # Identify all EPIC blocks or text containing EPIC
    epic_entries = []
    for b in blocks:
        text = b[4].strip()
        m = epic_regex.search(text)
        if m:
            epic = clean_ocr_epic(m.group(1))
            if len(epic) == 10:
                epic_entries.append({
                    'epic': epic,
                    'y0': b[1],
                    'y1': b[3],
                    'block': b
                })
                
    if not epic_entries:
        return []
        
    # Sort EPIC entries by y0 coordinate (top to bottom)
    epic_entries.sort(key=lambda e: e['y0'])
    
    voters = []
    for idx, item in enumerate(epic_entries):
        # Determine y range for this voter card
        prev_y = (epic_entries[idx-1]['y1'] + item['y0']) / 2 if idx > 0 else max(70, item['y0'] - 25)
        next_y = (item['y1'] + epic_entries[idx+1]['y0']) / 2 if idx < len(epic_entries)-1 else item['y1'] + 35
        
        # Collect all blocks in this y range
        card_blocks = [b for b in blocks if (b[1] >= prev_y - 15 and b[3] <= next_y + 20 and b[1] < next_y + 10)]
        
        left_lines = []
        right_lines = []
        sno = None
        
        for b in card_blocks:
            x0, y0, x1, y1, btext = b[:5]
            lines = [l.strip() for l in btext.splitlines() if l.strip()]
            
            # Check for Sl No
            if x1 < 60 and len(lines) == 1 and lines[0].isdigit():
                sno = int(lines[0])
                continue
                
            if x0 < 450:
                left_lines.extend(lines)
            elif x0 >= 450 and x0 < 760:
                right_lines.extend(lines)
                
        # Parse left lines: Name, Relative Name, Address
        name = left_lines[0] if len(left_lines) > 0 else f"Voter {item['epic']}"
        rel_name = left_lines[1] if len(left_lines) > 1 else None
        address = ", ".join(left_lines[2:]) if len(left_lines) > 2 else "Karnataka"
        
        # Clean relative name if it was merged with address or prefix
        if rel_name and ("WARD" in rel_name or "NO." in rel_name or "VTC" in rel_name):
            address = rel_name + ", " + address
            rel_name = None
            
        # Parse right lines: Qualification, Occupation, Age, Sex
        qual = None
        occ = None
        age = 30
        sex = "M"
        
        for r_line in right_lines:
            if epic_regex.search(r_line) or "Photo" in r_line or "Available" in r_line:
                continue
            if r_line.isdigit() and 18 <= int(r_line) <= 120:
                age = int(r_line)
            elif r_line.upper() in ('M', 'F', 'MALE', 'FEMALE'):
                sex = 'M' if 'M' in r_line.upper() else 'F'
            elif qual is None:
                qual = r_line
            elif occ is None:
                occ = r_line
                
        voters.append({
            'serial_number': sno,
            'epic_number': item['epic'],
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
        
    return voters

# Test on page 3 of chikkaballapur...
doc = pymupdf.open(pdf_dir / "chikkaballapur nandi & kasba hobli 2026_ocred.pdf")
voters_p3 = parse_page_by_y_blocks(doc[2], source_filename="chikkaballapur.pdf")
doc.close()

print(f"Extracted {len(voters_p3)} voters from Page 3:")
df = pd.DataFrame(voters_p3)
print(df[['epic_number', 'name', 'relative_name', 'qualification', 'occupation', 'age', 'part_number']])
