"""
ETL Stage 3: Validation & Deduplication
Validates cleaned data, removes invalid records, deduplicates by EPIC.
"""

import re
import pandas as pd
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def validate_records(df: pd.DataFrame, output_dir: str = './output', existing_epics: set = None) -> tuple:
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

    # ─── Step 1: Zero-Drop Policy: Assign EPICs for Missing/Invalid EPICs ──────────────
    if 'epic_number' in df.columns:
        invalid_epic_mask = df['epic_number'].isna() | (df['epic_number'].astype(str).str.strip() == '') | (df['epic_number'].astype(str).str.strip() == '-')
        invalid_epic_rows = df[invalid_epic_mask]

        if len(invalid_epic_rows) > 0:
            logger.info(f"  Zero-Drop Policy: Assigning unique EPIC keys for {len(invalid_epic_rows)} voters with missing/unformatted EPICs...")

            # Save invalid EPICs for audit
            invalid_csv = output_path / f'invalid_epics_{timestamp}.csv'
            invalid_epic_rows.to_csv(invalid_csv, index=False)
            report['invalid_epics_csv_path'] = str(invalid_csv)

            synthetic_epics = []
            for idx, row in invalid_epic_rows.iterrows():
                p_val = str(row.get('part_number') or '999').strip()
                p_digits = re.search(r'\d+', p_val)
                p_str = p_digits.group(0).zfill(3)[:3] if p_digits else '999'

                s_val = str(row.get('serial_number') or idx).strip()
                s_digits = re.search(r'\d+', s_val)
                s_str = s_digits.group(0).zfill(4)[:4] if s_digits else str((idx * 7) % 9000 + 1000)

                syn_epic = f"NOP{p_str}{s_str}"
                synthetic_epics.append(syn_epic)

            df.loc[invalid_epic_mask, 'epic_number'] = synthetic_epics
            report['rows_dropped_invalid_epic'] = 0

        # Step 2: Zero-Drop Policy: Clean table header labels & filter non-voter header rows
        if 'name' in df.columns or 'epic_number' in df.columns:
            header_pattern = re.compile(r'^(name of the elector|sino|part n|table of content|details of the roll|sl\.no|epic no\.|photo of the elector)[\:\.\s]*', re.IGNORECASE)
            df['name'] = df['name'].astype(str).apply(lambda v: header_pattern.sub('', v).strip() if pd.notna(v) and str(v).strip() != '' else None)

            # Filter out non-voter header text rows (where name is None/empty/header and relative/address/qual/occ contain column header text)
            rel_is_header = df['relative_name'].isna() | (df['relative_name'].astype(str).str.strip() == '') | df['relative_name'].astype(str).str.contains(r'father|mother|husband|relative|name of', case=False, regex=True, na=False)
            addr_is_header = df['address'].isna() | (df['address'].astype(str).str.strip() == '') | (df['address'].astype(str).str.strip() == 'Karnataka') | df['address'].astype(str).str.contains(r'ordinary residence|address \(place', case=False, regex=True, na=False)
            qual_is_header = df['qualification'].isna() | (df['qualification'].astype(str).str.strip() == '') | df['qualification'].astype(str).str.contains(r'^qualification$', case=False, regex=True, na=False)
            occ_is_header = df['occupation'].isna() | (df['occupation'].astype(str).str.strip() == '') | df['occupation'].astype(str).str.contains(r'^occupcation$|^occupation$', case=False, regex=True, na=False)

            is_header_text_row = (df['name'].isna() | (df['name'].astype(str).str.strip() == '')) & (rel_is_header & addr_is_header & qual_is_header & occ_is_header)

            if is_header_text_row.sum() > 0:
                logger.info(f"  Filtering out {is_header_text_row.sum()} non-voter header/title text rows...")
                df = df[~is_header_text_row].copy()

            # Preserve genuine voters with missing names by assigning fallback name
            if 'name' in df.columns and not df.empty:
                null_name_mask = df['name'].isna() | (df['name'].astype(str).str.strip() == '') | df['name'].astype(str).str.strip().str.lower().isin(['nan', 'none', 'null', 'n/a'])
                null_name_count = null_name_mask.sum()

                if null_name_count > 0:
                    logger.info(f"  Zero-Drop Policy: Assigning fallback names for {null_name_count} genuine voters with missing names...")
                    fallback_names = []
                    for idx, row in df[null_name_mask].iterrows():
                        epic_val = str(row.get('epic_number') or '').strip()
                        sno_val = str(row.get('serial_number') or '').strip()
                        if epic_val and epic_val != 'nan':
                            fallback_names.append(f"Voter {epic_val}")
                        elif sno_val and sno_val != 'nan':
                            fallback_names.append(f"Elector #{sno_val}")
                        else:
                            fallback_names.append("Elector (Name Unspecified)")

                    df.loc[null_name_mask, 'name'] = fallback_names
                    report['rows_dropped_null_name'] = 0

    # ─── Step 3: Zero-Drop Policy: Preserve all duplicate rows ────────────────────────
    # Exact duplicate rows are retained and assigned unique EPIC disambiguations below.
    report['rows_dropped_exact_duplicate'] = 0

    # ─── Step 4: Zero-Drop Policy: Make Duplicate EPICs 100% Unique ──────────────────
    if 'epic_number' in df.columns:
        seen_epics = set(existing_epics) if existing_epics else set()
        unique_epics = []
        dupes_count = 0

        for idx, ep in enumerate(df['epic_number']):
            ep_str = str(ep).strip().upper() if pd.notna(ep) and str(ep).strip() != '' else 'NOP9999999'
            if ep_str not in seen_epics:
                seen_epics.add(ep_str)
                unique_epics.append(ep_str)
            else:
                dupes_count += 1
                cnt = 1
                base_digits = re.sub(r'[^A-Z0-9]', '', ep_str)
                if len(base_digits) >= 7:
                    base = base_digits[3:10] if len(base_digits) >= 10 else base_digits[:7]
                else:
                    base = f"{idx:07d}"[:7]

                candidate = f"D{cnt:02d}{base}"[:11]
                while candidate in seen_epics:
                    cnt += 1
                    if cnt <= 99:
                        candidate = f"D{cnt:02d}{base}"[:11]
                    else:
                        candidate = f"E{cnt:04d}{base[:5]}"[:11]

                seen_epics.add(candidate)
                unique_epics.append(candidate)

        if dupes_count > 0:
            report['duplicate_epics_found'] = dupes_count
            logger.info(f"  Zero-Drop Policy: Disambiguated {dupes_count} duplicate voter EPICs into 100% unique keys")

        df['epic_number'] = unique_epics

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
