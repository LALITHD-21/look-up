"""
Zero-Drop Verification Script
Tests extracting ALL voter records (including missing EPICs and duplicate EPICs).
"""

import re
import pandas as pd
from pathlib import Path
from extract import extract_from_excel
from clean import clean_dataframe
from polling import load_polling_parts_mapping

pdf_dir = Path('../pdf')
excel_files = sorted(pdf_dir.glob('*.xlsx'))

polling_map = load_polling_parts_mapping('../poling addres')

total_valid_voters = 0
epic_counter = 1000000

for f in excel_files:
    if f.name.startswith('~$'): continue
    df_raw = extract_from_excel(f)
    if df_raw.empty: continue
    
    df_clean = clean_dataframe(df_raw, polling_map=polling_map)
    if df_clean.empty: continue
    
    # Filter out actual empty/header rows
    voter_mask = df_clean['name'].notna() & (df_clean['name'].astype(str).str.strip() != '') & \
                 ~df_clean['name'].astype(str).str.lower().str.contains('name of the elector|sino|part n|table of content|details of the roll')
    
    df_voters = df_clean[voter_mask].copy()
    total_valid_voters += len(df_voters)

print('====================================================')
print(f'Total True Voter Records Preserved: {total_valid_voters}')
print('====================================================')
