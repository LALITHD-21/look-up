import pymupdf, re, pandas as pd

FLEX_EPIC_REGEX = re.compile(r'\b([A-Z]{3}\s*[A-Z0-9]{7})\b', re.IGNORECASE)

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

doc = pymupdf.open('../pdf-ocr made/chikkaballapur nandi & kasba hobli 2026_ocred.pdf')
page = doc[80] # Page 81
words = page.get_text('words')
df = pd.DataFrame(words, columns=['x0', 'y0', 'x1', 'y1', 'word', 'block', 'line', 'word_idx'])
df = df.sort_values(by=['y0', 'x0'])

# Cluster words into horizontal lines by y0
lines = []
curr_line = []
curr_y = None
for idx, r in df.iterrows():
    if curr_y is None or abs(r['y0'] - curr_y) < 4:
        curr_line.append(r)
        curr_y = r['y0']
    else:
        lines.append(curr_line)
        curr_line = [r]
        curr_y = r['y0']
if curr_line:
    lines.append(curr_line)

line_texts = []
for l in lines:
    txt = ' '.join(r['word'] for r in l)
    y_val = round(l[0]['y0'], 1)
    line_texts.append((y_val, txt, l))

# Identify row header lines (lines containing an EPIC number or voter structure)
voter_row_starts = []
for idx, (y, txt, l) in enumerate(line_texts):
    m = FLEX_EPIC_REGEX.search(txt)
    if m:
        raw_epic = m.group(1)
        if any(kw in txt.lower() for kw in ['the elector', 'photo identity', 'modification']):
            continue
        epic = clean_ocr_epic(raw_epic)
        voter_row_starts.append((idx, y, epic, txt))

print('Found Voter Row Starts:')
for idx, y, ep, txt in voter_row_starts:
    print(f'  Index {idx:2d} (y={y:<5}): EPIC={ep:<11} | Main Line: {txt}')

voters = []
for i in range(len(voter_row_starts)):
    start_idx, start_y, epic, main_txt = voter_row_starts[i]
    end_idx = voter_row_starts[i+1][0] if i+1 < len(voter_row_starts) else len(line_texts)
    
    # All lines from start_idx to end_idx-1 belong to THIS voter
    voter_lines = [line_texts[k][1] for k in range(start_idx, end_idx)]
    
    # Extract age & sex from main_txt or voter_lines
    age = None
    sex = None
    for vl in voter_lines:
        m_age = re.search(r'\b(1[89]|[2-9]\d|1[01]\d|120)\b', vl)
        if m_age and age is None:
            age = int(m_age.group(1))
        m_sex = re.search(r'\b([MF])\b', vl)
        if m_sex and sex is None:
            sex = m_sex.group(1)
            
    voters.append({
        'epic': epic,
        'main_line': main_txt,
        'continuation_lines': voter_lines[1:],
        'age': age or 30,
        'sex': sex or 'M'
    })

with open('page81_perfect_voters.txt', 'w', encoding='utf-8') as f:
    for v in voters:
        f.write(f"EPIC: {v['epic']} | Age: {v['age']} | Sex: {v['sex']}\n")
        f.write(f"  Main: {v['main_line']}\n")
        cont_str = ' // '.join(v['continuation_lines'])
        f.write(f"  Cont: {cont_str}\n")
        f.write('-'*60 + '\n')

print('Saved to page81_perfect_voters.txt')
doc.close()
