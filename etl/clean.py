"""
ETL Stage 2: Cleaning & Normalization
Maps source columns to canonical names and cleans every field.
"""

import re
import pandas as pd
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ─── Column Mapping ───────────────────────────────────────────────────────────
# Maps common source column name variants to our canonical schema names.
# Matching is case-insensitive and whitespace-insensitive.

COLUMN_MAP = {
    'sno': 'serial_number',
    's no': 'serial_number',
    'sino': 'serial_number',
    'si no': 'serial_number',
    's.no': 'serial_number',
    's.no.': 'serial_number',
    'serial': 'serial_number',
    'serial no': 'serial_number',
    'serial number': 'serial_number',
    'sl no': 'serial_number',
    'slno': 'serial_number',
    'sl.no': 'serial_number',
    'sr no': 'serial_number',
    'srno': 'serial_number',
    'sr.no': 'serial_number',
    'epic': 'epic_number',
    'epic no': 'epic_number',
    'epic number': 'epic_number',
    'epicno': 'epic_number',
    'epic_no': 'epic_number',
    'epic no.': 'epic_number',
    'voter id': 'epic_number',
    'voter id no': 'epic_number',
    'voter id number': 'epic_number',
    'name': 'name',
    'elector name': 'name',
    'voter name': 'name',
    'name of elector': 'name',
    'name of the elector': 'name',
    'relative name': 'relative_name',
    'father/husband name': 'relative_name',
    'father name': 'relative_name',
    'husband name': 'relative_name',
    'mother name': 'relative_name',
    'name of father mother husband': 'relative_name',
    'name of father/mother/ husband': 'relative_name',
    'name of father/mother/husband': 'relative_name',
    'father mother husband name': 'relative_name',
    'f/h name': 'relative_name',
    'relation name': 'relative_name',
    'relative': 'relative_name',
    "father's name": 'relative_name',
    "husband's name": 'relative_name',
    'address': 'address',
    'address place of ordinary residence': 'address',
    'place of ordinary residence': 'address',
    'residence': 'address',
    'addr': 'address',
    'qualification': 'qualification',
    'education': 'qualification',
    'educational qualification': 'qualification',
    'edu': 'qualification',
    'occupation': 'occupation',
    'occupcation': 'occupation',
    'profession': 'occupation',
    'occ': 'occupation',
    'age': 'age',
    'sex': 'sex',
    'gender': 'sex',
    'photo': 'photo_available',
    'photo of the elector': 'photo_available',
    'photo of elector': 'photo_available',
    'photo available': 'photo_available',
    'photo avail': 'photo_available',
    'part number': 'part_number',
    'part no': 'part_number',
    'part_number': 'part_number',
    'part numberpart name': 'part_number',
    'part number part name': 'part_number',
    'part name': 'polling_station_name',
    'polling station name': 'polling_station_name',
    'ps name': 'polling_station_name',
    'name of ps': 'polling_station_name',
    'area of the ps': 'polling_address',
    'area of ps': 'polling_address',
    'polling address': 'polling_address',
    'area of the ps part wise total': 'polling_address',
    'district name': 'district_name',
    'district': 'district_name',
    'taluk name': 'taluk_name',
    'taluk': 'taluk_name',
}


def map_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Map source column names to canonical schema column names.
    Supports standard voter roll schemas and polling station / address master schemas.
    """
    if df.empty:
        return df

    # Drop columns where column name is empty or starts with Unnamed and has no data
    valid_cols = []
    for i, col in enumerate(df.columns):
        col_str = str(col).strip()
        if not col_str:
            continue
        valid_cols.append(i)

    if len(valid_cols) < len(df.columns):
        df = df.iloc[:, valid_cols].copy()

    new_column_names = []
    mapped_canonicals = set()
    unmapped = []

    for col in df.columns:
        col_str = str(col).strip()
        normalized = re.sub(r'[\s_.\-\(\)\/]+', ' ', col_str.lower()).strip()
        normalized_simple = re.sub(r'[^a-z0-9]', '', col_str.lower()).strip()

        matched_canonical = None
        for source_name, canonical_name in COLUMN_MAP.items():
            source_simple = re.sub(r'[^a-z0-9]', '', source_name)
            if normalized == source_name or normalized_simple == source_simple:
                if canonical_name in mapped_canonicals:
                    logger.warning(f"  Duplicate mapping: '{col}' -> '{canonical_name}' (already mapped)")
                else:
                    matched_canonical = canonical_name
                    mapped_canonicals.add(canonical_name)
                break

        if matched_canonical:
            new_column_names.append(matched_canonical)
        else:
            if col not in ('source_file', 'source_sheet'):
                unmapped.append(col_str)
            new_column_names.append(col_str)

    if unmapped:
        logger.warning(f"  Unmapped columns: {unmapped}")

    df.columns = new_column_names

    # Deduplicate columns if any duplicates remain
    df = df.loc[:, ~df.columns.duplicated()].copy()

    # Positional fallback for polling address sheets if unmapped/col_* columns exist
    cols = list(df.columns)
    if len(cols) >= 6 and 'epic_number' not in df.columns:
        pos_map = {}
        if 'serial_number' not in df.columns and cols[0] not in ('source_file', 'source_sheet'):
            pos_map[cols[0]] = 'serial_number'
        if 'district_name' not in df.columns and cols[1] not in ('source_file', 'source_sheet'):
            pos_map[cols[1]] = 'district_name'
        if 'taluk_name' not in df.columns and cols[2] not in ('source_file', 'source_sheet'):
            pos_map[cols[2]] = 'taluk_name'
        if 'part_number' not in df.columns and cols[3] not in ('source_file', 'source_sheet'):
            pos_map[cols[3]] = 'part_number'
        if 'polling_station_name' not in df.columns and cols[4] not in ('source_file', 'source_sheet'):
            pos_map[cols[4]] = 'polling_station_name'
        if 'polling_address' not in df.columns and cols[5] not in ('source_file', 'source_sheet'):
            pos_map[cols[5]] = 'polling_address'

        if pos_map:
            logger.info(f"  Applying positional column mapping for polling data: {pos_map}")
            df = df.rename(columns=pos_map)

    # Drop columns that are entirely empty after mapping
    cols_to_drop = []
    for col in df.columns:
        if col not in ('source_file', 'source_sheet'):
            series = df[col]
            if isinstance(series, pd.Series):
                if series.astype(str).str.strip().replace('', pd.NA).dropna().empty:
                    cols_to_drop.append(col)

    if cols_to_drop:
        logger.info(f"  Dropping empty columns: {cols_to_drop}")
        df = df.drop(columns=cols_to_drop)

    return df


# ─── Field Cleaning Functions ─────────────────────────────────────────────────

def clean_epic_number(raw) -> Optional[str]:
    """
    Normalize an EPIC number: uppercase, strip non-alphanumeric,
    validate format: exactly 3 uppercase letters + 7 digits (10 chars).
    """
    if raw is None:
        return None

    raw_str = str(raw).strip()
    if raw_str.lower() in ('nan', '', 'none', 'null'):
        return None

    # Remove everything except alphanumeric
    cleaned = re.sub(r'[^A-Za-z0-9]', '', raw_str).upper()

    # Validate: exactly 3 letters + 7 digits
    if re.match(r'^[A-Z]{3}\d{7}$', cleaned):
        return cleaned
    else:
        return None


def clean_name(raw) -> Optional[str]:
    """
    Clean a name field: strip, collapse whitespace, preserve casing.
    """
    if raw is None:
        return None

    raw_str = str(raw).strip()
    if raw_str.lower() in ('nan', '', 'none', 'null', 'na', 'n/a'):
        return None

    # Remove non-printable characters but preserve Unicode (Devanagari etc.)
    cleaned = ''.join(ch for ch in raw_str if ch.isprintable())

    # Collapse multiple spaces into one
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    # Remove trailing periods and stray numbers at the end
    cleaned = re.sub(r'[\.\d]+$', '', cleaned).strip()

    if not cleaned:
        return None

    return cleaned


def clean_relative_name(raw) -> Optional[str]:
    """
    Clean relative name. Same logic as clean_name.
    Preserves "S/o", "D/o", "W/o" prefixes.
    """
    return clean_name(raw)


def clean_address(raw) -> Optional[str]:
    """
    Clean address: replace newlines with ', ', collapse commas, strip edges.
    """
    if raw is None:
        return None

    raw_str = str(raw).strip()
    if raw_str.lower() in ('nan', '', 'none', 'null', 'na', 'n/a'):
        return None

    # Replace newlines with ', '
    cleaned = raw_str.replace('\r\n', ', ').replace('\n', ', ').replace('\r', ', ')

    # Replace multiple consecutive commas (with optional spaces) with single comma + space
    cleaned = re.sub(r'[,\s]*,+[,\s]*', ', ', cleaned)

    # Collapse multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)

    # Strip leading/trailing whitespace and commas
    cleaned = cleaned.strip().strip(',').strip()

    if not cleaned:
        return None

    return cleaned


def clean_age(raw) -> Optional[int]:
    """
    Clean and validate age / integer serial: extract integer.
    """
    if raw is None:
        return None

    raw_str = str(raw).strip()
    if raw_str.lower() in ('nan', '', 'none', 'null', 'na', 'n/a'):
        return None

    # Extract the first integer found
    match = re.search(r'\d+', raw_str)
    if not match:
        return None

    age = int(match.group())

    # Validate range
    if age <= 0:
        return None
    if age > 120:
        logger.warning(f"  Age out of range (>120): {age} — setting to None")
        return None
    if age < 18:
        logger.warning(f"  Age below 18: {age} — keeping but flagged")

    return age


def clean_sex(raw) -> Optional[str]:
    """
    Normalize sex/gender to 'M' or 'F'.
    """
    if raw is None:
        return None

    raw_str = str(raw).strip().upper()
    if raw_str in ('nan', '', 'NONE', 'NULL', 'NA', 'N/A'):
        return None

    mapping = {
        'M': 'M', 'MALE': 'M',
        'F': 'F', 'FEMALE': 'F',
    }

    result = mapping.get(raw_str)
    if result is None and raw_str not in ('', 'NAN'):
        logger.warning(f"  Unrecognized sex value: '{raw}' — setting to None")

    return result


def clean_qualification(raw) -> Optional[str]:
    """
    Clean qualification: strip and collapse whitespace. Keep as free text.
    """
    if raw is None:
        return None

    raw_str = str(raw).strip()
    if raw_str.lower() in ('nan', '', 'none', 'null', 'na', 'n/a', '-'):
        return None

    cleaned = re.sub(r'\s+', ' ', raw_str).strip()
    return cleaned if cleaned else None


def clean_occupation(raw) -> Optional[str]:
    """
    Clean occupation: strip and collapse whitespace. Keep as free text.
    """
    return clean_qualification(raw)


# ─── Main Cleaning Function ──────────────────────────────────────────────────

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all cleaning functions to the DataFrame.
    Returns cleaned DataFrame ready for validation.
    """
    if df.empty:
        return df

    # Step 1: Map columns to canonical names
    df = map_columns(df)
    logger.info(f"  Columns after mapping: {list(df.columns)}")

    # Step 2: Clean each field
    if 'epic_number' in df.columns:
        df['epic_number'] = df['epic_number'].apply(clean_epic_number)
    elif 'part_number' in df.columns or 'polling_station_name' in df.columns:
        logger.info("  Processing Polling Station / Polling Address master dataset")
    else:
        logger.error("  CRITICAL: Neither 'epic_number' nor 'part_number' columns found after mapping!")
        return pd.DataFrame()

    if 'name' in df.columns:
        df['name'] = df['name'].apply(clean_name)

    if 'relative_name' in df.columns:
        df['relative_name'] = df['relative_name'].apply(clean_relative_name)

    if 'address' in df.columns:
        df['address'] = df['address'].apply(clean_address)

    if 'serial_number' in df.columns:
        df['serial_number'] = df['serial_number'].apply(clean_age)

    if 'age' in df.columns:
        df['age'] = df['age'].apply(clean_age)

    if 'sex' in df.columns:
        df['sex'] = df['sex'].apply(clean_sex)

    if 'qualification' in df.columns:
        df['qualification'] = df['qualification'].apply(clean_qualification)

    if 'occupation' in df.columns:
        df['occupation'] = df['occupation'].apply(clean_occupation)

    # Polling station / address specific cleaners
    if 'part_number' in df.columns:
        df['part_number'] = df['part_number'].apply(lambda x: clean_name(str(x)) if pd.notna(x) else None)

    if 'polling_station_name' in df.columns:
        df['polling_station_name'] = df['polling_station_name'].apply(clean_address)

    if 'polling_address' in df.columns:
        df['polling_address'] = df['polling_address'].apply(clean_address)

    if 'district_name' in df.columns:
        df['district_name'] = df['district_name'].apply(clean_name)

    if 'taluk_name' in df.columns:
        df['taluk_name'] = df['taluk_name'].apply(clean_name)

    # Step 3: Set photo_url to None for ALL records (PENDING)
    df['photo_url'] = None

    # Step 4: Drop 'photo_available' if present
    if 'photo_available' in df.columns:
        df = df.drop(columns=['photo_available'])

    logger.info(f"  Rows after cleaning: {len(df)}")
    return df
