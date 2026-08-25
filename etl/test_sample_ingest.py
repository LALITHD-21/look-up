"""
Sample Ingestion Verification Test (100 rows)
As required by AGENTS.md: Always test on a small sample (100 rows) before running full ETL ingestion.
"""

import sys
import logging
from pathlib import Path
import pandas as pd
from dotenv import load_dotenv

from extract import extract_from_excel
from clean import clean_dataframe
from validate import validate_records
from ingest import ingest_to_supabase, verify_ingestion
from polling import load_polling_parts_mapping

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def run_sample_test():
    source_file = '../pdf/bagepalli  guluru kasba mittemari hobli 2026.xlsx'
    logger.info(f"Extracting sample from: {source_file}")

    df_raw = extract_from_excel(source_file)
    if df_raw.empty:
        logger.error("Sample extraction failed!")
        sys.exit(1)

    polling_map = load_polling_parts_mapping('../poling addres')
    df_clean = clean_dataframe(df_raw, polling_map=polling_map)
    df_valid, report = validate_records(df_clean)

    # Take first 100 records for safety test
    df_sample = df_valid.head(100).copy()
    logger.info(f"Testing ingestion on sample of {len(df_sample)} rows...")

    result = ingest_to_supabase(df_sample, method='copy')
    logger.info(f"Ingestion result: {result}")

    if result.get('errors'):
        logger.error(f"Sample ingestion failed with errors: {result['errors']}")
        sys.exit(1)

    verification = verify_ingestion(len(df_sample))
    logger.info(f"Verification result: {verification}")

    if verification['match']:
        logger.info("✓ Sample 100-row ingestion test PASSED successfully!")
    else:
        logger.error("Sample ingestion verification FAILED!")
        sys.exit(1)

if __name__ == '__main__':
    run_sample_test()
