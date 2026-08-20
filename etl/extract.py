"""
ETL Stage 1: Extraction
Reads raw data from Excel (.xlsx) and PDF (.pdf) files.
"""

import re
import pandas as pd
import pdfplumber
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def _deduplicate_columns(cols: list) -> list:
    """Ensure all column names are unique strings."""
    seen = {}
    deduped = []
    for idx, c in enumerate(cols):
        name = str(c).strip()
        if not name:
            name = f"col_{idx}"
        if name in seen:
            seen[name] += 1
            deduped.append(f"{name}_{seen[name]}")
        else:
            seen[name] = 0
            deduped.append(name)
    return deduped


def extract_from_excel(file_path: str) -> pd.DataFrame:
    """
    Read an Excel file and return a raw DataFrame.
    Handles multiple sheets and automatically detects header row if metadata/title
    rows precede the actual column headers. Supports inheriting headers across sheets
    when subsequent sheets omit header rows.
    """
    path = Path(file_path)
    if not path.exists():
        logger.error(f"File not found: {file_path}")
        return pd.DataFrame()

    try:
        xl = pd.ExcelFile(path, engine='openpyxl')
        all_dfs = []
        last_known_headers = None

        header_keywords = [
            'epic', 'voter', 'elector', 'name', 'sno', 'sino', 'slno', 'sl no', 'serial',
            'address', 'qualification', 'age', 'sex', 'district', 'part', 'taluk',
            'ps name', 'area of'
        ]
        keyword_patterns = [re.compile(r'\b' + re.escape(kw) + r'\b', re.IGNORECASE) for kw in header_keywords]

        for sheet_name in xl.sheet_names:
            logger.info(f"  Reading sheet: '{sheet_name}' from {path.name}")
            try:
                # Read raw without header first to detect header row location
                df_raw = pd.read_excel(
                    xl,
                    sheet_name=sheet_name,
                    header=None,
                    dtype=str,
                    keep_default_na=False,
                )

                if df_raw.empty:
                    logger.warning(f"  Sheet '{sheet_name}' is empty, skipping.")
                    continue

                # Remove completely blank rows first
                df_raw_clean = df_raw[~df_raw.apply(lambda r: all(str(v).strip() == '' for v in r), axis=1)].copy()
                if df_raw_clean.empty:
                    logger.warning(f"  Sheet '{sheet_name}' has no non-empty rows, skipping.")
                    continue

                # Find the header row by searching top 25 non-empty rows using word boundaries
                header_idx = -1
                max_matches = 0
                search_limit = min(25, len(df_raw_clean))
                for idx in range(search_limit):
                    row_vals = [str(v).strip() for v in df_raw_clean.iloc[idx].values if str(v).strip()]
                    matches = 0
                    for val in row_vals:
                        if any(pat.search(val) for pat in keyword_patterns):
                            matches += 1
                    if matches > max_matches:
                        max_matches = matches
                        header_idx = idx

                # Threshold: 2+ matches for first sheet/no existing header, 3+ matches if replacing existing header
                min_threshold = 2 if last_known_headers is None else 3

                if max_matches >= min_threshold and header_idx >= 0:
                    logger.info(f"  Detected header row at index {header_idx} ({max_matches} keyword matches)")
                    raw_cols = [str(c).strip() for c in df_raw_clean.iloc[header_idx].values]
                    columns = _deduplicate_columns(raw_cols)
                    last_known_headers = columns
                    df = df_raw_clean.iloc[header_idx + 1:].copy()
                    df.columns = columns
                elif last_known_headers is not None:
                    # Inherit last_known_headers, adjusting length if sheet column count differs
                    logger.info(f"  Inheriting header from previous sheet ({len(last_known_headers)} columns)")
                    df = df_raw_clean.copy()
                    n_cols = len(df.columns)
                    if n_cols == len(last_known_headers):
                        inherited_cols = list(last_known_headers)
                    elif n_cols < len(last_known_headers):
                        inherited_cols = last_known_headers[:n_cols]
                    else:
                        extra = [f"col_{i}" for i in range(len(last_known_headers), n_cols)]
                        inherited_cols = last_known_headers + extra
                    df.columns = _deduplicate_columns(inherited_cols)
                else:
                    logger.info(f"  Using default first non-empty row as header")
                    raw_cols = [str(c).strip() for c in df_raw_clean.iloc[0].values]
                    columns = _deduplicate_columns(raw_cols)
                    last_known_headers = columns
                    df = df_raw_clean.iloc[1:].copy()
                    df.columns = columns

                # Ensure df columns are unique
                df.columns = _deduplicate_columns(df.columns)

                # Drop rows where ALL cells are empty
                df = df.dropna(how='all')
                df = df[~df.apply(lambda row: all(str(v).strip() == '' for v in row), axis=1)]

                if df.empty:
                    logger.warning(f"  Sheet '{sheet_name}' has no data rows after cleanup, skipping.")
                    continue

                df['source_sheet'] = sheet_name
                df['source_file'] = path.name
                all_dfs.append(df)
                logger.info(f"  -> {len(df)} rows extracted from sheet '{sheet_name}'")

            except Exception as e:
                logger.error(f"  Error reading sheet '{sheet_name}': {e}")
                continue

        if not all_dfs:
            logger.warning(f"No data extracted from {path.name}")
            return pd.DataFrame()

        combined = pd.concat(all_dfs, ignore_index=True, sort=False)
        logger.info(f"  Total rows from {path.name}: {len(combined)}")
        return combined

    except Exception as e:
        logger.error(f"Failed to read Excel file {file_path}: {e}")
        return pd.DataFrame()



def extract_from_pdf(file_path: str) -> pd.DataFrame:
    """
    Use pdfplumber to extract tables from each page of a PDF.
    Handles repeated headers, multi-line addresses, and merged cells.
    """
    path = Path(file_path)
    if not path.exists():
        logger.error(f"File not found: {file_path}")
        return pd.DataFrame()

    try:
        all_rows = []
        header_row = None
        header_keywords = {'sno', 's.no', 'serial', 'epic', 'name', 'voter'}

        with pdfplumber.open(path) as pdf:
            logger.info(f"  PDF has {len(pdf.pages)} pages")

            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    tables = page.extract_tables()
                    if not tables:
                        continue

                    for table in tables:
                        if not table:
                            continue

                        for row_idx, row in enumerate(table):
                            if row is None:
                                continue

                            # Clean None values to empty strings
                            cleaned_row = [
                                cell.strip() if cell and isinstance(cell, str) else ''
                                for cell in row
                            ]

                            # Detect header rows (contains header keywords)
                            row_lower = ' '.join(cleaned_row).lower()
                            is_header = any(kw in row_lower for kw in header_keywords)

                            if is_header:
                                if header_row is None:
                                    # First header found — use it as column names
                                    header_row = cleaned_row
                                    logger.info(f"  Header detected on page {page_num}: {header_row}")
                                # Skip all header rows (including repeats)
                                continue

                            # Skip completely empty rows
                            if all(cell == '' for cell in cleaned_row):
                                continue

                            all_rows.append(cleaned_row)

                except Exception as e:
                    logger.warning(f"  Error on page {page_num}: {e}")
                    continue

        if not all_rows:
            logger.warning(f"No data rows extracted from {path.name}")
            return pd.DataFrame()

        if header_row is None:
            logger.warning(f"No header row detected in {path.name}. Using generic column names.")
            max_cols = max(len(r) for r in all_rows)
            header_row = [f'col_{i}' for i in range(max_cols)]

        # Ensure all rows have the same number of columns as the header
        normalized_rows = []
        for row in all_rows:
            if len(row) < len(header_row):
                row = row + [''] * (len(header_row) - len(row))
            elif len(row) > len(header_row):
                row = row[:len(header_row)]
            normalized_rows.append(row)

        df = pd.DataFrame(normalized_rows, columns=header_row)

        # Handle multi-line addresses:
        # If a row has no serial number but the previous row does,
        # the current row is a continuation of the previous row's address.
        df = _merge_continuation_rows(df)

        df['source_file'] = path.name
        df['source_sheet'] = 'pdf'

        logger.info(f"  Total rows from {path.name}: {len(df)}")
        return df

    except Exception as e:
        logger.error(f"Failed to read PDF file {file_path}: {e}")
        return pd.DataFrame()


def _merge_continuation_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge continuation rows (rows without a serial number) into the previous
    row's address field. In PDF electoral rolls, multi-line addresses often
    span multiple table rows where only the first row has the SNo.
    """
    if df.empty:
        return df

    # Find the serial number column
    sno_col = None
    for col in df.columns:
        if col.lower().strip() in ('sno', 's.no', 's.no.', 'serial', 'serial no', 'serial number'):
            sno_col = col
            break

    if sno_col is None:
        # Can't determine continuation rows without a serial number column
        return df

    # Find the address column
    addr_col = None
    for col in df.columns:
        col_lower = col.lower().strip()
        if col_lower in ('address', 'residence', 'place of ordinary residence'):
            addr_col = col
            break

    merged_rows = []
    current_row = None

    for _, row in df.iterrows():
        sno_val = str(row.get(sno_col, '')).strip()

        if sno_val and sno_val != '' and sno_val != 'nan':
            # This is a new record
            if current_row is not None:
                merged_rows.append(current_row)
            current_row = row.to_dict()
        else:
            # This is a continuation row — append text to the current row's address
            if current_row is not None and addr_col is not None:
                continuation_text = ' '.join(
                    str(v).strip() for v in row.values
                    if str(v).strip() and str(v).strip() != 'nan'
                )
                if continuation_text:
                    existing = str(current_row.get(addr_col, '')).strip()
                    if existing and existing != 'nan':
                        current_row[addr_col] = existing + ', ' + continuation_text
                    else:
                        current_row[addr_col] = continuation_text

    # Don't forget the last row
    if current_row is not None:
        merged_rows.append(current_row)

    if not merged_rows:
        return df

    return pd.DataFrame(merged_rows)


def extract_all(source_dir: str) -> pd.DataFrame:
    """
    Discover all .xlsx and .pdf files in source_dir, extract each,
    and concatenate into a single raw DataFrame.
    """
    source_path = Path(source_dir)
    if not source_path.exists():
        logger.error(f"Source directory not found: {source_dir}")
        return pd.DataFrame()

    # Discover files recursively
    excel_files = sorted(source_path.rglob('*.xlsx'))
    pdf_files = sorted(source_path.rglob('*.pdf'))

    # Filter out temp files (Excel creates ~$filename.xlsx)
    excel_files = [f for f in excel_files if not f.name.startswith('~$')]

    total_files = len(excel_files) + len(pdf_files)
    if total_files == 0:
        logger.warning(f"No .xlsx or .pdf files found in {source_dir}")
        return pd.DataFrame()

    logger.info(f"Found {len(excel_files)} Excel files and {len(pdf_files)} PDF files")

    all_dfs = []

    # Process Excel files
    for file_path in excel_files:
        logger.info(f"Processing Excel: {file_path.name}")
        try:
            df = extract_from_excel(str(file_path))
            if not df.empty:
                all_dfs.append(df)
        except Exception as e:
            logger.error(f"Failed to process {file_path.name}: {e}")
            continue

    # Process PDF files
    for file_path in pdf_files:
        logger.info(f"Processing PDF: {file_path.name}")
        try:
            df = extract_from_pdf(str(file_path))
            if not df.empty:
                all_dfs.append(df)
        except Exception as e:
            logger.error(f"Failed to process {file_path.name}: {e}")
            continue

    if not all_dfs:
        logger.warning("No data extracted from any files")
        return pd.DataFrame()

    # Concatenate all DataFrames
    # Use outer join to keep all columns even if they differ across files
    combined = pd.concat(all_dfs, ignore_index=True, sort=False)
    logger.info(f"Total raw rows extracted: {len(combined)}")

    return combined
