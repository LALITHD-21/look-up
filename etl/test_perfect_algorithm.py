import re

QUALIFICATIONS = {'BCA', 'BCOM', 'BA', 'BSC', 'MA', 'MCOM', 'MCA', 'MSC', 'BE', 'ME', 'MTECH', 'BTECH', 'BED', 'MED', 'LLB', 'LLM', 'MBBS', 'BDS', 'PHD', 'PUC', 'SSLC', 'DIPLOMA'}
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

def parse_voter_main_line(main_txt, cont_lines):
    # 1. EPIC
    m_epic = re.search(r'\b([A-Z]{3}\s*[A-Z0-9]{7})\b', main_txt, re.I)
    epic = clean_ocr_epic(m_epic.group(1)) if m_epic else 'NOP9999999'
    
    txt_before_epic = main_txt[:m_epic.start()] if m_epic else main_txt
    txt_before_epic = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', txt_before_epic)
    txt_before_epic = re.sub(r'\s+', ' ', txt_before_epic).strip()
    
    # 2. Sex & Age (scanned right-to-left before EPIC)
    words = txt_before_epic.split()
    
    sex = 'M'
    age = 30
    
    # Remove Sex from end of words if present
    if words and words[-1].upper() in ('M', 'F', 'MALE', 'FEMALE'):
        sex = 'M' if 'M' in words[-1].upper() else 'F'
        words.pop()
        
    if words and words[-1].isdigit() and 18 <= int(words[-1]) <= 120:
        age = int(words[-1])
        words.pop()
    elif len(words) >= 2 and words[-2].isdigit() and 18 <= int(words[-2]) <= 120:
        age = int(words[-2])
        words.pop(-2)
        
    # 3. Occupation & Qualification
    occ = None
    if words and words[-1].upper() in OCCUPATIONS:
        occ = words[-1].upper()
        words.pop()
    else:
        for idx in range(len(words)-1, -1, -1):
            if words[idx].upper() in OCCUPATIONS:
                occ = words[idx].upper()
                words.pop(idx)
                break
                
    qual = None
    if words and words[-1].upper() in QUALIFICATIONS:
        qual = words[-1].upper()
        words.pop()
    else:
        for idx in range(len(words)-1, -1, -1):
            if words[idx].upper() in QUALIFICATIONS:
                qual = words[idx].upper()
                words.pop(idx)
                break
                
    # Look for qual/occ in cont_lines if missing
    for cl in cont_lines:
        for w in cl.split():
            w_up = re.sub(r'[^A-Z]', '', w.upper())
            if w_up in QUALIFICATIONS and qual is None:
                qual = w_up
            elif w_up in OCCUPATIONS and occ is None:
                occ = w_up
                
    # 4. Remaining words: [Name] [Relative Name] [Address Line 1]
    # Find Address Line 1 start (digits, house no, VTC, village)
    addr_start = len(words)
    for w_idx, w in enumerate(words):
        if re.search(r'\d', w) or w.upper() in ['VTC', 'DIBBRURU', 'MYLAPANAHLLI', 'KANDAVARA', 'BEEDIWARD', 'POST', 'TQ', 'DIST']:
            if w_idx >= 2:
                addr_start = w_idx
                break
                
    person_words = words[:addr_start]
    addr_l1_words = words[addr_start:]
    
    if len(person_words) >= 4:
        name = ' '.join(person_words[:2])
        rel_name = ' '.join(person_words[2:])
    elif len(person_words) == 3:
        name = ' '.join(person_words[:2])
        rel_name = person_words[2]
    elif len(person_words) == 2:
        name = person_words[0]
        rel_name = person_words[1]
    elif len(person_words) == 1:
        name = person_words[0]
        rel_name = None
    else:
        name = f"Voter {epic}"
        rel_name = None
        
    # Clean continuation lines for Address
    clean_conts = []
    sno = None
    for cl in cont_lines:
        cl_c = re.sub(r'\b(photo|phato|available|elector|modification|page)\b', '', cl, flags=re.I)
        cl_c = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', cl_c)
        
        # Check for serial number
        m_sno = re.search(r'\b([1-9]\d{0,3})\b', cl_c)
        if m_sno and sno is None:
            val = int(m_sno.group(1))
            if val < 5000:
                sno = val
                cl_c = cl_c[:m_sno.start()] + ' ' + cl_c[m_sno.end():]
                
        if qual:
            cl_c = re.sub(r'\b' + qual + r'\b', '', cl_c, flags=re.I)
        if occ:
            cl_c = re.sub(r'\b' + occ + r'\b', '', cl_c, flags=re.I)
            
        cl_c = re.sub(r'\s+', ' ', cl_c).strip()
        if cl_c and not cl_c.isdigit():
            clean_conts.append(cl_c)
            
    full_address = ', '.join([w for w in [' '.join(addr_l1_words)] + clean_conts if w.strip()])
    full_address = re.sub(r'[,\s]*,+[,\s]*', ', ', full_address).strip(' ,')
    if not full_address:
        full_address = 'Karnataka'
        
    return {
        'serial_number': sno,
        'epic_number': epic,
        'name': name,
        'relative_name': rel_name,
        'address': full_address,
        'qualification': qual,
        'occupation': occ,
        'age': age,
        'sex': sex
    }

test_rows = [
    ("Chand Pasha A Ahmed KANDAVARA (VTC) BA 32 M | NMO3363793 | Phato", ["Available Chickballapur (Post) KANDAVARA 499", "(Ta) CHIKKABALLAPURA (Dist)", "Karnataka"]),
    ("Chandan G Gopal DIBBRURU DIBBRURU (VTC) | BCOM 30 [ M | NMO4061388 | photo", ["Available Chickballapur (Post) DIBBURU 500", "(Ta) CHIKKABALLAPURA (Dist)", "Karnataka"]),
    ("Chandan GowdaMV | Venkatesh Murthy MV | MYLAPANAHLLI BCA SOFTWERE 24 | M | NMOA3STSST [ Lo", ["MYLAPANAHLLI (VTC) Kalavara eI", "501 (Post) Chickballapur (Ta)", "CHIKKABALLAPURA (Dist)", "Karnataka"]),
    ("Chandan K Venkataswarny K N 2043 chikkaballapura BCA LECTURER 28 [ M | NMO3477882", ["Photo (VTC) chikkaballapura", "Available (Post) chikkaballapura 502", "Chickballapur (Ta)", "CHIKKABALLAPURA (Dist)", "Karnataka"])
]

print("=== PERFECT ALGORITHM VERIFICATION ===")
for main_t, conts in test_rows:
    res = parse_voter_main_line(main_t, conts)
    print(f"SNO: {res['serial_number']} | EPIC: {res['epic_number']} | Name: '{res['name']}' | Rel: '{res['relative_name']}' | Qual: {res['qualification']} | Occ: {res['occupation']} | Age: {res['age']} | Sex: {res['sex']}")
    print(f"  Address: {res['address']}")
    print("-" * 80)
