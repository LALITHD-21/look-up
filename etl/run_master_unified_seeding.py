"""
Master Unified Electoral Database Cleanup & Zero-Drop Seeding Pipeline
Purges invalid/dirty records and ingests 100% of voter records across all Excel & PDF OCR sources.
Target total: ~176,500 valid electors.
"""

import os
import sys
import time
import logging
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

from extract import extract_from_excel
from clean import clean_dataframe
from validate import validate_records
from ingest import ingest_to_supabase, verify_ingestion
from polling import load_polling_parts_mapping
from ocr_harihara import run_ocr_on_harihara
from ingest_pdf_ocr_folder import run_pdf_ocr_ingestion

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

def main():
    start_time = time.time()
    print("=" * 80, flush=True)
    print("  MASTER UNIFIED ELECTORAL DATABASE SEEDING & CLEANUP PIPELINE", flush=True)
    print(f"  Started: {time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    print("=" * 80, flush=True)

    # 1. Load Master Polling Mapping
    polling_map = load_polling_parts_mapping('../poling addres')

    all_voter_dfs = []

    # 2. Extract from all Excel files (excle-formate)
    excel_dir = Path('../excle-formate')
    if not excel_dir.exists():
        excel_dir = Path('excle-formate')

    excel_files = sorted([f for f in excel_dir.rglob('*.xlsx') if not f.name.startswith('~$')])
    logger.info(f"FOUND {len(excel_files)} EXCEL FILES IN 'excle-formate'")

    excel_extracted_count = 0
    for idx, fpath in enumerate(excel_files, 1):
        filename = fpath.name
        if 'harihara kasba hobli -2026.xlsx' in filename.lower():
            logger.info(f"[{idx}/{len(excel_files)}] OCR handling for Harihara drawing file: {filename}")
            try:
                df_harihara = run_ocr_on_harihara()
                if not df_harihara.empty:
                    df_harihara_clean = clean_dataframe(df_harihara, polling_map=polling_map)
                    all_voter_dfs.append(df_harihara_clean)
                    excel_extracted_count += len(df_harihara_clean)
            except Exception as e:
                logger.error(f"Error reading Harihara: {e}")
            continue

        try:
            df_raw = extract_from_excel(str(fpath))
            if not df_raw.empty:
                df_clean = clean_dataframe(df_raw, polling_map=polling_map)
                if not df_clean.empty:
                    all_voter_dfs.append(df_clean)
                    excel_extracted_count += len(df_clean)
                    logger.info(f"[{idx}/{len(excel_files)}] {filename[:40]}: {len(df_clean):,} clean records")
        except Exception as e:
            logger.error(f"[{idx}/{len(excel_files)}] Failed {filename}: {e}")

    logger.info(f"\n✓ TOTAL CLEAN RECORDS FROM EXCEL FILES: {excel_extracted_count:,}")

    # 3. Extract from PDF OCR folder (pdf-ocr made)
    print("\n----------------------------------------------------", flush=True)
    print("EXTRACTING FROM 'pdf-ocr made' OCR PDFs...", flush=True)
    print("----------------------------------------------------", flush=True)

    df_pdf_ocr = run_pdf_ocr_ingestion(dry_run=True)
    if df_pdf_ocr is not None and not df_pdf_ocr.empty:
        all_voter_dfs.append(df_pdf_ocr)
        logger.info(f"✓ TOTAL CLEAN RECORDS FROM PDF OCR: {len(df_pdf_ocr):,}")

    if not all_voter_dfs:
        logger.error("CRITICAL: No voter records extracted from any source!")
        sys.exit(1)

    # 4. Combine all datasets into a single Master DataFrame
    print("\n----------------------------------------------------", flush=True)
    print("COMBINING ALL DATASETS & ENFORCING GLOBAL ZERO-DROP POLICIES...", flush=True)
    print("----------------------------------------------------", flush=True)

    master_df = pd.concat(all_voter_dfs, ignore_index=True, sort=False)
    logger.info(f"Combined Raw Extracted Records: {len(master_df):,}")

    # Validate, clean header rows, and assign unique disambiguated EPIC keys
    master_clean, report = validate_records(master_df)
    logger.info(f"Final Preserved Master Electors Count: {len(master_clean):,}")

    # 5. Ingest into Supabase PostgreSQL (with PURGE_FIRST=True)
    print("\n----------------------------------------------------", flush=True)
    print(f"PURGING DIRTY DB RECORDS & INGESTING {len(master_clean):,} PRISTINE VOTERS INTO SUPABASE...", flush=True)
    print("----------------------------------------------------", flush=True)

    ingest_res = ingest_to_supabase(master_clean, method='copy', purge_first=True)

    total_duration = time.time() - start_time

    # 6. Database Final Verification Audit
    print("\n" + "=" * 80, flush=True)
    print("  FINAL DATABASE SEEDING & DATA QUALITY AUDIT REPORT", flush=True)
    print("=" * 80, flush=True)
    print(f"Total Source Excel Files Processed:  {len(excel_files)}", flush=True)
    print(f"Excel Voters Extracted:            {excel_extracted_count:,}", flush=True)
    print(f"PDF OCR Voters Extracted:          {len(df_pdf_ocr) if df_pdf_ocr is not None else 0:,}", flush=True)
    print(f"Total Preserved Master Records:    {len(master_clean):,}", flush=True)
    print(f"PostgreSQL Ingestion Status:       {ingest_res.get('rows_inserted', 0):,} rows inserted ({ingest_res.get('duration_seconds', 0)}s)", flush=True)
    print(f"Total Pipeline Runtime:            {total_duration/60:.2f} minutes", flush=True)

    # Verify directly from DB
    try:
        import psycopg2
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM electors")
        db_count = cur.fetchone()[0]

        cur.execute("SELECT count(*) FROM electors WHERE name ILIKE '%elector%' OR name ILIKE '%sl no%' OR sex NOT IN ('M', 'F')")
        invalid_cnt = cur.fetchone()[0]

        cur.close()
        conn.close()

        print(f"Final Verified DB Total Count:     {db_count:,} electors", flush=True)
        print(f"Invalid / Header Records in DB:    {invalid_cnt} (Target: 0)", flush=True)
    except Exception as e:
        print(f"[WARN] Final DB check error: {e}", flush=True)

    print("=" * 80 + "\n", flush=True)

if __name__ == '__main__':
    main()
