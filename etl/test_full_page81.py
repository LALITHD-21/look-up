import pymupdf, re, pandas as pd

FLEX_EPIC_REGEX = re.compile(r'\b([A-Z]{3}\s*[A-Z0-9]{7})\b', re.IGNORECASE)
QUALIFICATIONS = ['BCA', 'BCOM', 'BA', 'BSC', 'MA', 'MCOM', 'MCA', 'MSC', 'BE', 'ME', 'MTECH', 'BTECH', 'BED', 'MED', 'LLB', 'LLM', 'MBBS', 'BDS', 'PHD', 'PUC', 'SSLC', 'DIPLOMA']
OCCUPATIONS = ['LECTURER', 'SOFTWERE', 'SOFTWARE', 'TEACHER', 'FARMER', 'AGRICULTURE', 'BUSINESS', 'EMPLOYEE', 'ACCOUNTANT', 'ENGINEER', 'ENGINEEAR', 'ADVOCATE', 'DIRECTOR', 'STUDENT', 'HOUSEWIFE', 'DOCTOR', 'PROFESSOR', 'HEAD', 'DRIVER', 'POLICE', 'NURSE']

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

def parse_text_page_new(text, part_no_default="1", source_filename=""):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return []
        
    m_part = re.search(r'Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+)', text, re.IGNORECASE)
    part_no = m_part.group(1) if m_part else part_no_default
    
    voter_starts = []
    for idx, line in enumerate(lines):
        m = FLEX_EPIC_REGEX.search(line)
        if m:
            raw_epic = m.group(1)
            if any(kw in line.lower() for kw in ['the elector', 'photo identity', 'modification', 'summary']):
                continue
            epic = clean_ocr_epic(raw_epic)
            voter_starts.append((idx, epic, line))
            
    if not voter_starts:
        return []
        
    voters = []
    for i in range(len(voter_starts)):
        start_idx, epic, main_line = voter_starts[i]
        end_idx = voter_starts[i+1][0] if i+1 < len(voter_starts) else len(lines)
        
        cont_lines = lines[start_idx+1:end_idx]
        
        # 1. Age & Sex
        m_age = re.search(r'\b(1[89]|[2-9]\d|1[01]\d|120)\b', main_line)
        age = int(m_age.group(1)) if m_age else 30
        
        m_sex = re.search(r'\b([MF])\b', main_line)
        sex = m_sex.group(1).upper() if m_sex else 'M'
        
        # 2. Qual & Occ
        qual = None
        for q in QUALIFICATIONS:
            if re.search(r'\b' + q + r'\b', main_line, re.I):
                qual = q
                break
        if not qual:
            for cl in cont_lines:
                for q in QUALIFICATIONS:
                    if re.search(r'\b' + q + r'\b', cl, re.I):
                        qual = q
                        break
                if qual:
                    break
                    
        occ = None
        for o in OCCUPATIONS:
            if re.search(r'\b' + o + r'\b', main_line, re.I):
                occ = o
                break
        if not occ:
            for cl in cont_lines:
                for o in OCCUPATIONS:
                    if re.search(r'\b' + o + r'\b', cl, re.I):
                        occ = o
                        break
                if occ:
                    break
                    
        # 3. Clean main_line
        cleaned_main = main_line
        m_epic = FLEX_EPIC_REGEX.search(cleaned_main)
        if m_epic:
            cleaned_main = cleaned_main[:m_epic.start()]
            
        cleaned_main = re.sub(r'\b(photo|phato|available|elector|modification)\b', '', cleaned_main, flags=re.I)
        cleaned_main = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', cleaned_main)
        cleaned_main = re.sub(r'\s+', ' ', cleaned_main).strip()
        
        if qual:
            cleaned_main = re.sub(r'\b' + qual + r'\b', ' |QUAL| ', cleaned_main, flags=re.I)
        if occ:
            cleaned_main = re.sub(r'\b' + occ + r'\b', ' |OCC| ', cleaned_main, flags=re.I)
            
        parts = cleaned_main.split('|QUAL|')
        left_part = parts[0].strip()
        right_part = parts[1] if len(parts) > 1 else ''
        
        if '|OCC|' in left_part:
            left_part = left_part.split('|OCC|')[0].strip()
        if '|OCC|' in right_part:
            right_part = right_part.split('|OCC|')[1].strip()
            
        # Left part words
        words = left_part.split()
        name = ''
        rel_name = ''
        addr_l1 = ''
        
        sno = None
        for cl in cont_lines:
            m_sno = re.search(r'\b([1-9]\d{0,3})\b', cl)
            if m_sno and sno is None:
                sno = int(m_sno.group(1))
                
        if len(words) >= 4:
            addr_start = len(words)
            for w_idx, w in enumerate(words):
                if re.search(r'\d', w) or w.upper() in ['VTC', 'DIBBRURU', 'MYLAPANAHLLI', 'KANDAVARA', 'BEEDIWARD', 'POST', 'TQ', 'DIST']:
                    if w_idx >= 2:
                        addr_start = w_idx
                        break
                        
            person_words = words[:addr_start]
            addr_l1 = ' '.join(words[addr_start:])
            
            if len(person_words) >= 4:
                name = ' '.join(person_words[:2])
                rel_name = ' '.join(person_words[2:])
            elif len(person_words) == 3:
                name = ' '.join(person_words[:2])
                rel_name = person_words[2]
            elif len(person_words) == 2:
                name = person_words[0]
                rel_name = person_words[1]
            else:
                name = ' '.join(person_words)
        elif len(words) == 3:
            name = ' '.join(words[:2])
            rel_name = words[2]
        elif len(words) == 2:
            name = words[0]
            rel_name = words[1]
        elif len(words) == 1:
            name = words[0]
        else:
            name = f"Voter {epic}"
            
        # Continuation address lines
        clean_conts = []
        for cl in cont_lines:
            cl_c = re.sub(r'\b(photo|phato|available|elector|modification|page|\d{1,4})\b', '', cl, flags=re.I)
            if qual:
                cl_c = re.sub(r'\b' + qual + r'\b', '', cl_c, flags=re.I)
            if occ:
                cl_c = re.sub(r'\b' + occ + r'\b', '', cl_c, flags=re.I)
            cl_c = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', cl_c)
            cl_c = re.sub(r'\s+', ' ', cl_c).strip()
            if cl_c and not cl_c.isdigit():
                clean_conts.append(cl_c)
                
        full_address = ', '.join([w for w in [addr_l1, right_part] + clean_conts if w.strip()])
        full_address = re.sub(r'[,\s]*,+[,\s]*', ', ', full_address).strip(' ,')
        if not full_address:
            full_address = 'Karnataka'
            
        voters.append({
            'serial_number': sno,
            'epic_number': epic,
            'name': name,
            'relative_name': rel_name or None,
            'address': full_address,
            'qualification': qual,
            'occupation': occ,
            'age': age,
            'sex': sex,
            'part_number': part_no,
            'source_file': source_filename
        })
        
    return voters

doc = pymupdf.open('../pdf-ocr made/chikkaballapur nandi & kasba hobli 2026_ocred.pdf')
voters = parse_text_page_new(doc[80].get_text('text'), source_filename='chikkaballapur.pdf')
df_v = pd.DataFrame(voters)
print("EXTRACTED PAGE 81 VOTERS:")
for idx, r in df_v.iterrows():
    print(f"SNO: {r['serial_number']} | EPIC: {r['epic_number']} | Name: '{r['name']}' | Rel: '{r['relative_name']}' | Qual: {r['qualification']} | Occ: {r['occupation']} | Age: {r['age']} | Sex: {r['sex']}")
    print(f"  Address: {r['address']}")
    print("-" * 80)
doc.close()
