# Deployment Guide — Elector Lookup Portal

> Step-by-step instructions for deploying the application to production.

---

## 1. Prerequisites

Before deploying, ensure:

- [ ] **Phase 1 complete:** ETL pipeline written and data ingested into Supabase
- [ ] **Phase 2 complete:** Auth working (login, logout, route protection)
- [ ] **Phase 3 complete:** Full application working locally (`npm run dev`)
- [ ] **Phase 4 checks:** Responsive design, accessibility, and security checklist passed

---

## 2. Supabase Setup (One-Time)

### 2.1 Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose organization, name the project, set a strong database password
4. Select the **closest region** to your client
5. Wait for the project to initialize (~2 minutes)

### 2.2 Note Your Credentials

From **Project Settings → API**:
- `Project URL` → this is `SUPABASE_URL`
- `anon public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` key → this is `SUPABASE_SERVICE_ROLE_KEY` (ETL only!)

From **Project Settings → Database**:
- `Connection string` (URI format) → this is `DATABASE_URL`

### 2.3 Run Schema Script

1. Go to **SQL Editor** in Supabase dashboard
2. Paste the contents of `etl/schema.sql`
3. Click **Run**
4. Verify:
   ```sql
   SELECT count(*) FROM electors;  -- Should return 0
   SELECT * FROM pg_policies WHERE tablename = 'electors';  -- Should show 2 policies
   ```

### 2.4 Configure Auth

1. Go to **Authentication → Providers → Email**
2. **Turn OFF** "Allow new users to sign up" (disables public registration)
3. Go to **Authentication → Users**
4. Click **"Add user"** for each team member:
   - Enter their email and a temporary password
   - Check **"Auto Confirm User"**
5. Repeat for all team members

### 2.5 Ingest Data via ETL

```bash
cd etl
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Test on small sample first
python main.py --source ../data --dry-run --verbose

# If good, run full ingestion
python main.py --source ../data --ingest
```

---

## 3. Vercel Deployment

### 3.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Login to Vercel

```bash
vercel login
```

### 3.3 Deploy

```bash
cd web
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No (first time)
- **What's your project's name?** `elector-lookup-portal` (or similar)
- **In which directory is your code located?** `./` (current directory)
- **Want to modify settings?** No

### 3.4 Set Environment Variables

In the **Vercel dashboard** (not in code):

1. Go to your project → **Settings → Environment Variables**
2. Add:

| Key | Value | Environments |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview, Development |

> ⚠️ Do NOT add `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` to Vercel. These are ETL-only.

### 3.5 Production Deploy

```bash
vercel --prod
```

### 3.6 Verify Production

1. Visit the production URL provided by Vercel
2. You should see the login page
3. Log in with a test account
4. Search for a known EPIC number
5. Verify profile renders correctly
6. Test on mobile device
7. Test logout

---

## 4. Post-Deployment Checklist

### Security Verification

- [ ] Visit production URL without auth → redirected to `/login`
- [ ] Login with valid credentials → reaches `/dashboard`
- [ ] Login with invalid credentials → error message shown
- [ ] Search for known EPIC → profile displayed
- [ ] Search for non-existent EPIC → "No elector found" message
- [ ] Direct API call without auth → `401` response
- [ ] Logout → redirected to `/login`

### Performance Check

- [ ] Profile page loads in < 2 seconds
- [ ] No console errors in browser DevTools
- [ ] Mobile layout works at 375px width

### Domain & SSL

- [ ] Vercel provides automatic HTTPS ✅
- [ ] (Optional) Custom domain: add in Vercel dashboard → Domains

---

## 5. Keeping the Database Alive (Free Tier)

Supabase free tier pauses the database after **7 days of inactivity**. Options:

### Option A: Natural Usage (Recommended)
If the client uses the app at least once a week, the database stays awake. No action needed.

### Option B: Free Cron Ping
Set up a free cron job to ping the app every 5 days:

1. Go to [cron-job.org](https://cron-job.org) (free)
2. Create a new cron job:
   - URL: `https://your-app.vercel.app/login` (any page)
   - Schedule: Every 5 days
3. This keeps the Supabase database from pausing

---

## 6. Updating Data

When the client provides new/updated source files:

```bash
# Place new files in data/excel/ or data/pdf/
cd etl
venv\Scripts\activate

# Dry run first
python main.py --source ../data --dry-run --verbose

# If report looks good, ingest
python main.py --source ../data --ingest
```

The upsert ensures:
- **New records** are inserted
- **Existing records** (same EPIC) are updated with new values
- **No duplicates** are created

---

## 7. Troubleshooting Production Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Login fails on production | Missing env vars in Vercel | Check Settings → Environment Variables |
| "Something went wrong" on search | Supabase database paused | Wait 5 seconds, retry. Set up cron ping. |
| 404 on `/dashboard` | Build failed or wrong root directory | Check Vercel build logs |
| CORS errors | Supabase URL mismatch | Verify `NEXT_PUBLIC_SUPABASE_URL` matches exactly |
| Slow first load after idle | Supabase cold start | Normal on free tier (~3-5s). Second request is fast. |

---

## 8. Rollback Strategy

Since there's no CI/CD pipeline in v1:

- **Code rollback:** `git revert` the problematic commit, push to trigger redeploy
- **Data rollback:** Re-run ETL from original source files (they are the backup)
- **Full reset:** `TRUNCATE TABLE electors;` in SQL Editor + re-run ETL
