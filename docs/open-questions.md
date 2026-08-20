# Open Questions & Decisions — Elector Lookup Portal

> **Living document.** Update as decisions are made during the build.

---

## Open Questions (Require Client/Human Input)

### Q1: ⚠️ Photo Feature — Does the client want photos?
- **Status:** PENDING
- **Impact:** High — affects storage costs, visual quality of profile cards, ETL complexity
- **Action required:** Client must explicitly confirm. If yes, must also provide:
  - Location of actual image files (zip, folder, embedded in PDFs?)
  - Naming convention (e.g., `<EPIC_NUMBER>.jpg`?)
  - Total file size
- **Until resolved:** `photo_url` = `NULL` for all records. Profile shows initials placeholder.

### Q4: Shared credential vs. individual accounts?
- **Status:** OPEN
- **Recommendation:** Individual named accounts (see spec Section 5.3)
- **Impact:** Audit trail, session stability, individual revocation
- **Action required:** Client agreement before Phase 2, step 13

### Q5: Is this data from the public electoral roll or a private dataset?
- **Status:** OPEN
- **Impact:** Legal/privacy obligations, data handling requirements
- **Action required:** Clarify with client

### Q6: How many concurrent users does the client expect?
- **Status:** OPEN
- **Impact:** Supabase plan tier (free handles small teams fine)
- **Action required:** Clarify with client

### Q7: Does the client need export/download from the UI?
- **Status:** OPEN
- **Impact:** Not in v1 scope, but common follow-up request
- **Action required:** Clarify with client

### Q8: Should the app show a "last updated" date?
- **Status:** OPEN
- **Impact:** Minor UX. The `updated_at` column already exists in the schema.
- **Action required:** Discuss with client

---

## Decided Questions

### Q2: Restrict search bar to 10 chars or normalize on submit?
- **Status:** ✅ DECIDED
- **Decision:** Normalize on submit + validate with regex. Do NOT hard-restrict typing.
- **Rationale:** Better UX — user can paste freely, normalization handles cleanup.

### Q3: Will the client need name search in the future?
- **Status:** ✅ DECIDED → DEFERRED
- **Decision:** Not in v1. Schema already supports it (add `pg_trgm` GIN index when needed).
- **Rationale:** Only EPIC search is required now. Adding name search later is a minor migration.

---

## Decisions Made During Build

| # | Decision | Date | Context | Outcome |
|---|----------|------|---------|---------|
| | (will be filled as build progresses) | | | |
