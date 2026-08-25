"""
Check all raw column names across all Excel files in excle-formate
to ensure no columns or sheets are unmapped or missed.
"""
import re
from pathlib import Path
import pandas as pd
import openpyxl
from clean import COLUMN_MAP

def check_columns():
    base_dir = Path('../excle-formate')
    if not base_dir.exists():
        base_dir = Path('excle-formate')

    excel_files = sorted(base_dir.rglob('*.xlsx'))
    excel_files = [f for f in excel_files if not f.name.startswith('~$')]

    unmapped_summary = set()
    all_sheets = []

    for fpath in excel_files:
        try:
            xl = pd.ExcelFile(fpath, engine='openpyxl')
            for sheet in xl.sheet_names:
                all_sheets.append((fpath.name, sheet))
                df_header = pd.read_excel(xl, sheet_name=sheet, nrows=10, header=None, dtype=str)
                for idx, row in df_header.iterrows():
                    for val in row.dropna():
                        val_str = str(val).strip()
                        if not val_str or val_str.isdigit():
                            continue
                        normalized = re.sub(r'[\s_.\-\(\)\/]+', ' ', val_str.lower()).strip()
                        normalized_simple = re.sub(r'[^a-z0-9]', '', val_str.lower()).strip()
                        matched = False
                        for src, canon in COLUMN_MAP.items():
                            src_simple = re.sub(r'[^a-z0-9]', '', src)
                            if normalized == src or normalized_simple == src_simple:
                                matched = True
                                break
                        if not matched and len(val_str) < 50:
                            # Potential candidate column header
                            if any(k in val_str.lower() for k in ['name', 'epic', 'voter', 'address', 'age', 'sex', 'gender', 'relation', 'father', 'husband', 'part', 'sl', 'sno', 'no']):
                                unmapped_summary.add(val_str)
        except Exception as e:
            print(f"Error checking {fpath.name}: {e}")

    print(f"Total Sheets Checked: {len(all_sheets)}")
    print("Potential Unmapped Column Header Variants Found:")
    for u in sorted(unmapped_summary):
        print(f" - {u}")

if __name__ == '__main__':
    check_columns()
