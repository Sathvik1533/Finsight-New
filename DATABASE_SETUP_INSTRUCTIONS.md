# FinSight Database Setup — Phase 1 Only

## Overview

This guide walks you through setting up the FinSight database schema in Supabase. You will execute **Phase 1 only**, which includes:

1. Extensions
2. Core Tables (6 tables)
3. Constraints (embedded in table definitions)
4. Functions & Triggers (5 functions)
5. Row Level Security (RLS policies)
6. Indexes (Phase 1 standard indexes)
9. Verification Queries

**Excluded from Phase 1:**
- Phase 2: pg_trgm search indexes
- Phase 4: pgvector embeddings + materialized views

---

## Prerequisites

Before you begin:

1. **Supabase Project Created**
   - Region: `ap-south-1` (Mumbai) — CANNOT be changed after creation
   - Plan: Pro ($25/month) — required for PgBouncer + PITR

2. **API Keys Copied**
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Storage Bucket Created**
   - Name: `receipts`
   - Access: **Private** (not public)

4. **Authentication Configured**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/api/auth/callback`
   - Google OAuth enabled (optional for Phase 1)

---

## Step-by-Step Execution

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Execute Phase 1 Schema

1. Open the file: `supabase/migrations/001_phase1_complete.sql`
2. Copy the **entire contents** of the file
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected result:**
- Success message: "Success. No rows returned"
- Execution time: ~2-5 seconds

**If you see errors:**
- Check that you're running in the correct project
- Verify the region is `ap-south-1`
- Ensure no previous schema exists (this is a fresh setup)

### Step 3: Create Storage Bucket (if not done)

If you haven't created the `receipts` bucket yet:

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `receipts`
4. Public: **OFF** (must be private)
5. Click **Create bucket**

### Step 4: Run Verification Queries

1. Open the file: `supabase/migrations/002_verification_queries.sql`
2. Copy the **entire contents**
3. Paste into a new SQL Editor query
4. Click **Run**

**Expected results:**

**Query 1 (RLS enabled):**
```
tablename                  | rowsecurity
---------------------------|------------
conversations              | true
decision_engine_outputs    | true
insights                   | true
profiles                   | true
receipts                   | true
transactions               | true
```

**Query 2 (RLS policies):**
- At least 14 policies across all 6 tables

**Query 3 (Indexes):**
- At least 15 indexes with names starting with `idx_`

**Query 4 (Functions):**
```
routine_name                      | routine_type
----------------------------------|-------------
archive_decision_engine_output    | FUNCTION
get_category_stats                | FUNCTION
handle_new_user                   | FUNCTION
increment_receipt_count           | FUNCTION
set_updated_at                    | FUNCTION
```

**Query 5 (Trigger):**
```
trigger_name          | event_manipulation | action_timing | event_object_table
----------------------|--------------------|---------------|-------------------
on_auth_user_created  | INSERT             | AFTER         | users
```

**Query 6 & 7 (Function tests):**
- Both should output: `NOTICE: [function_name] test PASSED`

**Query 8 (Extensions):**
```
extname   | extversion
----------|------------
pg_cron   | [version]
pg_trgm   | [version]
vector    | [version]
```
Note: `pg_cron` may not be available on all Supabase plans. This is OK for Phase 1.

**Query 9 (Storage bucket):**
```
name      | public
----------|-------
receipts  | false
```

---

## Verification Checklist

Before proceeding to the next phase, verify:

- [ ] All 6 tables exist in the **Table Editor**
- [ ] RLS is enabled on all 6 tables (green shield icon)
- [ ] All 5 functions exist in **Database → Functions**
- [ ] All indexes exist in **Database → Indexes**
- [ ] Storage bucket `receipts` exists and is **private**
- [ ] All verification queries passed without errors
- [ ] No red error messages in SQL Editor

---

## Common Issues

### Issue: "relation auth.users does not exist"

**Cause:** Running in the wrong schema or project.

**Fix:** Ensure you're in the Supabase SQL Editor, not a local PostgreSQL instance.

---

### Issue: "extension vector is not available"

**Cause:** pgvector extension not installed on your Supabase instance.

**Fix:** 
1. Go to **Database → Extensions**
2. Search for "vector"
3. Enable the extension
4. Re-run the schema script

---

### Issue: "function storage.foldername does not exist"

**Cause:** Storage policies are being run before the storage schema is ready.

**Fix:**
1. Skip the storage policies section in the main script
2. Create the `receipts` bucket manually in the Storage dashboard
3. Run the storage policies separately after the bucket exists

---

### Issue: Verification query 6 or 7 fails with "Expected X, got Y"

**Cause:** The function logic has a bug or the schema wasn't created correctly.

**Fix:**
1. Check the error message for details
2. Verify the function exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'increment_receipt_count';`
3. If the function doesn't exist, re-run section 04 of the main script

---

## What's Next?

After successful Phase 1 setup:

1. **DO NOT** proceed to Phase 2 database additions yet
2. **DO NOT** run Phase 4 migrations (pgvector, materialized views)
3. **WAIT** for confirmation before moving to the next task

Phase 2 database additions (search indexes) are gated by:
- ≥ 200 active users with Level 2+ data
- Manual approval from product team

Phase 4 additions (vector search, materialized views) are gated by:
- Phase 3 complete
- ≥ 1,000 active users
- Dashboard query latency > 200ms at p95

---

## Environment Variables

After database setup, ensure these are in your `.env.local` (Next.js):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

And in `fastapi/.env` (Python):

```bash
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**CRITICAL:** Never commit these files to Git. Verify `.gitignore` includes:
```
.env
.env.local
.env.production
fastapi/.env
```

---

## Database Schema Summary

**Tables created:**
1. `profiles` — User profiles (extends auth.users)
2. `receipts` — Receipt upload metadata + AI pipeline state
3. `transactions` — Canonical financial records
4. `insights` — AI-generated insights (append-only)
5. `decision_engine_outputs` — Decision Engine results (append-only)
6. `conversations` — LangGraph conversation threads (Phase 5, empty for now)

**Functions created:**
1. `handle_new_user()` — Auto-creates profile on signup
2. `increment_receipt_count()` — Atomic receipt count + intelligence level update
3. `archive_decision_engine_output()` — Ensures single active DE output per user
4. `get_category_stats()` — Returns mean/stddev/count for anomaly detection
5. `set_updated_at()` — Auto-maintains updated_at timestamps

**Indexes created:**
- 15+ indexes covering all common query patterns
- Partial indexes on sparse boolean flags (anomaly, subscription, business expense)
- Composite indexes for user + date/category queries

**RLS policies:**
- 14+ policies ensuring users can only access their own data
- Service role key bypasses RLS (used by FastAPI only)

---

## Support

If you encounter issues not covered in this guide:

1. Check the Supabase logs: **Logs → Postgres Logs**
2. Verify your Supabase plan supports the required features
3. Ensure you're on the latest Supabase version
4. Contact support with the specific error message and query number

---

**Phase 1 Database Setup Complete ✓**

Wait for confirmation before proceeding to the next task.
