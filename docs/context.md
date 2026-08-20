# CONTEXT.md — Elector Lookup Portal (Full Project Details)

> **This is the single, comprehensive reference document for the entire project.**
> Everything you need to understand — what we're building, why, how, for whom, and every technical detail — is here.

---

## 1. What We Are Building

A **private, internal web application** — an **Elector Lookup Portal** — for a specific client. The tool serves as a centralized portal to search and view detailed profiles of electors (voters) from a dataset of approximately **100,000 to 200,000 records**.

The client currently has this data scattered across **messy Excel sheets** and **structured PDF electoral roll tables**. This project cleans, merges, and hosts the data, providing the client with a fast, secure, and user-friendly interface to look up individuals by their unique **EPIC Number** (Elector's Photo Identity Card number).

### The Core Interaction

```
User logs in → Types an EPIC number → Sees the voter's full profile → Done.
```

That's it. No editing, no uploading, no browsing, no admin panel. Just **type → find → view**.

---

## 2. Who Uses It

### The Client's Team (End Users)
- They log in with **individual accounts** (email + password)
- They search for electors by **EPIC number only**
- They view results in either a **card layout** or a **table layout**
- They can **print** the table view
- They do **NOT** upload, edit, or delete data
- Estimated team size: **5–10 people**

### Us (The Builders / Admins)
- We run the **ETL pipeline** to ingest data from Excel/PDF files
- We manage the **Supabase project** (database, auth, users)
- We create **user accounts** manually in the Supabase dashboard
- We deploy the app to **Vercel**

---

## 3. Key Constraints

| # | Constraint | Detail |
|---|-----------|--------|
| 1 | **Read-only for client** | They only consume data via the UI. All data ingestion is done by us via ETL. |
| 2 | **Strictly private** | No public sign-ups, no public access. Accounts created manually by admin. |
| 3 | **PII data** | Contains real names, addresses, ages of real voters. Security is critical. |
| 4 | **EPIC-only search** | The only search mechanism is exact-match on the `epic_number` column. |
| 5 | **No fuzzy/name search** | No fuzzy matching, no name search, no browsing/pagination in v1. |
| 6 | **Photos PENDING** | ⚠️ Photo feature NOT confirmed by client. Do NOT implement anything photo-related. |
| 7 | **Zero budget** | Entire project runs on free tiers: Supabase Free + Vercel Hobby + open source. |
| 8 | **No dark mode** | Light mode only in v1. |

---

## 4. The Dataset

### Source Data
- **Excel files (.xlsx):** Multiple files, each potentially with multiple sheets (one per constituency/ward). Columns include SNo, EPIC Number, Name, Relative Name, Address, Qualification, Occupation, Age, Sex.
- **PDF files (.pdf):** Structured electoral roll tables. Headers repeat on every page. Multi-line addresses that wrap across cell boundaries. The "SNo" column anchors record boundaries.

### Data Quality Issues
- EPIC numbers: inconsistent casing (`tya0633792`), embedded spaces/hyphens (`TYA-063 3792`), trailing whitespace
- Column headers: vary across files (`"EPIC No"` vs `"EPIC Number"` vs `"EPICNo"`)
- Addresses: multi-line with `\n`, concatenated with commas, sometimes just whitespace
- Names: extra spaces, trailing periods, stray numbers
- Ages: sometimes as strings (`"25 years"`), sometimes as floats (`25.0`)
- Sex: mixed formats (`"Male"`, `"MALE"`, `"M"`, `"m"`, `"Female"`, `"F"`)
- Some rows: completely empty, partially filled, or contain header repetitions from copy-pasting
- Duplicate records: same EPIC number appearing in multiple files

### Dataset Size
- **Records:** 100,000 to 200,000 elector records
- **Fields per record:** ~10 (see schema below)
- **Database size estimate:** ~50–100 MB (well within Supabase's 500 MB free tier)

---

## 5. The EPIC Number — The Most Important Field

The **EPIC (Elector's Photo Identity Card) number** is the unique identifier for each voter in India's electoral roll.

| Property | Detail |
|----------|--------|
| **Format** | 3 uppercase letters + 7 digits = exactly **10 characters** |
| **Regex** | `^[A-Z]{3}\d{7}$` |
| **Example** | `TYA0633792` |
| **Prefix meaning** | The 3-letter prefix typically corresponds to the state/constituency code |
| **Role in system** | Search key, unique constraint, URL parameter, database index |

### Normalization Rules (Applied Everywhere)
1. Convert to uppercase
2. Strip all non-alphanumeric characters (spaces, hyphens, special chars)
3. Validate: exactly 3 uppercase letters + 7 digits

### Examples of Normalization
| User Input | Normalized | Valid? |
|-----------|-----------|--------|
| `tya0633792` | `TYA0633792` | ✅ |
| `TYA 063 3792` | `TYA0633792` | ✅ |
| `TYA-0633792` | `TYA0633792` | ✅ |
| `633792` | `633792` | ❌ (no letter prefix) |
| `TYA063379` | `TYA063379` | ❌ (only 6 digits) |
| `ABCD1234567` | `ABCD1234567` | ❌ (4 letters, 7 digits) |

---

## 6. Technology Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| **Frontend** | Next.js (App Router) | 14.x+ | Server Components, fast, modern React with RSC support |
| **Language** | TypeScript | 5.x | Type safety, fewer runtime errors |
| **Styling** | Tailwind CSS | 3.4.x+ | Utility-first, fast iteration, comes with create-next-app |
| **Hosting** | Vercel (Hobby plan) | — | Seamless Next.js integration, auto HTTPS, edge middleware |
| **Database** | Supabase (PostgreSQL) | 15.x | Managed Postgres + Auth + RLS + REST API in one service |
| **Auth** | Supabase Auth | — | Cookie-based sessions, simple integration |
| **Search** | PostgreSQL B-Tree Index | — | Exact-match, O(log n), < 1ms for 200k rows |
| **ETL** | Python | 3.12.x | Mature ecosystem for Excel/PDF processing |
| **ETL libs** | pandas, openpyxl, pdfplumber, psycopg2, supabase-py | latest | Industry-standard data processing |

### Why This Stack?

| Decision | Why Not Alternatives |
|----------|---------------------|
| Supabase over Firebase | Postgres + RLS > NoSQL for relational data with row-level security |
| Supabase over PlanetScale/Neon | Supabase bundles Auth + Storage + REST API — no separate backend needed |
| Next.js Server Components | Profile page renders server-side with data already loaded — no client-side loading spinners |
| No separate Express/Fastify backend | Supabase client + RLS eliminates the need for a custom API server |
| No Redux/Zustand | Only 1 piece of client state (card/table toggle). `useState` is sufficient. |
| Tailwind over CSS Modules | Faster iteration, consistent design tokens, zero runtime cost |

---

## 7. Free-Tier Budget Breakdown (₹0 / $0)

| Service | Free Tier | What We Use | Enough? |
|---------|-----------|-------------|---------|
| **Supabase** | 500 MB database, 1 GB storage, 50k MAU, 2 projects | ~100 MB DB, <10 MAU, 1 project | ✅ Yes |
| **Vercel** | 100 GB bandwidth, unlimited deployments, auto HTTPS | Minimal traffic internal tool | ✅ Yes |
| **GitHub** | Unlimited private repos | Version control | ✅ Yes |
| **Python + libs** | Open source | ETL pipeline | ✅ Yes |
| **Next.js + Node.js** | Open source | Frontend + runtime | ✅ Yes |

### Known Free-Tier Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| Supabase pauses DB after 7 days idle | First request after pause takes 3–5 seconds | Free cron ping every 5 days (cron-job.org) |
| Supabase: only 2 free projects | Cannot create separate dev/staging/prod | Use single project; test ETL on small sample first |
| Supabase: no daily backups | Data loss risk if DB corrupted | Source Excel/PDF files are the backup; ETL can re-run |
| Vercel Hobby: non-commercial use | Borderline for client tool | Private internal tool qualifies; upgrade if needed |
| Supabase: ~2 req/sec sustained | Could hit rate limits with many concurrent users | Small team = never hit; upgrade if needed |

---

## 8. Database Schema

### The `electors` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `BIGSERIAL` | NO | Auto-increment PK. Internal only, not exposed in UI. |
| `serial_number` | `INTEGER` | YES | "SNo" from source data. Preserved for traceability. |
| `epic_number` | `VARCHAR(11)` | NO | **The search key.** UNIQUE, indexed. Format: `^[A-Z]{3}\d{7}$`. |
| `name` | `TEXT` | NO | Full name. Original casing preserved. |
| `relative_name` | `TEXT` | YES | Father/mother/husband name. May include "S/o", "D/o", "W/o". |
| `address` | `TEXT` | YES | Full address as single string. Not parsed into components. |
| `qualification` | `VARCHAR(100)` | YES | Educational qualification (free text). |
| `occupation` | `VARCHAR(100)` | YES | Occupation (free text). |
| `age` | `INTEGER` | YES | Age in years. Validated 18–120. |
| `sex` | `CHAR(1)` | YES | `'M'` or `'F'` only (CHECK constraint). |
| `photo_url` | `TEXT` | YES | ⚠️ Always `NULL` until photo feature confirmed. |
| `created_at` | `TIMESTAMPTZ` | NO | When record was first inserted. |
| `updated_at` | `TIMESTAMPTZ` | NO | When record was last modified by ETL. |

### Index
```sql
CREATE UNIQUE INDEX idx_electors_epic_number ON electors (epic_number);
```
- **Type:** B-Tree (default)
- **Performance:** O(log n) → for 200k rows, ~17 comparisons → **< 1ms per lookup**

### Row Level Security (RLS)
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| `authenticated` | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| `anon` | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| `service_role` (ETL only) | ✅ Bypasses | ✅ Bypasses | ✅ Bypasses | ✅ Bypasses |

---

## 9. ETL Pipeline (Data Ingestion)

The ETL is a standalone **Python project** (`etl/` directory), completely separate from the web app. It runs locally on the developer's machine.

### Pipeline Stages

```
Excel/PDF files → EXTRACT → CLEAN → VALIDATE → INGEST → Supabase PostgreSQL
```

| Stage | File | What It Does |
|-------|------|-------------|
| **Extract** | `extract.py` | Read .xlsx (pandas + openpyxl) and .pdf (pdfplumber). Handle multi-sheet, multi-page. |
| **Clean** | `clean.py` | Normalize EPICs, clean names, join multi-line addresses, normalize sex, validate ages. |
| **Validate** | `validate.py` | Drop invalid EPICs, drop null names, deduplicate, flag out-of-range ages. |
| **Ingest** | `ingest.py` | Upsert via psycopg2 `execute_values` with `ON CONFLICT DO UPDATE`. Idempotent. |
| **Orchestrate** | `main.py` | CLI interface: `--source`, `--ingest`, `--dry-run`, `--output`, `--verbose`. |

### Key ETL Properties
- **Idempotent:** Running twice on the same data produces the same result. No duplicates.
- **Resumable:** Can re-run with updated source files. New records inserted, existing updated.
- **Fast:** 200k rows ingested in < 30 seconds via psycopg2 COPY/upsert.
- **Traceable:** Adds `source_file` column, generates detailed run reports, outputs duplicates CSV.

---

## 10. Authentication & Access Control

### Login Flow
```
User visits app → Middleware checks session → Not authenticated → Redirect to /login
→ User enters email + password → supabase.auth.signInWithPassword()
→ Success → Set cookies → Redirect to /dashboard
→ Failure → Show "Invalid credentials" error
```

### Account Management
- **No public sign-ups.** Disabled in Supabase dashboard.
- **Accounts created manually** by admin in Supabase Dashboard → Authentication → Users → Add User.
- **Individual named accounts** (recommended over shared credentials for audit trail).
- **Auto-confirm** enabled (no email verification needed for admin-created accounts).

### Session Management
- **Access token:** 1 hour expiry, auto-refreshed
- **Refresh token:** ~1 week lifetime, stored in httpOnly cookie
- **Cookies:** `httpOnly`, `secure` (production), `sameSite=lax`

### Route Protection
| Route | Access | Behavior |
|-------|--------|----------|
| `/login` | Public | If already authenticated → redirect to `/dashboard` |
| `/dashboard` | Protected | If not authenticated → redirect to `/login` |
| `/profile/[epic]` | Protected | If not authenticated → redirect to `/login?redirect=/profile/[epic]` |

---

## 11. Frontend Architecture

### Pages (Next.js App Router)

| Page | Type | Purpose |
|------|------|---------|
| `/` | Redirect | → `/dashboard` if authed, → `/login` if not |
| `/login` | Client Component | Email + password login form |
| `/dashboard` | Client Component | Centered search bar, heading, format hint |
| `/profile/[epic]` | **Server Component** ⭐ | Server-side Supabase query → render profile |

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| `SearchBar` | Client | Real-time EPIC normalization, validation, submit → redirect |
| `ProfileCard` | Client | Card layout: photo placeholder + name + details grid |
| `ProfileTable` | Client | Table layout: Field \| Value two-column table (printable) |
| `ViewToggle` | Client | Card View ↔ Table View toggle buttons |
| `EmptyState` | Component | "No elector found" with "Search Again" button |
| `PhotoPlaceholder` | Client | Circular div with initials (always shown — photo ⚠️ PENDING) |
| `LogoutButton` | Client | `supabase.auth.signOut()` → redirect to `/login` |

### Profile Card Layout (Desktop ≥ 768px)
```
┌───────────────────────────────────────────┐
│  ┌─────┐  Name (large, bold)               │
│  │     │  EPIC: TYA 0633792 (monospace)     │
│  │ INI │  Age: 45  |  Sex: M                │
│  │ TIA │                                    │
│  │ LS  │  ─────────────────────────────      │
│  │     │  Relative: S/o RAMESH              │
│  └─────┘  Address: H No 123, Main Road...   │
│            Qualification: BSc               │
│            Occupation: Engineer              │
└───────────────────────────────────────────┘
```

### Profile Table Layout
```
┌───────────────┬───────────────────────────────────┐
│ Field         │ Value                             │
├───────────────┼───────────────────────────────────┤
│ EPIC Number   │ TYA0633792                        │
│ Name          │ RAVI KUMAR                        │
│ Relative Name │ S/o RAMESH                        │
│ Address       │ H No 123, Main Road, Village XYZ │
│ Qualification │ BSc                               │
│ Occupation    │ Engineer                          │
│ Age           │ 45                                │
│ Sex           │ M                                 │
└───────────────┴───────────────────────────────────┘
```

---

## 12. Security Architecture

### Defense in Depth (5 Layers)

```
Layer 5: No Write Policies — authenticated users can only SELECT
  Layer 4: HTTPS (Vercel) — all traffic encrypted via TLS
    Layer 3: Supabase Auth — httpOnly, secure, sameSite cookies
      Layer 2: Supabase RLS ⭐ — THE security boundary
        Layer 1: Next.js Middleware — redirect convenience (UX only)
```

> **Critical insight:** Middleware is UX. RLS is security. Even if middleware is bypassed entirely, the database still rejects unauthenticated requests.

### Secrets Separation

| Secret | Location | Who Uses It |
|--------|----------|-------------|
| `SUPABASE_URL` | Both `.env` files | ETL + Web App |
| `SUPABASE_ANON_KEY` | `web/.env.local` (public) | Web App (browser-safe, RLS enforces access) |
| `SUPABASE_SERVICE_ROLE_KEY` | `etl/.env` only | ETL only (bypasses RLS — NEVER in web app) |
| `DATABASE_URL` | `etl/.env` only | ETL only (direct Postgres admin access) |

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Unauthorized access to PII | RLS blocks unauthenticated reads; middleware redirects to login |
| Data exfiltration by authenticated user | Accepted risk in v1 (small trusted team). Rate limiting in v2. |
| Credential leakage | Individual accounts → revoke one without affecting others |
| API abuse / scraping | Supabase built-in rate limits; Vercel limits. Upgrade in v2. |
| SQL injection | Input normalized to alphanumeric only. Parameterized queries via Supabase client. |

---

## 13. User Interface Design

### Visual Style
- **Aesthetic:** Clean, minimalist, professional. Internal tool — no marketing fluff.
- **Background:** Light gray (`bg-gray-50`)
- **Cards:** White with subtle shadow (`bg-white shadow-md rounded-lg`)
- **Primary accent:** Indigo (`indigo-600`) for buttons, active states, focus rings
- **Text:** `gray-900` (primary), `gray-500` (secondary/labels)
- **Errors:** `red-600` text, `red-300` borders
- **Font:** Inter (via `next/font/google`) or system font stack
- **EPIC numbers:** Monospace font for code-like appearance
- **No dark mode** in v1
- **No animations** beyond simple transitions

### Responsive Breakpoints
| Viewport | Width | Key Changes |
|----------|-------|-------------|
| Mobile | < 640px | Search bar full width, card stacks vertically, toggle full width |
| Tablet | 768px | Card switches to side-by-side layout |
| Desktop | 1024px+ | Content centered, max-width 640px |

### Error States

| Error | When | What User Sees |
|-------|------|---------------|
| Invalid EPIC format | User types something that doesn't match `^[A-Z]{3}\d{7}$` | Inline error below search bar; no redirect |
| No record found | Valid EPIC format but not in database | "No elector found with EPIC number TYA0633792" + "Search Again" button |
| Network/server error | Supabase query fails (timeout, RLS denial) | "Something went wrong" + "Retry" button + "Back to Search" link |
| Session expired | User's session timed out mid-use | Redirect to `/login` on next navigation |

---

## 14. Performance Characteristics

| Operation | Latency | Why |
|-----------|---------|-----|
| EPIC lookup query | < 1ms | B-Tree index scan, O(log n) on 200k rows |
| Profile page render | < 100ms | Server Component, no client-side fetch waterfall |
| Login | < 500ms | Single Supabase Auth API call |
| Search bar normalization | Instant | Client-side string manipulation |
| ETL full ingestion | < 30 seconds | psycopg2 execute_values with upsert |
| Cold start (after 7d idle) | 3–5 seconds | Supabase free-tier database wake-up |
| JS bundle size | < 100 KB gzipped | No heavy client-side libraries |

---

## 15. Build Phases

| Phase | Name | What Gets Built | Dependencies |
|-------|------|----------------|-------------|
| **Phase 1** | Data Foundation | ETL pipeline + database schema + data ingestion | Supabase project + source files |
| **Phase 2** | Auth & Infrastructure | Next.js scaffold + login + middleware + Supabase clients | Phase 1 complete |
| **Phase 3** | Core Application | SearchBar + Dashboard + Profile page + all components | Phase 2 complete |
| **Phase 4** | Polish & Deploy | Responsive design + accessibility + security check + Vercel deploy | Phase 3 complete |

---

## 16. What Is NOT Being Built (v1)

| Feature | Status | Notes |
|---------|--------|-------|
| Photo display | ⚠️ PENDING | Do NOT implement until client confirms |
| Name-based search | ❌ Not in v1 | Schema supports it (add pg_trgm later) |
| Fuzzy search | ❌ Not in v1 | — |
| Bulk data export | ❌ Not in v1 | — |
| Data editing via UI | ❌ Not in v1 | Client is read-only |
| Admin panel | ❌ Not in v1 | — |
| Advanced filters | ❌ Not in v1 | No filter by age, sex, district, etc. |
| Pagination / browse | ❌ Not in v1 | Lookup only, not a directory |
| Dark mode | ❌ Not in v1 | Light mode only |
| Mobile app | ❌ Not in v1 | Responsive web only |
| Audit logging | ❌ Not in v1 | No search history tracking |
| Multi-tenancy | ❌ Not in v1 | Single client, single dataset |
| i18n | ❌ Not in v1 | English only |
| Offline mode | ❌ Not in v1 | Requires internet |
| Real-time updates | ❌ Not in v1 | Data is static between ETL runs |

---

## 17. File Structure

```
project-root/
├── etl/                            # Python ETL pipeline
│   ├── extract.py                  # Stage 1: Excel/PDF extraction
│   ├── clean.py                    # Stage 2: cleaning & normalization
│   ├── validate.py                 # Stage 3: validation & deduplication
│   ├── ingest.py                   # Stage 4: Supabase upsert ingestion
│   ├── main.py                     # CLI orchestrator
│   ├── schema.sql                  # Database DDL + RLS policies
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # Credentials (NEVER commit)
│   ├── .env.example                # Template (committed)
│   └── output/                     # Reports, duplicates CSV, cleaned data
│
├── web/                            # Next.js application
│   ├── app/
│   │   ├── layout.tsx              # Root layout (HTML, fonts, metadata)
│   │   ├── page.tsx                # Root redirect
│   │   ├── globals.css             # Tailwind base + print stylesheet
│   │   ├── login/page.tsx          # Login form (Client Component)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Header + LogoutButton
│   │   │   └── page.tsx            # SearchBar (Client Component)
│   │   └── profile/[epic]/
│   │       └── page.tsx            # Profile detail (Server Component ⭐)
│   ├── components/
│   │   ├── SearchBar.tsx           # EPIC input with live normalization
│   │   ├── ProfileCard.tsx         # Card view layout
│   │   ├── ProfileTable.tsx        # Table view layout (printable)
│   │   ├── ViewToggle.tsx          # Card ↔ Table toggle
│   │   ├── EmptyState.tsx          # "No records found"
│   │   ├── LogoutButton.tsx        # Logout + redirect
│   │   └── PhotoPlaceholder.tsx    # Initials circle (always shown)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client
│   │   │   ├── server.ts           # Server Supabase client
│   │   │   └── middleware.ts       # Middleware session updater
│   │   ├── utils.ts                # normalizeEpic, isValidEpic, etc.
│   │   └── types.ts                # Elector interface, FIELD_LABELS
│   ├── middleware.ts               # Route protection
│   ├── .env.local                  # Supabase URL + anon key (NEVER commit)
│   └── .env.example                # Template (committed)
│
├── data/                           # Raw source files (gitignored — PII)
│   ├── excel/                      # .xlsx files from client
│   └── pdf/                        # .pdf electoral rolls from client
│
├── docs/                           # All documentation
│   ├── architecture.md
│   ├── context.md                  # This file
│   ├── database-schema.md
│   ├── deployment-guide.md
│   ├── etl-guide.md
│   ├── glossary.md
│   ├── open-questions.md
│   ├── security-checklist.md
│   └── testing-strategy.md
│
├── AGENTS.md                       # AI agent guardrails & instructions
├── progress.md                     # Build progress tracker
├── README.md                       # Project overview & quick start
└── .gitignore                      # Ignores secrets, PII, build artifacts
```

---

## 18. Open Questions (Pending Client Input)

| # | Question | Impact | Status |
|---|---------|--------|--------|
| 1 | Does the client want photos? If yes, where are the files? | Storage costs, UI quality, ETL complexity | ⚠️ PENDING |
| 2 | Shared credential vs. individual accounts? | Audit trail, security, session stability | OPEN (recommend individual) |
| 3 | Is this data from the public electoral roll or private? | Legal/privacy obligations | OPEN |
| 4 | How many concurrent users expected? | Supabase tier | OPEN |
| 5 | Does the client need export/download from UI? | Not in v1, common follow-up | OPEN |
| 6 | Show "last updated" date in UI? | Minor UX, column exists | OPEN |

---

## 19. Document Status

| Field | Value |
|-------|-------|
| **Spec version** | v3.0 — Free-Tier + Antigravity IDE Edition |
| **Status** | FINAL |
| **Budget** | ₹0 / $0 |
| **Photo feature** | ⚠️ PENDING — do NOT implement |
| **Current build phase** | Pre-build (documentation complete, ready for Phase 1) |
| **Last updated** | 2026-08-19 |
