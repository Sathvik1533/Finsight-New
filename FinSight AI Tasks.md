# FINSIGHT — TASKS.md
## Production Engineering Task Registry
```
Version:         1.0.0
Classification:  Internal — Engineering Execution
Consumes:        TECH_STACK_v2.md · PRD_v2.md · STAGE_GUIDE.md v1.1 · UI_GENERATOR_SPEC.md v2.0
Phases:          5 (Phase 1–3 are buildable now; Phase 4–5 require Phase 3 data)
Ownership codes: BE = Backend (Kiro) · FE = Frontend (v0/dev) · INT = Integration (you)
Priority codes:  CRITICAL = blocks next task · IMPORTANT = needed for phase completion · OPTIONAL = additive
```

---

## HOW TO READ THIS DOCUMENT

Each task has:
- A unique ID (e.g., `P1-BE-001`) traceable across phases
- An **owner** — who executes it
- A **priority** — what happens if it is skipped
- A **depends on** — which tasks must be ✅ before this one starts
- A **done when** — the specific, verifiable condition that closes the task
- An **integration note** where tasks cross the BE/FE boundary

Tasks are ordered within each phase by execution sequence, not by perceived importance. Do not reorder within a phase.

---

# SECTION 1 — TASK PHILOSOPHY

## 1.1 Modular Development Contract

Every task in this document produces a testable artifact before the next task begins. There are no tasks that say "build the whole X." Every task is the smallest unit of work that produces a verifiable output.

**The rule:** A task is not complete until its "done when" condition is met and verified. Marking a task complete based on code written (not behavior verified) is not completion.

## 1.2 Backend-First Execution Order

Within each phase, backend tasks are sequenced before frontend tasks. This is not a preference — it is a dependency. Frontend components that call APIs that don't exist yet cannot be tested. Frontend built against mocked data requires a second pass when the real API lands. Building backend-first eliminates that rework.

The one exception: UI scaffolding (project setup, routing, global layout) can proceed in parallel with backend setup because it has no API dependencies.

## 1.3 No Breaking the Pipeline

The AI pipeline (NVIDIA → Groq → Gemini) is sequential and stateful. Each stage's output is the next stage's input. A bug introduced at Stage 2 (categorization) does not surface until the user's dashboard is wrong, which may be hours after the upload. Every pipeline task has an integration test requirement before it is considered done.

The pipeline must work end-to-end before any frontend work begins on the upload flow. This means:
- `P1-BE-010` (full pipeline smoke test) gates `P1-FE-003` (upload modal with real pipeline).

## 1.4 Security Is Not a Task — It Is a Constraint

Security rules from TECH_STACK_v2.md §8 apply to every task. They are listed here once and not repeated per task:
- No AI provider API key in any Next.js file, ever
- User ID comes from session token only — never from request body
- All Supabase service role operations happen in FastAPI only
- Pre-commit secret scan runs before every push to `main`

---

# SECTION 2 — TASK DEPENDENCY GRAPH

```
PHASE 1 — CORE PIPELINE
P1-BE-001 → P1-BE-002 → P1-BE-003 → P1-BE-004
                              ↓
P1-BE-005 → P1-BE-006 → P1-BE-007 → P1-BE-008 → P1-BE-009 → P1-BE-010
                                                                    ↓
P1-FE-001 → P1-FE-002 → P1-FE-003 (requires P1-BE-010) → P1-FE-004 → P1-FE-005
                                                                    ↓
P1-INT-001 → P1-INT-002 → P1-INT-003

PHASE 2 — INTELLIGENCE (requires all P1 tasks complete)
P2-BE-001 → P2-BE-002 → P2-BE-003 → P2-BE-004 → P2-BE-005
                                          ↓
P2-FE-001 → P2-FE-002 → P2-FE-003 (requires P2-BE-003) → P2-FE-004 → P2-FE-005
                                                                    ↓
P2-INT-001 → P2-INT-002

PHASE 3 — DECISION ENGINE (requires Phase 2 complete + 60 days real data)
P3-BE-001 → P3-BE-002 → P3-BE-003 → P3-BE-004 → P3-BE-005 → P3-BE-006
                                                                    ↓
P3-FE-001 → P3-FE-002 → P3-FE-003 (requires P3-BE-006) → P3-FE-004
                                                                    ↓
P3-INT-001 → P3-INT-002

PHASE 4 — SCALE + VECTOR (requires Phase 3 complete + 1,000+ active users)
P4-* tasks are largely independent within the phase

PHASE 5 — AGENTS (requires Phase 4 complete + pgvector deployed)
P5-* tasks are sequential
```

---

# SECTION 3 — PHASE 1: CORE PIPELINE

**Objective:** End-to-end working system. Real user → real receipt → real data → real dashboard. Nothing mocked.
**Duration:** 6–8 weeks (solo) · 3–4 weeks (2-person)
**Gate to Phase 2:** All P1 tasks ✅ + 200+ real users with Level 2 data

---

## P1-BE-001 — Repository and Project Skeleton
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** Nothing

**Tasks:**
- [ ] Initialize Git repository, create private GitHub repo
- [ ] Set up branch strategy: `main` (protected) · `develop` · `feat/*`
- [ ] Create `.gitignore` with all required entries (`.env`, `.env.local`, `fastapi/.env`, `node_modules/`, `.next/`, `__pycache__/`, `*.pyc`)
- [ ] Initialize Next.js 14 project: `npx create-next-app@14 finsight --typescript --tailwind --app --src-dir --import-alias "@/*"`
- [ ] Install all frontend dependencies in one command (see TECH_STACK_v2.md §2)
- [ ] Initialize FastAPI project structure under `fastapi/` subdirectory
- [ ] Create `CLAUDE.md` at project root with content from TECH_STACK_v2.md Appendix
- [ ] Create `.env.example` with all variable names and blank values
- [ ] Configure `tailwind.config.ts` with full FinSight token set from UI_GENERATOR_SPEC.md §2

**Done when:**
- `npm run dev` starts on `localhost:3000` with no TypeScript errors
- `npx tsc --noEmit` returns zero errors
- `git status` does not show `.env.local` as a tracked file
- `fastapi/` directory exists with `main.py`, `requirements.txt`, `Dockerfile`
- Tailwind config has all FinSight color tokens present and no default shadcn overrides

---

## P1-BE-002 — Supabase Project and Schema
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P1-BE-001

**Tasks:**
- [ ] Create Supabase project in region `ap-south-1` (Mumbai)
- [ ] Execute `profiles` table SQL (with `subscription_tier VARCHAR(10) DEFAULT 'free'`)
- [ ] Execute `receipts` table SQL (with `ai_model_used`, `ocr_confidence` columns)
- [ ] Execute `transactions` table SQL (with `categorization_model`, `is_anomalous`, `is_subscription` columns)
- [ ] Execute `insights` table SQL
- [ ] Execute `decision_engine_outputs` table SQL (full schema from TECH_STACK_v2.md §4.2)
- [ ] Execute `handle_new_user()` trigger function and trigger
- [ ] Execute `increment_receipt_count()` function
- [ ] Execute `archive_decision_engine_output()` function
- [ ] Execute all RLS policies for all 5 tables (see TECH_STACK_v2.md §4.4)
- [ ] Execute all indexes (see TECH_STACK_v2.md §4.5) — including partial indexes on `is_anomalous` and `is_subscription`
- [ ] Create `receipts` storage bucket — private mode
- [ ] Execute all 3 storage RLS policies (upload_own, read_own, delete_own)
- [ ] Enable Google OAuth in Supabase Auth dashboard
- [ ] Set Site URL to `http://localhost:3000`
- [ ] Set Redirect URL to `http://localhost:3000/api/auth/callback`
- [ ] Enable email verification for email/password auth
- [ ] Save `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

**Done when:**
```sql
-- Run this query — all 5 tables must return rowsecurity = true
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Test trigger: insert a test auth user → confirm profiles row auto-created
-- with intelligence_level=1, total_receipts_uploaded=0, subscription_tier='free'
```
- All 5 tables: `rowsecurity = true`
- Trigger verified: profile row created on signup
- Storage bucket exists, private, with 3 policies
- `.env.local` populated (not committed to git)

---

## P1-BE-003 — Supabase Client Configuration
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P1-BE-002

**Tasks:**
- [ ] Create `src/lib/supabase/client.ts` — browser client using anon key only
- [ ] Create `src/lib/supabase/server.ts` — server client with full cookie handler (no stubs)
- [ ] Create `src/lib/supabase/middleware.ts` — createMiddlewareClient helper
- [ ] Create `src/middleware.ts` — route protection with full cookie read/set/remove implementation
  - Protected routes: `/dashboard`, `/receipts`, `/insights`, `/settings`
  - Public routes: `/`, `/auth`, `/api/auth/*`
  - `matcher` config excluding `_next/static`, `_next/image`, `favicon.ico`
- [ ] Create `src/types/database.ts` — all interfaces: `Profile`, `Receipt`, `Transaction`, `Insight`, `DecisionEngineOutput`, `TransactionCategory`, `HealthScoreBreakdown`, `GeminiResponse`
- [ ] Create `src/types/receipt.ts`, `transaction.ts`, `insights.ts` — re-exports only, no duplicate definitions

**Done when:**
- A unauthenticated `fetch()` to `/dashboard` in the browser redirects to `/auth` (middleware functioning)
- An authenticated request to `/dashboard` passes through middleware
- TypeScript compiles with zero errors on all type files
- `Profile` interface includes `subscription_tier: 'free' | 'pro' | 'business'`

---

## P1-BE-004 — Authentication System
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P1-BE-003

**Tasks:**
- [ ] Create `src/app/api/auth/callback/route.ts` — Supabase OAuth code exchange → redirect to `/dashboard`
- [ ] Create `src/app/(auth)/auth/page.tsx` — sign-in/sign-up UI with Zod validation schemas
  - Zod: `signInSchema` (email + password min 8 chars)
  - Zod: `signUpSchema` (adds fullName min 2 chars, confirmPassword with refine equality check)
  - Google OAuth button → `supabase.auth.signInWithOAuth({ provider: 'google' })`
- [ ] Create `src/app/(app)/layout.tsx` — server component: validates session, redirects to `/auth` if none, renders `<AppShell>`
- [ ] Create `src/hooks/useUser.ts` — fetches user + profile from Supabase on mount, subscribes to auth state changes
- [ ] Verify `handle_new_user` trigger fires on email signup AND Google OAuth (both paths must create a profile row)

**Done when:**
- Email signup → verification email received → verified → redirected to `/dashboard`
- Google OAuth → redirected to `/dashboard`
- Signing up creates a row in both `auth.users` AND `public.profiles`
- Unauthenticated visit to `/dashboard` → redirected to `/auth`
- Authenticated visit to `/auth` → redirected to `/dashboard`
- `useUser().profile.subscription_tier` returns `'free'` for new users

---

## P1-BE-005 — FastAPI Service Foundation
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P1-BE-002

**Tasks:**
- [ ] Create `fastapi/requirements.txt` with exact pinned versions (see TECH_STACK_v2.md §3.3)
- [ ] Create `fastapi/.env` (not committed) with all required variables:
  - `NVIDIA_NIM_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `FASTAPI_SECRET_KEY` (min 32 chars, random)
  - `ALLOWED_ORIGINS=http://localhost:3000`
- [ ] Create `fastapi/main.py` with:
  - Lifespan function that validates all required env vars on startup — raises `RuntimeError` if any are missing
  - CORS middleware reading `ALLOWED_ORIGINS` from env (never hardcoded)
  - `verify_internal_secret` dependency that rejects requests with invalid/missing `X-Internal-Secret` header
  - `/health` endpoint that checks all three AI provider connections and returns their status
  - Router includes: `analyze.router`, `insights.router`, `decision_engine.router`
- [ ] Create `fastapi/Dockerfile` (FROM python:3.11-slim)
- [ ] Create `fastapi/.env.example` with blank values

**Done when:**
- `cd fastapi && uvicorn main:app --reload` starts on port 8000 without errors
- `GET http://localhost:8000/health` returns `{"status": "ok", "models": {"nvidia": bool, "groq": bool, "gemini": bool}}`
- `POST` to any protected endpoint without `X-Internal-Secret` returns `401`
- A request with wrong secret value returns `401`
- Missing any env var at startup raises `RuntimeError` with the variable name in the message

---

## P1-BE-006 — AI Client Modules
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P1-BE-005

**Tasks:**
- [ ] Create `fastapi/ai_clients/nvidia_nim.py`
  - `AsyncOpenAI` client pointing to `https://integrate.api.nvidia.com/v1`
  - `async def extract_receipt(image_base64: str) -> dict`
  - `temperature=0.0`, `response_format={"type": "json_object"}`, `timeout=12.0`
  - Strips markdown code fences before `json.loads()` (Gemini-compatible fence stripping)
  - Returns parsed dict — raises `ValueError` if confidence < 0.30
- [ ] Create `fastapi/prompts/ocr_extraction_v1.py` — `OCR_EXTRACTION_PROMPT` constant (full prompt from TECH_STACK_v2.md §6.1)
- [ ] Create `fastapi/ai_clients/groq_client.py`
  - `AsyncGroq` client
  - `async def categorize_transaction(extraction_json: dict, user_context: dict = None) -> dict`
  - `temperature=0.0`, `response_format={"type": "json_object"}`, `timeout=5.0`
  - `user_context` param: if not None, inject merchant→category history into system prompt
  - If `confidence < 0.50` in response: override `category = "Other"` before returning
- [ ] Create `fastapi/prompts/categorization_v1.py` — `VALID_CATEGORIES` list + `CATEGORIZATION_SYSTEM_PROMPT` with hard-coded Indian merchant mappings
- [ ] Create `fastapi/ai_clients/gemini_client.py`
  - `genai.configure(api_key=os.getenv("GEMINI_API_KEY"))` at module level
  - `async def generate_insights(transactions: list, time_range: str, patterns: dict) -> dict`
  - `temperature=0.3`, `max_output_tokens=1024`
  - Caps transaction input at 100 items
  - Strips code fences before `json.loads()`

**Done when:**
- Unit test: `extract_receipt()` called with a sample receipt image base64 returns dict with all required fields
- Unit test: `extract_receipt()` with a blank image raises `ValueError` (confidence < 0.30)
- Unit test: `categorize_transaction()` with Swiggy transaction returns `"Food & Dining"` with confidence > 0.80
- Unit test: `categorize_transaction()` with confidence=0.40 in model response returns `"Other"`
- Unit test: `generate_insights()` with 5 sample transactions returns dict with `insights` array, `health_score` integer, `score_breakdown` object
- `genai.configure()` is called in `insights.py` at module level (not imported from `analyze.py`)

---

## P1-BE-007 — Analyze Router (Core Pipeline)
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P1-BE-006

**Tasks:**
- [ ] Create `fastapi/routers/analyze.py`
  - `POST /analyze/receipt` endpoint with `AnalyzeRequest` Pydantic model
  - Pydantic validators on `image_base64` (valid base64), `user_id` and `receipt_id` (valid UUID format)
  - Full pipeline execution in this exact order:
    1. Mark receipt `status='processing'`
    2. Decode base64 → PIL Image (handle PDF: extract first page to PNG)
    3. Call `nvidia_nim.extract_receipt()` → if confidence < 0.30 → `raise ValueError`
    4. Call `groq_client.categorize_transaction()` → override to "Other" if confidence < 0.50
    5. Compute `processing_time_ms`
    6. INSERT `transactions` row (use `CURRENT_DATE` server-side as `transaction_date` fallback, not Python `datetime.now()`)
    7. UPDATE `receipts` row: `status='complete'`, `processed_at=datetime.now(timezone.utc).isoformat()` (not the string `"now()"`)
    8. RPC `increment_receipt_count(user_id)`
    9. Fire background task: `run_decision_engine(user_id)` (non-blocking)
    10. Return `{ status, extraction, categorization, processing_time_ms }`
  - Full `try/except` at each step: on any exception, mark receipt `status='failed'` with `processing_error=str(e)` and re-raise appropriate HTTP exception
  - `ValueError` (OCR confidence) → `HTTPException(422, detail=str(e))`
  - `httpx.TimeoutException` → `HTTPException(504, detail="AI provider timeout")`
  - Unexpected → `HTTPException(500, detail="Processing failed")`

**Done when:**
- `POST /analyze/receipt` with valid base64 JPEG receipt → returns `{ status: "success", extraction: {...}, categorization: {...}, processing_time_ms: number }`
- Transaction row created in DB with correct `category`, `confidence`, `categorization_model="groq-llama-3.3-70b"`
- Receipt row updated with `status='complete'`, `processed_at` is a valid ISO timestamp (not the literal string `"now()"`)
- Profile `total_receipts_uploaded` incremented by 1
- Profile `intelligence_level` updated correctly (3rd receipt → level 2)
- Low-confidence receipt (< 0.30) → receipt `status='failed'`, `422` returned, no transaction created
- Endpoint without `X-Internal-Secret` → `401`

---

## P1-BE-008 — Insights Router
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P1-BE-007

**Tasks:**
- [ ] Create `fastapi/routers/insights.py`
  - `genai.configure(api_key=os.getenv("GEMINI_API_KEY"))` at module level
  - `POST /insights/generate` endpoint with `InsightsRequest` Pydantic model
  - Guard: if `len(transactions) < 3` → return `{"insights": [], "health_score": null, "score_breakdown": null}` without calling Gemini
  - Call `gemini_client.generate_insights(transactions, time_range, patterns={})`
  - Validate health_score is within 0–100 (clamp if model returns out-of-range)
  - INSERT into `insights` table via service role key
  - Return result

**Done when:**
- `POST /insights/generate` with 5 transaction objects returns valid insights JSON
- `POST /insights/generate` with 2 transactions returns empty array without calling Gemini
- Health score out of range (e.g., 105) is clamped to 100 before persistence
- `insights` row created in DB with correct `user_id`, `insight_texts`, `health_score`, `transaction_count`

---

## P1-BE-009 — Next.js BFF Routes
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P1-BE-007, P1-BE-003

**Tasks:**
- [ ] Create `POST /api/receipts/upload` — complete implementation:
  - Extract `userId` from session token (never from body)
  - Check free tier: `profile.subscription_tier === 'free'` && `total_receipts_uploaded >= 20` → return `402` with `code: 'LIMIT_REACHED'`
  - Validate MIME type server-side against allowlist: `['image/jpeg', 'image/png', 'image/webp', 'application/pdf']`
  - Validate file size ≤ 10MB
  - Upload buffer to Supabase Storage at `{userId}/{receiptId}/{timestamp}.{ext}`
  - INSERT receipts row with `status='pending'`
  - Encode buffer to base64
  - `POST FASTAPI_INTERNAL_URL/analyze/receipt` with `X-Internal-Secret` header
  - Return FastAPI response to client
- [ ] Create `GET /api/receipts` — paginated list with `page`, `category`, `range` query params
- [ ] Create `GET /api/receipts/[id]` — single receipt + transaction + signed URL (1-hour expiry, server-side only)
- [ ] Create `PATCH /api/receipts/[id]` — update category, set `is_manually_corrected=true`
- [ ] Create `DELETE /api/receipts/[id]` — delete storage object first, then transaction, then receipt row
- [ ] Create `GET /api/insights` — return most recent insights row from DB (no FastAPI call)
- [ ] Create `POST /api/insights` — fetch transactions, call FastAPI `/insights/generate`, persist, return
- [ ] Create `GET /api/dashboard/summary` — aggregated query (total spend, top category, avg transaction, top merchant, weekly totals, category breakdown)
  - Zero-amount transactions excluded from totals
  - Returns zeroes (not 404) for users with no transactions

**Done when:**
- `POST /api/receipts/upload` without session → `401`
- `POST /api/receipts/upload` with file > 10MB → `400`
- `POST /api/receipts/upload` on 21st upload as free user → `402` with `code: 'LIMIT_REACHED'`
- `GET /api/dashboard/summary` for new user with 0 transactions → `{ total_spend: 0, category_breakdown: [], ... }` (not error)
- `DELETE /api/receipts/[id]` deletes storage object, transaction, and receipt row — all three, in that order
- Signed URL in `GET /api/receipts/[id]` response has 1-hour expiry

---

## P1-BE-010 — End-to-End Pipeline Smoke Test
**Owner:** INT
**Priority:** CRITICAL
**Depends on:** P1-BE-009

**Tasks:**
- [ ] Upload a real JPEG receipt through `POST /api/receipts/upload` using a test user session
- [ ] Verify receipt row created with `status='pending'` → transitions to `status='complete'`
- [ ] Verify transaction row created with correct merchant, amount, category, confidence
- [ ] Verify profile `total_receipts_uploaded = 1` and `intelligence_level = 1`
- [ ] Upload 2 more receipts → verify `intelligence_level = 2` after 3rd upload
- [ ] Verify `GET /api/dashboard/summary` returns non-zero values after 3 uploads
- [ ] Verify `processed_at` in receipts table is a real timestamp, not the string `"now()"`
- [ ] Run security scan: `grep -r "NVIDIA_NIM_API_KEY\|GROQ_API_KEY\|GEMINI_API_KEY\|service_role" --include="*.ts" --include="*.tsx" src/` — must return zero results

**Done when:** All 8 verifications pass. This task gates all FE work on the upload flow.

---

## P1-FE-001 — Global Layout and Design System
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P1-BE-001

**Tasks:**
- [ ] Set up `src/app/globals.css` with CSS custom properties, body styles, `.font-amount` class, skeleton shimmer `@keyframes`, Intelligence Meter Level 4 shimmer `@keyframes`, orbital spin `@keyframes`
- [ ] Load Inter and JetBrains Mono via `next/font` in `src/app/layout.tsx`
- [ ] Create global background substrate in root layout: 4-layer atmospheric background (base + amber warm glow + periwinkle cool glow + noise texture) — `position: fixed`, `pointer-events: none`, `z-index: 0`
- [ ] Create `src/lib/utils/cn.ts` — `twMerge(clsx(...))` utility
- [ ] Create `src/lib/utils/format-currency.ts` — `formatCurrency(amount, currency='INR')` and `formatAmount(amount)`
- [ ] Create `src/lib/utils/intelligence-level.ts`:
  - `getIntelligenceLevel(count)` — returns `1|2|3|4`
  - `getIntelligenceMeterPercent(count)` — returns `0|15|40|70|100`
  - `INTELLIGENCE_LABELS` constant
  - `INTELLIGENCE_NEXT_TARGET` constant
- [ ] Create `src/lib/motion-tokens.ts` — full motion token library from UI_GENERATOR_SPEC.md §6.2
- [ ] Install and configure shadcn/ui: `npx shadcn-ui@latest add dialog drawer toast progress badge separator avatar alert-dialog select tabs tooltip`

**Done when:**
- `npm run dev` renders a dark (`#0D0F1A`) background page with visible atmospheric gradient substrate
- `getIntelligenceLevel(10)` returns `4`
- `getIntelligenceMeterPercent(5)` returns `40`
- CSS keyframes `skeleton-shimmer` and `amber-shimmer` are present in `globals.css`

---

## P1-FE-002 — Atomic Components
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P1-FE-001

**Tasks:**
- [ ] `AmberButton` — amber bg (#FFD166), dark text (#0D0F1A), hover translateY(-1px), active translateY(0)
- [ ] `SecondaryButton` — transparent, base-600 border
- [ ] `GhostButton` — transparent, muted text, hover text-primary
- [ ] `DangerButton` — transparent, danger-400 text and border, hover danger-900 bg
- [ ] `GlassCard` — Level 1 glass surface with all CSS properties
- [ ] `GlassCardElevated` — Level 2 glass surface with amber border tint
- [ ] `GlassSubtle` — Level 3 glass surface for table rows
- [ ] `CurrencyAmount` — JetBrains Mono wrapper, ₹ at `font-size: 0.85em`, `font-variant-numeric: tabular-nums`
- [ ] `CategoryBadge` — all 12 TransactionCategory → color mapping with background/text/border at 15%/100%/30% opacity
- [ ] `ConfidenceDot` — 8px circle: green (>0.8), amber (0.5–0.8), red (<0.5) + Radix Tooltip
- [ ] `StatusChip` — pending/processing/complete/failed with semantic colors
- [ ] `DeltaIndicator` — ↑ (success-400) / ↓ (danger-400) with percentage and label
- [ ] `ProgressBar` — amber fill, base-700 track, configurable percentage
- [ ] `SkeletonBlock` — applies `skeleton-shimmer` CSS class, configurable dimensions
- [ ] `IconWrapper` — Lucide icon with 4 standardized size variants (20/18/16/14px, stroke 1.75)
- [ ] `AmberBadge` — amber bg, dark text, rounded-badge

**Done when:**
- All 16 atoms render in isolation without TypeScript errors
- `CategoryBadge` with `"Food & Dining"` renders amber background tint (not wrong color)
- `ConfidenceDot` with `confidence={0.3}` renders red, `0.6` renders amber, `0.9` renders green
- Storybook or equivalent visual review page shows all atoms (optional but recommended)

---

## P1-FE-003 — Upload Modal (Requires P1-BE-010)
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P1-BE-010, P1-FE-002

**Tasks:**
- [ ] Create `src/hooks/useUpload.ts` with state machine: `'idle' | 'uploading' | 'processing' | 'complete' | 'error' | 'limit_reached'`
  - 402 response with `code: 'LIMIT_REACHED'` → setState to `'limit_reached'` (NOT `'error'`)
  - `processingStep` counter driven by `setTimeout` (0ms → step 1, 800ms → step 2, 1600ms → step 3)
  - `clearTimeout` in `finally` block
- [ ] Create `src/components/upload/DropZone.tsx` — `react-dropzone` with drag-over state (border → amber)
- [ ] Create `src/components/upload/ProcessingState.tsx` — Deep Forest palette interior, orbital ring, 3 steps with Framer Motion checkmark spring
- [ ] Create `src/components/upload/UploadModal.tsx` — shadcn Dialog, 6 states, each state as a distinct sub-view:
  - `idle`: DropZone
  - `processing`: ProcessingState
  - `results`: 2-column layout with extracted data + confirm/try-again
  - `error`: specific error messaging (low quality receipt vs. network failure)
  - `limit_reached`: upgrade prompt with ₹499/month pricing (NOT an error state)
  - `preview`: image preview + confirm button

**Done when:**
- Uploading a real receipt shows all 3 processing steps advancing in sequence
- A low-quality receipt shows the specific "try a clearer photo" error message (not generic)
- 21st upload (free tier) shows the upgrade prompt — NOT a red error state
- `processingStep` never advances all 3 steps before the API returns (timer vs API race condition handled)

---

## P1-FE-004 — App Shell and Navigation
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P1-FE-002

**Tasks:**
- [ ] Create `src/hooks/useIntelligenceLevel.ts`:
  - Accepts `profile: Profile | null`
  - Derives level from `profile.total_receipts_uploaded` via `getIntelligenceLevel()` — NOT from `profile.intelligence_level`
  - Returns `{ level, count, meterPercent, label, nextTarget, isLevel1..4, hasCharts, hasHealthScore }`
- [ ] Create `src/components/dashboard/IntelligenceMeter.tsx`:
  - Props: `receiptCount: number, variant: 'sidebar' | 'dashboard'`
  - Framer Motion spring on fill: `stiffness: 200, damping: 25`
  - Level 1 pulse CSS class (`meter-fill-level1`), Level 4 shimmer CSS class (`meter-fill-level4`)
  - Both CSS animations defined in `globals.css` — not Framer Motion
- [ ] Create `src/components/layout/AppShell.tsx` — flex row wrapper
- [ ] Create `src/components/layout/Sidebar.tsx`:
  - 240px expanded / 64px collapsed, 200ms CSS transition
  - IntelligenceMeter (sidebar variant) always rendered
  - 4 NavItems with active state (amber left border + amber text + base-800 bg)
  - Insights locked state when `profile.intelligence_level < 3`
  - UploadCTA pinned to bottom
- [ ] Create `src/components/layout/Header.tsx`:
  - 64px sticky, glass bg, amber border bottom
  - Page title left, user avatar + signout right
  - Upload button visible on mobile (hidden on desktop — sidebar handles it)
- [ ] Create `src/app/(app)/layout.tsx` — server component, validates session, renders `<AppShell>`

**Done when:**
- Sidebar renders with Intelligence Meter, nav items, and upload CTA
- Sidebar collapses to 64px with 200ms transition
- Level 1 meter shows pulse animation (CSS — not Framer Motion)
- Level 4 meter shows shimmer animation (CSS — not Framer Motion)
- Insights nav item shows lock icon when `intelligence_level < 3`

---

## P1-FE-005 — Dashboard Page (All 4 Levels)
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P1-FE-004, P1-BE-009

**Tasks:**
- [ ] Create `src/lib/api/dashboard.ts` — `fetchDashboardSummary()` typed wrapper
- [ ] Create `src/lib/api/receipts.ts` — `fetchReceipts()`, `fetchReceiptById()`, `deleteReceipt()` typed wrappers
- [ ] Create `src/lib/api/insights.ts` — `fetchLatestInsights()`, `refreshInsights()` typed wrappers
- [ ] Create `src/components/dashboard/KPICard.tsx` — glass card with icon, amount, delta, loading skeleton
- [ ] Create `src/components/dashboard/KPICardSkeleton.tsx` — 3 shimmer blocks, same dimensions as KPICard
- [ ] Create `src/components/dashboard/TransactionRow.tsx`:
  - Receipt thumbnail (52×52px, 1° tilt on hover)
  - Merchant + date + CategoryBadge + CurrencyAmount + ConfidenceDot + AnomalyFlag
  - Left amber border appears on hover
- [ ] Create `src/components/shared/EmptyState.tsx` — motivational copy + upload CTA
- [ ] Create `src/components/dashboard/HealthScoreLocked.tsx` — padlock icon + "X more receipts" progress
- [ ] Create `src/app/(app)/dashboard/page.tsx` — server component, SSR data fetch, passes to client component
  - Level 1: EmptyState + KPICardSkeleton × 4 + HealthScoreLocked
  - Level 2: KPICard × 4 (real data) + HealthScoreLocked + no charts
  - Level 3: KPICard × 4 + charts (lazy-loaded) + HealthScoreLocked
  - Level 4: all Level 3 + HealthScoreCard + InsightTextCards + anomaly flags on transactions
- [ ] Implement level unlock animation: compare pre/post upload `total_receipts_uploaded`, if level changes → trigger `unlockReveal` stagger sequence (TECH_STACK_v2.md §9.1 steps 29–31)

**Done when:**
- Level 1 dashboard shows teaser skeletons, not blank cards
- Level 2 dashboard shows real KPI data with cardReveal stagger animation
- Level 4 dashboard shows all components including HealthScoreCard
- Level unlock animation fires when the 3rd, 6th, and 10th receipts are uploaded
- `GET /api/dashboard/summary` is the only API call for all KPI data — no per-KPI requests

---

## P1-INT-001 — CI/CD Pipeline Setup
**Owner:** INT
**Priority:** IMPORTANT
**Depends on:** P1-BE-001

**Tasks:**
- [ ] Create `.github/workflows/ci.yml` with 4 jobs: `security-scan`, `type-check`, `lint`, `fastapi-check`
- [ ] `security-scan` job: grep for `NVIDIA_NIM_API_KEY|GROQ_API_KEY|GEMINI_API_KEY|service_role|AIza` in `src/` — fail on any result
- [ ] Configure Vercel project: connect GitHub repo, set all env vars (NEXT_PUBLIC_ + server-only), set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure Railway project: connect GitHub repo, set `RAILWAY_DOCKERFILE_PATH=fastapi/Dockerfile`, set all FastAPI env vars, set `ALLOWED_ORIGINS` to Vercel production URL
- [ ] Set up Supabase Auth production settings: update Site URL, Redirect URLs, configure custom SMTP

**Done when:**
- Push to any branch triggers CI — all 4 jobs run
- A file with a fake API key in `src/` causes `security-scan` to fail and block merge
- Production deploy to Vercel succeeds
- FastAPI `/health` endpoint accessible at Railway production URL

---

## P1-INT-002 — Receipts Page and Detail
**Owner:** INT (assembles FE + BE work)
**Priority:** IMPORTANT
**Depends on:** P1-BE-009, P1-FE-004

**Tasks:**
- [ ] Create `src/app/(app)/receipts/page.tsx` — server component, SSR initial data
  - FilterBar with CategoryFilterDropdown (shadcn Select) + DateRangeSelect + search input
  - ReceiptTableRow (desktop) / ReceiptCard (mobile) per receipt
  - Pagination controls (prev/next)
  - Empty state when filters return no results
- [ ] Create `src/app/(app)/receipts/[id]/page.tsx` — server component
  - 60/40 split: receipt image (signed URL) left, data panel right
  - All extracted data fields displayed
  - Confidence bar (ProgressBar component)
  - AI reasoning text from `gemini_response.categorization.reasoning`
  - Line items table if present
  - Delete button (shadcn AlertDialog for confirmation)
- [ ] Create `src/app/api/dashboard/summary/route.ts` — if not done in P1-BE-009

**Done when:**
- Receipts list paginates at 20 per page
- Category filter correctly filters results (test with real data)
- Receipt detail shows signed receipt image (not a placeholder for valid receipts)
- Delete receipt: AlertDialog appears, confirming deletes all 3 records (storage + transaction + receipt)
- RLS test: fetch `GET /api/receipts/{other_user_id_receipt}` returns empty/404

---

## P1-INT-003 — Settings Page and Production Validation
**Owner:** INT
**Priority:** IMPORTANT
**Depends on:** P1-INT-001, P1-INT-002

**Tasks:**
- [ ] Create `src/app/(app)/settings/page.tsx`:
  - Profile card (name editable, email display-only, currency select)
  - Plan card (tier badge, receipt count vs limit, ProgressBar, upgrade CTA for free users)
  - Data export card (CSV export function, client-side blob generation)
  - Danger Zone card (Neon Coral #FF6044 border, Space Black #121313 bg, "type DELETE to confirm")
  - Sign out button at bottom
- [ ] Create `src/app/api/decision-engine/output/route.ts` — `GET` returns current `decision_engine_outputs` row for user
- [ ] Run full production security checklist:
  ```bash
  grep -r "NVIDIA_NIM_API_KEY\|GROQ_API_KEY\|GEMINI_API_KEY\|service_role\|AIza" \
    --include="*.ts" --include="*.tsx" src/   # Must return ZERO results
  git ls-files | grep "\.env"                 # Must return only .env.example
  npm run build                               # Must exit 0 with zero TS errors
  ```
- [ ] Run full E2E journey test in production (see PRD_v2.md §8.5 checklist — 18 verification steps)

**Done when:** All 18 production verification steps pass. CI pipeline passes on `main`.

---

# SECTION 4 — PHASE 2: INTELLIGENCE SYSTEM

**Objective:** Pattern detection, anomaly detection, improved categorization, email digest.
**Gate to start:** All Phase 1 tasks ✅ + ≥ 200 active users with Level 2+ data
**Duration:** 4–6 weeks

---

## P2-BE-001 — Schema Migration for Phase 2
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** All Phase 1 ✅

**Tasks:**
- [ ] Add migration for `transactions.is_anomalous BOOLEAN DEFAULT FALSE` (if not already in Phase 1 schema — verify)
- [ ] Add migration for `transactions.is_subscription BOOLEAN DEFAULT FALSE` (if not already in Phase 1 schema — verify)
- [ ] Enable `pg_trgm` extension in Supabase: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- [ ] Execute GIN index on merchant for full-text search: `CREATE INDEX idx_transactions_merchant_trgm ON public.transactions USING GIN (merchant gin_trgm_ops);`
- [ ] Create `user_merchant_corrections` view (or table) for Phase 3 personalization prep: tracks unique (user_id, merchant, category) where `is_manually_corrected = TRUE`

**Done when:**
- `SELECT * FROM pg_extension WHERE extname = 'pg_trgm'` returns a row
- `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_transactions_merchant_trgm'` returns a row
- `is_anomalous` and `is_subscription` columns exist on `transactions`

---

## P2-BE-002 — Anomaly Detection (SQL + Python)
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P2-BE-001

**Tasks:**
- [ ] Create `fastapi/decision_engine/anomaly_detector.py`
  - `def compute_anomaly_flag(transaction: dict, user_id: str, category: str) -> bool`
  - Fetch last 30 days of transactions for user in this category
  - Cold start guard: if < 5 transactions in category → return `False` (never flag without baseline)
  - Compute mean and standard deviation of amounts in category
  - Z-score formula: `(transaction_amount - mean) / std_dev`
  - Flag if Z-score > 2.5
  - Return `True` (anomalous) or `False`
- [ ] Integrate into `fastapi/routers/analyze.py`: after transaction INSERT, call `compute_anomaly_flag()` and UPDATE `is_anomalous` on the transaction row if True
- [ ] Create SQL function `get_category_stats(user_id_param UUID, category_param TEXT, days INT)` → returns `{mean, stddev, count}` for performance

**Done when:**
- A transaction 3× the user's category average (after 5+ prior transactions) is flagged `is_anomalous = TRUE`
- A transaction in a new category (< 5 prior transactions) is never flagged
- Unit test: inject 5 transactions of ₹500 average, then ₹5000 → `is_anomalous = TRUE`
- Unit test: inject 4 transactions (below threshold), then ₹5000 → `is_anomalous = FALSE`

---

## P2-BE-003 — Personalized Categorization Context
**Owner:** BE (Kiro)
**Priority:** IMPORTANT
**Depends on:** P2-BE-001

**Tasks:**
- [ ] Create `fastapi/utils/user_context.py`
  - `async def get_user_merchant_context(user_id: str) -> dict`
  - Query: top 5 merchants by correction frequency for this user where `is_manually_corrected = TRUE`
  - Returns `{merchant_name: category_name}` dict (empty dict for new users)
- [ ] Integrate into `fastapi/routers/analyze.py`: fetch `user_context` before calling `groq_client.categorize_transaction()`
- [ ] Ensure empty context dict does not add tokens to the Groq prompt (only inject context block if `len(user_context) > 0`)

**Done when:**
- After user corrects "Swiggy" from "Shopping" to "Food & Dining", the next Swiggy upload categorizes as "Food & Dining" at 0.95+ confidence
- Empty context dict → Groq prompt identical to Phase 1 prompt (no context injection overhead)
- `get_user_merchant_context()` returns empty dict for users with zero corrections

---

## P2-BE-004 — Pattern Detection Engine
**Owner:** BE (Kiro)
**Priority:** IMPORTANT
**Depends on:** P2-BE-001

**Tasks:**
- [ ] Create `fastapi/intelligence/pattern_detector.py` with these functions:
  - `compute_spending_velocity(transactions: list) -> dict` — current 7d vs previous 7d total
  - `compute_category_concentration(transactions: list) -> dict` — % of total in top category
  - `compute_merchant_frequency(transactions: list) -> list` — top 3 merchants by count, 30d
  - `compute_day_of_week_distribution(transactions: list) -> dict` — spend by weekday, normalized
  - `compute_weekend_vs_weekday_ratio(transactions: list) -> float`
- [ ] All functions are pure Python — no AI calls, no database calls. Input is the transaction list.
- [ ] Integrate: pass pattern output dict as `patterns` argument to `gemini_client.generate_insights()` so Gemini receives pre-computed signals rather than deriving them from raw data

**Done when:**
- Unit test: `compute_spending_velocity()` with current 7d total ₹5000 and previous 7d total ₹3000 returns `{"current": 5000, "previous": 3000, "change_pct": 66.7}`
- Unit test: `compute_category_concentration()` with 80% in Food & Dining returns concentration flag
- Gemini insight generation prompt includes computed patterns object (verify by logging the prompt)

---

## P2-BE-005 — Receipt Search API
**Owner:** BE (Kiro)
**Priority:** IMPORTANT
**Depends on:** P2-BE-001

**Tasks:**
- [ ] Update `GET /api/receipts` to accept `q` (search query) parameter
- [ ] If `q` is present: use PostgreSQL `merchant ILIKE '%{q}%'` for Phase 2 (full `pg_trgm` similarity in Phase 4)
- [ ] Ensure search respects existing category and date range filters (combine with AND)
- [ ] Add `search` param to `src/lib/api/receipts.ts` `fetchReceipts()` function

**Done when:**
- `GET /api/receipts?q=swiggy` returns only receipts where merchant contains "swiggy" (case-insensitive)
- `GET /api/receipts?q=swiggy&category=Food+%26+Dining` correctly applies both filters
- Results still paginate correctly with search active

---

## P2-FE-001 — Anomaly Visualization
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P2-BE-002, P1-FE-005

**Tasks:**
- [ ] Update `TransactionRow` to show `AlertTriangle` icon (warning-400 color) when `transaction.is_anomalous = true` — only at Level 4
- [ ] Create `src/components/dashboard/AnomalyCallout.tsx` — Cherry Red & Butter Yellow palette block:
  - Background: rgba(255,71,71,0.08) — Cherry Red at 8% opacity
  - Icon: Lucide AlertTriangle, color #F7E998 (Butter Yellow)
  - Transaction amount + context text
- [ ] Show anomaly callouts in Insights page Zone E (AI panel) for Level 4+ users

**Done when:**
- Anomalous transactions show AlertTriangle on transaction row
- Non-anomalous transactions show no AlertTriangle
- Anomaly callouts render with Cherry Red background tint (not amber, not red full opacity)

---

## P2-FE-002 — Charts (Level 3 Unlock)
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P1-FE-005, P2-BE-004

**Tasks:**
- [ ] Create `src/components/charts/SpendingDonut.tsx` — Tremor DonutChart wrapper:
  - `next/dynamic` with `ssr: false`
  - `showAnimation={true}`
  - Center label: total spend as CurrencyAmount
  - Legend below chart with amounts right-aligned
- [ ] Create `src/components/charts/WeeklyTrendChart.tsx` — Tremor AreaChart wrapper:
  - `next/dynamic` with `ssr: false`
  - Amber fill color, no stroke line
  - Weekly / Monthly toggle above chart (amber pill for active, ghost for inactive)
  - `showAnimation={true}`
- [ ] Create `src/components/charts/CategoryBarChart.tsx` — Tremor BarChart wrapper:
  - Horizontal layout
  - Sorted by total descending
  - `showAnimation={true}`
- [ ] All chart loading states: `SkeletonBlock` with matching dimensions (not Tremor's own loading)

**Done when:**
- Charts are absent at Level 1 and 2 (not hidden, not placeholder — absent from DOM)
- Charts render at Level 3 with `unlockReveal` animation
- `next/dynamic` prevents Tremor from running on the server (no hydration mismatch errors)

---

## P2-FE-003 — Insights Page (Level 3+)
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P2-FE-002, P2-BE-004

**Tasks:**
- [ ] Create `src/app/(app)/insights/page.tsx` — server component
  - Server-side check: if `profile.intelligence_level < 3` → redirect to `/dashboard?message=upload6`
  - Dashboard displays dismissible toast: "Upload 6 receipts to unlock Insights"
  - Zone layout: SpendingDonut (6 cols) + WeeklyTrendChart (6 cols) → TopMerchantList (4 cols) + AIInsightsPanel (8 cols) → CategoryBarChart (full width)
- [ ] Create `src/components/insights/TopMerchantList.tsx` — ranked list with rank number, merchant, total, count, CategoryBadge
- [ ] Create `src/components/insights/AIInsightsPanel.tsx` — Level 4+ only section:
  - HealthScoreArc (small variant)
  - InsightTextCard × N
  - AnomalyCallout × N
  - "Refresh Insights" button → calls `POST /api/insights` via React Query mutation
  - "Last updated X hours ago" timestamp
- [ ] Create `src/components/dashboard/InsightTextCard.tsx` — GlassCard + icon + insight string + metadata

**Done when:**
- Level 2 user visiting `/insights` is redirected to dashboard with toast message
- Level 3 user sees Zones B, C, D, F but Zone E (AI panel) is absent
- Level 4 user sees all zones including AI panel with Refresh button functional
- Refresh Insights triggers `POST /api/insights` and updates the InsightTextCards

---

## P2-FE-004 — HealthScoreCard (Level 4)
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P1-FE-005, P1-BE-008

**Tasks:**
- [ ] Create `src/components/dashboard/HealthScoreCard.tsx`:
  - SVG arc: 200×200 viewBox, 220° arc span (160° to 380°), animated via Framer Motion `strokeDasharray`
  - Score number: JetBrains Mono 36px with Magic UI NumberTicker on mount
  - Band label: "AT RISK" (danger-400) / "FAIR" (warning-400) / "GOOD" (info-400) / "EXCELLENT" (success-400)
  - 4 sub-score columns with 5-dot indicators (filled amber, empty base-700)
  - AI commentary: italic, 13px, text-secondary, 2-line max
  - Arc animation on mount: fill from 0 to score value, 800ms springGentle
- [ ] `HealthScoreCard` appears at Level 4 right rail (4 cols) replacing `HealthScoreLocked`
- [ ] Level 4 unlock animation: `HealthScoreCard` enters with `unlockReveal` (spring) after `HealthScoreLocked` exits

**Done when:**
- Arc animates correctly from 0 to score value on first render
- Score 78 shows "GOOD" band in info-400 color
- Score 45 shows "FAIR" band in warning-400 color
- Sub-score dots: score=80 shows 4 filled dots of 5
- `HealthScoreLocked` is completely absent at Level 4 (not hidden, not behind the card)

---

## P2-FE-005 — Receipt Search UI and Manual Correction
**Owner:** FE
**Priority:** IMPORTANT
**Depends on:** P2-BE-003, P2-BE-005

**Tasks:**
- [ ] Add search input to `FilterBar` on Receipts page — debounced 300ms before triggering React Query refetch
- [ ] Implement manual category correction on receipt detail page:
  - "Edit Category" button next to CategoryBadge on detail page
  - Opens shadcn Select with all 12 TransactionCategory options
  - On change: calls `PATCH /api/receipts/[id]` with new category
  - On success: invalidate `['receipts', id]`, `['dashboard', 'summary']`
  - Shows "Manually corrected" label on transaction row after correction
- [ ] Update `TransactionRow` to show distinct visual state when `is_manually_corrected = true` — small pencil icon or "edited" label

**Done when:**
- Search filters transaction list without full page reload
- Category correction saves to database with `is_manually_corrected = true`
- Corrected transactions show the "manually corrected" indicator
- Dashboard KPI data updates after category correction (cache invalidated)

---

## P2-INT-001 — Email Digest Integration
**Owner:** INT
**Priority:** IMPORTANT
**Depends on:** P2-BE-004

**Tasks:**
- [ ] Set up Resend or Postmark account and API key
- [ ] Create `fastapi/email/digest_sender.py`:
  - `async def send_monthly_digest(user_id: str, profile: dict, insight: dict) -> bool`
  - Composes email: total spend, top category, top merchant, Health Score change, 1 insight
  - For free users: sends preview with "unlock X features by upgrading" section
  - Uses Resend/Postmark HTTP API (not SMTP)
- [ ] Create scheduled trigger (Railway cron or external cron): 1st of each month, run for all Pro users
- [ ] Add `POST /api/email/digest-test` Next.js route for testing with a specific user

**Done when:**
- Test endpoint sends a real email to a test address with correct data
- Email renders correctly in Gmail and Apple Mail
- Email delivery rate ≥ 95% (check Resend/Postmark delivery logs)

---

## P2-INT-002 — Phase 2 Integration Validation
**Owner:** INT
**Priority:** CRITICAL
**Depends on:** All P2 tasks

**Tasks:**
- [ ] Verify anomaly detection: upload 5 normal receipts in one category, upload 1 at 5× the average → confirm `is_anomalous = TRUE`
- [ ] Verify personalized categorization: correct a merchant's category, re-upload the merchant → confirm new category used at higher confidence
- [ ] Verify search: search for partial merchant name → returns correct results
- [ ] Verify Insights page access control: Level 2 user visits `/insights` → redirected
- [ ] Verify HealthScoreCard only appears at Level 4
- [ ] Performance check: `GET /api/receipts?q=swiggy` returns in < 500ms for a user with 200 transactions

**Done when:** All 6 verifications pass.

---

# SECTION 5 — PHASE 3: DECISION ENGINE

**Objective:** Tax estimation, subscription detection, budget leakage, decision panel UI.
**Gate to start:** Phase 2 ✅ + ≥ 60 days production data + manual correction history available
**Duration:** 8–12 weeks

---

## P3-BE-001 — Decision Engine Table Migration
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** Phase 2 ✅

**Tasks:**
- [ ] Verify `decision_engine_outputs` table exists (created in Phase 1 schema) with all columns:
  `id`, `user_id`, `computed_at`, `time_range`, `estimated_tax_liability`, `tax_deductible_total`, `tax_computation_basis`, `detected_subscriptions`, `subscription_monthly_total`, `leakage_signals`, `high_risk_categories`, `decision_narrative`, `is_current`
- [ ] Verify RLS policy `decision_outputs_select_own` exists (SELECT only — FastAPI writes via service role)
- [ ] Verify `archive_decision_engine_output()` function exists and works correctly
- [ ] Add `FastAPI /decision-engine/run` to Next.js API routes: `GET /api/decision-engine/output` (reads current row)

**Done when:**
- `SELECT * FROM decision_engine_outputs LIMIT 1` executes without error
- `archive_decision_engine_output('test-uuid')` sets all matching rows `is_current = FALSE`

---

## P3-BE-002 — Tax Estimation Module
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P3-BE-001

**Tasks:**
- [ ] Create `fastapi/decision_engine/tax_estimator.py`
  - `def compute_tax_estimate(transactions: list[dict]) -> dict`
  - Input: all transactions with `is_business_expense = TRUE`
  - Compute `total_by_category`: sum for Software, Dining, Travel, Professional separately
  - Apply deductibility ratios: Software×1.0, Dining×0.5, Travel×1.0, Professional×1.0
  - Compute `estimated_deductible_total`
  - Compute `tax_liability_reduction_estimate = deductible_total × 0.30`
  - Return output dict including `disclaimer` and `data_period` (current FY Apr–Mar)
  - Edge case: if no business transactions → return dict with nulls + message "No business expenses flagged yet"
- [ ] Unit tests for all deductibility calculations

**Done when:**
- Unit test: ₹10,000 in Software → deductible=₹10,000, tax_saved=₹3,000
- Unit test: ₹10,000 in Dining → deductible=₹5,000, tax_saved=₹1,500
- Unit test: no business transactions → returns dict with nulls and guidance message
- Disclaimer text appears in output: "These are estimates. Consult a CA for actual tax computation."

---

## P3-BE-003 — Subscription Detection Module
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P3-BE-001

**Tasks:**
- [ ] Create `fastapi/decision_engine/subscription_detector.py` — `detect_subscriptions(transactions)` function (exact implementation from TECH_STACK_v2.md §7.3)
  - Merchant occurrence grouping
  - Day-of-month regularity check (±3 days tolerance = day_range ≤ 6)
  - Amount consistency check (≤ 10% deviation from mean)
  - Returns list of detected subscriptions with `merchant`, `amount`, `frequency`, `occurrences`, `last_date`, `annual_cost`
- [ ] UPDATE `transactions.is_subscription = TRUE` for all transaction IDs that belong to a detected subscription
- [ ] Unit tests for tolerance edge cases

**Done when:**
- Unit test: Netflix charged on the 15th for 3 months at ₹649 → detected as subscription
- Unit test: Same merchant charged on the 15th and 28th (13 day range) → NOT detected
- Unit test: Same merchant at ₹649 and ₹800 (23% deviation) → NOT detected
- After running detector, `transactions.is_subscription = TRUE` for Netflix rows in test data

---

## P3-BE-004 — Budget Leakage Detection Module
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P3-BE-001

**Tasks:**
- [ ] Create `fastapi/decision_engine/leakage_detector.py`
  - `def detect_budget_leakage(transactions: list[dict], user_id: str) -> dict`
  - For each category with ≥ 5 transactions in history:
    - Compute trailing 3-month baseline (average monthly spend in category)
    - Compute current month pace: `(spend_so_far / days_elapsed) × days_in_month`
    - Flag if `current_pace > baseline × 1.35` AND `days_remaining > 10`
    - Severity: MODERATE (35–60% above) or HIGH (>60% above)
  - Returns `{"leakage_signals": [...], "high_risk_categories": [...]}`
  - Categories with < 5 transactions: skip (cold start protection)

**Done when:**
- Unit test: 3-month baseline ₹5,800/month in Food, current pace ₹8,420 → MODERATE flag
- Unit test: baseline ₹6,100 in Shopping, current pace ₹12,300 → HIGH flag
- Unit test: category with 4 transactions → NOT flagged regardless of amount
- Unit test: current pace 130% above baseline, 8 days remaining → NOT flagged (< 10 days remaining)

---

## P3-BE-005 — Decision Engine Orchestrator
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P3-BE-002, P3-BE-003, P3-BE-004

**Tasks:**
- [ ] Create `fastapi/decision_engine/engine.py` — `async def run_decision_engine(user_id: str)` function:
  - Check `profile.intelligence_level >= 3` — return early if not
  - Check `len(transactions) >= 5` — return early if not
  - Call `compute_tax_estimate(transactions)`
  - Call `detect_subscriptions(transactions)`
  - Call `detect_budget_leakage(transactions, user_id)`
  - Call `generate_decision_narrative(tax, subscriptions, leakage, segment)`
  - Call `archive_decision_engine_output(user_id)` RPC
  - INSERT new `decision_engine_outputs` row with `is_current = TRUE`
- [ ] Create `fastapi/decision_engine/narrative_generator.py` — `async def generate_decision_narrative(...)` using Gemini (< 100 words, specific amounts, CA disclaimer)
- [ ] Create `fastapi/routers/decision_engine.py` — `POST /decision-engine/run` endpoint
- [ ] Integrate `run_decision_engine()` as background task in `fastapi/routers/analyze.py` (fires after `increment_receipt_count` when level >= 3)

**Done when:**
- `POST /decision-engine/run` (with valid secret) runs full engine for a user
- `decision_engine_outputs` row is created with `is_current = TRUE`
- Previous row for same user is set to `is_current = FALSE`
- Narrative is < 100 words and contains at least one specific INR amount
- Engine returns early (no new row) for users with `intelligence_level < 3`

---

## P3-BE-006 — Decision Engine API Route
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P3-BE-005

**Tasks:**
- [ ] Create `src/app/api/decision-engine/output/route.ts` — `GET`:
  - Validate session
  - Query `decision_engine_outputs WHERE user_id = userId AND is_current = TRUE`
  - Return the row or `null` if none exists
- [ ] Add `['decision-engine', 'output', userId]` query key to React Query config with 1-hour stale time
- [ ] Add `DecisionEngineOutput` TypeScript interface to `src/types/database.ts`

**Done when:**
- `GET /api/decision-engine/output` returns null for users with no Decision Engine data
- `GET /api/decision-engine/output` returns the current row for users with data
- Row includes all three module outputs: tax, subscriptions, leakage

---

## P3-FE-001 — Decision Panel Atoms and Molecules
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P3-BE-006

**Tasks:**
- [ ] Create `src/components/decision/TaxEstimateCard.tsx`:
  - GlassCard with amber icon
  - "Estimated Deductible" large amount (CurrencyAmount)
  - "Potential Tax Saving" sub-amount
  - Category breakdown table: Software / Dining (50%) / Travel / Professional
  - Disclaimer text (italic, muted, 11px)
  - "Verify with your CA" ghost link
- [ ] Create `src/components/decision/SubscriptionDetectedCard.tsx`:
  - List of detected subscriptions: merchant + amount + frequency + Lucide `RefreshCw` icon
  - "Total monthly cost: ₹X,XXX" summary at bottom
  - "Annual burn: ₹XX,XXX" in muted text
- [ ] Create `src/components/decision/LeakageAlertCard.tsx`:
  - Category name + severity badge (MODERATE amber / HIGH danger)
  - Current pace vs baseline in a mini comparison display
  - Days remaining in month
  - Cherry Red tint for HIGH severity items (rgba(255,71,71,0.08) bg)

**Done when:**
- `TaxEstimateCard` renders without errors with sample tax data
- `SubscriptionDetectedCard` renders a list of subscriptions
- `LeakageAlertCard` HIGH severity items have Cherry Red background tint

---

## P3-FE-002 — Decision Panel and Narrative
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P3-FE-001

**Tasks:**
- [ ] Create `src/components/decision/DecisionPanel.tsx`:
  - Decision narrative at top (from `decision_narrative` field) — rendered prominently
  - Conditional section rendering: TaxEstimateCard only if `estimated_tax_liability > 0`
  - SubscriptionDetectedCard only if `detected_subscriptions.length > 0`
  - LeakageAlertCard only if `leakage_signals.length > 0`
  - "Last computed X hours ago" timestamp
  - Loading state: 3× SkeletonBlock
  - Empty state: "FinSight will analyse your financial patterns as you upload more receipts"
- [ ] Create `src/hooks/useDecisionEngine.ts`:
  - TanStack Query with `staleTime: 3600000` (1 hour)
  - Query key: `['decision-engine', 'output']`

**Done when:**
- DecisionPanel renders with real data from the Decision Engine
- If no subscriptions detected, SubscriptionDetectedCard is absent (not empty)
- Loading state shows skeletons (not blank space)
- Decision narrative renders as the first visible element

---

## P3-FE-003 — Insights Page Decision Section (Requires P3-BE-006)
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P3-FE-002, P3-BE-006

**Tasks:**
- [ ] Add Decision Panel as a new section at the bottom of the Insights page (Level 3+ only)
- [ ] Load `DecisionPanel` via `next/dynamic` with `ssr: false` (Decision Engine data is user-specific and changes rarely)
- [ ] Dashboard (Level 4): add Decision Engine summary strip above the transaction feed — shows narrative + 3 key metrics in a compact row

**Done when:**
- Decision Panel appears on Insights page for Level 3+ users with Decision Engine data
- Decision Panel is absent for Level 1–2 users
- Dashboard strip shows at Level 4 only
- `next/dynamic` used for DecisionPanel (no SSR of DE-specific data)

---

## P3-FE-004 — Business Expense Flag UI
**Owner:** FE
**Priority:** IMPORTANT
**Depends on:** P3-FE-001

**Tasks:**
- [ ] Add "Business Expense" toggle to receipt detail page — updates `transactions.is_business_expense` via `PATCH /api/receipts/[id]`
- [ ] After toggling: invalidate Decision Engine output (`['decision-engine', 'output']`) + trigger background re-run via `POST /api/decision-engine/run`
- [ ] Show "Business" badge on TransactionRow when `is_business_expense = TRUE` (Lucide `Briefcase` icon, small, muted)

**Done when:**
- Toggling business expense on a transaction updates `is_business_expense` in DB
- Decision Engine re-runs after toggle (background, non-blocking)
- "Business" badge visible on transaction row when flagged

---

## P3-INT-001 — Decision Engine End-to-End Validation
**Owner:** INT
**Priority:** CRITICAL
**Depends on:** All P3 tasks

**Tasks:**
- [ ] Create test user with 10+ transactions across multiple months including subscriptions
- [ ] Run `POST /decision-engine/run` for test user
- [ ] Verify tax estimate: flag 3 transactions as business expenses, verify deductible calculation correct
- [ ] Verify subscription detection: create 2× Netflix at same day-of-month → confirmed detected
- [ ] Verify leakage: spike a category to 50% above baseline with 15+ days remaining → MODERATE flag
- [ ] Verify decision narrative mentions specific INR amounts, is < 100 words, includes CA disclaimer
- [ ] Verify `is_current` flips correctly: run engine twice for same user → only 1 row `is_current = TRUE`

**Done when:** All 7 verifications pass.

---

## P3-INT-002 — Phase 3 Performance Validation
**Owner:** INT
**Priority:** IMPORTANT
**Depends on:** P3-INT-001

**Tasks:**
- [ ] Measure Decision Engine compute time for a user with 200 transactions: must be < 3 seconds (excluding Gemini narrative)
- [ ] Measure `GET /api/decision-engine/output` response time: must be < 100ms
- [ ] Verify Decision Engine runs as a fire-and-forget background task (upload response not delayed by DE computation)
- [ ] Verify DE does not run for Level 1–2 users (check FastAPI logs for early-return behavior)

**Done when:** All 4 performance targets met.

---

# SECTION 6 — PHASE 4: SCALE AND VECTOR INTELLIGENCE

**Objective:** 10,000+ user scale, pgvector semantic search, async processing queue, materialized views.
**Gate to start:** Phase 3 ✅ + ≥ 1,000 active users
**Duration:** Ongoing — implement components as scale thresholds are reached

---

## P4-BE-001 — Materialized Views for Dashboard
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** Phase 3 ✅

**Tasks:**
- [ ] Create `mv_user_category_totals` materialized view (exact SQL from TECH_STACK_v2.md §4.6)
- [ ] Create unique index on the materialized view
- [ ] Set up refresh job via `pg_cron` extension: `REFRESH MATERIALIZED VIEW CONCURRENTLY` every 6 hours
- [ ] Update `GET /api/dashboard/summary` to query `mv_user_category_totals` instead of live `transactions` scan
- [ ] A/B performance test: measure query time before and after materialized view at 1M+ rows

**Done when:**
- Dashboard summary query time < 200ms at 5M+ transaction rows (verify with `EXPLAIN ANALYZE`)
- `REFRESH MATERIALIZED VIEW CONCURRENTLY` does not block reads (verify with load test)

---

## P4-BE-002 — pgvector Semantic Search
**Owner:** BE (Kiro)
**Priority:** IMPORTANT
**Depends on:** Phase 3 ✅

**Tasks:**
- [ ] Enable `pgvector` extension in Supabase: `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] Add `merchant_embedding VECTOR(1536)` column to `transactions` table
- [ ] Create `fastapi/embeddings/merchant_embedder.py`:
  - `async def embed_merchant(merchant: str) -> list[float]`
  - Uses OpenAI `text-embedding-3-small` (1536 dimensions, cheapest embedding model)
  - Caches embeddings: if merchant already embedded in DB, return cached vector
- [ ] Generate embeddings for all existing merchant names as a migration job
- [ ] After each new transaction: generate embedding for `merchant` field, store in `merchant_embedding`
- [ ] Update `GET /api/receipts?q=` to use vector similarity when `pg_trgm` returns < 3 results:
  ```sql
  SELECT * FROM transactions
  ORDER BY merchant_embedding <=> query_embedding
  LIMIT 20
  ```
- [ ] Create `idx_transactions_merchant_vector` — IVFFlat index for approximate nearest neighbor

**Done when:**
- Searching "gym" returns transactions from "Cult.Fit" (semantic match, not text match)
- Embedding generation adds < 50ms to transaction processing (async, non-blocking)
- `merchant_embedding <=> query_embedding` cosine similarity search executes in < 100ms

---

## P4-BE-003 — Async Processing Queue
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P4-BE-001 (scale threshold reached)

**Tasks:**
- [ ] Add Redis to Railway deployment
- [ ] Add `redis==5.0.0` and `rq==1.16.0` (or `bullmq` Python client) to `requirements.txt`
- [ ] Refactor `POST /analyze/receipt` FastAPI endpoint:
  - Instead of running full pipeline synchronously: enqueue job to Redis queue, return `{ receipt_id, status: 'queued' }`
  - Worker process picks up job and runs full pipeline
- [ ] Update Next.js upload flow:
  - `useUpload` hook: after `status='queued'` response, subscribe to Supabase Realtime on `receipts.status` for `receipt_id`
  - When `status` changes to `'complete'`: fetch results and transition modal to RESULTS state
  - Show queue position in upload modal: "Processing — 2 of 5 in queue"
- [ ] Add `REDIS_URL` environment variable to FastAPI Railway config

**Done when:**
- During simulated load (50 concurrent uploads): all uploads complete without timeout errors
- Queue drain time after 50 simultaneous submissions: < 5 minutes
- Upload modal shows "Processing" with queue position (not just a spinner)
- Supabase Realtime subscription triggers modal transition correctly

---

## P4-BE-004 — Rate Limiting at Edge
**Owner:** INT
**Priority:** IMPORTANT
**Depends on:** Phase 3 ✅

**Tasks:**
- [ ] Implement Vercel Edge Middleware rate limiting on `POST /api/receipts/upload`:
  - Free tier: 5 uploads/hour (composite key: IP + userId)
  - Pro tier: 60 uploads/hour
- [ ] Rate limit response: `429 Too Many Requests` with `Retry-After` header
- [ ] Update upload modal: handle 429 as a new state `'rate_limited'` with "Too many uploads — try again in X minutes"

**Done when:**
- Free tier user uploading 6 files in 1 hour: 6th upload returns 429 with `Retry-After`
- Pro tier user: same scenario allows all 6 uploads

---

## P4-FE-001 — "Ask FinSight" Conversational Interface
**Owner:** FE
**Priority:** IMPORTANT
**Depends on:** P4-BE-002

**Tasks:**
- [ ] Create `src/components/ask/AskFinSightPanel.tsx` — floating panel triggered by `/ask` command or sidebar button:
  - Text input: "Ask a question about your finances..."
  - Conversation history (last 10 turns)
  - Loading state: animated dots
  - Answer rendered as formatted text with amounts highlighted
- [ ] Create `POST /api/ask` Next.js route — calls `POST /fastapi/ask/query` with question + user context
- [ ] Create `fastapi/routers/ask.py` — `POST /ask/query`:
  - Fetch user's transaction summary, Decision Engine output, recent insights
  - Build context prompt: "The user has spent ₹X on food, has Y subscriptions worth ₹Z/month, their health score is W..."
  - Pass user question + context to Gemini 2.0 Flash
  - Stream response back (SSE or simple JSON)

**Done when:**
- "Why did my health score drop this month?" returns a specific answer citing actual numbers
- "How much am I spending on subscriptions?" returns subscription list from Decision Engine
- Gemini has access to the user's actual data (not generic advice)

---

## P4-INT-001 — LangChain Integration (Pipeline Orchestration)
**Owner:** INT
**Priority:** OPTIONAL
**Depends on:** P4-FE-001

**Entry condition:** The Decision Engine has branching logic based on user segment (freelancer vs. salaried) that requires dynamic prompt selection. Currently handled with `if` statements — becomes unmaintainable at 5+ branches.

**Tasks:**
- [ ] Add `langchain==0.2.0` and `langchain-core==0.2.0` to `requirements.txt`
- [ ] Refactor `fastapi/decision_engine/engine.py` to use LangChain LCEL (LangChain Expression Language) for the multi-step pipeline
- [ ] Create `fastapi/chains/categorization_chain.py` — LangChain chain wrapping the Groq categorization call with routing based on receipt type
- [ ] Migrate prompt templates from string f-strings to `langchain.prompts.ChatPromptTemplate`
- [ ] Verify all existing tests pass with LangChain-based pipeline

**Done when:**
- All existing pipeline tests pass (no regression)
- Decision Engine correctly routes freelancer vs. salaried branches via LangChain routing
- LangChain version pinned and locked — no `>=` version specifiers

---

# SECTION 7 — PHASE 5: MULTI-AGENT SYSTEM

**Objective:** LangGraph agent system for conversational financial advisor, automation workflows.
**Gate to start:** Phase 4 ✅ + pgvector deployed + "Ask FinSight" (P4-FE-001) in production
**Duration:** 10–16 weeks

---

## P5-BE-001 — LangGraph Agent Graph Definition
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** Phase 4 ✅, P4-INT-001

**Tasks:**
- [ ] Add `langgraph==0.2.0` to `requirements.txt`
- [ ] Create `fastapi/agents/graph.py` — define the agent graph with these nodes:
  - `intent_classifier`: classifies user question into: `spending_query | tax_query | subscription_query | health_score_query | general_query`
  - `transaction_analyst`: handles spending questions — queries DB, runs pattern detection, returns analysis
  - `tax_advisor`: handles tax questions — runs tax_estimator, explains deductibility categories
  - `subscription_auditor`: handles subscription questions — runs subscription_detector
  - `health_analyzer`: handles health score questions — explains sub-scores, identifies drivers
  - `response_synthesizer`: takes agent outputs, generates final natural language response with Gemini
- [ ] Define edges: `intent_classifier` → (route to one of 5 nodes) → `response_synthesizer`
- [ ] State schema: `{ messages: list, user_data: dict, agent_output: dict, final_response: str }`

**Done when:**
- Graph compiles without error: `graph = StateGraph(AgentState).compile()`
- `intent_classifier` correctly routes "Why is my food spend high?" to `transaction_analyst`
- `intent_classifier` correctly routes "How much tax can I save?" to `tax_advisor`
- Graph handles multi-turn conversation: second message in thread routes correctly based on context

---

## P5-BE-002 — Agent Memory and Conversation State
**Owner:** BE (Kiro)
**Priority:** CRITICAL
**Depends on:** P5-BE-001

**Tasks:**
- [ ] Create `conversations` table in Supabase:
  ```sql
  CREATE TABLE public.conversations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    thread_id  TEXT NOT NULL,
    messages   JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Add RLS policies (SELECT, INSERT, UPDATE for own rows)
- [ ] Create `fastapi/agents/memory.py`:
  - `async def load_conversation(user_id: str, thread_id: str) -> list`
  - `async def save_conversation(user_id: str, thread_id: str, messages: list)`
- [ ] Integrate with LangGraph checkpointer — persist and resume conversation state across requests

**Done when:**
- User asks "How much did I spend on food?" → gets answer
- User asks "And compared to last month?" in the same thread → agent uses previous context
- Conversation state persists across page reloads (not just in-memory)

---

## P5-BE-003 — Automation Workflows
**Owner:** BE (Kiro)
**Priority:** OPTIONAL
**Depends on:** P5-BE-001

**Tasks:**
- [ ] Create "Monthly Review" workflow — LangGraph subgraph:
  - Triggered: 1st of each month
  - Steps: fetch month data → run all DE modules → generate insights → send email digest with agent commentary
- [ ] Create "Subscription Alert" workflow:
  - Triggered: when new subscription detected
  - Steps: identify subscription → check if similar exists → compose email "New subscription detected: Netflix ₹649/month"
- [ ] Create `POST /api/workflows/trigger` — Next.js route to manually trigger a workflow by name

**Done when:**
- Monthly Review workflow runs end-to-end for a test user
- Subscription Alert email sent when test subscription created

---

## P5-FE-001 — Conversational UI
**Owner:** FE
**Priority:** CRITICAL
**Depends on:** P5-BE-002

**Tasks:**
- [ ] Upgrade `AskFinSightPanel.tsx` to full conversational interface:
  - Conversation thread rendering with role-based bubbles (user: amber bg / FinSight: glass card)
  - Streaming response display (characters appear in real-time via SSE or chunked fetch)
  - Suggested questions panel for first-time users: "What's my biggest spending category?" / "How much tax can I save?" / "Which subscriptions am I forgetting about?"
  - Thread persistence: conversation thread ID stored in URL param so threads are shareable/restorable
- [ ] Create `src/app/(app)/ask/page.tsx` — full-page conversation interface
- [ ] Add "Ask FinSight" nav item to Sidebar (Level 3+ only)

**Done when:**
- Conversation renders correctly with correct roles
- Response streams in real-time (not all at once)
- Suggested questions work for first-time users
- Thread ID in URL persists conversation across page reloads

---

## P5-INT-001 — Agent Quality Validation
**Owner:** INT
**Priority:** CRITICAL
**Depends on:** All P5 tasks

**Tasks:**
- [ ] Run quality test suite against the agent graph with 10 standardized financial questions
- [ ] Measure routing accuracy: `intent_classifier` must route correctly for ≥ 90% of test questions
- [ ] Measure response relevance: responses must contain specific amounts from the user's actual data (not generic advice) for ≥ 85% of queries
- [ ] Measure response latency: time-to-first-token ≤ 2 seconds, full response ≤ 8 seconds
- [ ] Verify multi-turn context: follow-up questions correctly reference previous answers for ≥ 80% of cases
- [ ] Verify no PII leakage: agent never exposes one user's data when queried by another user

**Done when:** All 6 quality gates pass.

---

# SECTION 8 — TASK DEPENDENCY MATRIX

| Task ID | Depends On | Blocks |
|---|---|---|
| P1-BE-001 | — | Everything |
| P1-BE-002 | P1-BE-001 | P1-BE-003, P1-BE-005 |
| P1-BE-003 | P1-BE-002 | P1-BE-004, P1-BE-009 |
| P1-BE-004 | P1-BE-003 | P1-FE-003 |
| P1-BE-005 | P1-BE-002 | P1-BE-006 |
| P1-BE-006 | P1-BE-005 | P1-BE-007 |
| P1-BE-007 | P1-BE-006 | P1-BE-008, P1-BE-009 |
| P1-BE-008 | P1-BE-007 | P1-INT-002 |
| P1-BE-009 | P1-BE-007, P1-BE-003 | P1-BE-010 |
| P1-BE-010 | P1-BE-009 | P1-FE-003 |
| P1-FE-001 | P1-BE-001 | P1-FE-002 |
| P1-FE-002 | P1-FE-001 | P1-FE-003, P1-FE-004, P1-FE-005 |
| P1-FE-003 | P1-BE-010, P1-FE-002 | P1-FE-005 |
| P1-FE-004 | P1-FE-002 | P1-FE-005 |
| P1-FE-005 | P1-FE-004, P1-BE-009 | P1-INT-002 |
| P2-BE-001 | Phase 1 ✅ | All P2 BE tasks |
| P2-BE-002 | P2-BE-001 | P2-FE-001 |
| P2-BE-003 | P2-BE-001 | P2-FE-005 |
| P3-BE-001 | Phase 2 ✅ | All P3 BE tasks |
| P3-BE-005 | P3-BE-002–004 | P3-BE-006, P3-FE-003 |
| P4-BE-003 | P4-BE-001 | P4-FE-001 |
| P5-BE-001 | Phase 4 ✅, P4-INT-001 | P5-BE-002, P5-FE-001 |

---

# SECTION 9 — PRIORITY SUMMARY

## CRITICAL Tasks (Cannot be skipped — blocks phase progression)

| Phase | Task ID | Task Name |
|---|---|---|
| P1 | P1-BE-001 | Repository and project skeleton |
| P1 | P1-BE-002 | Supabase schema with all 5 tables |
| P1 | P1-BE-003 | Supabase client configuration |
| P1 | P1-BE-004 | Authentication system |
| P1 | P1-BE-005 | FastAPI service foundation |
| P1 | P1-BE-006 | AI client modules (NVIDIA + Groq + Gemini) |
| P1 | P1-BE-007 | Analyze router — full pipeline |
| P1 | P1-BE-008 | Insights router |
| P1 | P1-BE-009 | Next.js BFF routes |
| P1 | P1-BE-010 | End-to-end pipeline smoke test |
| P1 | P1-FE-001 | Global layout and design system |
| P1 | P1-FE-002 | Atomic components |
| P1 | P1-FE-003 | Upload modal (6 states) |
| P1 | P1-FE-004 | App shell and IntelligenceMeter |
| P1 | P1-FE-005 | Dashboard (all 4 intelligence levels) |
| P2 | P2-BE-001 | Phase 2 schema migration |
| P2 | P2-BE-002 | Anomaly detection |
| P2 | P2-FE-002 | Charts (Level 3 unlock) |
| P2 | P2-FE-003 | Insights page |
| P2 | P2-FE-004 | HealthScoreCard SVG arc |
| P2 | P2-INT-002 | Phase 2 integration validation |
| P3 | P3-BE-001–006 | All Decision Engine backend modules |
| P3 | P3-FE-001–003 | Decision Panel UI |
| P3 | P3-INT-001 | Decision Engine E2E validation |
| P4 | P4-BE-001 | Materialized views |
| P4 | P4-BE-003 | Async processing queue |
| P5 | P5-BE-001 | LangGraph agent graph |
| P5 | P5-BE-002 | Agent memory |
| P5 | P5-FE-001 | Conversational UI |
| P5 | P5-INT-001 | Agent quality validation |

## IMPORTANT Tasks (Needed for phase completion — do not skip in normal execution)

P1-INT-001 (CI/CD) · P1-INT-002 (Receipts page) · P1-INT-003 (Settings + production validation)
P2-BE-003 (Personalized categorization) · P2-BE-004 (Pattern detection) · P2-BE-005 (Search)
P2-FE-001 (Anomaly visualization) · P2-FE-005 (Manual correction) · P2-INT-001 (Email digest)
P3-FE-004 (Business expense flag) · P3-INT-002 (Performance validation)
P4-BE-002 (pgvector) · P4-BE-004 (Rate limiting) · P4-FE-001 (Ask FinSight)

## OPTIONAL Tasks (Additive — can be deferred without breaking the phase)

P4-INT-001 (LangChain refactor — only when DE branches exceed 5)
P5-BE-003 (Automation workflows)

---

# SECTION 10 — OWNERSHIP ASSIGNMENTS

| Owner | Responsibilities |
|---|---|
| **BE (Kiro)** | All FastAPI routes and modules · AI client files · Database schema and migrations · Python decision engine modules · Supabase configuration · Railway deployment |
| **FE (v0/dev)** | All `src/components/` · All `src/app/` pages · All `src/hooks/` · Tailwind config · `globals.css` keyframes · `src/lib/utils/` · `src/lib/motion-tokens.ts` |
| **INT (you)** | Next.js API routes (`src/app/api/`) · `src/lib/api/` typed wrappers · `src/middleware.ts` · `src/lib/supabase/` clients · CI/CD pipeline · Environment variable management · End-to-end integration tests · Production validation checklists |

## Boundary Rules

1. **INT owns the boundary between FE and BE.** When FE needs data from BE, INT writes the Next.js API route and the TypeScript fetch wrapper. FE components import from `src/lib/api/` — they never call `fetch('/api/...')` directly with `JSON.parse` chains.

2. **BE writes no frontend code.** FastAPI is Python. Railway is Python. BE does not create React components, does not touch `src/`, does not modify `tailwind.config.ts`.

3. **FE does not touch AI logic.** No AI provider SDK appears in any `.tsx` or `.ts` file in `src/`. No Gemini, no Groq, no NVIDIA NIM in the frontend.

4. **Secret scanning is INT's responsibility.** Before every merge to `main`, INT runs the secret scan grep. If a secret is found, INT traces it to the owner and blocks the merge.

---

# SECTION 11 — DONE CRITERIA CHECKLIST (Per Phase)

## Phase 1 Complete When:

- [ ] `npm run build` exits 0 on main branch
- [ ] All CI jobs pass (security, type-check, lint, fastapi-check)
- [ ] End-to-end upload works: real receipt → real data in DB → real dashboard update
- [ ] All 4 intelligence levels render correctly with correct component gating
- [ ] Level unlock animation fires on 3rd, 6th, and 10th receipts
- [ ] Free tier limit enforced server-side (21st upload → 402 with upgrade prompt)
- [ ] `processed_at` in receipts is real ISO timestamp (run: `SELECT processed_at FROM receipts LIMIT 5`)
- [ ] Secret scan returns zero results
- [ ] No `is_manually_corrected`, `is_anomalous`, `is_subscription` behavior visible in UI (Phase 2 features)

## Phase 2 Complete When:

- [ ] Anomaly detection correctly flags statistically unusual transactions
- [ ] Manual category correction updates DB and persists through page reload
- [ ] Charts render at Level 3 and are absent at Level 1–2
- [ ] HealthScoreCard SVG arc animates on first render
- [ ] Insights page redirects Level 1–2 users to dashboard
- [ ] Personalized categorization: corrected merchant re-categorizes correctly on next upload
- [ ] Phase 2 integration validation (P2-INT-002) passes all 6 checks

## Phase 3 Complete When:

- [ ] Decision Engine runs end-to-end for a test user with 10+ transactions
- [ ] Tax estimate: business transactions produce correct deductible total
- [ ] Subscription detection: test subscriptions correctly identified
- [ ] Budget leakage: spiked category correctly flagged with correct severity
- [ ] Decision Panel UI renders in production with real data
- [ ] Engine performance: DE compute < 3s, API read < 100ms
- [ ] P3-INT-001 all 7 verifications pass

---

*End of FINSIGHT TASKS.md v1.0.0*
*This document governs all engineering execution.*
*Source authority: TECH_STACK_v2.md · PRD_v2.md · STAGE_GUIDE.md v1.1 · UI_GENERATOR_SPEC.md v2.0*
