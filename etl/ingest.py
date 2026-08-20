"""
ETL Stage 4: Ingestion into Supabase
Bulk-inserts cleaned data via psycopg2 upsert (recommended) or Supabase REST API.
"""

import os
import time
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from tqdm import tqdm
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Schema columns to insert (order matters — must match VALUES in the SQL)
SCHEMA_COLUMNS = [
    'serial_number', 'epic_number', 'name', 'relative_name',
    'address', 'qualification', 'occupation', 'age', 'sex', 'photo_url'
]

UPSERT_SQL = """
    INSERT INTO electors
        (serial_number, epic_number, name, relative_name, address,
         qualification, occupation, age, sex, photo_url)
    VALUES %s
    ON CONFLICT (epic_number) DO UPDATE SET
        serial_number = EXCLUDED.serial_number,
        name = EXCLUDED.name,
        relative_name = EXCLUDED.relative_name,
        address = EXCLUDED.address,
        qualification = EXCLUDED.qualification,
        occupation = EXCLUDED.occupation,
        age = EXCLUDED.age,
        sex = EXCLUDED.sex,
        photo_url = EXCLUDED.photo_url,
        updated_at = NOW()
"""


def ingest_to_supabase(df: pd.DataFrame, method: str = 'copy') -> dict:
    """
    Bulk-insert the cleaned DataFrame into the Supabase `electors` table.

    Args:
        df: Cleaned DataFrame ready for ingestion.
        method: 'copy' (psycopg2 upsert — fast) or 'rest' (Supabase API — slower).

    Returns:
        dict with rows_inserted, errors, duration_seconds.
    """
    if df.empty:
        return {'rows_inserted': 0, 'errors': ['DataFrame is empty'], 'duration_seconds': 0}

    if method == 'copy':
        res = _upsert_via_psycopg2(df)
        if res.get('errors') and res.get('rows_inserted', 0) == 0:
            logger.warning("  Direct PostgreSQL connection failed. Falling back to Supabase REST API...")
            return _upsert_via_rest(df)
        return res
    elif method == 'rest':
        return _upsert_via_rest(df)
    else:
        return {'rows_inserted': 0, 'errors': [f"Unknown method: {method}"], 'duration_seconds': 0}


def _prepare_records(df: pd.DataFrame) -> list:
    """
    Convert DataFrame rows to a list of tuples ready for SQL insertion.
    Ensures columns are in the correct order and handles type conversion.
    """
    records = []

    for _, row in df.iterrows():
        record = []
        for col in SCHEMA_COLUMNS:
            val = row.get(col)

            # Convert pandas NA / NaN / 'nan' to None
            if pd.isna(val) or str(val).lower() in ('nan', 'none', ''):
                val = None
            elif col == 'age' and val is not None:
                try:
                    val = int(float(val))
                except (ValueError, TypeError):
                    val = None
            elif col == 'serial_number' and val is not None:
                try:
                    val = int(float(val))
                except (ValueError, TypeError):
                    val = None
            elif isinstance(val, str):
                val = val.strip() if val.strip() else None

            record.append(val)

        records.append(tuple(record))

    return records


def _upsert_via_psycopg2(df: pd.DataFrame) -> dict:
    """
    Upsert using psycopg2's execute_values for maximum speed.
    Uses INSERT ... ON CONFLICT DO UPDATE (idempotent).
    """
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        return {
            'rows_inserted': 0,
            'errors': ['DATABASE_URL not set in environment'],
            'duration_seconds': 0
        }

    result = {
        'rows_inserted': 0,
        'errors': [],
        'duration_seconds': 0,
    }

    start_time = time.time()

    try:
        logger.info(f"  Connecting to database...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # Prepare records
        records = _prepare_records(df)
        total = len(records)
        logger.info(f"  Prepared {total} records for upsert")

        # Batch upsert with execute_values (much faster than individual INSERTs)
        batch_size = 1000
        inserted = 0

        for i in tqdm(range(0, total, batch_size), desc="  Ingesting", unit="batch"):
            batch = records[i:i + batch_size]
            try:
                execute_values(cur, UPSERT_SQL, batch, page_size=batch_size)
                inserted += len(batch)
            except Exception as e:
                logger.error(f"  Error in batch {i // batch_size}: {e}")
                result['errors'].append(f"Batch {i // batch_size}: {str(e)}")
                conn.rollback()
                # Try to continue with next batch
                continue

        conn.commit()
        result['rows_inserted'] = inserted

        # Verify row count in database
        cur.execute("SELECT count(*) FROM electors")
        db_count = cur.fetchone()[0]
        logger.info(f"  Database row count after ingestion: {db_count}")

        cur.close()
        conn.close()

    except Exception as e:
        logger.error(f"  Database connection error: {e}")
        result['errors'].append(str(e))

    result['duration_seconds'] = round(time.time() - start_time, 2)
    logger.info(f"  Ingestion complete: {result['rows_inserted']} rows in {result['duration_seconds']}s")

    return result


def _upsert_via_rest(df: pd.DataFrame) -> dict:
    """
    Upsert using the Supabase REST API via supabase-py.
    Slower but simpler. Uses service role key to bypass RLS.
    """
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        return {
            'rows_inserted': 0,
            'errors': ['SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set'],
            'duration_seconds': 0
        }

    result = {
        'rows_inserted': 0,
        'errors': [],
        'duration_seconds': 0,
    }

    start_time = time.time()

    try:
        from supabase import create_client
        supabase = create_client(url, key)

        records = _prepare_records(df)
        total = len(records)
        batch_size = 500

        for i in tqdm(range(0, total, batch_size), desc="  Ingesting (REST)", unit="batch"):
            batch = records[i:i + batch_size]

            # Convert tuples to dicts for the REST API
            batch_dicts = []
            for record in batch:
                row_dict = {}
                for idx, col in enumerate(SCHEMA_COLUMNS):
                    row_dict[col] = record[idx]
                batch_dicts.append(row_dict)

            try:
                supabase.table('electors').upsert(
                    batch_dicts,
                    on_conflict='epic_number'
                ).execute()
                result['rows_inserted'] += len(batch)
            except Exception as e:
                logger.error(f"  REST API error in batch {i // batch_size}: {e}")
                result['errors'].append(f"Batch {i // batch_size}: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"  Supabase client error: {e}")
        result['errors'].append(str(e))

    result['duration_seconds'] = round(time.time() - start_time, 2)
    logger.info(f"  REST ingestion complete: {result['rows_inserted']} rows in {result['duration_seconds']}s")

    return result


def verify_ingestion(expected_count: int) -> dict:
    """
    Verify that the database row count matches the expected count.
    """
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        return {'match': False, 'db_count': 0, 'expected': expected_count, 'error': 'DATABASE_URL not set'}

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM electors")
        db_count = cur.fetchone()[0]
        cur.close()
        conn.close()

        match = db_count >= expected_count  # >= because previous runs may have added records
        return {
            'match': match,
            'db_count': db_count,
            'expected': expected_count,
            'error': None
        }
    except Exception as e:
        return {'match': False, 'db_count': 0, 'expected': expected_count, 'error': str(e)}
