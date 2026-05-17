# FinSight — Layer Progress Log
# Every layer: what it was, what broke, how we fixed it, and what we learned.

---

## LAYER 1 — Foundation (Backend + Navigation + First Receipt)
**Status: ✅ COMPLETE**
**Completed: 17 May 2026**

### What Layer 1 Was
Get the full foundation working end-to-end:
- FastAPI backend running and healthy
- Navigation shell (sidebar) wrapping all authenticated pages
- One real receipt processed through the full AI pipeline
- Dashboard showing real data from the database

---

### Step 1.1 — Start the Backend

**Goal:** `curl localhost:8000/health` returns 200.

**What we did:**
- Copied FastAPI out of iCloud to `~/Desktop/finsight-backend-local`
  - Why: iCloud randomly pauses file syncing, causing Python file reads to fail mid-request
- Created `.env` with Supabase URL, service role key, and Groq API key
- Installed dependencies: `uv pip install -r requirements.txt`
- Started server: `uvicorn main:app --reload --port 8000`

**Result:** `{"status":"ok","environment":"development","models":{"groq_vision":true,"groq_categorization":true}}`

**Rule learned:** Always run the backend from `~/Desktop/finsight-backend-local`. Never from the iCloud path. Do this at the start of every session.

---

### Step 1.2 — Navigation Shell

**Goal:** Sidebar visible and active on every authenticated page.

**What we did:**
- Built `src/app/(dashboard)/layout.tsx`
- 220px fixed left sidebar with: logo, Upload CTA, 5 nav links, user email, sign out
- Active link: gold left border + gold text + gold-dim background
- Page transitions: Framer Motion fade on every route change
- Initially built as top navbar (user changed mind to sidebar)

**Error: Wrong port**
- Browser hitting `localhost:3000`, dev server on `3001` (or vice versa)
- Root cause: `.env.local` had `NEXT_PUBLIC_APP_URL=http://localhost:3000` but Next.js started on 3001 because something else held 3000
- Fix: Match `.env.local` to whatever port Next.js actually starts on. Check the terminal output after `bun dev`.

**Rule learned:** After every `bun dev`, look at what port Next.js says it started on. Update `.env.local` if needed. Restart after changing `NEXT_PUBLIC_*` vars.

---

### Step 1.3 — Real Receipt Upload (End-to-End)

**Goal:** Upload a real receipt photo → OCR → GST category → stored in DB → visible in dashboard.

---

**Error 1: `gst_head column does not exist`**

**Symptom:** Upload failed immediately with database error.

**Root cause:** Migration file `supabase/migrations/003_gst_columns.sql` existed in the codebase but was never actually executed against the Supabase database. The `transactions` table was missing three columns: `gst_head`, `gst_rate`, `itc_eligible`.

**Fix:** Ran in Supabase SQL Editor (`supabase.com/dashboard/project/kozpikxdqddslrttazio/sql/new`):
```sql
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS gst_head TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate TEXT,
  ADD COLUMN IF NOT EXISTS itc_eligible BOOLEAN DEFAULT FALSE;
```

**Rule learned:** Writing a `.sql` migration file does NOT apply it. You must manually run it in the Supabase SQL Editor. After writing any migration, immediately run it and verify with a SELECT.

---

**Error 2: `null value in column "id" violates not-null constraint`**

**Symptom:** OCR worked, AI categorisation worked, but database write failed.

**Root cause:** The `transactions` table was created with:
```sql
id UUID NOT NULL
```
No `DEFAULT gen_random_uuid()`. The FastAPI backend never sends an `id` — it expects Postgres to auto-generate a UUID. But Postgres had no instruction to do that, so `id` arrived as `null` → constraint violation → insert rejected.

**Fix:** Ran in Supabase SQL Editor:
```sql
ALTER TABLE transactions 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

**Rule learned:** `NOT NULL` alone does not auto-generate values. Every table's primary key needs `DEFAULT gen_random_uuid()` explicitly. Always check this when creating tables.

---

**Error 3: Receipt processed but dashboard shows nothing**

**Symptom:** Upload succeeded (green success state in modal), but dashboard still showed "no receipts yet."

**Root cause:** The dashboard API fetched transactions with a date filter:
```sql
WHERE transaction_date >= (today - 30 days)
```
But the receipt's extracted date came from the bill itself. If you uploaded an old Swiggy/Airtel receipt from 2022, it stored that old date — which fell outside the 30-day window. Dashboard query returned zero rows.

**Fix 1:** Removed date filter from KPI fetching in `src/app/api/dashboard/summary/route.ts`. Now fetches ALL transactions for the user. Chart still filters by date window, but counts and lists show everything.

**Fix 2:** Added 800ms delay before dashboard refetch after upload, to give Supabase time to commit the row before Next.js re-queries.

**Rule learned:** Date filters hide old receipts. For an MVP, always fetch all data and filter in the UI. Also: after any write operation, wait ~1 second before reading back — databases need time to commit.

---

### Layer 1 Final Verification

| Check | Result |
|---|---|
| `curl localhost:8000/health` = 200 | ✅ |
| Sidebar visible on every authenticated page | ✅ |
| One real receipt processed end-to-end | ✅ |
| Receipt appears in dashboard after upload | ✅ |
| No "Failed to load" errors anywhere | ✅ |

---

### The Pattern Behind All Layer 1 Errors

1. **Migrations written ≠ migrations applied.** The file existing in `/supabase/migrations/` means nothing until you run it.
2. **Postgres needs explicit defaults.** `NOT NULL` alone doesn't generate UUIDs. Always add `DEFAULT gen_random_uuid()`.
3. **Date filters hide old-dated data.** Receipts carry the date printed on them, not today's date. Fetch all, filter in UI.
4. **iCloud breaks Python.** Always copy backend out of iCloud before starting.
5. **Port must match.** `NEXT_PUBLIC_APP_URL` must match where Next.js actually started.

---

## LAYER 2 — All Pages Working
**Status: 🔄 IN PROGRESS**

### What Layer 2 Is
Every page must exist and show real data:
- Dashboard: 4 stat cards + chart + recent receipts list
- Receipts: full table + filters + drag-drop upload
- Receipt detail: image preview + extracted fields + GST breakdown
- Contractors: fix errors + risk score badges + add modal
- Reports: GST summary table + PDF export
- Budgets: category limits + progress bars + alerts

### Layer 2 Completion Checklist
- [ ] Dashboard page — 4 real KPI cards, chart, recent receipts
- [ ] Receipts page — table, filters, upload
- [ ] Receipt detail page — image + fields + GST
- [ ] Contractors page — list + risk scores + add modal (no errors)
- [ ] Reports page — GST summary + PDF export working
- [ ] Budgets page — limits + progress bars + set budget modal
- [ ] All 6 pages load with real data
- [ ] Upload → process → appears in receipts list (end-to-end verified)
- [ ] PDF export downloads correctly
- [ ] No broken pages

---

## LAYER 3 — God-Level UI/UX
**Status: ⏳ PENDING**

### What Layer 3 Is
Apply the full design system. Every page must feel premium, alive, and personal.

### Layer 3 Checklist (11 points)
- [ ] Color from researched palette (`#09090f` bg, `#f0b429` gold, `#16a34a` green)
- [ ] Sora for headings, Inter for body, JetBrains Mono for all numbers
- [ ] Hero shows actual product working (not illustrations)
- [ ] Empty states: icon + message + CTA (never just "No data")
- [ ] Skeleton loaders on all data sections
- [ ] Error states with retry button
- [ ] Framer Motion on every interactive element
- [ ] Page entrance animations (opacity 0→1, y 16→0, 0.5s)
- [ ] Indian number format: ₹1,24,000
- [ ] Indian date format: 17 May 2026
- [ ] 4 feelings: Confidence + Relief + Ambition + Delight

---

## LAYER 4 — Deploy
**Status: ⏳ PENDING**

- [ ] `vercel deploy` from Finsight-New → get live URL
- [ ] Deploy FastAPI to Railway → get backend URL
- [ ] Update `NEXT_PUBLIC_FASTAPI_URL` in Vercel env vars
- [ ] Upload a real receipt on production URL
- [ ] Measure and record real end-to-end latency

---

## LAYER 5 — Portfolio Polish
**Status: ⏳ PENDING**

- [ ] Update RESUME.md with real numbers + live URL
- [ ] 11 semantic git commits telling the build story
- [ ] README with live URL + tech stack + how to run
- [ ] 2-minute demo video: signup → upload → GST tag → export PDF

---

## Quick Reference — Common Fixes

| Problem | Fix |
|---|---|
| Backend not running | `cd ~/Desktop/finsight-backend-local && source .venv/bin/activate && uvicorn main:app --reload --port 8000` |
| Wrong port | Check terminal after `bun dev`. Match `.env.local` `NEXT_PUBLIC_APP_URL` to that port. Restart. |
| Column doesn't exist | Run the migration SQL in Supabase SQL Editor manually |
| `null value in column "id"` | `ALTER TABLE x ALTER COLUMN id SET DEFAULT gen_random_uuid();` |
| Dashboard shows no data after upload | Check if receipt date is old — remove date filter from API |
| Supabase project dead | Check `supabase.com/dashboard` — free tier deletes after 7 days paused |
| iCloud breaking Python | Copy backend: `cp -r "...iCloud.../fastapi" ~/Desktop/finsight-backend-local` |
