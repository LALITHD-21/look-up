# Database Schema Reference — Elector Lookup Portal

> Complete database schema specification, DDL scripts, indexes, and RLS policies.

---

## 1. Table: `electors`

### 1.1 Column Specification

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `BIGSERIAL` | NO | auto-increment | `PRIMARY KEY` | Internal synthetic key. Not exposed in UI. |
| `serial_number` | `INTEGER` | YES | — | — | "SNo" from source data. Not unique across constituencies. |
| `epic_number` | `VARCHAR(11)` | NO | — | `NOT NULL`, `UNIQUE` | The search key. Format: `^[A-Z]{3}\d{7}$` (10 chars). |
| `name` | `TEXT` | NO | — | `NOT NULL` | Full name. Original casing preserved. |
| `relative_name` | `TEXT` | YES | — | — | Father/mother/husband name. May include "S/o", "D/o", "W/o". |
| `address` | `TEXT` | YES | — | — | Full address as single string. Not parsed into components. |
| `qualification` | `VARCHAR(100)` | YES | — | — | Educational qualification (free text). |
| `occupation` | `VARCHAR(100)` | YES | — | — | Occupation (free text). |
| `age` | `INTEGER` | YES | — | — | Age in years. ETL validates 18–120 range. |
| `sex` | `CHAR(1)` | YES | — | `CHECK (sex IN ('M', 'F'))` | 'M' or 'F' only. |
| `photo_url` | `TEXT` | YES | — | — | ⚠️ PENDING: Always `NULL` until photo feature confirmed. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | — | Record creation timestamp (set by ETL). |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | — | Last modification timestamp (set by ETL upsert). |

### 1.2 Why These Types?

| Choice | Rationale |
|--------|-----------|
| `BIGSERIAL` PK (not UUID) | 8 bytes vs 16. Faster joins. EPIC is the natural business key. |
| `VARCHAR(11)` for EPIC | 10-char format + 1-char safety buffer. |
| `TEXT` for name/address | Indian names and addresses have no fixed length. Same Postgres performance as `VARCHAR`. |
| `CHAR(1)` for sex | Tightest representation. `CHECK` enforces only `M`/`F`. |
| `photo_url` included but NULL | Avoids future migration. Harmless as NULL column. |

---

## 2. Indexes

### 2.1 Primary Index (Critical)

```sql
-- The most important index in the system.
-- Every search query hits this index.
-- UNIQUE constraint creates a B-Tree index automatically, but we name it.
CREATE UNIQUE INDEX idx_electors_epic_number ON electors (epic_number);
```

**Performance:** O(log n) lookup. For 200,000 rows → ~17 comparisons → < 1ms.

### 2.2 Future Indexes (NOT created in v1)

```sql
-- If name search is ever needed:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX idx_electors_name_trgm ON electors USING GIN (name gin_trgm_ops);
```

---

## 3. Row Level Security (RLS)

### 3.1 Policies

```sql
-- Enable RLS
ALTER TABLE electors ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read
CREATE POLICY "Authenticated users can read electors"
    ON electors FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Anonymous users cannot read (explicit deny)
CREATE POLICY "Anonymous users cannot read electors"
    ON electors FOR SELECT
    TO anon
    USING (false);

-- No INSERT/UPDATE/DELETE policies for authenticated role.
-- Data is read-only from the frontend.
-- ETL uses service role key which bypasses RLS.
```

### 3.2 Access Matrix

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| `authenticated` | ✅ Allowed | ❌ No policy | ❌ No policy | ❌ No policy |
| `anon` | ❌ Denied | ❌ No policy | ❌ No policy | ❌ No policy |
| `service_role` | ✅ Bypasses RLS | ✅ Bypasses RLS | ✅ Bypasses RLS | ✅ Bypasses RLS |

---

## 4. Full DDL Script

> Run this in the Supabase SQL Editor. Also saved as `etl/schema.sql`.

```sql
-- ============================================
-- Elector Lookup Portal — Database Setup Script
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS electors (
    id              BIGSERIAL PRIMARY KEY,
    serial_number   INTEGER,
    epic_number     VARCHAR(11) NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    relative_name   TEXT,
    address         TEXT,
    qualification   VARCHAR(100),
    occupation      VARCHAR(100),
    age             INTEGER,
    sex             CHAR(1) CHECK (sex IN ('M', 'F')),
    photo_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the unique index on epic_number
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
```

### Verification Queries

```sql
-- Check table exists and row count
SELECT count(*) FROM electors;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'electors';

-- Check indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'electors';

-- Check RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'electors';
```

---

## 5. ETL Upsert Query

```sql
-- Used by ingest.py via psycopg2 execute_values
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
    updated_at = NOW();
```

**Key behaviors:**
- `created_at` is only set on initial `INSERT` (via `DEFAULT NOW()`).
- `updated_at` is set to `NOW()` on every upsert (including updates).
- `photo_url` is always `NULL` (⚠️ PENDING).
- Idempotent: running the ETL twice produces the same result.

---

## 6. Storage Estimates

| Metric | Value |
|--------|-------|
| Records | 100,000 – 200,000 |
| Avg row size | ~500 bytes |
| Total table size | ~50–100 MB |
| Index size | ~5–10 MB |
| Supabase free tier limit | 500 MB |
| **Headroom** | **~400 MB free** ✅ |
