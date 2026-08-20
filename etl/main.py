"""
Elector Lookup Portal — ETL Pipeline
Main orchestrator script with CLI interface.

Usage:
    python main.py --source ../data --ingest          # Full run
    python main.py --source ../data --dry-run         # Extract + clean + validate only
    python main.py --source ../data --output out.csv  # Save cleaned data to CSV
    python main.py --input cleaned.csv --ingest       # Ingest from pre-cleaned CSV
    python main.py --source ../data --dry-run --verbose
"""

import argparse
import sys
import logging
from pathlib import Path
from datetime import datetime

import pandas as pd
from dotenv import load_dotenv

from extract import extract_all
from clean import clean_dataframe
from validate import validate_records, generate_report_text
from ingest import ingest_to_supabase, verify_ingestion

# Load environment variables from .env
load_dotenv()


def setup_logging(verbose: bool = False):
    """Configure logging."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )


def main():
    parser = argparse.ArgumentParser(
        description='Elector Lookup Portal — ETL Pipeline',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --source ../data --ingest           Full ETL run
  python main.py --source ../data --dry-run          Extract, clean, validate (no ingest)
  python main.py --source ../data --output clean.csv Save cleaned data to CSV
  python main.py --input clean.csv --ingest          Ingest from a pre-cleaned CSV
  python main.py --source ../data --dry-run --verbose Verbose logging
        """
    )

    parser.add_argument(
        '--source',
        type=str,
        help='Path to the source data directory containing .xlsx and .pdf files'
    )
    parser.add_argument(
        '--input',
        type=str,
        help='Path to a pre-cleaned CSV file to ingest directly'
    )
    parser.add_argument(
        '--output',
        type=str,
        help='Path to save the cleaned CSV output (without ingesting)'
    )
    parser.add_argument(
        '--ingest',
        action='store_true',
        help='Ingest cleaned data into Supabase'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Extract, clean, and validate only — do not ingest'
    )
    parser.add_argument(
        '--method',
        type=str,
        choices=['copy', 'rest'],
        default='copy',
        help='Ingestion method: "copy" (psycopg2, fast) or "rest" (Supabase API, slower). Default: copy'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose/debug logging'
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.source and not args.input:
        parser.error('Either --source or --input is required.')

    if args.dry_run and args.ingest:
        parser.error('Cannot use both --dry-run and --ingest.')

    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_dir = Path('./output')
    output_dir.mkdir(parents=True, exist_ok=True)

    print()
    print('=' * 60)
    print('  Elector Lookup Portal — ETL Pipeline')
    print(f'  Started: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print('=' * 60)
    print()

    # ─── Step 1: Get the data ─────────────────────────────────────────────────
    if args.input:
        # Load from pre-cleaned CSV
        logger.info(f"Loading pre-cleaned data from: {args.input}")
        try:
            df = pd.read_csv(args.input, dtype=str, keep_default_na=False)
            logger.info(f"Loaded {len(df)} rows from CSV")
            source_files = [args.input]
        except Exception as e:
            logger.error(f"Failed to load CSV: {e}")
            sys.exit(1)

        # Skip cleaning and validation for pre-cleaned input
        report = {
            'total_raw_rows': len(df),
            'rows_after_cleaning': len(df),
            'rows_dropped_invalid_epic': 0,
            'rows_dropped_null_name': 0,
            'rows_dropped_exact_duplicate': 0,
            'duplicate_epics_found': 0,
            'rows_flagged_age_out_of_range': 0,
            'invalid_sex_values': 0,
            'duplicates_csv_path': None,
            'invalid_epics_csv_path': None,
        }

    else:
        # ─── Step 1a: Extract ─────────────────────────────────────────────────
        logger.info(f"Extracting data from: {args.source}")
        df = extract_all(args.source)

        if df.empty:
            logger.error("No data extracted from source files. Exiting.")
            sys.exit(1)

        # Track source files for the report
        source_files = []
        if 'source_file' in df.columns:
            source_files = df['source_file'].unique().tolist()

        logger.info(f"Extracted {len(df)} raw rows from {len(source_files)} files")

        # ─── Step 1b: Clean ───────────────────────────────────────────────────
        logger.info("Cleaning data...")
        df = clean_dataframe(df)

        if df.empty:
            logger.error("All rows dropped during cleaning. Check source data.")
            sys.exit(1)

        logger.info(f"Cleaned: {len(df)} rows remaining")

        # ─── Step 1c: Validate ────────────────────────────────────────────────
        logger.info("Validating and deduplicating...")
        df, report = validate_records(df, output_dir=str(output_dir))

        if df.empty:
            logger.error("All rows dropped during validation. Check source data.")
            sys.exit(1)

        logger.info(f"Validated: {len(df)} valid records")

    # ─── Step 2: Output cleaned CSV (if requested) ───────────────────────────
    if args.output:
        output_csv = Path(args.output)
        # Only save schema columns + traceability columns
        save_cols = [
            'serial_number', 'epic_number', 'name', 'relative_name',
            'address', 'qualification', 'occupation', 'age', 'sex', 'photo_url'
        ]
        save_cols = [c for c in save_cols if c in df.columns]
        df[save_cols].to_csv(output_csv, index=False)
        logger.info(f"Cleaned data saved to: {output_csv}")

    # ─── Step 3: Ingest (if not dry-run) ──────────────────────────────────────
    ingest_result = None
    verification = None

    if args.ingest and not args.dry_run:
        logger.info(f"Ingesting {len(df)} rows into Supabase (method: {args.method})...")
        ingest_result = ingest_to_supabase(df, method=args.method)

        if ingest_result['errors']:
            for err in ingest_result['errors']:
                logger.error(f"  Ingestion error: {err}")

        # Verify
        verification = verify_ingestion(len(df))
        if verification['match']:
            logger.info(f"  ✓ Verification passed: DB has {verification['db_count']} rows")
        else:
            logger.warning(
                f"  ✗ Verification: expected >= {verification['expected']}, "
                f"got {verification['db_count']}"
            )

    elif args.dry_run:
        logger.info("Dry run — skipping ingestion.")

    # ─── Step 4: Generate and save report ─────────────────────────────────────
    report_text = generate_report_text(
        report,
        source_files=source_files,
        timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )

    # Add ingestion results to report
    if ingest_result:
        report_text += '\n--- Ingestion ---\n'
        report_text += f"Method:                       {args.method.upper()}\n"
        report_text += f"Rows ingested:                {ingest_result['rows_inserted']:>10,}\n"
        report_text += f"Errors:                       {len(ingest_result['errors']):>10}\n"
        report_text += f"Duration:                     {ingest_result['duration_seconds']:>10.1f} seconds\n"

    if verification:
        report_text += '\n--- Verification ---\n'
        report_text += f"Database row count:           {verification['db_count']:>10,}\n"
        report_text += f"Expected (this run):          {verification['expected']:>10,}\n"
        report_text += f"Match:                        {'YES [OK]' if verification['match'] else 'NO [FAIL]'}\n"

    report_text += '\n' + '=' * 60 + '\n'
    if args.dry_run:
        report_text += '  ETL DRY RUN COMPLETE\n'
    elif ingest_result and not ingest_result['errors']:
        report_text += '  ETL COMPLETE -- SUCCESS\n'
    else:
        report_text += '  ETL COMPLETE -- WITH ERRORS (see above)\n'
    report_text += '=' * 60 + '\n'

    # Print report to stdout
    print()
    print(report_text)

    # Save report to file
    report_file = output_dir / f'report_{timestamp}.txt'
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report_text)
    logger.info(f"Report saved to: {report_file}")

    # Exit with appropriate code
    if ingest_result and ingest_result['errors']:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
