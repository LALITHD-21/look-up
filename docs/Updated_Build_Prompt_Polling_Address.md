# ADDENDUM: Part Number & Polling Address in Elector Details

**Applies to:** Build Prompt v3.0 — Internal Elector Lookup Portal (FINAL SPECIFICATION)
**Status:** MANDATORY — integrate into every affected section below
**Design decision:** Part number + polling station name + polling address are added as columns directly on the `electors` table (flat single-table design, as chosen by the project owner). The polling address is repeated per elector within a part; this is acceptable for v1.

---

## What is being added

Each elector record now also carries:

| Field | Type | Nullable | Description |
|---|---|---|---|
| `part_number` | VARCHAR(20) | YES | The electoral roll Part number the elector belongs to. Free text (may contain digits, letters, slashes, e.g. `12`, `45A`, `120/2`). Stored as-is after light cleaning (strip, collapse whitespace). |
| `polling_station_name` | TEXT | YES | Name of the polling station for that Part (e.g., "Govt Primary School, Ward 5"). |
| `polling_address` | TEXT | YES | Full address of the polling station (building, area, post, taluka, district, state). Single text field, NOT parsed. |

These three fields form a logical "Polling Station" group. They are displayed together in the details view but stored as separate columns for queryability.

---

## 1. Database Schema changes (Section 2 of the main spec)

### 1.1 Updated `electors` table DDL

Replace the CREATE TABLE in Section 2.1 / 2.6 with:

```sql
CREATE TABLE IF NOT EXISTS electors (
    id                    BIGSERIAL PRIMARY KEY,
    serial_number         INTEGER,
    epic_number           VARCHAR(11) NOT NULL UNIQUE,
    name                  TEXT NOT NULL,
    relative_name         TEXT,
    address               TEXT,
    qualification         VARCHAR(100),
    occupation            VARCHAR(100),
    age                   INTEGER,
    sex                   CHAR(1) CHECK (sex IN ('M', 'F')),
    part_number           VARCHAR(20),
    polling_station_name   TEXT,
    polling_address       TEXT,
    photo_url             TEXT,          -- ⚠️ PENDING: leave NULL
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Column specification (add to Section 2.2)

| Column | Type | Nullable | Description & Rules |
|---|---|---|---|
| `part_number` | VARCHAR(20) | YES | Electoral roll Part number. Not unique (many electors share a Part). Not searchable in v1. Cleaned: strip, collapse whitespace, uppercase only if the source is purely alphabetic. VARCHAR(20) is generous; most values are <6 chars. |
| `polling_station_name` | TEXT | YES | Name of the polling station assigned to this Part. Preserved in original casing. |
| `polling_address` | TEXT | YES | Full address of the polling station as a single string. May include building name, area, post, taluka, district, state. Stored as text, NOT parsed into separate columns. Newlines in source replaced with ", ". |

### 1.3 Indexes (Section 2.3)

No index required on these columns for v1 (no search on part_number). If Part-based browsing is added later:

```sql
-- FUTURE (do NOT create now):
-- CREATE INDEX idx_electors_part_number ON electors (part_number);
```

### 1.4 RLS (Section 2.4)

No change — the existing SELECT policy for `authenticated` automatically covers the new columns. RLS is row-level, not column-level, so no additional policy is needed.

### 1.5 Full updated SQL setup script

```sql
-- ============================================
-- Elector Lookup Portal — Database Setup Script (with Polling fields)
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS electors (
    id                    BIGSERIAL PRIMARY KEY,
    serial_number         INTEGER,
    epic_number           VARCHAR(11) NOT NULL UNIQUE,
    name                  TEXT NOT NULL,
    relative_name         TEXT,
    address               TEXT,
    qualification         VARCHAR(100),
    occupation            VARCHAR(100),
    age                   INTEGER,
    sex                   CHAR(1) CHECK (sex IN ('M', 'F')),
    part_number           VARCHAR(20),
    polling_station_name   TEXT,
    polling_address       TEXT,
    photo_url             TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Unique index on epic_number (the only search key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_electors_epic_number
    ON electors (epic_number);

-- 3. Enable Row Level Security
ALTER TABLE electors ENABLE ROW LEVEL SECURITY;

-- 4. Policy: authenticated users can SELECT
CREATE POLICY "Authenticated users can read electors"
    ON electors FOR SELECT
    TO authenticated
    USING (true);

-- 5. Policy: anonymous users CANNOT SELECT
CREATE POLICY "Anonymous users cannot read electors"
    ON electors FOR SELECT
    TO anon
    USING (false);

-- 6. Verify
-- SELECT count(*) FROM electors;  -- should be 0
-- SELECT * FROM pg_policies WHERE tablename = 'electors';
```

---

## 2. ETL Pipeline changes (Section 3 of the main spec)

### 2.1 Source data

The polling address comes from a **separate Excel/CSV mapping file** (not from the PDF electoral roll). This file maps each Part number to its polling station name and full polling address. Expected columns:

| Source column (possible names) | Canonical column |
|---|---|
| Part No, Part Number, Part, part_no | `part_number` |
| Polling Station, Polling Station Name, Station Name, PS Name | `polling_station_name` |
| Polling Address, PS Address, Station Address, Address | `polling_address` |

Example file: `data/polling/parts_mapping.xlsx` (or `.csv`).

The main elector source data (Excel/PDF) may also contain a `Part No` column per row. If so, it is used to JOIN against the mapping file. If the elector source does NOT contain a Part number, the ETL cannot attach a polling address and must log a warning.

### 2.2 New cleaning functions (add to Stage 2 / clean.py)

```python
def clean_part_number(raw) -> str:
    """
    Normalize a Part number.

    Steps:
    1. Convert to string, handle None/NaN.
    2. Strip leading/trailing whitespace.
    3. Collapse multiple internal spaces into one.
    4. Do NOT uppercase unless purely alphabetic (Part numbers like
       '45A' should stay '45A'; '120/2' stays '120/2').
    5. Return None for empty / 'NA' / 'N/A'.

    Examples:
        ' 12 '        -> '12'
        '45A'         -> '45A'
        '120 / 2'     -> '120/2'   (spaces around slash removed)
        None          -> None
        'NA'          -> None
    """
    if raw is None:
        return None
    raw_str = str(raw).strip()
    if raw_str == '' or raw_str.upper() in ('NA', 'N/A'):
        return None
    # collapse internal whitespace
    raw_str = ' '.join(raw_str.split())
    # remove spaces around slashes
    raw_str = raw_str.replace(' / ', '/').replace('/ ', '/').replace(' /', '/')
    return raw_str


def clean_polling_station_name(raw) -> str:
    """
    Clean the polling station name. Same logic as clean_name:
    strip, collapse whitespace, preserve casing.
    Return None for empty / 'NA' / 'N/A'.
    """
    if raw is None:
        return None
    raw_str = str(raw).strip()
    if raw_str == '' or raw_str.upper() in ('NA', 'N/A'):
        return None
    return ' '.join(raw_str.split())


def clean_polling_address(raw) -> str:
    """
    Clean the polling station address. Same logic as clean_address:
    - Replace newlines with ', '.
    - Collapse multiple commas.
    - Collapse multiple spaces (preserve comma-space).
    - Strip leading/trailing whitespace and commas.
    Return None for empty / 'NA' / 'N/A'.
    """
    if raw is None:
        return None
    raw_str = str(raw).strip()
    if raw_str == '' or raw_str.upper() in ('NA', 'N/A'):
        return None
    # replace newlines with comma-space
    raw_str = raw_str.replace('\r\n', ', ').replace('\n', ', ').replace('\r', ', ')
    # collapse multiple commas
    import re
    raw_str = re.sub(r',\s*,', ', ', raw_str)
    # collapse multiple spaces
    raw_str = re.sub(r' {2,}', ' ', raw_str)
    return raw_str.strip(' ,')
```

### 2.3 Column mapping additions (add to COLUMN_MAP in clean.py)

```python
COLUMN_MAP = {
    # ... existing entries ...

    # --- NEW: Polling fields ---
    'part no': 'part_number',
    'part number': 'part_number',
    'part': 'part_number',
    'part_no': 'part_number',
    'partno': 'part_number',

    'polling station': 'polling_station_name',
    'polling station name': 'polling_station_name',
    'station name': 'polling_station_name',
    'ps name': 'polling_station_name',
    'polling station': 'polling_station_name',

    'polling address': 'polling_address',
    'ps address': 'polling_address',
    'station address': 'polling_address',
}
```

### 2.4 NEW Stage 1b: Load polling parts mapping

Add a new loader that reads the separate mapping file and returns a DataFrame of `{part_number, polling_station_name, polling_address}`. This is joined onto the elector DataFrame by `part_number` during cleaning.

```python
def load_polling_parts_mapping(mapping_path: str) -> pd.DataFrame:
    """
    Read the separate Excel/CSV file that maps Part number ->
    polling station name + polling address.

    - Supports .xlsx (openpyxl) and .csv.
    - Maps source column names via COLUMN_MAP.
    - Cleans part_number, polling_station_name, polling_address.
    - Deduplicates by part_number (keep first).
    - Returns DataFrame with exactly:
        part_number (str), polling_station_name (str), polling_address (str)
    - Logs a warning for any Part numbers that appear in the elector data
      but are missing from this mapping.
    """
    pass
```

### 2.5 Updated `clean_dataframe` (Stage 2)

Add steps after the existing cleaning:

```python
def clean_dataframe(df: pd.DataFrame, parts_map: pd.DataFrame = None) -> pd.DataFrame:
    """
    ... existing steps 1-9 ...

    10. If df has a 'part_number' column, clean it with clean_part_number.
        If not, create it as None.
    11. If parts_map is provided, LEFT JOIN df onto parts_map by part_number
        to attach polling_station_name and polling_address.
        - If the elector already has polling_station_name/address from its
          own source row, prefer the non-null value (coalesce: elector source
          wins, mapping fills the gap).
        - If join produces no match, polling fields stay None; log unmatched
          part numbers.
    12. Clean polling_station_name and polling_address with their clean_* fns.
    13. Set photo_url to None for ALL records (⚠️ PENDING).
    """
    pass
```

### 2.6 Updated ingestion SQL (Stage 5)

The INSERT and ON CONFLICT UPDATE must now include the three new columns:

```python
def upsert_via_copy(df: pd.DataFrame, db_url: str):
    """
    SQL:
        INSERT INTO electors
            (serial_number, epic_number, name, relative_name, address,
             qualification, occupation, age, sex,
             part_number, polling_station_name, polling_address,
             photo_url)
        VALUES %s
        ON CONFLICT (epic_number) DO UPDATE SET
            serial_number           = EXCLUDED.serial_number,
            name                    = EXCLUDED.name,
            relative_name           = EXCLUDED.relative_name,
            address                 = EXCLUDED.address,
            qualification           = EXCLUDED.qualification,
            occupation              = EXCLUDED.occupation,
            age                     = EXCLUDED.age,
            sex                     = EXCLUDED.sex,
            part_number             = EXCLUDED.part_number,
            polling_station_name    = EXCLUDED.polling_station_name,
            polling_address         = EXCLUDED.polling_address,
            photo_url               = EXCLUDED.photo_url,
            updated_at              = NOW();
    """
    pass
```

### 2.7 Updated ETL run report (Section 3.5)

Add a new section to the report:

```
--- Polling Parts Mapping ---
Mapping file:             data/polling/parts_mapping.xlsx
Parts in mapping:          1,240
Electors with a Part No:   76,490 of 76,512 (99.97%)
Electors missing Part No:  22 (warning)
Part numbers unmatched:    3 (in elector data but not in mapping file)
Polling address attached:  76,487
Polling address NULL:      25
```

### 2.8 Updated CLI (Section 3.7)

Add an optional `--polling-map` flag:

```
# Full run with a separate polling parts mapping file
python main.py --source ./data --polling-map ./data/polling/parts_mapping.xlsx --ingest

# Dry run with mapping
python main.py --source ./data --polling-map ./data/polling/parts_mapping.xlsx --dry-run
```

If `--polling-map` is omitted, the ETL still runs but `part_number`, `polling_station_name`, and `polling_address` are set to whatever is present in the elector source (or None). A warning is logged that polling addresses may be incomplete.

---

## 3. Frontend changes (Section 6 of the main spec)

### 3.1 TypeScript types (Section 6.2)

Update `lib/types.ts`:

```typescript
export interface Elector {
    id: number;
    serial_number: number | null;
    epic_number: string;
    name: string;
    relative_name: string | null;
    address: string | null;
    qualification: string | null;
    occupation: string | null;
    age: number | null;
    sex: 'M' | 'F' | null;
    part_number: string | null;
    polling_station_name: string | null;
    polling_address: string | null;
    photo_url: string | null;  // ⚠️ Always null until photo feature confirmed
    created_at: string;
    updated_at: string;
}

export interface ElectorDisplayData {
    epic_number: string;
    name: string;
    relative_name: string | null;
    address: string | null;
    qualification: string | null;
    occupation: string | null;
    age: number | null;
    sex: 'M' | 'F' | null;
    part_number: string | null;
    polling_station_name: string | null;
    polling_address: string | null;
    photo_url: string | null;
}

export const FIELD_LABELS: Record<keyof ElectorDisplayData, string> = {
    epic_number: 'EPIC Number',
    name: 'Name',
    relative_name: 'Relative Name',
    address: 'Address',
    qualification: 'Qualification',
    occupation: 'Occupation',
    age: 'Age',
    sex: 'Sex',
    part_number: 'Part Number',
    polling_station_name: 'Polling Station',
    polling_address: 'Polling Address',
    photo_url: 'Photo',
};
```

### 3.2 Card View (ProfileCard, Section 6.6)

Add a dedicated **Polling Station** section to the card, visually separated by a divider. It shows all three fields together as a group:

```
Desktop (>= 768px):
┌───────────────────────────────────────────┐
│  ┌─────┐  Name (large, bold)               │
│  │     │  EPIC: TYA 0633792 (monospace)     │
│  │ PHO │  Age: 45  |  Sex: M                │
│  │ TO  │                                    │
│  │ PLH │  ─────────────────────────────      │
│  │     │  Relative: S/o RAMESH              │
│  └─────┘  Address: H No 123, Main Road,     │
│            Village XYZ, Tq: ABC, Dist: PQR  │
│            Qualification: BSc               │
│            Occupation: Engineer              │
│                                             │
│            ─────────────────────────────      │  ← divider
│            POLLING STATION                   │  ← group label (uppercase, gray-400, tracking-wide)
│            Part Number: 45A                  │
│            Station: Govt Primary School,     │
│                     Ward 5                   │
│            Polling Address: Near Bus Stop,  │
│                     Main Road, Village XYZ, │
│                     Tq: ABC, Dist: PQR       │
└───────────────────────────────────────────┘
```

Rules for the polling section:
- Render only if at least one of `part_number`, `polling_station_name`, `polling_address` is non-null.
- The group label "POLLING STATION" is small, uppercase, `text-gray-400`, `tracking-wide`, above the three rows.
- Each row uses the same label/value styling as the rest of the card.
- If `part_number` is null, show "—" for that row. Same for the other two fields. Do NOT hide the entire section if only some fields are missing.
- On mobile, the section stacks with the rest of the details.

### 3.3 Table View (ProfileTable, Section 6.6)

Add three rows to the Field | Value table, grouped under a visual separator row:

```
┌───────────────────────┬───────────────────────────────────┐
│ Field                 │ Value                             │
├───────────────────────┼───────────────────────────────────┤
│ EPIC Number           │ TYA0633792                        │
│ Name                  │ RAVI KUMAR                        │
│ Relative Name         │ S/o RAMESH                        │
│ Address               │ H No 123, Main Road, Village XYZ │
│ Qualification         │ BSc                               │
│ Occupation            │ Engineer                          │
│ Age                   │ 45                                │
│ Sex                   │ M                                 │
├───────────────────────┼───────────────────────────────────┤   ← separator row (full-width, gray-100 bg, bold "Polling Station" label)
│ POLLING STATION                                                            │
├───────────────────────┼───────────────────────────────────┤
│ Part Number           │ 45A                               │
│ Polling Station       │ Govt Primary School, Ward 5       │
│ Polling Address       │ Near Bus Stop, Main Road, ...    │
└───────────────────────┴───────────────────────────────────┘
```

Implementation:
- Insert a full-width separator `<tr>` with `colspan=2`, `bg-gray-100`, containing the text "Polling Station" in bold.
- Follow with the three Field | Value rows, using the same row styling as the rest of the table.
- The separator + the three rows must carry the `printable-table` class so they appear in print output (Ctrl+P).
- If all three polling fields are null, still render the separator and rows with "—" values, so the printed output is consistent. (Alternative: hide the group entirely when all three are null — implementer's choice, but be consistent with the card view.)

### 3.4 Print stylesheet (Section 6.10)

No change needed to the `@media print` rules themselves — the new rows are inside `.printable-table` and inherit the print visibility. Just ensure the separator row and the three polling rows are inside the element with class `printable-table`.

---

## 4. Build Order updates (Section 12 of the main spec)

### Phase 1 additions (Data Foundation)

After the existing Phase 1 steps, add:

- Inspect the separate polling parts mapping file (`data/polling/parts_mapping.xlsx` or `.csv`). Document its columns and data quality.
- Write `load_polling_parts_mapping()` in `etl/extract.py` (or a new `etl/polling.py`).
- Write `clean_part_number()`, `clean_polling_station_name()`, `clean_polling_address()` in `etl/clean.py`.
- Update `clean_dataframe()` to accept `parts_map` and perform the LEFT JOIN.
- Update `ingest_to_supabase()` / `upsert_via_copy()` SQL to include the three new columns.
- Update the ETL CLI to accept `--polling-map`.
- Update `schema.sql` with the three new columns.
- Test: run the ETL on a sample, verify the polling fields are attached and the report shows match/miss counts.

### Phase 3 additions (Core Application)

- Update `lib/types.ts` with the three new fields and their labels in `FIELD_LABELS`.
- Update `ProfileCard.tsx` to render the "Polling Station" section below the other details.
- Update `ProfileTable.tsx` to render the separator row + three polling rows.
- Test: search for an EPIC whose Part has a polling address → verify all three fields appear in card and table views.
- Test: search for an EPIC with no Part number → verify the polling section shows "—" or is gracefully absent.
- Test: Ctrl+P on the table view → verify the polling rows appear in the print output.

---

## 5. Testing additions (Section 10 of the main spec)

### ETL tests (add to Section 10.1)

| Test | Description | Pass criteria |
|---|---|---|
| Part mapping load | Feed a known parts_mapping.xlsx | All parts loaded, columns mapped, deduplicated |
| Part join | Elector data with Part numbers, join against mapping | Polling fields attached for matching Parts |
| Unmatched Part | Elector has a Part number not in mapping | Polling fields None, warning logged |
| Missing Part in elector | Elector has no Part number | Polling fields None, no error |
| Part cleaning | `clean_part_number(' 120 / 2 ')` | Returns `'120/2'` |
| Polling address cleaning | Multi-line address | Newlines → ", ", no trailing commas |

### Frontend tests (add to Section 10.2)

| Test | Description | Pass criteria |
|---|---|---|
| Polling in card view | Open a profile with polling data | "Polling Station" section visible with all 3 fields |
| Polling in table view | Switch to table view | Separator row + 3 polling rows visible |
| Polling in print | Ctrl+P on table view | Polling rows appear in print preview |
| Missing polling data | Profile with no Part number | Polling section shows "—" or is gracefully absent |

---

## 6. Decisions Log entry (Section 13)

| # | Question | Status | Decision / Recommendation | When to Resolve |
|---|---|---|---|---|
| 9 | How to store polling address? | DECIDED | Add `part_number`, `polling_station_name`, `polling_address` columns directly on the `electors` table (flat design). Address is repeated per elector within a Part — acceptable for v1. | Done. |
| 10 | Where does polling address come from? | DECIDED | A separate Excel/CSV mapping file (Part number → polling station + address). Loaded via `--polling-map` flag. | Done. |
| 11 | What does the details view show? | DECIDED | Part number + polling station name + full polling address, grouped under a "Polling Station" section in both card and table views. | Done. |

---

## 7. File & Directory Structure additions (Section 16)

```
project-root/
├── data/
│   ├── excel/
│   ├── pdf/
│   └── polling/                          # NEW
│       └── parts_mapping.xlsx            # Part number -> polling station + address
├── etl/
│   ├── extract.py
│   ├── clean.py                          # + clean_part_number, clean_polling_station_name, clean_polling_address
│   ├── validate.py
│   ├── ingest.py                         # updated SQL with 3 new columns
│   ├── main.py                           # + --polling-map flag
│   ├── schema.sql                        # updated DDL with 3 new columns
│   └── ...
└── web/
    └── lib/
        └── types.ts                      # + part_number, polling_station_name, polling_address
```

---

## 8. Summary of every section that must change

| Main spec section | Change |
|---|---|
| 2.1, 2.6 — DDL | Add 3 columns to CREATE TABLE |
| 2.2 — Column spec | Add 3 rows to the column table |
| 3.2 — Source formats | Document the separate polling mapping file |
| 3.4 Stage 1 — Extraction | Add `load_polling_parts_mapping()` |
| 3.4 Stage 2 — Cleaning | Add `clean_part_number`, `clean_polling_station_name`, `clean_polling_address`; update `clean_dataframe` to JOIN mapping |
| 3.4 Stage 2 — COLUMN_MAP | Add polling field aliases |
| 3.4 Stage 5 — Ingestion | Update INSERT/ON CONFLICT SQL with 3 columns |
| 3.5 — Run report | Add "Polling Parts Mapping" section |
| 3.7 — CLI | Add `--polling-map` flag |
| 6.2 — TypeScript types | Add 3 fields to `Elector`, `ElectorDisplayData`, `FIELD_LABELS` |
| 6.6 — Card view | Add "Polling Station" section below details |
| 6.6 — Table view | Add separator row + 3 polling rows |
| 10.1 — ETL tests | Add 6 polling-related tests |
| 10.2 — Frontend tests | Add 4 polling-related tests |
| 12 — Build order | Add polling tasks to Phase 1 and Phase 3 |
| 13 — Decisions log | Add decisions 9, 10, 11 |
| 16 — Directory structure | Add `data/polling/` |

---

End of addendum. Apply these changes to the main build prompt before handing it to the agent.
