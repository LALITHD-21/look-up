"""
ETL Stage 3: Validation & Deduplication
Validates cleaned data, removes invalid records, deduplicates by EPIC.
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def validate_records(df: pd.DataFrame, output_dir: str = './output') -> tuple:
    """
    Validate and deduplicate the cleaned DataFrame.

    Returns:
        tuple of (cleaned_df, report_dict)
    """
    if df.empty:
        return df, _empty_report()

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    total_raw = len(df)
    report = {
        'total_raw_rows': total_raw,
        'rows_after_cleaning': total_raw,
        'rows_dropped_invalid_epic': 0,
        'rows_dropped_null_name': 0,
        'rows_dropped_exact_duplicate': 0,
        'duplicate_epics_found': 0,
        'rows_flagged_age_out_of_range': 0,
        'invalid_sex_values': 0,
        'duplicates_csv_path': None,
        'invalid_epics_csv_path': None,
    }

    # ─── Step 1: Validate EPIC or Polling Station fields ──────────────────────
    if 'epic_number' in df.columns:
        invalid_epic_mask = df['epic_number'].isna() | (df['epic_number'] == '')
        invalid_epic_rows = df[invalid_epic_mask]

        if len(invalid_epic_rows) > 0:
            report['rows_dropped_invalid_epic'] = len(invalid_epic_rows)
            logger.warning(f"  Dropping {len(invalid_epic_rows)} rows with invalid/missing EPIC numbers")

            # Save invalid EPICs for review
            invalid_csv = output_path / f'invalid_epics_{timestamp}.csv'
            invalid_epic_rows.to_csv(invalid_csv, index=False)
            report['invalid_epics_csv_path'] = str(invalid_csv)
            logger.info(f"  Invalid EPICs saved to: {invalid_csv}")

        df = df[~invalid_epic_mask].copy()

        # Step 2: Drop rows with null/empty names
        if 'name' in df.columns:
            null_name_mask = df['name'].isna() | (df['name'].astype(str).str.strip() == '')
            null_name_count = null_name_mask.sum()

            if null_name_count > 0:
                report['rows_dropped_null_name'] = int(null_name_count)
                logger.warning(f"  Dropping {null_name_count} rows with null/empty names")

            df = df[~null_name_mask].copy()

    elif 'part_number' in df.columns or 'polling_station_name' in df.columns:
        # Filter out summary/total rows (e.g. rows where part_number or serial_number is 'TOTAL')
        total_mask = df.apply(
            lambda r: any('total' in str(v).lower() for v in r.values),
            axis=1
        )
        if total_mask.sum() > 0:
            logger.info(f"  Dropping {total_mask.sum()} summary/total rows from polling data")
            df = df[~total_mask].copy()

        # Drop rows where part_number and polling_station_name are both null
        null_polling_mask = df['part_number'].isna() & df['polling_station_name'].isna()
        if null_polling_mask.sum() > 0:
            logger.info(f"  Dropping {null_polling_mask.sum()} rows with missing polling station details")
            df = df[~null_polling_mask].copy()

    # ─── Step 3: Drop exact duplicate rows ────────────────────────────────────
    schema_cols = [
        'serial_number', 'epic_number', 'name', 'relative_name',
        'address', 'qualification', 'occupation', 'age', 'sex',
        'part_number', 'polling_station_name', 'polling_address',
        'district_name', 'taluk_name'
    ]
    available_cols = [c for c in schema_cols if c in df.columns]

    before_dedup = len(df)
    df = df.drop_duplicates(subset=available_cols, keep='first')
    exact_dupes = before_dedup - len(df)

    if exact_dupes > 0:
        report['rows_dropped_exact_duplicate'] = exact_dupes
        logger.info(f"  Removed {exact_dupes} exact duplicate rows")

    # ─── Step 4: Handle duplicate EPIC numbers ────────────────────────────────
    if 'epic_number' in df.columns:
        epic_counts = df['epic_number'].value_counts()
        duplicate_epics = epic_counts[epic_counts > 1]

        if len(duplicate_epics) > 0:
            report['duplicate_epics_found'] = len(duplicate_epics)
            logger.warning(f"  Found {len(duplicate_epics)} EPIC numbers with multiple records")

            # Collect all duplicate rows for the CSV
            dup_mask = df['epic_number'].isin(duplicate_epics.index)
            dup_rows = df[dup_mask].copy()

            # Save duplicates for review
            dup_csv = output_path / f'duplicates_{timestamp}.csv'
            dup_rows.to_csv(dup_csv, index=False)
            report['duplicates_csv_path'] = str(dup_csv)
            logger.info(f"  Duplicate EPIC records saved to: {dup_csv}")

            # Sort and keep the first occurrence of each EPIC
            sort_cols = []
            if 'source_file' in df.columns:
                sort_cols.append('source_file')
            if 'serial_number' in df.columns:
                sort_cols.append('serial_number')

            if sort_cols:
                df = df.sort_values(sort_cols, na_position='last')

            df = df.drop_duplicates(subset='epic_number', keep='first')
            logger.info(f"  Kept first occurrence for each duplicate EPIC. Rows remaining: {len(df)}")

    # ─── Step 5: Flag out-of-range ages ───────────────────────────────────────
    if 'age' in df.columns:
        age_series = pd.to_numeric(df['age'], errors='coerce')
        out_of_range = ((age_series < 18) | (age_series > 120)) & age_series.notna()
        flagged_count = int(out_of_range.sum())

        if flagged_count > 0:
            report['rows_flagged_age_out_of_range'] = flagged_count
            logger.warning(f"  {flagged_count} rows with age outside 18-120 range (kept, flagged)")

    # ─── Step 6: Count invalid sex values ─────────────────────────────────────
    if 'sex' in df.columns:
        valid_sex = df['sex'].isin(['M', 'F']) | df['sex'].isna()
        invalid_sex_count = int((~valid_sex).sum())

        if invalid_sex_count > 0:
            report['invalid_sex_values'] = invalid_sex_count
            # Set invalid sex values to None
            df.loc[~valid_sex, 'sex'] = None
            logger.warning(f"  {invalid_sex_count} invalid sex values set to None")

    # ─── Step 7: Final verification ───────────────────────────────────────────
    if 'epic_number' in df.columns:
        assert df['epic_number'].notna().all(), "Found null EPIC numbers after validation!"
    report['rows_after_cleaning'] = len(df)

    logger.info(f"  Validation complete: {len(df)} valid records")
    return df, report


def _empty_report() -> dict:
    """Return an empty report dict."""
    return {
        'total_raw_rows': 0,
        'rows_after_cleaning': 0,
        'rows_dropped_invalid_epic': 0,
        'rows_dropped_null_name': 0,
        'rows_dropped_exact_duplicate': 0,
        'duplicate_epics_found': 0,
        'rows_flagged_age_out_of_range': 0,
        'invalid_sex_values': 0,
        'duplicates_csv_path': None,
        'invalid_epics_csv_path': None,
    }


def generate_report_text(report: dict, source_files: list = None, timestamp: str = None) -> str:
    """
    Generate a human-readable text report from the report dict.
    """
    if timestamp is None:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    lines = [
        '=' * 60,
        '  ETL Run Report',
        f'  Timestamp: {timestamp}',
        '=' * 60,
        '',
    ]

    if source_files:
        lines.append('Source files processed:')
        for f in source_files:
            lines.append(f'  - {f}')
        lines.append('')

    lines.extend([
        f"Total raw rows read:          {report.get('total_raw_rows', 0):>10,}",
        f"Rows after cleaning:          {report.get('rows_after_cleaning', 0):>10,}",
        '',
        '--- Cleaning Summary ---',
        f"Invalid EPIC numbers:         {report.get('rows_dropped_invalid_epic', 0):>10,} (dropped)",
        f"Null names:                   {report.get('rows_dropped_null_name', 0):>10,} (dropped)",
        f"Exact duplicate rows:         {report.get('rows_dropped_exact_duplicate', 0):>10,} (dropped)",
        f"Duplicate EPIC numbers:       {report.get('duplicate_epics_found', 0):>10,} (kept first, rest flagged)",
        f"Age out of range (18-120):    {report.get('rows_flagged_age_out_of_range', 0):>10,} (flagged, kept)",
        f"Invalid sex values:           {report.get('invalid_sex_values', 0):>10,} (set to None)",
        '',
        '--- Photo Status ---',
        f"photo_url set:                         0 (PENDING — photo feature not confirmed)",
        f"photo_url NULL:               {report.get('rows_after_cleaning', 0):>10,} (all records)",
        '',
    ])

    if report.get('duplicates_csv_path'):
        lines.append(f"Duplicates CSV:  {report['duplicates_csv_path']}")
    if report.get('invalid_epics_csv_path'):
        lines.append(f"Invalid EPICs:   {report['invalid_epics_csv_path']}")

    lines.extend([
        '',
        '=' * 60,
    ])

    return '\n'.join(lines)
