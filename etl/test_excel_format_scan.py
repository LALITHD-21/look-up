"""
Scan and verify all Excel files in excle-formate/pdf directory.
"""
import os
import sys
import logging
from pathlib import Path
import pandas as pd

from extract import extract_from_excel
from clean import clean_dataframe
from validate import validate_records
from polling import load_polling_parts_mapping

# Set logging to ERROR to keep output clean
logging.basicConfig(level=logging.ERROR)

def scan_excel_folder():
    base_dir = Path('../excle-formate')
    if not base_dir.exists():
        base_dir = Path('excle-formate')
    
    excel_files = sorted(base_dir.rglob('*.xlsx'))
    excel_files = [f for f in excel_files if not f.name.startswith('~$')]
    
    print(f"Scanning {len(excel_files)} Excel files in {base_dir}...", flush=True)
    
    total_raw_rows = 0
    total_clean_rows = 0
    total_valid_rows = 0
    file_stats = []
    
    polling_map = load_polling_parts_mapping('../poling addres')

    for idx, fpath in enumerate(excel_files, 1):
        rel_path = fpath.relative_to(base_dir)
        try:
            df_raw = extract_from_excel(str(fpath))
            raw_cnt = len(df_raw)
            total_raw_rows += raw_cnt

            if df_raw.empty:
                file_stats.append((str(rel_path), 0, 0, 0, "EMPTY"))
                print(f"[{idx}/{len(excel_files)}] EMPTY: {rel_path.name}", flush=True)
                continue

            df_clean = clean_dataframe(df_raw, polling_map=polling_map)
            clean_cnt = len(df_clean)
            total_clean_rows += clean_cnt

            df_valid, rep = validate_records(df_clean)
            valid_cnt = len(df_valid)
            total_valid_rows += valid_cnt

            file_stats.append((str(rel_path), raw_cnt, clean_cnt, valid_cnt, "OK"))
            print(f"[{idx}/{len(excel_files)}] {rel_path.name[:35]}: Raw={raw_cnt}, Clean={clean_cnt}, Valid={valid_cnt}", flush=True)

        except Exception as e:
            file_stats.append((str(rel_path), 0, 0, 0, f"ERROR: {e}"))
            print(f"[{idx}/{len(excel_files)}] ERROR {rel_path.name}: {e}", flush=True)

    print("\n================ SUMMARY ================", flush=True)
    print(f"Total Files Scanned: {len(excel_files)}", flush=True)
    print(f"Total Raw Rows:      {total_raw_rows:,}", flush=True)
    print(f"Total Clean Rows:    {total_clean_rows:,}", flush=True)
    print(f"Total Valid Rows:    {total_valid_rows:,}", flush=True)
    print("=========================================", flush=True)

    # Print any files with 0 valid rows or errors
    problematic = [s for s in file_stats if s[3] == 0 or "ERROR" in s[4] or "EMPTY" in s[4]]
    if problematic:
        print("\n--- Problematic Files (0 valid rows or errors) ---", flush=True)
        for p in problematic:
            print(p, flush=True)
    else:
        print("\nAll files successfully processed with 0 drops!", flush=True)

if __name__ == '__main__':
    scan_excel_folder()
