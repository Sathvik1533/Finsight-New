# FinSight Struggle Log
# What broke, why, and how we fixed it — so we never repeat it.

---

## Session Summary: May 17, 2026

### What We Were Trying to Do
Take FinSight from 6.5/10 to 10/10 — deployed, polished, internship-portfolio-ready.

---

## Struggles & Root Causes

### 1. Supabase Project Dead (NXDOMAIN)
**Symptom:** "Failed to fetch" on signup. Supabase URL returned NXDOMAIN.
**Root cause:** Old project `wlwmyioejjyerzvkpyph` was deleted by Supabase (free tier deletes after 7 days paused).
**Fix:** Found correct project `kozpikxdqddslrttazio` from dashboard URL. Updated `.env.local`.
**Prevention:** Never let Supabase free project sit idle for more than 5 days without activity.

### 2. Email Rate Limit Exceeded
**Symptom:** "Email rate limit exceeded" on signup.
**Root cause:** Supabase free tier allows only 2 confirmation emails per hour.
**Fix:** Supabase dashboard → Authentication → Sign In / Providers → Email → toggle off "Confirm email" → Save.
**Prevention:** Always disable email confirmation during development. Re-enable only before production launch.

### 3. FastAPI Can't Run From iCloud Path
**Symptom:** FastAPI starts but behaves unexpectedly / crashes with file access errors.
**Root cause:** iCloud Drive randomly pauses syncing, making Python file reads slow or fail.
**Fix:** Copy backend out of iCloud every session:
```bash
cp -r "/Users/k.sathvik/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Finsight-New/fastapi" ~/Desktop/finsight-backend-local
cd ~/Desktop/finsight-backend-local
uvicorn main:app --reload --port 8000
```
**Prevention:** Always run backend from `~/Desktop/finsight-backend-local`. Never from iCloud path.

### 4. Port 3000 Already In Use
**Symptom:** Next.js starts on 3001 instead of 3000. Auth redirects fail.
**Root cause:** Another process holding port 3000.
**Fix:** Either kill the other process (`lsof -ti:3000 | xargs kill`) or update `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3001
```
**Prevention:** Always check which port Next.js started on before testing.

### 5. Multiple Duplicate FinSight Folders Causing Confusion
**Symptom:** Editing the wrong folder, changes not appearing.
**Root cause:** Three folders existed: `Finsight New ` (real, 1.1GB), `Finsight New` (screenshots, 472KB), `FinSightProject` (empty shell, 2.2MB).
**Fix:** Renamed real project to `Finsight-New`. Deleted the other two.
**Prevention:** Only one folder per project. Name it with a hyphen, no trailing space.

### 6. UI Feeling Generic (50+ Iterations Without Desired Output)
**Symptom:** Every redesign felt like "dark Vercel/Linear clone." No unique identity.
**Root cause:** Building from AI memory instead of researched palettes. Dark template was being applied blindly.
**Fix:** 
- Researched 10 real fintech sites (Binance, Revolut, Jupiter, Fi, Razorpay, Zerodha, Stripe, etc.)
- Extracted exact hex values from each
- Derived `#09090f` (warm-ink dark) + `#f0b429` (gold) as FinSight identity
- Created `VISION.md` with the full system
- Created `~/.claude/UI-SYSTEM.md` and updated `~/.kiro/steering/ui-design-standards.md`
**Prevention:** Always research real products before picking colors. Never use default AI palette suggestions.

### 7. Design Repos Not Being Used
**Symptom:** Right side Claude claiming to use the design repos but output showed no evidence.
**Root cause:** Repos were cloned but never actually read before building.
**Fix:** Explicit instruction to Read the files before building:
```
Read /Users/k.sathvik/claude-global-repos/awesome-design-md/README.md
Read /Users/k.sathvik/claude-global-repos/ui-ux-pro-max-skill/README.md
```
**Prevention:** Every session starts with: "Read VISION.md, read the design repos, then build."

### 8. Dashboard Showing "Failed to Load" for Everything
**Symptom:** All dashboard sections show errors. Contractors page completely broken.
**Root cause:** FastAPI backend not running. Frontend tries to fetch from `localhost:8000` which is offline.
**Fix:** Start the backend (see Fix #3 above).
**Prevention:** Two terminals always open: one for `bun dev`, one for `uvicorn`.

### 9. Contractors "Failed to Create"
**Symptom:** Add Contractor modal shows "Failed to create contractor" error.
**Root cause:** Backend not running (same as #8) OR Supabase RLS policy blocking insert.
**Fix:** Check backend first. If running, check Supabase → Table Editor → contractors → RLS policies.

---

## The Lesson From All of This

**The real problem was never the code. It was always:**
1. Wrong environment (iCloud, wrong port, dead Supabase project)
2. No design system (building from AI memory instead of research)
3. No VISION document (re-explaining everything every session)

**The solution:**
- `VISION.md` — project-specific identity, palette, page structure
- `~/.claude/UI-SYSTEM.md` — universal god-level UI rules
- `~/.kiro/steering/ui-design-standards.md` — auto-loaded in every Kiro session
- This `STRUGGLE.md` — so we never debug the same problem twice

### 10. MCP Servers Not Connecting After settings.json Update
**Symptom:** Added `aceternityui-mcp` to `~/.claude/settings.json` but tools never appeared in session. Restarted VS Code multiple times.
**Root cause:** Claude Code VS Code extension has two config files — `settings.json` and `settings.local.json`. The extension was reading from a different location. Also, the MCP server (`aceternityui-mcp`) starts fine via CLI but its tools list was empty on first handshake.
**Fix:**
- Added to BOTH `~/.claude/settings.json` AND `~/.claude/settings.local.json`
- Created project-level `.mcp.json` in the project root — this is the most reliable way
- Manually called the MCP via node subprocess to get component list directly
**Prevention:** Always create `.mcp.json` at project root for project-specific MCPs. Use `settings.local.json` for global MCPs. Verify with: `node -e "require('child_process').spawn('npx',['mcp-name'],{stdio:'inherit'})"` to check if MCP responds to tools/list before wasting time restarting.

### 11. Supabase Missing Columns — `gst_head` Not Found
**Symptom:** Receipt upload fails with: `Database error: Failed to write transaction: Could not find the 'gst_head' column of 'transactions' in the schema cache`
**Root cause:** Migration `003_gst_columns.sql` was written and committed but never actually run against the Supabase database. The `transactions` table was missing `gst_head`, `gst_rate`, and `itc_eligible` columns.
**Fix:** Run the SQL manually in Supabase SQL Editor:
```sql
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS gst_head TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate TEXT,
  ADD COLUMN IF NOT EXISTS itc_eligible BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  monthly_limit NUMERIC(12, 2) NOT NULL CHECK (monthly_limit > 0),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, category)
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "budgets_own" ON budgets FOR ALL USING (auth.uid() = user_id);
```
**Prevention:** After writing any `.sql` migration file, immediately run it in Supabase dashboard. Never assume it auto-applies. Keep a checklist: "migration written ✓ → migration applied ✓".

### 12. UI Feeling Like a Template (Not a Real Product)
**Symptom:** Dashboard looked like assembled Lego blocks — cards with text dropped in, no visual weight, no hierarchy, no soul.
**Root cause:** Building components in isolation and stacking them, rather than designing the page as a whole experience. Also relying on AI-generated layout patterns instead of studying what makes real SaaS dashboards feel alive.
**What makes dashboards feel alive:**
- Personal greeting with the user's name
- Headline that changes based on actual data state
- Numbers that count up (AnimatedNumber)
- Cards with depth — mouse-tracking glare (GlareCard)
- Ambient glow effects in background
- Empty states that invite action, not just say "No data"
- Staggered entrance animations (not everything appearing at once)
**Fix:** Rewrote dashboard with BlurFade, GlareCard, AnimatedNumber, BackgroundBeams on empty state, personal greeting, data-driven headlines.
**Prevention:** Before building any dashboard page: (1) screenshot a real SaaS you admire, (2) identify 3 things that make it feel alive, (3) implement those 3 things first.

---

## Pending Work (As of May 17, 2026)

- [ ] Sidebar layout shell — `src/app/(dashboard)/layout.tsx`
- [ ] Dashboard page redesigned with new palette
- [ ] Receipts page — full list + filters + upload
- [ ] Contractors page — fix "Failed to load" error
- [ ] Reports page — CA PDF export
- [ ] Budgets page — category limits + progress bars
- [ ] FastAPI backend running end-to-end (real receipt upload working)
- [ ] Deploy — Vercel (frontend) + Railway (backend)
- [ ] RESUME.md updated with real latency numbers + live URL
- [ ] GitHub commit history cleaned up (11 semantic commits)
- [ ] Demo video recorded
