# AGENTS.md — Elector Lookup Portal

> **This file governs AI agent behavior for the entire project.**
> Read this file FIRST before starting any work.

---

## 1. Project Identity

| Field              | Value                                                     |
| ------------------ | --------------------------------------------------------- |
| **Project**        | Internal Elector Lookup Portal                            |
| **Spec version**   | v3.0 — Free-Tier + Antigravity IDE Edition                |
| **Budget**         | ₹0 / $0 (free tiers only)                                |
| **Photo feature**  | ⚠️ **PENDING** — do NOT implement anything photo-related  |
| **Primary search** | Exact-match on `epic_number` (EPIC: 3 letters + 7 digits) |

---

## 2. Agent Guardrails — MUST FOLLOW

### 2.1 Absolute prohibitions

1. **NO photo functionality.** Do not write photo upload code, create storage buckets, render `<img>` tags for elector photos, or create `upload_photos.py`. The `photo_url` column stays `NULL`. Profile cards always show a `PhotoPlaceholder` (initials/silhouette).
2. **NO extra Supabase projects.** Free tier allows only 2. Use a single project for everything.
3. **NO secrets in chat or logs.** Read `.env` files from disk. Never output API keys, service role keys, or database passwords.
4. **NO skipping RLS.** Row Level Security is the actual security boundary. Middleware is UX. Both must be implemented.
5. **NO deploying to Vercel before Phase 4.** Develop and test locally first (`npm run dev`).
6. **NO pushing to remote without human approval.**
7. **NO dark mode** in v1.
8. **NO name search, fuzzy search, pagination, browse, bulk export, data editing, admin panel** in v1.

### 2.2 Decision-making rules

- If **unsure** about security, data handling, or schema decisions → **STOP and ask the human**.
- If an error **cannot be resolved after 2 attempts** → report full error + context, then wait.
- **Commit after each phase** with a descriptive message (e.g., `"Phase 1: ETL pipeline and database schema"`).
- Always **test on a small sample** (100 rows) before running full ETL ingestion.

---

## 3. Technology Stack

| Layer             | Technology                      | Version    |
| ----------------- | ------------------------------- | ---------- |
| Frontend          | Next.js (App Router)            | 14.x+     |
| Language          | TypeScript                      | 5.x       |
| Styling           | Tailwind CSS                    | 3.4.x+    |
| Hosting           | Vercel (Hobby plan)             | —         |
| Backend/Database  | Supabase (PostgreSQL)           | 15.x      |
| Auth              | Supabase Auth (cookie sessions) | —         |
| ETL               | Python 3.12.x                   | 3.12.x    |
| ETL libraries     | pandas, openpyxl, pdfplumber, supabase-py, psycopg2-binary | latest |

---

## 4. Build Phases — Execute In Order

### Phase 1: Data Foundation
- Create project directory structure
- Write full ETL pipeline (`extract.py`, `clean.py`, `validate.py`, `ingest.py`, `main.py`)
- Create SQL schema script (`schema.sql`)
- Test ETL on sample data, then ingest full dataset
- **Skip** `upload_photos.py` entirely

### Phase 2: Auth & Infrastructure
- Scaffold Next.js app with `create-next-app`
- Install `@supabase/ssr`, `@supabase/supabase-js`
- Create Supabase client files (browser, server, middleware)
- Implement login page, middleware route protection
- Create utility functions and TypeScript types
- Test auth flow end-to-end

### Phase 3: Core Application
- Build `SearchBar` with real-time normalization
- Build dashboard page (`/dashboard`)
- Build profile page (`/profile/[epic]`) as Server Component
- Build `ProfileCard`, `ProfileTable`, `ViewToggle`, `EmptyState`, `PhotoPlaceholder`, `LogoutButton`
- Build all error states
- Add print stylesheet
- Test full user flow

### Phase 4: Polish & Deploy
- Responsive design pass (375px, 768px, 1280px)
- Error handling pass
- Accessibility pass (focus rings, aria-labels, keyboard nav)
- Security verification (Section 8.3 checklist)
- Deploy to Vercel
- End-to-end testing on production
- Create README.md

---

## 5. Key Architectural Decisions

| Decision                          | Rationale                                                    |
| --------------------------------- | ------------------------------------------------------------ |
| Single `electors` table (no FK)   | Flat lookup app, normalization adds complexity with no benefit |
| `BIGSERIAL` PK, not UUID          | Smaller, faster, EPIC is the natural business key            |
| `VARCHAR(11)` for EPIC            | 10-char format + 1-char safety buffer                        |
| `TEXT` for name/address           | Indian names/addresses have no fixed length                  |
| Server Components for profile     | No client fetch waterfall, smaller JS bundle                 |
| RLS as security boundary          | Middleware is UX only; RLS enforces at DB level              |
| Upsert (ON CONFLICT DO UPDATE)    | Makes ETL idempotent and re-runnable                         |
| `photo_url` in schema but NULL    | Avoids migration later; harmless as NULL                     |

---

## 6. File Structure Reference

```
project-root/
├── etl/                    # Python ETL pipeline
│   ├── extract.py
│   ├── clean.py
│   ├── validate.py
│   ├── ingest.py
│   ├── main.py
│   ├── schema.sql
│   ├── requirements.txt
│   ├── .env                # NEVER commit
│   ├── .env.example
│   └── output/
├── web/                    # Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── profile/[epic]/page.tsx
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── ProfileCard.tsx
│   │   ├── ProfileTable.tsx
│   │   ├── ViewToggle.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LogoutButton.tsx
│   │   └── PhotoPlaceholder.tsx
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── utils.ts
│   │   └── types.ts
│   ├── middleware.ts
│   ├── .env.local          # NEVER commit
│   └── .env.example
├── data/                   # Raw source files (gitignored)
│   ├── excel/
│   └── pdf/
├── docs/
│   └── build-prompt.md
├── AGENTS.md               # This file
├── progress.md             # Build progress tracker
├── .gitignore
└── README.md
```

---

## 7. EPIC Number — The Most Important Field

- **Format:** 3 uppercase letters + 7 digits = exactly 10 characters
- **Regex:** `^[A-Z]{3}\d{7}$`
- **Example:** `TYA0633792`
- It is the **search key**, **unique constraint**, and **URL parameter**.
- Always **normalize** user input: uppercase + strip non-alphanumeric.
- Always **validate** before querying the database.

---

## 8. Security Essentials

1. RLS enabled on `electors` → only `authenticated` role can `SELECT`
2. `anon` role explicitly denied
3. No `INSERT/UPDATE/DELETE` policies for `authenticated`
4. Service role key used **only** in ETL, **never** in web app client code
5. Middleware redirects unauthenticated users to `/login`
6. All cookies: `httpOnly`, `secure` (production), `sameSite=lax`
7. No PII logged anywhere
8. `.env` and `.env.local` in `.gitignore`

---

## 9. Free-Tier Constraints

| Service   | Limit                  | Mitigation                                            |
| --------- | ---------------------- | ----------------------------------------------------- |
| Supabase  | 500MB DB, 2 projects   | ~100MB used for 200k rows; single project only        |
| Supabase  | Pauses after 7d idle   | Optional: free cron ping every 5 days                 |
| Supabase  | No backups (free)      | Source Excel/PDF files are the backup; ETL re-runs    |
| Vercel    | Hobby plan, 100GB BW   | Internal tool, minimal traffic                        |
| Vercel    | Non-commercial use     | Private internal tool qualifies; monitor if scales    |
