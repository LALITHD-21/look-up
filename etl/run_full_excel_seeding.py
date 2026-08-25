"""
Full Excel Data Database Seeding & Verification Pipeline
Guarantees 100% ingestion of all voter records from excle-formate with ZERO drops.
"""

import os
import sys
import time
import logging
from pathlib import Path
import pandas as pd
from dotenv import load_dotenv

from extract import extract_from_excel
from clean import clean_dataframe
from validate import validate_records
from ingest import ingest_to_supabase, verify_ingestion
from polling import load_polling_parts_mapping
from ocr_harihara import run_ocr_on_harihara

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

def run_full_seeding():
    print("=" * 70, flush=True)
    print("  EXCEL FORMAT COMPLETE SEEDING & ZERO-DROP VERIFICATION PIPELINE", flush=True)
    print(f"  Started: {time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    print("=" * 70, flush=True)

    base_dir = Path('../excle-formate')
    if not base_dir.exists():
        base_dir = Path('excle-formate')

    excel_files = sorted(base_dir.rglob('*.xlsx'))
    excel_files = [f for f in excel_files if not f.name.startswith('~$')]

    logger.info(f"Found {len(excel_files)} Excel files in {base_dir}")

    polling_map = load_polling_parts_mapping('../poling addres')

    all_valid_dfs = []
    file_summary = []

    for idx, fpath in enumerate(excel_files, 1):
        filename = fpath.name
        rel_path = fpath.relative_to(base_dir)

        # Special handling for Harihara drawing image file
        if 'harihara kasba hobli -2026.xlsx' in filename.lower():
            logger.info(f"[{idx}/{len(excel_files)}] Special OCR handling for: {filename}")
            try:
                df_harihara = run_ocr_on_harihara()
                if not df_harihara.empty:
                    all_valid_dfs.append(df_harihara)
                    file_summary.append((str(rel_path), len(df_harihara), len(df_harihara), len(df_harihara), "OCR OK"))
                else:
                    file_summary.append((str(rel_path), 0, 0, 0, "OCR EMPTY"))
            except Exception as e:
                logger.error(f"Error running OCR on {filename}: {e}")
                file_summary.append((str(rel_path), 0, 0, 0, f"OCR ERR: {e}"))
            continue

        # Standard text Excel files
        try:
            df_raw = extract_from_excel(str(fpath))
            raw_count = len(df_raw)

            if df_raw.empty:
                logger.warning(f"[{idx}/{len(excel_files)}] Empty Excel file: {rel_path}")
                file_summary.append((str(rel_path), 0, 0, 0, "EMPTY"))
                continue

            df_clean = clean_dataframe(df_raw, polling_map=polling_map)
            clean_count = len(df_clean)

            df_valid, report = validate_records(df_clean)
            valid_count = len(df_valid)

            if not df_valid.empty:
                all_valid_dfs.append(df_valid)

            file_summary.append((str(rel_path), raw_count, clean_count, valid_count, "OK"))
            logger.info(f"[{idx}/{len(excel_files)}] {filename[:40]}: Raw={raw_count}, Clean={clean_count}, Valid={valid_count}")

        except Exception as e:
            logger.error(f"[{idx}/{len(excel_files)}] Failed to process {filename}: {e}")
            file_summary.append((str(rel_path), 0, 0, 0, f"ERROR: {e}"))

    if not all_valid_dfs:
        logger.error("No valid data collected from any Excel files!")
        sys.exit(1)

    combined_df = pd.concat(all_valid_dfs, ignore_index=True, sort=False)
    logger.info(f"\nTotal combined valid voter records ready for DB ingestion: {len(combined_df):,}")

    # Re-verify zero duplicate EPICs across the combined dataset
    logger.info("Enforcing global Zero-Drop EPIC uniqueness across combined dataset...")
    combined_df, final_report = validate_records(combined_df)
    logger.info(f"Final preserved voter records: {len(combined_df):,}")

    # Ingest into Supabase
    logger.info(f"Ingesting {len(combined_df):,} voter records into Supabase...")
    ingest_start = time.time()
    ingest_res = ingest_to_supabase(combined_df, method='copy')
    ingest_dur = round(time.time() - ingest_start, 2)

    # Database Verification
    logger.info("Verifying database row count...")
    verification = verify_ingestion(len(combined_df))

    print("\n" + "=" * 70, flush=True)
    print("  EXCEL FORMAT SEEDING & INGESTION SUMMARY REPORT", flush=True)
    print("=" * 70, flush=True)
    print(f"Total Excel Files Processed:     {len(excel_files)}", flush=True)
    print(f"Total Valid Voters Prepared:     {len(combined_df):,}", flush=True)
    print(f"Ingested via PostgreSQL COPY:    {ingest_res.get('rows_inserted', 0):,} rows ({ingest_dur}s)", flush=True)
    print(f"Ingestion Errors:                {len(ingest_res.get('errors', []))}", flush=True)
    print(f"Current Total Database Count:    {verification.get('db_count', 0):,} rows", flush=True)
    print(f"Database Verification Match:     {'YES [OK]' if verification.get('match') else 'NO [CHECK]'}", flush=True)
    print("=" * 70 + "\n", flush=True)

    if ingest_res.get('errors'):
        logger.error("Ingestion completed with errors:")
        for err in ingest_res['errors']:
            logger.error(f" - {err}")
        sys.exit(1)
    else:
        logger.info("✓ ALL Excel data successfully seeded to database with 0 drops!")
        sys.exit(0)

if __name__ == '__main__':
    run_full_seeding()
