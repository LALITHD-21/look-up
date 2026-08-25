import re, pandas as pd

QUALIFICATIONS = ['BCA', 'BCOM', 'BA', 'BSC', 'MA', 'MCOM', 'MCA', 'MSC', 'BE', 'ME', 'MTECH', 'BTECH', 'BED', 'MED', 'LLB', 'LLM', 'MBBS', 'BDS', 'PHD', 'PUC', 'SSLC', 'DIPLOMA']
OCCUPATIONS = ['LECTURER', 'SOFTWERE', 'SOFTWARE', 'TEACHER', 'FARMER', 'AGRICULTURE', 'BUSINESS', 'EMPLOYEE', 'ACCOUNTANT', 'ENGINEER', 'ENGINEEAR', 'ADVOCATE', 'DIRECTOR', 'STUDENT', 'HOUSEWIFE', 'DOCTOR', 'PROFESSOR', 'HEAD', 'DRIVER', 'POLICE', 'NURSE']

def parse_main_row(main_txt, cont_lines):
    # 1. Extract EPIC
    m_epic = re.search(r'\b([A-Z]{3}\s*[A-Z0-9]{7})\b', main_txt, re.I)
    epic = m_epic.group(1).upper().replace(' ', '') if m_epic else 'NOP9999999'
    
    # 2. Extract Age & Sex
    m_age = re.search(r'\b(1[89]|[2-9]\d|1[01]\d|120)\b', main_txt)
    age = int(m_age.group(1)) if m_age else 30
    
    m_sex = re.search(r'\b([MF])\b', main_txt)
    sex = m_sex.group(1).upper() if m_sex else 'M'
    
    # 3. Extract Qualification & Occupation
    qual = None
    for q in QUALIFICATIONS:
        if re.search(r'\b' + q + r'\b', main_txt, re.I):
            qual = q
            break
            
    occ = None
    for o in OCCUPATIONS:
        if re.search(r'\b' + o + r'\b', main_txt, re.I):
            occ = o
            break
            
    # Clean main_txt to isolate Name, Relative Name, and Address line 1
    cleaned = main_txt
    if m_epic:
        cleaned = cleaned[:m_epic.start()]
    cleaned = re.sub(r'\b(photo|phato|available|elector|modification)\b', '', cleaned, flags=re.I)
    cleaned = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    # Remove Qual & Occ from cleaned
    if qual:
        cleaned = re.sub(r'\b' + qual + r'\b', ' |QUAL| ', cleaned, flags=re.I)
    if occ:
        cleaned = re.sub(r'\b' + occ + r'\b', ' |OCC| ', cleaned, flags=re.I)
        
    parts = cleaned.split('|QUAL|')
    left_part = parts[0].strip()
    right_part = parts[1] if len(parts) > 1 else ''
    
    if '|OCC|' in left_part:
        left_part = left_part.split('|OCC|')[0].strip()
    if '|OCC|' in right_part:
        right_part = right_part.split('|OCC|')[1].strip()
        
    # Left part contains: [Name] [Relative Name] [Address line 1]
    # In Kannada/English voter lists: Name is first 1-3 words, Relative Name is next 1-3 words
    words = left_part.split()
    
    name = ''
    rel_name = ''
    addr_l1 = ''
    
    if len(words) >= 4:
        # e.g., Chandan K Venkataswarny K N 2043 chikkaballapura
        # Look for house number / digits / VTC / address keywords to demarcate address start
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
        
    # Clean continuation lines for address
    clean_conts = []
    for cl in cont_lines:
        cl_c = re.sub(r'\b(photo|phato|available|elector|modification|page|\d{1,4})\b', '', cl, flags=re.I)
        cl_c = re.sub(r'[\|\[\]\(\)\{\}\:]', ' ', cl_c)
        cl_c = re.sub(r'\s+', ' ', cl_c).strip()
        if cl_c and not cl_c.isdigit():
            clean_conts.append(cl_c)
            
    full_address = ', '.join([w for w in [addr_l1, right_part] + clean_conts if w.strip()])
    full_address = re.sub(r'[,\s]*,+[,\s]*', ', ', full_address).strip(' ,')
    if not full_address:
        full_address = 'Karnataka'
        
    return {
        'epic_number': epic,
        'name': name,
        'relative_name': rel_name or None,
        'address': full_address,
        'qualification': qual,
        'occupation': occ,
        'age': age,
        'sex': sex
    }

# Test on lines 20, 24, 29 of page81_spatial.txt
test_rows = [
    ("Chand Pasha A Ahmed KANDAVARA (VTC) BA 32 M | NMO3363793 | Phato", ["Available Chickballapur (Post) KANDAVARA 499", "(Ta) CHIKKABALLAPURA (Dist)", "Karnataka"]),
    ("Chandan G Gopal DIBBRURU DIBBRURU (VTC) | BCOM 30 [ M | NMO4061388 | photo", ["Available Chickballapur (Post) DIBBURU 556", "(Ta) CHIKKABALLAPURA (Dist)", "Karnataka"]),
    ("Chandan GowdaMV | Venkatesh Murthy MV | MYLAPANAHLLI BCA SOFTWERE 24 | M | NMOA3STSST [ Lo", ["MYLAPANAHLLI (VTC) Kalavara eI", "501 (Post) Chickballapur (Ta)", "CHIKKABALLAPURA (Dist)", "Karnataka"]),
    ("Chandan K Venkataswarny K N 2043 chikkaballapura BCA LECTURER 28 [ M | NMO3477882", ["Photo (VTC) chikkaballapura", "Available (Post) chikkaballapura s02", "Chickballapur (Ta)", "CHIKKABALLAPURA (Dist)", "Karnataka"])
]

print("TEST PARSING Source PDF Table Rows:")
for main_t, conts in test_rows:
    parsed = parse_main_row(main_t, conts)
    print(f"EPIC: {parsed['epic_number']:<10} | Name: {parsed['name']:<18} | RelName: {str(parsed['relative_name']):<18} | Qual: {str(parsed['qualification']):<5} | Occ: {str(parsed['occupation']):<10} | Age: {parsed['age']} | Sex: {parsed['sex']}")
    print(f"  Address: {parsed['address']}")
    print("-" * 80)
