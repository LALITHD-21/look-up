# Security Checklist — Elector Lookup Portal

> **Run through this checklist after Phase 2 and again after Phase 4.**
> Every item must be verified before production deployment.

---

## Authentication

- [ ] Supabase Auth enabled
- [ ] Public sign-ups **disabled** (Authentication → Providers → Email → "Allow new users to sign up" OFF)
- [ ] All users created **manually** by admin in Supabase dashboard
- [ ] Session cookies: `httpOnly`, `secure` (production), `sameSite=lax`
- [ ] "Confirm email" = false for manually created users (already verified)

## Authorization (Database)

- [ ] RLS **enabled** on `electors` table
- [ ] `SELECT` policy: only `authenticated` role can read
- [ ] **Explicit denial** policy for `anon` role
- [ ] **No** `INSERT`/`UPDATE`/`DELETE` policies for `authenticated` role
- [ ] Service role key used **only** in ETL script, **never** in client code
- [ ] Verify with: `SELECT * FROM pg_policies WHERE tablename = 'electors';`

## Route Protection

- [ ] `middleware.ts` protects `/dashboard` and `/profile/*`
- [ ] Unauthenticated users redirected to `/login`
- [ ] Authenticated users on `/login` redirected to `/dashboard`
- [ ] Post-login redirect via `?redirect=` query parameter works

## Data Protection

- [ ] No PII in `console.log()` or Vercel logs
- [ ] No PII in URL parameters except `epic_number` (unavoidable — it's the search key)
- [ ] HTTPS enforced (Vercel does this by default)
- [ ] Environment variables properly separated (`NEXT_PUBLIC_` vs server-only)
- [ ] `.env` and `.env.local` are in `.gitignore`
- [ ] `.env.example` is committed (no real values)

## API Security

- [ ] All DB queries go through Supabase client with `anon` key
- [ ] RLS enforces auth even if frontend is bypassed
- [ ] No raw SQL exposed to the client
- [ ] Supabase REST API not directly called for writes from client

## Secrets Management

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **only** in `etl/.env`
- [ ] `DATABASE_URL` is **only** in `etl/.env`
- [ ] Both ETL `.env` files are gitignored
- [ ] Vercel env vars set in Vercel dashboard, not in code
- [ ] No secrets in client-side JavaScript (`NEXT_PUBLIC_` keys are public by design — that's OK)

## Verification Tests

- [ ] `curl` Supabase REST API without auth token → `401 Unauthorized`
- [ ] `curl` Supabase REST API with anon key only → empty result (RLS blocks)
- [ ] Attempt `INSERT` via authenticated Supabase client → rejected (no policy)
- [ ] Visit `/profile/invalid-format` → "Invalid EPIC format" error
- [ ] SQL injection attempt in search bar → normalized to alphanumeric, no injection

---

## Photo Security (⚠️ PENDING — Skip Until Confirmed)

- [ ] ~~Photo URLs are signed (not public) if photos contain PII~~
- [ ] ~~Storage bucket policies restrict access to authenticated users~~
- [ ] ~~Photos served from Supabase Storage, not proxied through Next.js~~

---

## Sign-off

| Reviewer | Date | All checks passed? |
| -------- | ---- | ------------------- |
|          |      |                     |
