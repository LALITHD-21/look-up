import pymupdf, re, pandas as pd

FLEX_EPIC_REGEX = re.compile(r'\b([A-Z]{3}\s*[A-Z0-9]{7})\b', re.IGNORECASE)

QUALIFICATIONS = {'BA', 'BCOM', 'BCA', 'BSC', 'MA', 'MCOM', 'MCA', 'MSC', 'BE', 'ME', 'MTECH', 'BTECH', 'BED', 'MED', 'LLB', 'LLM', 'MBBS', 'BDS', 'PHD', 'PUC', 'SSLC', 'DIPLOMA'}
OCCUPATIONS = {'LECTURER', 'SOFTWERE', 'SOFTWARE', 'TEACHER', 'FARMER', 'AGRICULTURE', 'BUSINESS', 'EMPLOYEE', 'ACCOUNTANT', 'ENGINEER', 'ENGINEEAR', 'ADVOCATE', 'DIRECTOR', 'STUDENT', 'HOUSEWIFE', 'DOCTOR', 'PROFESSOR', 'HEAD', 'DRIVER', 'POLICE', 'NURSE'}

def clean_ocr_epic(ep_raw):
    ep = ep_raw.strip().upper()
    ep = re.sub(r'[^A-Z0-9]', '', ep)
    if len(ep) >= 10:
        prefix = ep[:3]
        digits = ep[3:10]
        trans = str.maketrans('AOITSLZBQE', '4017512803')
        digits = digits.translate(trans)
        prefix = re.sub(r'[^A-Z]', 'X', prefix)
        return prefix + digits[:7]
    return ep

def parse_page_voters(text):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    line_data = []
    
    # Identify all lines containing EPICs
    voter_starts = []
    for idx, l in enumerate(lines):
        m = FLEX_EPIC_REGEX.search(l)
        if m:
            raw_ep = m.group(1)
            if any(kw in l.lower() for kw in ['the elector', 'photo identity', 'modification']):
                continue
            ep = clean_ocr_epic(raw_ep)
            voter_starts.append((idx, ep, l))
            
    voters = []
    for i in range(len(voter_starts)):
        start_idx, ep, main_l = voter_starts[i]
        end_idx = voter_starts[i+1][0] if i+1 < len(voter_starts) else len(lines)
        
        block = [lines[k] for k in range(start_idx, end_idx)]
        
        # 1. Clean main line
        # Remove EPIC, photo, and trailing garbage
        main_clean = re.sub(r'\b[A-Z]{3}\s*[A-Z0-9]{7}\b', '', main_l, flags=re.I)
        main_clean = re.sub(r'\b(photo|phato|available|elector|modification)\b', '', main_clean, flags=re.I)
        main_clean = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', main_clean)
        main_clean = re.sub(r'\s+', ' ', main_clean).strip()
        
        # Extract Age & Sex
        m_age = re.search(r'\b(1[89]|[2-9]\d|1[01]\d|120)\b', main_clean)
        age = int(m_age.group(1)) if m_age else 30
        if m_age:
            main_clean = main_clean[:m_age.start()] + ' ' + main_clean[m_age.end():]
            
        m_sex = re.search(r'\b([MF])\b', main_clean)
        sex = m_sex.group(1) if m_sex else 'M'
        if m_sex:
            main_clean = main_clean[:m_sex.start()] + ' ' + main_clean[m_sex.end():]
            
        main_clean = re.sub(r'\s+', ' ', main_clean).strip()
        
        # Extract Qualification & Occupation from main line or block
        qual = None
        occ = None
        words = main_clean.split()
        filtered_words = []
        for w in words:
            w_up = w.upper()
            if w_up in QUALIFICATIONS and qual is None:
                qual = w_up
            elif w_up in OCCUPATIONS and occ is None:
                occ = w_up
            else:
                filtered_words.append(w)
                
        # Look for qual/occ in block continuation if not found
        for bl in block[1:]:
            for w in bl.split():
                w_up = w.upper().strip(',.()')
                if w_up in QUALIFICATIONS and qual is None:
                    qual = w_up
                elif w_up in OCCUPATIONS and occ is None:
                    occ = w_up
                    
        # Filter continuation lines to build address
        addr_lines = []
        sno = None
        for bl in block[1:]:
            bl_l = bl.lower()
            if any(kw in bl_l for kw in ['photo', 'available', 'elector', 'modification', 'page']):
                continue
            # Look for serial number at start of line (e.g. 499, 500, 501)
            m_sno = re.search(r'\b([1-9]\d{0,3})\b', bl)
            if m_sno and sno is None:
                sno = int(m_sno.group(1))
                bl = bl[:m_sno.start()] + ' ' + bl[m_sno.end():]
            bl_clean = re.sub(r'\b(' + '|'.join(QUALIFICATIONS | OCCUPATIONS) + r')\b', '', bl, flags=re.I)
            bl_clean = re.sub(r'\s+', ' ', bl_clean).strip()
            if bl_clean:
                addr_lines.append(bl_clean)
                
        # Split filtered_words into Name, Relative Name, and Address part 1
        name = None
        rel_name = None
        addr_p1 = []
        
        if len(filtered_words) >= 2:
            # First 2 words or first 1-2 words are Name
            # If word 2 looks like a relative name or single initial:
            name = filtered_words[0]
            idx_curr = 1
            while idx_curr < len(filtered_words) and (len(filtered_words[idx_curr]) == 1 or filtered_words[idx_curr].istitle() or filtered_words[idx_curr].isupper()):
                if idx_curr == 1 or (idx_curr == 2 and len(filtered_words[1]) <= 2):
                    name += ' ' + filtered_words[idx_curr]
                    idx_curr += 1
                else:
                    break
                    
            if idx_curr < len(filtered_words):
                rel_name = filtered_words[idx_curr]
                idx_curr += 1
                while idx_curr < len(filtered_words) and (len(filtered_words[idx_curr]) == 1 or filtered_words[idx_curr].istitle() or filtered_words[idx_curr].isupper()):
                    if len(filtered_words[idx_curr]) <= 3 or idx_curr == len(name.split()) + 1:
                        rel_name += ' ' + filtered_words[idx_curr]
                        idx_curr += 1
                    else:
                        break
                        
            addr_p1 = filtered_words[idx_curr:]
        elif len(filtered_words) == 1:
            name = filtered_words[0]
        else:
            name = f'Voter {ep}'
            
        full_addr = ', '.join([w for w in [' '.join(addr_p1)] + addr_lines if w.strip()])
        if not full_addr:
            full_addr = 'Karnataka'
            
        voters.append({
            'serial_number': sno,
            'epic_number': ep,
            'name': name,
            'relative_name': rel_name,
            'address': full_addr,
            'qualification': qual,
            'occupation': occ,
            'age': age,
            'sex': sex
        })
        
    return voters

doc = pymupdf.open('../pdf-ocr made/chikkaballapur nandi & kasba hobli 2026_ocred.pdf')
voters = parse_page_voters(doc[80].get_text('text'))
df_out = pd.DataFrame(voters)
with open('page81_clean_extracted.txt', 'w', encoding='utf-8') as f:
    f.write(df_out.to_string())

print('Extracted voters written to page81_clean_extracted.txt')
doc.close()
