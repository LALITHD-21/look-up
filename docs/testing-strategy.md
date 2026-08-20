# Testing Strategy — Elector Lookup Portal

> All test cases for ETL, frontend, and security — organized by phase.

---

## 1. ETL Tests (Phase 1)

### 1.1 Extraction Tests

| # | Test | Input | Expected Output | Pass Criteria |
|---|------|-------|-----------------|---------------|
| E1 | Excel extraction | Known `.xlsx` with 100 rows, 2 sheets | DataFrame with 100 rows | Row count matches, all columns present |
| E2 | PDF extraction | Known `.pdf` with 50 pages | DataFrame with extracted rows | Row count reasonable, no rows lost |
| E3 | Multi-file extraction | Directory with 3 Excel + 2 PDF | Single combined DataFrame | All files processed, `source_file` column added |
| E4 | Corrupt file handling | 1 valid + 1 corrupt file | Valid file processed, corrupt logged | No crash, error logged, valid data preserved |
| E5 | Empty file | `.xlsx` with only headers | Empty DataFrame | No crash, 0 rows reported |

### 1.2 Cleaning Tests

| # | Test | Input | Expected Output |
|---|------|-------|-----------------|
| C1 | EPIC: valid lowercase | `'tya0633792'` | `'TYA0633792'` |
| C2 | EPIC: with spaces | `'TYA 063 3792'` | `'TYA0633792'` |
| C3 | EPIC: with hyphens | `'TYA-0633792'` | `'TYA0633792'` |
| C4 | EPIC: too short | `'TYA063379'` | `None` |
| C5 | EPIC: all digits | `'1234567890'` | `None` |
| C6 | EPIC: empty | `''` | `None` |
| C7 | EPIC: NaN | `float('nan')` | `None` |
| C8 | Name: multiple spaces | `'  RAVI   KUMAR  '` | `'RAVI KUMAR'` |
| C9 | Name: casing preserved | `'Ravi Kumar'` | `'Ravi Kumar'` |
| C10 | Address: newlines | `'H No 123\nMain Road'` | `'H No 123, Main Road'` |
| C11 | Address: only commas | `'  , , , H No 1  '` | `'H No 1'` |
| C12 | Age: valid integer | `25` | `25` |
| C13 | Age: string with text | `'25 years'` | `25` |
| C14 | Age: out of range | `200` | `None` |
| C15 | Sex: 'Male' | `'Male'` | `'M'` |
| C16 | Sex: lowercase 'f' | `'f'` | `'F'` |
| C17 | Sex: unrecognized | `'Other'` | `None` |

### 1.3 Validation Tests

| # | Test | Input | Expected Behavior |
|---|------|-------|-------------------|
| V1 | Drop invalid EPICs | 100 rows, 5 with `None` EPIC | 95 rows remain |
| V2 | Drop null names | 100 rows, 2 with `None` name | 98 rows remain |
| V3 | Remove exact duplicates | 100 rows, 3 fully identical | 97 rows remain |
| V4 | EPIC deduplication | 100 rows, 5 with duplicate EPICs | Keep first, flag rest in CSV |
| V5 | Age flagging | Records with age 15 and 130 | 15 flagged (kept), 130 set to None |

### 1.4 Ingestion Tests

| # | Test | Expected Behavior |
|---|------|-------------------|
| I1 | First ingestion (100 rows) | 100 rows inserted, 0 updated |
| I2 | Re-run same data | 0 inserted, 100 updated (upsert) |
| I3 | Row count verification | DataFrame count == database count |
| I4 | Upsert idempotency | Run 3 times → same row count each time |

---

## 2. Frontend Tests (Phase 2 & 3)

### 2.1 Authentication Tests

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| A1 | Login success | Enter valid email + password, submit | Redirect to `/dashboard` |
| A2 | Login failure | Enter wrong password, submit | Error message shown, stay on `/login` |
| A3 | Login empty fields | Submit with empty fields | Validation error shown |
| A4 | Route protection | Visit `/dashboard` without auth | Redirect to `/login` |
| A5 | Route protection | Visit `/profile/TYA0633792` without auth | Redirect to `/login` |
| A6 | Auth redirect | Visit `/login` while authenticated | Redirect to `/dashboard` |
| A7 | Post-login redirect | Visit `/profile/TYA0633792`, get redirected to `/login`, log in | Redirect back to `/profile/TYA0633792` |
| A8 | Logout | Click logout button | Redirect to `/login`, session cleared |
| A9 | Session expiry | Let session expire, then search | Redirect to `/login` |

### 2.2 Search Tests

| # | Test | Input | Expected Result |
|---|------|-------|-----------------|
| S1 | Valid EPIC search | `TYA0633792` (exists in DB) | Redirect to `/profile/TYA0633792`, profile shown |
| S2 | Lowercase input | `tya0633792` | Normalized to `TYA0633792`, search works |
| S3 | Input with spaces | `TYA 063 3792` | Normalized, search works |
| S4 | Non-existent EPIC | `ABC1234567` (valid format, not in DB) | EmptyState: "No elector found" |
| S5 | Invalid format | `abc123` | Inline error, no redirect |
| S6 | Empty submit | Press Enter with empty input | Inline error shown |
| S7 | Real-time normalization | Type `tya ` | Input shows `TYA` (live normalization) |

### 2.3 Profile Page Tests

| # | Test | Action | Expected Result |
|---|------|--------|-----------------|
| P1 | Card view (default) | Navigate to valid EPIC | Card view renders with all fields |
| P2 | Table view toggle | Click "Table View" | View switches to table layout |
| P3 | Card view toggle | Click "Card View" | View switches back to card |
| P4 | Photo placeholder | View profile | Initials shown (no photo — ⚠️ PENDING) |
| P5 | Invalid EPIC in URL | Navigate to `/profile/INVALID` | "Invalid EPIC format" error |
| P6 | Print table view | Ctrl+P on table view | Only table visible in print preview |
| P7 | Back to search | Click "Search Again" on empty state | Navigate to `/dashboard` |

### 2.4 Responsive Tests

| # | Viewport | What to Check |
|---|----------|---------------|
| R1 | 375px (mobile) | Search bar full width, card stacks vertically, toggle full width |
| R2 | 768px (tablet) | Card side-by-side, toggle normal size |
| R3 | 1280px (desktop) | Content centered, max-width 640px |

---

## 3. Security Tests (Phase 4)

### 3.1 Database Security

| # | Test | Method | Expected Result |
|---|------|--------|-----------------|
| SEC1 | Direct API without auth | `curl <supabase_url>/rest/v1/electors` (no token) | `401 Unauthorized` |
| SEC2 | API with anon key only | `curl -H "apikey: <anon_key>" <url>/rest/v1/electors` | Empty result (RLS blocks) |
| SEC3 | Write attempt (auth) | Supabase client `.insert()` with authenticated session | Rejected (no INSERT policy) |
| SEC4 | Delete attempt (auth) | Supabase client `.delete()` with authenticated session | Rejected (no DELETE policy) |

### 3.2 Input Security

| # | Test | Input | Expected Result |
|---|------|-------|-----------------|
| SEC5 | SQL injection in search | `'; DROP TABLE electors; --` | Normalized to alphanumeric, no injection |
| SEC6 | XSS in URL | `/profile/<script>alert(1)</script>` | Sanitized, error shown |
| SEC7 | URL manipulation | `/profile/../../etc/passwd` | Normalized, invalid EPIC format error |

### 3.3 Secrets Security

| # | Test | Expected Result |
|---|------|-----------------|
| SEC8 | Check client-side JS bundle | No service role key present |
| SEC9 | Check Vercel env vars | Only `NEXT_PUBLIC_*` keys set |
| SEC10 | Check `.gitignore` | `.env` and `.env.local` excluded |
| SEC11 | Check browser Network tab | No service role key in requests |

---

## 4. Accessibility Tests (Phase 4)

| # | Test | Expected Result |
|---|------|-----------------|
| ACC1 | Tab through login form | Focus moves: email → password → submit |
| ACC2 | Tab through search | Focus moves to search input, then button |
| ACC3 | Focus rings visible | All interactive elements show focus ring |
| ACC4 | Error announcements | Error messages have `role="alert"` |
| ACC5 | Search input label | `aria-label="EPIC Number search"` present |
| ACC6 | Keyboard submit | Enter key submits search form |
| ACC7 | Escape key in search | Clears input and error |
