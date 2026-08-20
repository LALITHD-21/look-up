# Elector Lookup Portal — Glossary

| Term | Definition |
|------|-----------|
| **EPIC** | Elector's Photo Identity Card number. Unique 10-character voter ID: 3 uppercase letters + 7 digits (e.g., `TYA0633792`). |
| **ETL** | Extract, Transform, Load. The process of reading raw data, cleaning it, and inserting it into the database. |
| **RLS** | Row Level Security. PostgreSQL feature that restricts which rows a user can read/write based on policies. |
| **PII** | Personally Identifiable Information. Data that can identify a specific individual (name, address, age, etc.). |
| **RSC** | React Server Component. Next.js App Router feature where components render on the server and send HTML to the client. |
| **Anon Key** | The public Supabase API key. Safe to expose in the browser. Access is enforced by RLS policies. |
| **Service Role Key** | The admin Supabase API key. Bypasses RLS entirely. NEVER exposed to the browser. Used only in the ETL script. |
| **VTG** | Village/Town/Gram. Part of the address field in Indian electoral rolls. |
| **Upsert** | `INSERT ... ON CONFLICT DO UPDATE`. Inserts a new row, or updates it if a row with the same unique key already exists. Used for idempotent ETL runs. |
| **MAU** | Monthly Active Users. Supabase's pricing metric for Authentication. |
| **B-Tree Index** | The default PostgreSQL index type. Optimized for exact-match and range queries. Used on `epic_number`. |
| **pg_trgm** | PostgreSQL extension for trigram-based similarity matching. Would be used if name search is ever needed (deferred). |
| **GIN Index** | Generalized Inverted Index. Used with `pg_trgm` for fuzzy text search. Not created in v1. |
| **PgBouncer** | Connection pooler used by Supabase for managing database connections efficiently. |
| **httpOnly Cookie** | A cookie that cannot be accessed by client-side JavaScript. Used for session tokens to prevent XSS attacks. |
| **sameSite** | Cookie attribute that controls cross-site request behavior. Set to `lax` for session cookies. |
| **Cold Start** | Delay when a paused Supabase free-tier database receives its first request after 7+ days of inactivity (~3-5 seconds). |
