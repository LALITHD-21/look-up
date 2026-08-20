# Architecture — Elector Lookup Portal

> System architecture, data flow, component responsibilities, and design rationale.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER (Offline)                        │
│                                                                     │
│  ┌──────────┐   ┌──────────┐                                       │
│  │ Excel    │   │ PDF      │   Source files from client             │
│  │ (.xlsx)  │   │ (.pdf)   │   (gitignored — contain PII)          │
│  └────┬─────┘   └────┬─────┘                                       │
│       │              │                                               │
│       ▼              ▼                                               │
│  ┌─────────────────────────┐                                        │
│  │    Python ETL Pipeline  │   extract → clean → validate → ingest │
│  │    (runs locally)       │   Uses service role key (bypasses RLS) │
│  └────────────┬────────────┘                                        │
│               │ psycopg2 COPY / upsert                              │
│               ▼                                                      │
│  ┌─────────────────────────┐                                        │
│  │   Supabase PostgreSQL   │   Single table: `electors`            │
│  │   (managed, free tier)  │   B-Tree index on `epic_number`       │
│  │                         │   RLS: authenticated SELECT only      │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (Online)                     │
│                                                                     │
│  ┌─────────────────────────┐                                        │
│  │   Supabase Auth         │   Cookie-based sessions               │
│  │   (managed)             │   Individual named accounts           │
│  │                         │   No public sign-ups                  │
│  └────────────┬────────────┘                                        │
│               │ auth tokens                                          │
│               ▼                                                      │
│  ┌─────────────────────────┐   ┌────────────────────────┐          │
│  │   Next.js App           │──▶│  Vercel (Hosting)      │          │
│  │   (App Router, RSC)     │   │  Hobby plan (free)     │          │
│  │                         │   │  Auto HTTPS, Edge MW   │          │
│  │   • /login              │   └────────────────────────┘          │
│  │   • /dashboard          │                                        │
│  │   • /profile/[epic]     │                                        │
│  └─────────────────────────┘                                        │
│               │                                                      │
│               ▼                                                      │
│  ┌─────────────────────────┐                                        │
│  │   Client's Browser      │   Search EPIC → View profile          │
│  │   (Chrome/Firefox/etc.) │   Card view or Table view             │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow

### 2.1 ETL Flow (One-time / Periodic — Offline)

```
Excel/PDF Files
     │
     ▼
┌─────────────┐
│ 1. EXTRACT  │  extract.py
│             │  • Read .xlsx via pandas + openpyxl
│             │  • Read .pdf via pdfplumber
│             │  • Handle multi-sheet, multi-page
│             │  • Add source traceability columns
└──────┬──────┘
       ▼
┌─────────────┐
│ 2. CLEAN    │  clean.py
│             │  • Map columns to canonical names
│             │  • Normalize EPIC: uppercase, strip non-alnum
│             │  • Clean names: collapse whitespace, preserve casing
│             │  • Clean addresses: join lines with ", "
│             │  • Normalize sex: Male→M, Female→F
│             │  • Validate age: 18–120 range
│             │  • Set photo_url = NULL (⚠️ PENDING)
└──────┬──────┘
       ▼
┌─────────────┐
│ 3. VALIDATE │  validate.py
│             │  • Drop invalid EPICs (not matching ^[A-Z]{3}\d{7}$)
│             │  • Drop null names
│             │  • Remove exact duplicates
│             │  • Deduplicate by EPIC (keep first, flag rest)
│             │  • Generate validation report
└──────┬──────┘
       ▼
┌─────────────┐
│ 4. INGEST   │  ingest.py
│             │  • Upsert via psycopg2 execute_values
│             │  • INSERT ... ON CONFLICT (epic_number) DO UPDATE
│             │  • Idempotent — safe to re-run
│             │  • Verify row count matches
└──────┬──────┘
       ▼
  Supabase PostgreSQL
  (electors table populated)
```

### 2.2 Web Portal Ingestion Flow (Online — File Upload Panel)

```
Excel/PDF File Drag-and-Drop in Web UI (/dashboard)
     │
     ▼
┌──────────────────────────────┐
│ Next.js API Route            │  /api/upload
│ 1. Verify Auth Cookie        │  Ensure user is logged in
│ 2. Parse Multipart File      │  Read .xlsx/.csv via SheetJS or .pdf via Regex
│ 3. Normalize & Clean Fields  │  Canonical names, EPIC regex ^[A-Z]{3}\d{7}$
│ 4. Batch Upsert to Supabase  │  INSERT ... ON CONFLICT (epic_number) DO UPDATE
│ 5. Return JSON Summary Report│  Rows inserted, valid count, errors
└──────────────┬───────────────┘
               ▼
   Supabase PostgreSQL (electors table updated instantly)
```


### 2.2 User Request Flow (Online — Every Search)

```
User types EPIC in SearchBar
     │
     ▼
┌──────────────────────┐
│ Client-side          │
│ 1. Normalize input   │  uppercase + strip non-alnum
│ 2. Validate format   │  regex ^[A-Z]{3}\d{7}$
│ 3. Redirect to       │  /profile/TYA0633792
│    /profile/[epic]   │
└──────────┬───────────┘
           │ HTTP GET (server navigation)
           ▼
┌──────────────────────┐
│ Next.js Server       │
│ (Server Component)   │
│                      │
│ 1. Middleware checks │  Is user authenticated?
│    auth session      │  No → redirect to /login
│                      │  Yes → continue
│ 2. Normalize EPIC    │  (URL may have been typed manually)
│ 3. Validate format   │  Invalid → render error
│ 4. Query Supabase:   │
│    SELECT * FROM     │  Uses anon key + user's session
│    electors WHERE    │  RLS enforces authentication
│    epic_number = $1  │
│ 5. Render result     │  Found → ProfileCard/Table
│                      │  Not found → EmptyState
│                      │  Error → Error state
└──────────┬───────────┘
           │ HTML response
           ▼
  User sees profile page
```

---

## 3. Component Architecture

### 3.1 Next.js App Router Pages

```
app/
├── layout.tsx ............... Root layout (HTML, fonts, metadata)
├── page.tsx ................. Root redirect → /dashboard or /login
├── globals.css .............. Tailwind base + print stylesheet
│
├── login/
│   └── page.tsx ............. Client Component
│                              • Email + password form
│                              • supabase.auth.signInWithPassword()
│                              • Error display
│                              • Redirect on success
│
├── dashboard/
│   ├── layout.tsx ........... Header bar + LogoutButton
│   └── page.tsx ............. Client Component
│                              • SearchBar (centered)
│                              • Heading + subtitle + format hint
│
└── profile/
    └── [epic]/
        └── page.tsx ......... Server Component ⭐
                               • Extract EPIC from URL params
                               • Server-side Supabase query
                               • Renders ProfileDisplay (client)
                               • Handles all error states
```

### 3.2 React Components

```
components/
│
├── SearchBar.tsx ............ Client Component
│   Props: (none)
│   State: inputValue, error, isLoading
│   Behavior: real-time normalization, validation, submit → redirect
│
├── ProfileCard.tsx .......... Client Component
│   Props: elector: Elector
│   Layout: PhotoPlaceholder + name/EPIC + details grid
│   Responsive: side-by-side (desktop) → stacked (mobile)
│
├── ProfileTable.tsx ......... Client Component
│   Props: elector: Elector
│   Layout: Field | Value two-column table
│   Class: "printable-table" for print stylesheet
│
├── ViewToggle.tsx ........... Client Component
│   Props: view, onToggle
│   Layout: Card View | Table View buttons
│   Active state: indigo-600 highlight
│
├── EmptyState.tsx ........... Server/Client Component
│   Props: epic: string
│   Layout: Icon + "No elector found" message + "Search Again" button
│
├── PhotoPlaceholder.tsx ..... Client Component
│   Props: name: string, epic: string
│   Layout: Circular div with initials (derived from name)
│   Note: ALWAYS shown — photo feature is ⚠️ PENDING
│
└── LogoutButton.tsx ......... Client Component
    Props: (none)
    Behavior: supabase.auth.signOut() → redirect to /login
```

### 3.3 Library Modules

```
lib/
├── supabase/
│   ├── client.ts ........... createBrowserClient() — used in Client Components
│   ├── server.ts ........... createServerClient() — used in Server Components
│   └── middleware.ts ....... updateSession() — used in middleware.ts
│
├── types.ts ................ Elector interface, ElectorDisplayData, FIELD_LABELS
└── utils.ts ................ normalizeEpic(), isValidEpic(), formatEpicForDisplay(), getInitials()
```

---

## 4. Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEFENSE IN DEPTH                         │
│                                                             │
│  Layer 5 ─ No Write Policies                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Authenticated users can only SELECT, never mutate     │  │
│  │                                                       │  │
│  │  Layer 4 ─ HTTPS (Vercel)                             │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ All traffic encrypted in transit via TLS        │  │  │
│  │  │                                                 │  │  │
│  │  │  Layer 3 ─ Supabase Auth (Cookie Sessions)      │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │ httpOnly, secure, sameSite=lax cookies    │  │  │  │
│  │  │  │                                           │  │  │  │
│  │  │  │  Layer 2 ─ Supabase RLS ⭐ (THE boundary) │  │  │  │
│  │  │  │  ┌─────────────────────────────────────┐  │  │  │  │
│  │  │  │  │ DB-level: authenticated can SELECT  │  │  │  │  │
│  │  │  │  │ DB-level: anon explicitly denied    │  │  │  │  │
│  │  │  │  │                                     │  │  │  │  │
│  │  │  │  │  Layer 1 ─ Next.js Middleware        │  │  │  │  │
│  │  │  │  │  ┌───────────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │ Redirects to /login (UX only) │  │  │  │  │  │
│  │  │  │  │  └───────────────────────────────┘  │  │  │  │  │
│  │  │  │  └─────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

> **Key insight:** Middleware is UX convenience (redirects). RLS is the real security boundary. Even if middleware is bypassed, the database rejects unauthenticated requests.

---

## 5. Database Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    electors table                         │
│                                                          │
│  id            BIGSERIAL  PK  (internal, not exposed)    │
│  ─────────────────────────────────────────────────────── │
│  serial_number INTEGER        nullable                   │
│  epic_number   VARCHAR(11)    NOT NULL, UNIQUE ← INDEX   │
│  name          TEXT           NOT NULL                    │
│  relative_name TEXT           nullable                   │
│  address       TEXT           nullable                   │
│  qualification VARCHAR(100)   nullable                   │
│  occupation    VARCHAR(100)   nullable                   │
│  age           INTEGER        nullable                   │
│  sex           CHAR(1)        CHECK (M/F)               │
│  photo_url     TEXT           nullable (always NULL ⚠️)  │
│  created_at    TIMESTAMPTZ    default NOW()             │
│  updated_at    TIMESTAMPTZ    default NOW()             │
│                                                          │
│  INDEXES:                                                │
│  └─ idx_electors_epic_number (UNIQUE, B-Tree)           │
│                                                          │
│  RLS POLICIES:                                           │
│  ├─ authenticated → SELECT allowed                      │
│  └─ anon → SELECT denied                                │
│  └─ (no INSERT/UPDATE/DELETE for authenticated)         │
└──────────────────────────────────────────────────────────┘

Query pattern: O(log n) index scan
  SELECT * FROM electors WHERE epic_number = 'TYA0633792'
  → < 1ms for 200k rows
```

---

## 6. Environment & Secrets Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    SECRETS BOUNDARY                       │
│                                                          │
│  ETL (Python) ─ etl/.env                                │
│  ├─ SUPABASE_URL .............. project URL              │
│  ├─ SUPABASE_SERVICE_ROLE_KEY . bypasses RLS (ADMIN)    │
│  └─ DATABASE_URL .............. direct Postgres conn     │
│     ⚠️ NEVER commit. NEVER expose to browser.           │
│                                                          │
│  Web App (Next.js) ─ web/.env.local                     │
│  ├─ NEXT_PUBLIC_SUPABASE_URL ... project URL (public)   │
│  └─ NEXT_PUBLIC_SUPABASE_ANON_KEY  anon key (public)    │
│     ✅ Safe to expose. RLS enforces access.              │
│                                                          │
│  Vercel Dashboard                                        │
│  ├─ NEXT_PUBLIC_SUPABASE_URL ... same as above           │
│  └─ NEXT_PUBLIC_SUPABASE_ANON_KEY  same as above         │
│     Set in Vercel UI, not in code.                       │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Technology Rationale

| Decision | Why | Alternatives Considered |
|----------|-----|------------------------|
| **Next.js App Router** | Server Components eliminate client-side data fetching waterfalls. Profile page renders server-side with data already loaded. | Pages Router (lacks RSC), SPA (loading spinners) |
| **Supabase (not Firebase)** | Postgres with RLS gives SQL power + row-level security. Single service for DB + Auth + Storage. | Firebase (NoSQL, weaker RLS), PlanetScale (no bundled auth), Neon (no bundled auth) |
| **RLS as security boundary** | Even if frontend code is compromised or middleware bypassed, the database rejects unauthorized access. | API-only auth (single point of failure) |
| **Server Components for profile** | Zero client JS for data fetching. SEO-friendly. No loading states on initial render. | Client Components + useEffect (waterfall, spinner) |
| **Single flat table** | 200k records, single lookup by EPIC. Normalization adds JOINs with zero benefit. | Normalized tables (districts, constituencies) — overkill |
| **psycopg2 COPY for ETL** | 10x faster than Supabase REST API. 200k rows in <30 seconds vs 5-10 minutes. | Supabase REST API (slower), raw COPY (less control) |
| **Tailwind CSS** | Fast iteration, consistent spacing/colors, comes free with create-next-app. | CSS Modules (more boilerplate), styled-components (runtime cost) |
| **No state management library** | Only one piece of client state: view toggle (card/table). useState is sufficient. | Redux, Zustand (massive overkill for a boolean) |

---

## 8. Performance Characteristics

| Operation | Expected Latency | Why |
|-----------|-----------------|-----|
| EPIC lookup query | < 1ms | B-Tree index scan on 200k rows = O(log n) |
| Profile page render (server) | < 100ms | Server Component, no client fetch waterfall |
| Login | < 500ms | Supabase Auth, single API call |
| Search bar normalization | Instant | Client-side string manipulation |
| ETL full ingestion (200k rows) | < 30 seconds | psycopg2 execute_values with upsert |
| Cold start (after 7d idle) | 3-5 seconds | Supabase free-tier database wake-up |

---

## 9. Scalability Notes (Not Needed for v1)

The current architecture comfortably handles:
- **200k records** — PostgreSQL handles millions; 200k is trivial
- **50 concurrent users** — Supabase PgBouncer connection pooling handles this
- **1,000 searches/day** — well within free-tier API rate limits

If the project scales beyond v1:
- Add `pg_trgm` GIN index for name search
- Upgrade to Supabase Pro for backups and no auto-pause
- Add rate limiting via Vercel Edge Middleware
- Add audit logging of searches
