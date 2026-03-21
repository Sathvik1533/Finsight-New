# FINSIGHT — TIMELINE.md
## Execution Roadmap V1 → V5

```
Version:        1.0.0
Classification: Internal — Engineering Execution
Status:         Active — Build Contract
Consumes:       PRD_v2.md · TECH_STACK.md v2.0 · AI_STACK.md v1.0
                INFRA.md v1.0 · PROMPT_STRATEGY.md v1.0
                PRODUCT_EVOLUTION.md v1.0
Authors:        FinSight Engineering
Total Horizon:  ~10 weeks (V1 through V3 production-ready)
```

---

## DOCUMENT AUTHORITY

This is the execution contract. Every sprint entry maps
to a specific file, function, endpoint, or DB object —
not a feature category. Vague tasks ("build the dashboard")
do not appear here. Specific tasks ("implement
`GET /api/dashboard/summary` with category breakdown
query using `GROUP BY category`") do. If a task cannot
be made this specific, it means the design is not ready
and should not be in the sprint.

Timelines are estimates with named risks. A day that
slips is a day that is documented with a reason.

---

## TABLE OF CONTENTS

1. [Execution Philosophy](#1-execution-philosophy)
2. [V1 — Core System (5 Days)](#2-v1--core-system-5-days)
3. [V2 — Product Layer (7 Days)](#3-v2--product-layer-7-days)
4. [V3 — Decision Engine (2 Weeks)](#4-v3--decision-engine-2-weeks)
5. [V4 — Scale + Advanced AI (3 Weeks)](#5-v4--scale--advanced-ai-3-weeks)
6. [V5 — Differentiation (Ongoing)](#6-v5--differentiation-ongoing)
7. [Dependency Map](#7-dependency-map)
8. [Team Execution Model](#8-team-execution-model)
9. [Risk Register](#9-risk-register)
10. [Success Metrics](#10-success-metrics)

---

## 1. Execution Philosophy

### 1.1 The Build Order Principle

FinSight is a pipeline product. Every layer depends on
the layer below it. You cannot build insights before
categorization works. You cannot build categorization
before OCR works. You cannot build OCR before the
database schema exists. This is not a product team
choosing to be disciplined — it is physics. The build
order is imposed by architecture, not preference.

This means the first 5 days are not about shipping
features. They are about proving the pipeline works
end-to-end with real data. A receipt photograph enters
the system. A categorized transaction exits into a
database. The dashboard shows it. Until this loop
closes, nothing else matters.

```
PIPELINE DEPENDENCY CHAIN (cannot be inverted)

DB Schema + RLS         → everything downstream uses this
Supabase Auth           → every route requires a session
FastAPI skeleton        → all AI calls go through here
NVIDIA NIM OCR          → required for categorization input
Groq Categorization     → required for transaction writes
Transaction DB write    → required for dashboard data
Next.js BFF routes      → required for frontend connection
Dashboard frontend      → required for user-visible value

Build in this order. Test each layer before adding the next.
```

### 1.2 Phase Discipline

Phase discipline is not about conservatism — it is about
not building on unstable foundations. V3's subscription
detector requires merchant history across multiple months.
You cannot have merchant history without V1's categorization
pipeline running reliably for 30+ days. V4's async queue
solves a concurrency problem that does not exist until
you have 1,000+ users. Building the queue before you
have 100 users is solving a problem you do not have yet
with complexity that will slow down the work you do have.

```
PHASE GATE RULES

V1 → V2: The full pipeline must process 10 real receipts
         with ≥ 90% field extraction accuracy before
         any V2 feature enters development.

V2 → V3: Category correction must be live and receiving
         real corrections from real users before V3's
         personalized categorization uses that data.
         (You cannot build the feedback consumer
         before the feedback exists.)

V3 → V4: V3 features must be live for 30+ days before
         V4 scale infrastructure is built. The scale
         problem must be observable before the solution
         is engineered.

V4 → V5: V5 AI Agent and Business Workspace features
         require 12+ months of user transaction history
         to be genuinely valuable. Ship V4 first.
         Let the data accumulate.
```

### 1.3 The Execution Model for This Team

This is a two-person technical team with AI assistance:

- **You (EM + Integration Lead):** System design,
  FastAPI backend, database schema, API integration,
  testing, deployment, cross-layer debugging.
- **Kiro:** Frontend scaffolding, component generation,
  BFF route implementation once contracts are defined.
- **AI tools (v0.dev, Claude, Cursor):** Component
  generation for known patterns, boilerplate reduction.

The constraint: AI tools generate code you must review.
Every generated component is tested against real data
before it is considered done. AI-generated code that
has not been tested is not done — it is a draft.

---

## 2. V1 — Core System (5 Days)

```
GOAL: Working end-to-end pipeline with real data
DEFINITION OF DONE: Upload a real receipt photo → see a
  categorized transaction on the dashboard.
  No mocked data. No hardcoded responses. Real OCR.
  Real categorization. Real database. Real UI.
```

---

### Day 1 — Foundation: Database + Auth + FastAPI Shell

**Owner:** You (backend) in parallel with Kiro (Next.js setup)

**You deliver by end of Day 1:**

```
SUPABASE SETUP
□ Create Supabase project in ap-south-1 region
□ Execute all 5 table DDL statements in order:
    001_create_profiles.sql
    002_create_receipts.sql
    003_create_transactions.sql
    004_create_insights.sql
    005_create_decision_engine_outputs.sql
□ Add all database indexes (7 indexes from TECH_STACK §4.5)
□ Enable RLS on all 5 tables
□ Create all RLS policies (TECH_STACK §4.4 — 14 policies)
□ Deploy `handle_new_user()` trigger
□ Deploy `increment_receipt_count()` function
□ Deploy `archive_decision_engine_output()` function
□ Create `receipts` storage bucket (private)
□ Apply storage RLS policies (3 policies from TECH_STACK §5.2)
□ Configure Auth: enable Email + Google OAuth
□ Set Auth redirect URL to localhost:3000 for dev

FASTAPI SKELETON
□ Create fastapi/ directory structure:
    fastapi/
    ├── main.py              (app + CORS + health route)
    ├── config.py            (env var loading + validation)
    ├── models/              (Pydantic schemas)
    │   ├── ocr.py           (OCROutput schema)
    │   ├── categorization.py (CategorizationOutput schema)
    │   └── pipeline.py      (ReceiptAnalysisRequest/Response)
    ├── ai_clients/          (empty — Day 2)
    │   ├── nvidia_nim.py
    │   ├── groq_client.py
    │   └── gemini_client.py
    ├── pipeline/            (empty — Days 2-3)
    │   └── orchestrator.py
    └── requirements.txt
□ `GET /health` implemented and returning `{"status": "ok"}`
□ CORS configured: localhost:3000 origin only
□ X-Internal-Secret middleware implemented (rejects missing header)
□ Dockerfile created (Python 3.11-slim, uvicorn, port 8000)
□ fastapi/.env created (gitignored) with all 7 env vars

TEST: `curl localhost:8000/health` returns `{"status": "ok"}`
```

**Kiro delivers by end of Day 1:**

```
NEXT.JS PROJECT SETUP
□ next create app with App Router, TypeScript, Tailwind v3
□ Install all dependencies:
    @supabase/supabase-js @supabase/ssr
    @tanstack/react-query
    framer-motion
    lucide-react
    shadcn/ui init (Button, Dialog, Toast, Badge, Tooltip)
□ Create .env.local with 5 env vars (3 NEXT_PUBLIC + 2 server)
□ Supabase client files:
    src/lib/supabase/client.ts   (browser client)
    src/lib/supabase/server.ts   (server client — cookies)
□ Tailwind config: extend with FinSight design tokens
    (indigo #0D0F1A, amber #FFD166, JetBrains Mono for money)
□ Global layout: AppShell with sidebar placeholder
□ Auth pages: /auth/login and /auth/signup (forms only,
    no logic yet — Day 4)

TEST: `npm run dev` compiles without errors.
      Browser shows /auth/login page.
```

**Blocker if Day 1 slips:**
Supabase DDL execution order matters (foreign key constraints).
If any migration fails, fix it before moving to Day 2.
Do not proceed with a broken schema.

---

### Day 2 — OCR Integration (NVIDIA NIM)

**Owner:** You (backend)

```
NVIDIA NIM CLIENT
□ Implement fastapi/ai_clients/nvidia_nim.py:
    - AsyncOpenAI client pointing to integrate.api.nvidia.com/v1
    - `extract_receipt(image_base64: str) -> dict` function
    - temperature=0.0, max_tokens=1024, timeout=12.0
    - response_format=json_object
□ Copy OCR_EXTRACTION_PROMPT from PROMPT_STRATEGY.md §2.2
    into fastapi/prompts/ocr_extraction_v1.py
□ Implement OCROutput Pydantic model (PROMPT_STRATEGY §6.1):
    - merchant: Optional[str]
    - amount: Optional[float]
    - currency: Optional[Literal[...]]
    - date: Optional[str] with YYYY-MM-DD validator
    - confidence: float (ge=0.0, le=1.0)

PYDANTIC VALIDATION
□ Add amount validator: raises if negative
□ Add date validator: regex match YYYY-MM-DD format
□ Confidence gate function:
    def is_confidence_acceptable(confidence: float) -> bool:
        return confidence >= 0.30
    # This is the hard rejection threshold from PRD §7

BASIC /analyze/receipt STUB
□ Create POST /analyze/receipt in main.py:
    - Validate X-Internal-Secret (middleware handles this)
    - Decode base64 → bytes
    - Call extract_receipt() → OCROutput
    - If confidence < 0.30: return 422
    - Return raw extraction JSON (no categorization yet)
□ Retry logic via tenacity:
    - 2 attempts on TimeoutException / ConnectError
    - 1s, 4s exponential backoff

MANUAL TEST (required before Day 3)
□ Take a clear photo of any real receipt
□ Convert to base64: `base64 -i receipt.jpg`
□ POST to localhost:8000/analyze/receipt with:
    { "image_base64": "...", "user_id": "test", "receipt_id": "test" }
□ Verify response contains merchant, amount, date, confidence
□ Confidence must be ≥ 0.30 on a clear receipt photo
□ Test with a blurry/dark photo: confirm 422 on low confidence
```

**Blocker if Day 2 slips:**
NVIDIA NIM API key not provisioned. Resolution: create
account at build.nvidia.com, activate API key, add to
fastapi/.env. This must be done at the start of Day 1,
not Day 2.

**What NOT to do on Day 2:**
Do not build error handling UI. Do not build the upload
modal. Do not configure Railway deployment. The only
goal today is proving the OCR call works with real data.

---

### Day 3 — Categorization + Database Write

**Owner:** You (backend)

```
GROQ CATEGORIZATION CLIENT
□ Implement fastapi/ai_clients/groq_client.py:
    - AsyncGroq client
    - `categorize_transaction(extraction: dict,
        merchant_history: list) -> dict` function
    - temperature=0.1, max_tokens=128, timeout=5.0
    - response_format=json_object
□ Copy CATEGORIZATION_SYSTEM_PROMPT from TECH_STACK §6.2
    into fastapi/prompts/categorization_v1.py
□ Implement CategorizationOutput Pydantic model:
    - category: Literal[...12 categories...]
    - confidence: float (ge=0.0, le=1.0)
    - reasoning: str (max_length=200)
□ Confidence fallback: if confidence < 0.50 → category = "Other"
□ Invalid category fallback: if category not in ALLOWED →
    category = "Other", confidence = 0.0

SUPABASE DATABASE WRITE
□ Implement database write in orchestrator.py:
    STEP 1: INSERT INTO transactions row
        (user_id, receipt_id, merchant, amount, currency,
         transaction_date, category, confidence,
         categorization_model, is_business_expense=False)
    STEP 2: UPDATE receipts SET
        status='complete', processed_at=NOW(),
        ocr_confidence=confidence,
        gemini_response=jsonb(ocr+cat results),
        ai_model_used='nvidia-llama-3.2-90b'
    STEP 3: RPC increment_receipt_count(user_id)
        → atomically updates total_receipts_uploaded
        → recalculates intelligence_level in SQL
□ All writes use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
□ Failure mode: if DB write fails → return 503 with
    error_code: "DATABASE_WRITE_FAILED"

COMPLETE /analyze/receipt PIPELINE
□ Wire together in orchestrator.py:
    async def run_full_pipeline(image_base64, user_id, receipt_id):
        ocr = await extract_receipt(image_base64)       # NVIDIA NIM
        if ocr.confidence < 0.30: raise OCRFailedError
        cat = await categorize_transaction(ocr.dict())  # Groq
        await write_to_database(ocr, cat, user_id, receipt_id)
        return { status, extraction: ocr, categorization: cat }
□ BackgroundTasks stub for Decision Engine (empty for now):
    background_tasks.add_task(stub_decision_engine, user_id)

MANUAL TEST (required before Day 4)
□ POST to /analyze/receipt with real receipt base64
□ Check Supabase Table Editor:
    - receipts table: row exists with status='complete'
    - transactions table: row exists with real category
    - profiles table: total_receipts_uploaded incremented
□ Verify intelligence_level updated to 1 (first receipt)
□ Test with 3 more receipts: verify level stays 1 until
    receipt #3, then jumps to 2
```

**Critical check before leaving Day 3:**
Run the pre-deploy secret audit script from INFRA.md.
Make sure no API key appears in any `.ts` or `.tsx` file.
This is a 30-second check that catches a class of problems
that would take hours to debug in production.

---

### Day 4 — Frontend Connection

**Owner:** Kiro (frontend) directed by You (API contracts)

**You define before Kiro starts:**
Write the exact API response shapes for each route so
Kiro codes against a contract, not a guess.

```
NEXT.JS BFF ROUTES (you implement — these touch secrets)
□ POST /api/receipts/upload:
    [1] createServerClient() → extract session → user_id
    [2] Check free tier limit (profiles.total_receipts_uploaded >= 25)
        → return 402 if exceeded
    [3] Validate MIME: accept only jpeg/png/webp/pdf
        → return 400 if invalid
    [4] Validate size: ≤ 10MB → return 400 if over
    [5] Upload to Supabase Storage:
        path: receipts/{user_id}/{uuid}.{ext}
        using: SUPABASE_SERVICE_ROLE_KEY
    [6] INSERT receipts row: status='pending'
    [7] Convert file buffer to base64
    [8] POST to FastAPI /analyze/receipt:
        headers: X-Internal-Secret: FASTAPI_SECRET_KEY
        body: { image_base64, user_id, receipt_id }
        timeout: 60s (Vercel Pro required)
    [9] Return FastAPI response to browser

□ GET /api/dashboard/summary:
    → session validate → user_id
    → Query:
        SELECT
          SUM(amount) as total_spend,
          COUNT(*) as transaction_count,
          MAX(transaction_date) as last_transaction,
          array_agg(DISTINCT category) as categories
        FROM transactions
        WHERE user_id = $1
          AND transaction_date >= NOW() - INTERVAL '30 days'
    → Return: { total_spend, transaction_count,
                top_category, last_transaction }

□ GET /api/receipts:
    → session validate → user_id → page/category/range params
    → Paginated query with filters
    → Return: { receipts, transactions, total, page }

□ GET /api/receipts/[id]:
    → session validate → single receipt row + transaction row
    → Generate signed URL (1hr expiry) for image
    → Return: { receipt, transaction, image_url }
```

**Kiro implements (frontend):**

```
AUTHENTICATION FLOW
□ /auth/login: email/password form → supabase.auth.signIn()
□ /auth/signup: form → supabase.auth.signUp()
□ Google OAuth button → supabase.auth.signInWithOAuth()
□ Auth callback route: /api/auth/callback (exchanges code)
□ Session check in layout: redirect to /auth if no session
□ useUser() hook: returns profile from Supabase

UPLOAD MODAL (core interaction — must work before dashboard)
□ UploadModal component: 3 states only for now
    IDLE → shows dropzone
    PROCESSING → shows "Analyzing receipt..." spinner
    RESULTS → shows extraction fields (merchant, amount, date,
               category, confidence bar)
□ POST to /api/receipts/upload on confirm
□ On success: close modal, invalidate TanStack queries
□ On error: show specific error message (OCR failed vs. limit reached)
□ The modal must handle 8s wait gracefully (animation, not blank)

DASHBOARD PAGE (Level 1–4 states)
□ GET /api/dashboard/summary via TanStack Query
□ KPI cards: 4 cards showing total_spend, transaction_count,
    top_category, last_transaction
□ Level 1 state: skeleton KPI cards (shimmer)
□ Level 2+ state: real data in KPI cards
□ Transaction Feed: GET /api/receipts?page=1, shows last 8
□ Intelligence Meter: horizontal bar on Dashboard
    - reads from profile.total_receipts_uploaded
    - level computed client-side via getIntelligenceLevel()
    - never reads profile.intelligence_level directly

SIDEBAR
□ Navigation: Dashboard | Receipts | Insights | Settings
□ Intelligence Meter (vertical variant) — always visible
□ Upload CTA button — always amber, always accessible
□ Collapse to 64px on tablet

TEST: Click Upload → select real receipt photo →
      confirm → see transaction on dashboard.
      Upload 3 total → see Intelligence Meter advance to Level 2.
      KPI cards fill with real data at Level 2.
```

---

### Day 5 — Integration Testing + Bug Fixing

**Owner:** You (lead) + Kiro (frontend fixes)

```
INTEGRATION TEST SUITE (manual — automated in V2)
□ Test 1: Happy path
    - Upload 10 receipts of different types
      (restaurant, grocery, transport, retail, utility)
    - Verify: all 10 create transactions with correct categories
    - Verify: intelligence level advances 1→2→3→4 correctly
    - Verify: dashboard KPI cards show correct totals
    - Verify: transaction feed shows all 10 in reverse date order

□ Test 2: OCR edge cases
    - Blurry receipt: confirm 422 + error state in modal
    - Non-receipt image (selfie): confirm 422 + clear error message
    - PDF receipt: confirm it processes correctly
    - Thermal receipt (common in India): test with a real one
    - Receipt with no date visible: confirm date=null, still saves

□ Test 3: Categorization spot check
    - Swiggy receipt → Food & Dining (must pass)
    - BigBasket receipt → Groceries (must pass)
    - Uber receipt → Transportation (must pass)
    - If any fail: adjust CATEGORIZATION_SYSTEM_PROMPT
      (not the model — the prompt first)

□ Test 4: Auth flow
    - Signup with email → verify email (use Supabase email)
    - Login → lands on dashboard
    - Google OAuth → lands on dashboard
    - Session expires: redirects to /auth/login

□ Test 5: Free tier gate
    - Create test user with total_receipts_uploaded = 25
    - Attempt upload: confirm 402 response
    - Confirm upgrade prompt appears in modal (not generic error)

□ Test 6: Secret audit
    - Run: grep -r "nvapi-\|gsk_\|AIza\|service_role" \
        --include="*.ts" --include="*.tsx" src/
    - Expected: ZERO RESULTS
    - If any results: STOP. Fix before any other work.

□ Test 7: Basic Railway deployment
    - Deploy FastAPI to Railway (RAILWAY_DOCKERFILE_PATH=fastapi/Dockerfile)
    - Verify GET https://[railway-url]/health → {"status":"ok"}
    - Update FASTAPI_INTERNAL_URL in Vercel env vars
    - Test one upload against deployed Railway service

BUG TRIAGE PROTOCOL
    P0 (blocking): Pipeline fails on valid receipt → fix same day
    P1 (degraded): Category wrong on common merchant → fix in Day 5
    P2 (cosmetic): UI misalignment → log, fix in V2
    P3 (edge case): Rare OCR failure → log, monitor

V1 DONE CRITERIA
□ 10 real receipts processed end-to-end with real OCR + real categorization
□ Dashboard shows real data for a Level 4 user
□ Intelligence Meter advances through all 4 levels correctly
□ Auth flow works (email + Google OAuth)
□ Railway service running and reachable from Vercel
□ Secret audit passes (zero exposed keys)
□ No P0 bugs open
```

---

## 3. V2 — Product Layer (7 Days)

```
GOAL: Make the product genuinely usable for daily use.
      Features that make users come back, not just try once.
PREREQUISITE: V1 done criteria all met.
DURATION: 7 working days (split into two sub-phases)
```

### V2 Sub-Phase A — Retention Core (Days 1–4)

**Day 1: Category Correction (IDEA-005)**

```
This is the highest-priority V2 feature (score: 9.0 from
PRODUCT_EVOLUTION §5.2). It must ship first because it is
the foundation for V3's personalized categorization.

BACKEND (You)
□ PATCH /api/receipts/[id]:
    - Validate session → user owns this receipt
    - UPDATE transactions SET
        category = new_category,
        is_manually_corrected = TRUE
      WHERE receipt_id = $1 AND user_id = $2
    - Return updated transaction row
□ Add `get_merchant_history()` function to FastAPI:
    SELECT merchant, category, COUNT(*) as count
    FROM transactions
    WHERE user_id = $1
      AND is_manually_corrected = TRUE
    GROUP BY merchant, category
    ORDER BY count DESC
    LIMIT 10
    (Used in Groq prompt context from this point forward)
□ Wire merchant_history into categorize_transaction() call:
    history = await get_merchant_history(user_id)
    cat = await categorize_transaction(ocr.dict(), history)

FRONTEND (Kiro)
□ Category dropdown on ReceiptDetailPage:
    - shadcn Select component with all 12 categories
    - PATCH /api/receipts/[id] on change
    - Optimistic update: category chip updates immediately
    - Error rollback: revert if PATCH fails
□ Confidence dot on TransactionRow:
    - Amber dot shown when confidence < 0.75
    - Tooltip: "Category assigned automatically — tap to review"
□ Settings page counter: "You've improved accuracy N times"
    - Query: COUNT(*) FROM transactions WHERE
        user_id = $1 AND is_manually_corrected = TRUE

TEST: Correct "AWS" from Other → Business & Professional.
      Upload another AWS receipt: must auto-categorize as
      Business & Professional (merchant history injection working).
```

**Day 2: Monthly Digest Email (IDEA-004)**

```
BACKEND (You)
□ Install Resend: pip install resend
□ Create fastapi/email/digest_builder.py:
    function build_digest_data(user_id: str) -> dict:
        - Query transactions: last 30 days
        - Compute: total_spend, top_category, category_breakdown
        - Fetch: latest health_score from insights table
        - Return structured dict (no AI, pure SQL)
□ Create Next.js /api/email/digest route:
    - Triggered by Supabase cron (pg_cron) on 1st of month
    - Or: manual trigger for testing
    - Auth: service role only (no user session needed)
    - Query users with email_digest_enabled = TRUE
        AND total_receipts_uploaded >= 3
    - For each user: build_digest_data() → send via Resend

□ Add to profiles table:
    ALTER TABLE profiles ADD COLUMN
        email_digest_enabled BOOLEAN DEFAULT TRUE;
    (Migration: 006_add_email_digest_column.sql)

EMAIL TEMPLATE (Kiro)
□ React Email component: MonthlyDigestEmail.tsx
    Props: { user_name, month_label, total_spend,
             top_category, top_category_amount,
             health_score, currency_symbol }
    Content: Subject line with real number, body with
             real data, single CTA "See your full breakdown"
□ Plain text fallback (required for deliverability)

□ Settings page: email digest toggle
    - Toggle connected to PATCH /api/profiles
    - Updates profiles.email_digest_enabled

TEST: Trigger digest manually for a test user with 5+
      receipts. Verify email arrives with correct numbers.
      Verify unsubscribe updates the DB column.
```

**Day 3: Batch Upload (IDEA-001)**

```
BACKEND (You)
□ New FastAPI endpoint: POST /analyze/receipts/batch
    Body: { images: [{ base64, media_type, receipt_id }] }
    Logic:
        # Process in parallel, max 3 concurrent NIM calls
        semaphore = asyncio.Semaphore(3)
        async def process_one(img):
            async with semaphore:
                return await run_full_pipeline(img)
        results = await asyncio.gather(
            *[process_one(img) for img in images],
            return_exceptions=True
        )
    Response: { results: [success/failure per image] }
□ Error isolation: one failed image does not fail the batch
□ Add batch variant of Next.js BFF route:
    POST /api/receipts/upload/batch
    - Accepts up to 20 files
    - Uploads all to Supabase Storage
    - Creates pending receipt rows
    - Calls FastAPI /analyze/receipts/batch

FRONTEND (Kiro)
□ BatchUploadModal: extends UploadModal with multi-file support
    - Dropzone: accepts multiple files
    - Preview grid: thumbnail per receipt
    - Processing: "Processing 4 of 9..."
    - Results table: merchant | amount | category | confidence
      per receipt, with inline correction before confirm
    - Low confidence (< 0.75): amber row highlight
    - Confirm all vs. confirm individually
□ Batch results: all saves trigger single cache invalidation

TEST: Drop 5 receipts simultaneously. All 5 must save.
      Verify Supabase has 5 transactions.
      Force one bad image in the batch: confirm it fails
      gracefully while others succeed.
```

**Day 4: Insights Page + Health Score**

```
This is the Level 4 payoff feature — the first time users
see AI-generated intelligence about their own behavior.

GEMINI INSIGHTS INTEGRATION (You)
□ Implement fastapi/ai_clients/gemini_client.py:
    - google.generativeai configured with GEMINI_API_KEY
    - `generate_insights(transactions, currency, period) -> dict`
    - temperature=0.3, max_tokens=1024
    - response_mime_type="application/json"
    - System prompt from PROMPT_STRATEGY.md §4.2
□ Python pre-computation before Gemini call:
    (Deterministic-first: Python computes all numbers)
    - category_breakdown: GROUP BY category SUM(amount)
    - top_merchant, top_merchant_spend
    - avg_transaction_value
    - weekend_vs_weekday_ratio
    - anomalous_transactions (z-score > 2.5)
□ Pydantic InsightsOutput validation (PROMPT_STRATEGY §6.3)
□ Fallback: if Gemini fails → deterministic fallback
    (PROMPT_STRATEGY §8.3 — no empty state)
□ Health Score computation (Python, not AI):
    - consistency_score: upload frequency regularity
    - diversification_score: HHI inverse of category spread
    - anomaly_score: from InsightsOutput.anomaly_score
    - trend_score: week-over-week direction

□ POST /insights/generate endpoint:
    - Auth: X-Internal-Secret
    - Body: { user_id, transactions, time_range }
    - Run pre-computation → Gemini → Health Score → DB write
    - INSERT into insights table
    - Return full insights response

□ Next.js routes:
    GET  /api/insights → read from DB (no FastAPI call)
    POST /api/insights → session check → POST to FastAPI

FRONTEND (Kiro)
□ InsightsPage (/insights):
    - HealthScoreCard: SVG arc + score number + band label
    - InsightTextCard × 3-5: title + body + data_point
    - RecommendationCard × 2-3: priority indicator + text
    - "Refresh Insights" button → POST /api/insights
      (rate limited: once per hour per user in UI)
    - Level gate: Insights page visible at Level 3+,
      Health Score visible at Level 4+
□ SpendingDonut chart (Tremor): category breakdown
□ WeeklyTrendChart (Tremor AreaChart): week-over-week

TEST: With 10 real receipts, click Refresh Insights.
      Verify 3-5 insights contain real numbers from
      your actual transactions (not hallucinated).
      Verify Health Score is between 0 and 100.
      Force a Gemini timeout: verify fallback shows
      deterministic text, not an error state.
```

### V2 Sub-Phase B — Growth Layer (Days 5–7)

**Day 5: Referral Receipt Unlock (IDEA-012)**

```
BACKEND (You)
□ New migration: 007_add_referral_columns.sql
    ALTER TABLE profiles ADD COLUMN
        referral_code VARCHAR(12) DEFAULT NULL,
        referred_by UUID REFERENCES profiles(id),
        bonus_receipt_slots INTEGER DEFAULT 0;
□ Generate referral_code on profile creation:
    - Update handle_new_user() trigger to generate code:
      referral_code = encode(gen_random_bytes(6), 'hex')
□ Referral credit trigger:
    - When total_receipts_uploaded = 3 for a referred user:
      UPDATE profiles SET bonus_receipt_slots += 10
      WHERE id = (SELECT referred_by FROM profiles WHERE id = NEW.id)
□ Free tier limit update:
    effective_limit = 25 + bonus_receipt_slots
    (Update free tier gate in /api/receipts/upload)
□ New route: GET /api/referral/stats:
    Return: { referral_code, referral_count, bonus_slots_earned }

FRONTEND (Kiro)
□ Settings page: "Earn more uploads" section
    - Display referral link: finsight.app/r/{code}
    - Share buttons: WhatsApp (wa.me/?text=...) + copy link
    - Counter: "2 people joined · +20 upload slots unlocked"
□ Signup flow: detect /r/{code} in URL → set referred_by
□ Dashboard: subtle indicator when near free tier limit

TEST: Create two test accounts. Referral link signup →
      upload 3 receipts from referred account →
      verify referrer gets +10 slots immediately.
```

**Day 6: Receipts Page + Search Filter**

```
FRONTEND (Kiro) directed by You (API contracts)
□ ReceiptsPage (/receipts):
    - Table on desktop: date | merchant | amount | category | confidence
    - Card list on mobile (same data, vertical layout)
    - FilterBar: category dropdown + date range + search text
    - Pagination: 20 per page, prev/next controls
    - Each row: click → /receipts/[id]
□ ReceiptDetailPage (/receipts/[id]):
    - Full extraction data displayed
    - Receipt image (signed URL, lazy loaded)
    - Category dropdown (correction — already built Day 1)
    - Confidence bar
    - Delete receipt (DELETE /api/receipts/[id])
□ DELETE /api/receipts/[id] backend route:
    [1] Session validate → user owns this receipt
    [2] DELETE from Supabase Storage (storage first)
    [3] DELETE transaction row
    [4] UPDATE receipt row to status='deleted'
    NOTE: Do NOT decrement total_receipts_uploaded.
          Intelligence level does not decrease.
    [5] Invalidate dashboard + receipts queries

TEST: Upload 5 receipts. Filter by category.
      Click a receipt → see detail with image.
      Delete a receipt: verify it disappears from list
      but Intelligence Meter does not decrease.
```

**Day 7: V2 Integration Testing + Vercel Pro Setup**

```
INFRASTRUCTURE
□ Upgrade Vercel to Pro plan ($20/month)
    REASON: Hobby plan has 10s timeout — insufficient for
    the upload pipeline (OCR 1.5-3.5s + Groq 250ms + DB writes).
    At Pro: 60s timeout. This is non-negotiable.
□ Set ALLOWED_ORIGINS in Railway to Vercel production URL
□ Configure custom SMTP in Supabase (not default Supabase SMTP)
□ Set up Uptime Robot: monitor /health endpoint (free tier)
□ Verify secret audit passes on Vercel build

V2 INTEGRATION TESTS
□ Full upload flow with batch (5 receipts): all save
□ Category correction: corrected merchant auto-classifies next time
□ Insights generate with real data: no hallucinations
□ Health Score changes when data profile changes
□ Email digest: trigger manually, verify correct data
□ Referral flow end-to-end: sign up via link, upload 3,
    referrer gets +10 slots
□ Receipts page: filter, paginate, delete, detail view all work

V2 DONE CRITERIA
□ All V1 criteria still pass
□ Category correction working + merchant history injected
□ Insights + Health Score generating for Level 4 users
□ Monthly digest email sending with correct user data
□ Batch upload processing up to 5 receipts simultaneously
□ Referral system active and crediting correctly
□ Receipts page fully functional (filter, paginate, detail)
□ Vercel Pro deployed with 60s timeout
□ No P0 or P1 bugs open
```

---

## 4. V3 — Decision Engine (2 Weeks)

```
GOAL: The product earns its "Decision Engine" name.
      Users see observations they could not make themselves.
PREREQUISITE: Category corrections must have been live
              for at least 14 days with real user data.
              The merchant_history context must be populated.
DURATION: 14 working days across two focused sprints.
```

### V3 Week 1 — Predictive Intelligence

**Days 1–2: Subscription Detector (IDEA-003)**

```
This is pure Python + SQL. No AI involved.

DB CHANGES (You)
□ Migration: 008_subscription_flag.sql
    (is_subscription column already in schema from V1)
□ Add `detected_on` column to transactions:
    ALTER TABLE transactions ADD COLUMN
        subscription_detected_on TIMESTAMPTZ DEFAULT NULL;

SUBSCRIPTION DETECTION SQL FUNCTION (You)
□ Create: fastapi/decision_engine/subscription_detector.py
    Algorithm:
        SELECT merchant, amount, transaction_date
        FROM transactions
        WHERE user_id = $1
          AND transaction_date >= NOW() - INTERVAL '90 days'
        ORDER BY merchant, transaction_date

    For each merchant with >= 2 transactions:
        - Check if charges recur on similar calendar dates
          (same day-of-month ± 3 days)
        - Check if amounts are within 10% of each other
        - If both: mark as subscription

    UPDATE transactions SET
        is_subscription = TRUE,
        subscription_detected_on = NOW()
    WHERE user_id = $1 AND [matching criteria]

□ Wire into FastAPI BackgroundTask:
    After each upload at Level 3+:
    background_tasks.add_task(run_subscription_detector, user_id)

□ New Next.js route: GET /api/subscriptions
    → Query transactions WHERE is_subscription = TRUE
    → Group by merchant: { merchant, amount, frequency,
        last_charge, total_ytd, is_active }
    → Return subscription list

SUBSCRIPTION AUDIT DASHBOARD (Kiro)
□ New page: /subscriptions
□ Subscription cards: merchant, monthly amount, YTD total,
    last charge date, status badge (Active / Possibly Forgotten)
□ "Possibly Forgotten" logic: last charge > 45 days ago
□ Monthly total: "₹18,400/year across 7 subscriptions"
□ Sidebar nav entry visible at Level 3+

TEST: Upload 3 Netflix receipts (same amount, monthly dates).
      Verify all 3 flagged as is_subscription = TRUE.
      Verify subscription page shows ₹[amount]/month with YTD.
      Verify false positive rate: Swiggy with irregular
      orders should NOT be flagged as subscription.
```

**Days 3–4: Spending Forecast + Budget Risk Alerts (IDEA-007)**

```
FORECAST COMPUTATION (You)
□ Create fastapi/decision_engine/forecast_engine.py:
    function compute_monthly_forecast(user_id: str) -> dict:
        # Current month spend
        current_spend = SUM(amount) WHERE
            transaction_date >= date_trunc('month', NOW())
        # Days elapsed + remaining
        days_elapsed = current day of month
        days_remaining = days_in_month - days_elapsed
        # Projection
        if days_elapsed >= 7:  # Need at least 7 days of data
            projected = (current_spend / days_elapsed) * days_in_month
            confidence_range = projected * 0.15  # ±15%
        # 3-month baseline per category
        FOR each category:
            baseline = AVG(monthly_total) WHERE
                transaction_date >= NOW() - INTERVAL '90 days'
                AND category = $category
            current_month_total = SUM(amount) WHERE
                transaction_date >= date_trunc('month', NOW())
                AND category = $category
            deviation_pct = (current_month_total - baseline) / baseline
            IF deviation_pct > 0.35 AND days_remaining > 10:
                → flag as budget_risk

□ API route: GET /api/forecast
    Returns: { projected_total, confidence_low, confidence_high,
               days_remaining, category_alerts: [{ category,
               current, baseline, deviation_pct, days_remaining }] }

GEMINI NARRATIVE for alerts (short, 1 sentence):
    Input: category_alerts from forecast engine (Python-computed)
    Output: "Food delivery is tracking 38% above your
            October average of ₹6,200."
    (See PROMPT_STRATEGY §5 for narrative prompt)

FRONTEND (Kiro)
□ ForecastBanner on Dashboard (Zone C):
    - "On track for ₹34,000 this month (±₹5,100)"
    - Visible when days_elapsed >= 7 and forecast available
□ Category risk indicators on Dashboard donut chart:
    - Cherry red dot on over-budget categories
□ Budget Risk Alert: amber banner when alert active
    - Dismissible for 48 hours
    - Re-surfaces after dismissal period

TEST: Upload 15 receipts spread over first 10 days of month.
      Verify forecast calculates correctly vs. manual math.
      Inflate food receipts 40% over baseline: verify alert fires.
      Dismiss alert: verify it does not reappear for 48 hours.
```

**Days 5: Anomaly Detection in Dashboard**

```
ANOMALY DETECTION SQL FUNCTION (You)
(This runs as a Supabase DB function on each transaction INSERT)

□ Create: supabase/functions/detect_anomaly.sql
    CREATE OR REPLACE FUNCTION detect_transaction_anomaly()
    RETURNS TRIGGER AS $$
    DECLARE
        cat_mean NUMERIC;
        cat_stddev NUMERIC;
        z_score NUMERIC;
        min_transactions INTEGER := 5;
        transaction_count INTEGER;
    BEGIN
        -- Count transactions in this category (30 days)
        SELECT COUNT(*) INTO transaction_count
        FROM transactions
        WHERE user_id = NEW.user_id
          AND category = NEW.category
          AND transaction_date >= NOW() - INTERVAL '30 days'
          AND id != NEW.id;

        -- Only flag if sufficient baseline exists
        IF transaction_count >= min_transactions THEN
            SELECT AVG(amount), STDDEV(amount)
            INTO cat_mean, cat_stddev
            FROM transactions
            WHERE user_id = NEW.user_id
              AND category = NEW.category
              AND transaction_date >= NOW() - INTERVAL '30 days'
              AND id != NEW.id;

            IF cat_stddev > 0 THEN
                z_score := (NEW.amount - cat_mean) / cat_stddev;
                IF ABS(z_score) > 2.5 THEN
                    NEW.is_anomalous := TRUE;
                END IF;
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER check_anomaly_on_insert
        BEFORE INSERT ON transactions
        FOR EACH ROW EXECUTE FUNCTION detect_transaction_anomaly();

FRONTEND (Kiro)
□ Anomaly flag on TransactionRow: Lucide AlertTriangle icon
□ Anomaly callout on Insights page (cherry red palette)
    "3 unusual transactions this month"
□ Tooltip on anomaly icon: "This transaction is
    significantly higher than your typical [category] spend"

TEST: Upload receipts establishing baseline for Food & Dining.
      Upload one receipt 4× the average.
      Verify is_anomalous = TRUE in DB within seconds of upload.
```

### V3 Week 2 — Intelligence Depth

**Days 6–8: Income Awareness / Freelancer Mode (IDEA-011)**

```
DB CHANGES (You)
□ Migration: 009_income_events.sql
    CREATE TABLE income_events (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES profiles(id)
                          ON DELETE CASCADE,
        amount       NUMERIC(12, 2) NOT NULL,
        period_label VARCHAR(20) NOT NULL,  -- "2024-11"
        type         VARCHAR(20) DEFAULT 'monthly_estimate',
        notes        TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    -- RLS: user sees only own rows
    ALTER TABLE income_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "income_own" ON income_events
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

□ New profile column:
    ALTER TABLE profiles ADD COLUMN
        freelancer_mode_enabled BOOLEAN DEFAULT FALSE;

BACKEND (You)
□ POST /api/income → insert income_event row
□ GET /api/income → return income events for user
□ Update dashboard summary: when income data exists:
    spending_rate = (monthly_spend / monthly_income) * 100
    → Return spending_rate in dashboard summary response
□ Update tax computation in Decision Engine:
    IF income_data exists:
        tax_liability = (income - business_deductions) * 0.30
        (more accurate than current business_expenses * 0.30)

FRONTEND (Kiro)
□ Settings page: "Freelancer Mode" toggle
    (updates profiles.freelancer_mode_enabled)
□ Monthly income entry: number input that appears when
    Freelancer Mode is enabled on Dashboard
    "What did you earn in [month]?" — optional, no hard gate
□ New KPI card: "Spending Rate: 42% of income"
    Visible only when: freelancer_mode AND income entry exists
□ Updated tax card in Decision Engine panel:
    Shows income-adjusted tax estimate when available

TEST: Enable Freelancer Mode. Enter ₹1,50,000 income
      for November. Upload 5 business-flagged receipts.
      Verify spending_rate KPI shows correct percentage.
      Verify tax card shows income-adjusted estimate.
```

**Days 9–10: Tax Export Report (IDEA-002)**

```
BACKEND (You)
□ Install: pip install reportlab (PDF generation in Python)
□ New FastAPI endpoint: POST /reports/tax-export
    Body: { user_id, date_range, include_business_only: bool }
    Logic:
        1. Query transactions with filters
        2. Group by category with subtotals
        3. Compute: gross spend, estimated deductions,
                    estimated tax liability
        4. Generate PDF via reportlab
        5. Return PDF bytes with Content-Type: application/pdf

PDF STRUCTURE:
    Page 1: Executive Summary
        - Date range
        - Total spend
        - Business expense total
        - Estimated tax liability
        - Disclaimer (required from PRODUCT_EVOLUTION §IDEA-002)
    Page 2+: Category Breakdown
        - Section per category
        - Transaction rows: date | merchant | amount | confidence
    Last page: GST Summary (if any is_gst_eligible rows)

□ New Next.js route: GET /api/reports/tax
    → Validates session + Pro tier
    → Calls FastAPI /reports/tax-export
    → Streams PDF response with proper headers
    → Content-Disposition: attachment; filename="finsight-tax-report.pdf"

□ Pro gate enforcement:
    IF profiles.subscription_tier NOT IN ('pro', 'business'):
        return 402 { error_code: "PRO_REQUIRED" }
    (Server-side check — not client-side)

FRONTEND (Kiro)
□ Settings page: "Export Reports" section
    - Tax Report button (visible to all, Pro-gated on click)
    - Date range picker: current FY (Apr-Mar) | calendar year | custom
    - "Business only" toggle
    - Download button → GET /api/reports/tax
□ Upgrade prompt: shown when free user clicks Export

TEST: As Pro user, generate tax report with 20 receipts
      including 8 business-flagged.
      Open PDF: verify all numbers match Supabase data.
      As free user: verify 402 and upgrade prompt shown.
```

**Days 11–12: Personalized Categorization (Phase 3 PRD Feature)**

```
By now, real users have been making corrections for 14+ days.
This is the payoff of building IDEA-005 first.

BACKEND (You)
□ Upgrade get_merchant_history() to include similarity matching:
    SELECT DISTINCT ON (normalized_merchant)
        merchant, category, COUNT(*) as frequency
    FROM transactions
    WHERE user_id = $1
      AND is_manually_corrected = TRUE
      AND merchant % $2  -- pg_trgm similarity
    GROUP BY normalized_merchant, merchant, category
    ORDER BY normalized_merchant, frequency DESC
    LIMIT 10

□ Context injection already wired (V2 Day 1) —
    this upgrade makes it smarter for partial name matches.

□ Accuracy logging: add to ai_audit_log for every
    categorization call whether merchant_history was used:
    was_personalized = len(merchant_history) > 0

DRIFT TEST (run before deploying)
□ Run category_drift_test() from PROMPT_STRATEGY.md §9.3
    All 10 merchant test cases must pass.
    If any fail: fix the prompt, not the model.

TEST: Upload 3 receipts from a merchant you previously
      corrected. All 3 must auto-categorize correctly
      (not "Other"). Check ai_audit_log: was_personalized=TRUE.
```

**Days 13–14: V3 Integration Testing**

```
□ Subscription detector: test with 90 days of data
    (create historical test data via direct DB insert)
□ Forecast: verify math accuracy against manual calculation
□ Budget alerts: verify fire/dismiss/refire cycle
□ Anomaly detection: verify DB trigger fires within 1 second
□ Income awareness: end-to-end freelancer flow
□ Tax export: PDF correct, Pro gate enforced
□ Personalized categorization: correction history flows into Groq

V3 DONE CRITERIA
□ Subscription detection flags known subscription merchants
□ Monthly forecast within ±20% of actual month-end spend
□ Budget risk alerts fire and dismiss correctly
□ Anomaly detection fires on Z-score > 2.5 outliers
□ Tax PDF export generates with correct numbers
□ Freelancer mode shows spending rate KPI
□ Category correction history improves future accuracy
□ All V1 and V2 criteria still pass
```

---

## 5. V4 — Scale + Advanced AI (3 Weeks)

```
GOAL: Production stability for 1,000–10,000 users.
      Infrastructure that handles load, not just features.
PREREQUISITE: V3 live for 30+ days with real user traffic.
              Measurable latency data from production logs.
              At least 300 active users.
```

### V4 Week 1 — Async Queue + Infrastructure

**Days 1–3: Redis + BullMQ Async Queue**

```
This is only built when p95 upload time > 10 seconds
on 5%+ of uploads in a rolling 1-hour window.
Do not build this in V3.

□ Provision Upstash Redis (REDIS_URL in Railway env vars)
□ Install: pip install rq (Python Redis Queue — simpler than
           BullMQ for a Python-native queue)

FASTAPI QUEUE ARCHITECTURE (You)
□ POST /api/receipts/upload changes:
    BEFORE: Returns after full pipeline completes
    AFTER:
        - Validate + store in Supabase Storage → immediate
        - Insert receipts row: status='queued'
        - Enqueue job to Redis
        - Return immediately: { receipt_id, status: 'queued' }

□ RQ Worker process (new Railway service):
    fastapi/workers/receipt_worker.py
        - Dequeues job
        - Runs full OCR + categorization + DB write pipeline
        - Updates receipts.status to 'complete' or 'failed_ocr'

□ Supabase Realtime subscription (frontend):
    supabase
      .channel('receipt-status')
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'receipts',
          filter: `id=eq.${receipt_id}`
        }, (payload) => handleStatusChange(payload))
      .subscribe()

FRONTEND (Kiro)
□ New Upload Modal state: QUEUED
    Shows: "Processing... (position N in queue)"
    Transitions to RESULTS when Realtime fires
□ Graceful handling of queue position indicator

TEST: Simulate 5 concurrent uploads. All must complete.
      Verify no receipt stays in 'queued' for > 60 seconds.
      Kill worker mid-job: verify receipt stays 'failed_ocr',
      not 'processing' forever.
```

**Days 4–5: Rate Limiting + Security Hardening**

```
□ Rate limiting at Next.js edge (Vercel Edge Config):
    Free tier: 5 uploads/hour per IP+user_id
    Pro tier: 60 uploads/hour
    Implementation: @upstash/ratelimit + Vercel Edge Middleware

□ Sentry integration (Phase 3 from INFRA.md):
    FastAPI: sentry_sdk with FastApiIntegration
    Next.js: @sentry/nextjs
    PII scrubbing: remove image_base64 before sending to Sentry
    Traces sample rate: 10%

□ Structured logging (Logtail):
    FastAPI: structured JSON logs with pipeline_event()
    All ai_audit_log entries written consistently

□ Circuit breaker pattern (circuitbreaker library):
    Per-provider: 5 failures → open → 60s recovery
    Prevents cascading failures during provider outages

TEST: Trigger 6 uploads in 1 hour as free user:
      6th must return 429 with clear error message.
      Simulate NVIDIA NIM timeout 5 times in a row:
      Verify circuit opens, subsequent calls fail fast.
```

### V4 Week 2 — WhatsApp Upload + Merchant Intelligence

**Days 6–8: WhatsApp / Telegram Quick Upload (IDEA-009)**

```
START WITH TELEGRAM (lower barrier — no business verification)
Validate the concept before Meta API investment.

□ Create Telegram Bot: @BotFather → new bot → get TOKEN
□ New FastAPI webhook handler: POST /webhooks/telegram
    - Validates Telegram token signature
    - Receives: photo message from user
    - Looks up: user_whatsapp_links (phone → user_id)
    - Downloads photo from Telegram CDN
    - Triggers receipt pipeline for that user
    - Responds: "Got it! ₹340 at McDonald's. Save? Y/N"
    - On Y reply: mark as confirmed in DB

DB CHANGES (You)
□ New table: user_bot_links
    CREATE TABLE user_bot_links (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES profiles(id),
        platform    VARCHAR(20) NOT NULL, -- 'telegram' | 'whatsapp'
        platform_id VARCHAR(100) NOT NULL UNIQUE, -- telegram chat_id
        verified_at TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    );

□ Account linking flow:
    Settings → "Connect Telegram" → deep link to bot
    Bot stores chat_id → platform_id in user_bot_links
    Uses one-time token (Redis, 10min TTL) for verification

FRONTEND (Kiro)
□ Settings page: "Quick Upload" section
    - Connect Telegram button
    - Shows: verification deep link
    - After verification: "Connected as @username ✓"
    - Instructions: "Send a receipt photo to FinSight bot"

TEST: Link a real Telegram account. Send a photo.
      Verify transaction appears in FinSight within 10s.
```

**Days 9–10: Merchant Intelligence Cards (IDEA-008)**

```
BACKEND (You)
□ New route: GET /api/merchants/[merchant_slug]
    - merchant_slug = URL-encoded merchant name
    - Query:
        SELECT
            COUNT(*) as visit_count,
            SUM(amount) as total_spend,
            AVG(amount) as avg_order,
            MIN(transaction_date) as first_visit,
            MAX(transaction_date) as last_visit,
            COUNT(*) FILTER (WHERE is_anomalous) as anomaly_count
        FROM transactions
        WHERE user_id = $1
          AND merchant ILIKE $2
□ New index:
    CREATE INDEX idx_transactions_user_merchant
        ON transactions(user_id, merchant);

FRONTEND (Kiro)
□ MerchantIntelligencePanel (shadcn Sheet component):
    - Trigger: click on any merchant name in transaction list
    - Content: total spend, visit count, avg order,
               first/last visit, anomaly count,
               6-month sparkline (Tremor SparkAreaChart)
    - "Mark as subscription" action if pattern qualifies

TEST: Click "Swiggy" in transaction list.
      Panel shows accurate stats matching DB data.
      Verify sparkline shows correct monthly trend.
```

### V4 Week 3 — Database Optimization + Multi-Agent Prep

**Days 11–12: Materialized Views + DB Optimization**

```
□ Deploy: mv_user_category_totals materialized view
    (SQL from TECH_STACK §4.6)
□ Setup refresh: pg_cron job every 6 hours
    cron.schedule('refresh-category-totals', '0 */6 * * *',
        'REFRESH MATERIALIZED VIEW CONCURRENTLY
         mv_user_category_totals')
□ Update GET /api/dashboard/summary:
    Read from mv_user_category_totals instead of live query
    → p95 dashboard load time should drop below 200ms

□ Add pg_trgm extension for merchant similarity search:
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE INDEX idx_transactions_merchant_trgm
        ON transactions USING GIN (merchant gin_trgm_ops);

□ Railway scaling: upgrade to 2GB RAM
    (image processing with Pillow peaks at 800MB+)

TEST: Load dashboard with 500+ transactions.
      Measure: API response time < 200ms (p95).
      Compare before/after materialized view.
```

**Days 13–15: LangChain Prep + Natural Language Search (IDEA-006)**

```
This is the V4 entry point for IDEA-006. Full conversational
AI is V5 — this sprint builds the query parsing layer.

NATURAL LANGUAGE QUERY PARSER (You)
□ New FastAPI endpoint: POST /search/parse-query
    Body: { query: str, user_id: str }
    Logic:
        - Pass query to Gemini with structured filter prompt
        - Temperature: 0.0 (translation task, not reasoning)
        - Returns: { category, merchant, date_range,
                     min_amount, max_amount }
    Fallback: if Gemini fails → return empty filters
              (standard filter UI still functional)

□ Gemini query parser prompt:
    "Parse this natural language transaction search query into
    structured filters. Return ONLY JSON with these fields:
    { category, merchant, date_range_start, date_range_end,
    min_amount, max_amount }. Null for fields not specified.
    Query: [user's query]"
    Temperature: 0.0, max_tokens: 128

□ Next.js route: POST /api/search
    → Call FastAPI /search/parse-query
    → Apply returned filters to standard GET /api/receipts query
    → Return filtered receipt list

FRONTEND (Kiro)
□ Search bar on Receipts page (replaces text filter)
□ Natural language input with placeholder examples:
    "Swiggy over ₹500 last month"
    "All business expenses in Q3"
□ Results show standard transaction list with active filters displayed

TEST: Query "Swiggy over ₹500 in October"
      Verify returns only Swiggy transactions > ₹500 in October.
      Test ambiguous query: "food stuff" → should return
      Food & Dining filter (not an error).
```

---

## 6. V5 — Differentiation (Ongoing)

```
GOAL: Capabilities no competitor can replicate without
      FinSight's accumulated user data.
PREREQUISITE: 18+ months of transaction history per active user.
              V4 scale infrastructure stable for 60+ days.
              Minimum 1,000 Pro users.
```

### V5 Feature 1 — AI Spending Coach (IDEA-013)

```
ENTRY CONDITION: Met at 18 months of data accumulation.
                 This is the most ambitious feature in
                 FinSight's roadmap. Do not rush it.

ARCHITECTURE (LangGraph multi-agent):
    User query → Router Agent
                 → Anomaly Agent (if anomaly question)
                 → Trend Agent (if trend question)
                 → Search Agent (if lookup question)
                 → Insight Agent (if pattern question)
                 ↓
                 Synthesis Agent → Response

SPRINT PLAN (3 weeks when entry condition met):
    Week 1: LangGraph setup + Router Agent
    Week 2: Specialized agents (Anomaly + Trend + Search)
    Week 3: Synthesis + conversation memory + UI

NEW INFRA REQUIRED:
    - Conversation state table in Supabase
    - Extended Gemini context window usage
    - New /advisor route in Next.js
    - LangGraph Python library added to FastAPI requirements
```

### V5 Feature 2 — Business Workspace (IDEA-014)

```
ENTRY CONDITION: 500+ Pro users. Demand signals from
                 solo business operators in user research.

SCHEMA ADDITIONS:
    - organizations table
    - organization_members junction table
    - Extended RLS policies for org-scoped access

SPRINT PLAN (4 weeks):
    Week 1: Organizations schema + RLS + invite flow
    Week 2: Org dashboard (aggregate views)
    Week 3: Project/client tagging + consolidated export
    Week 4: Per-seat billing (Stripe seats)

PRICING: ₹499/member/month (Business tier)
         Built on top of existing Pro infrastructure
```

### V5 Feature 3 — Vector DB + Semantic Memory

```
ENTRY CONDITION: pg_trgm search producing < 80% recall
                 for merchant name variations. Or: 500+
                 transactions per user making similarity
                 search valuable.

APPROACH:
    - pgvector (PostgreSQL extension) — not a new database
    - Embed merchant names on transaction write
    - Semantic search: "gym" finds "Cult.Fit Ltd"
    - Start with pgvector; migrate to Pinecone only if
      pgvector performance is insufficient at scale

SPRINT PLAN (2 weeks when entry condition met):
    Week 1: pgvector extension + embedding pipeline
    Week 2: Semantic search endpoint + UI integration
```

---

## 7. Dependency Map

### 7.1 Hard Dependencies (cannot be skipped or reordered)

```
LEVEL 0 — Supabase Schema
  └─→ LEVEL 1 — FastAPI skeleton + Auth
      └─→ LEVEL 2 — NVIDIA NIM OCR
          └─→ LEVEL 3 — Groq Categorization
              └─→ LEVEL 4 — DB Transaction Write
                  └─→ LEVEL 5 — Next.js BFF routes
                      └─→ LEVEL 6 — Dashboard UI

  Category Correction (IDEA-005)
    └─→ Merchant history injection into Groq
        └─→ Personalized categorization (V3)
            └─→ Accuracy improvement data
                └─→ AI Spending Coach training context (V5)

  Subscription Detector (V3)
    └─→ Subscription Audit Dashboard (IDEA-003)
        └─→ Business Workspace subscription views (V5)

  Income data (IDEA-011, V3)
    └─→ Spending rate KPI
        └─→ Income-adjusted tax estimation
            └─→ AI Advisor income-aware responses (V5)

  Materialized views (V4)
    └─→ Dashboard p95 < 200ms
        └─→ Org aggregate views (V5 Business Workspace)
```

### 7.2 Feature Unlock Dependencies

```
FEATURE                         REQUIRES
─────────────────────────────────────────────────────────────────
Insights + Health Score         10+ transactions (Level 4)
Spending Forecast               14+ days of transaction data
Budget Risk Alerts              3+ months for baseline
Subscription Detection          2+ months of repeat transactions
Personalized Categorization     User corrections via IDEA-005
Natural Language Search         50+ transactions (Level 3+)
Tax Export                      Pro tier (enforced server-side)
AI Spending Coach               18+ months data + LangGraph
Business Workspace              Organizations table + RLS
Semantic Search (pgvector)      500+ transactions per user
```

### 7.3 Build Blockers Reference

```
BLOCKER                       BLOCKS                    RESOLUTION
─────────────────────────────────────────────────────────────────────
NVIDIA NIM API key missing    All V1 after Day 1        Create key Day 1
Vercel Hobby plan             V2 upload reliability     Upgrade before V2 launch
DB schema wrong               Everything                Fix migrations, rerun
Railway ALLOWED_ORIGINS       Production uploads        Set before V1 deploy
Supabase region wrong         DB latency (permanent)    Cannot change post-create
FASTAPI_SECRET_KEY mismatch   All BFF→FastAPI calls     Set identical in both
pg_trgm extension missing     Merchant similarity       Enable in Supabase dashboard
```

---

## 8. Team Execution Model

### 8.1 Role Responsibilities

```
YOU (Engineering Manager + Integration Lead)
─────────────────────────────────────────────────────────────
PRIMARY OWNS:
  - All FastAPI code (AI clients, pipeline, endpoints)
  - Database schema, migrations, RLS policies
  - All Next.js BFF API routes (touch secrets, session logic)
  - System integration (wiring frontend to backend)
  - Deployment (Railway config, Vercel setup, env vars)
  - Testing (integration tests, pipeline validation)
  - Architecture decisions (any change to TECH_STACK.md)
  - Secret management (audit scripts, rotation)

REVIEWS BEFORE MERGE:
  - All Kiro frontend code that touches API routes
  - All database queries in frontend hooks
  - Any new dependency added to package.json or requirements.txt

KIRO (Frontend Engineer, AI-assisted)
─────────────────────────────────────────────────────────────
PRIMARY OWNS:
  - All Next.js pages (App Router page.tsx files)
  - All React components (within design system constraints)
  - TanStack Query hooks (data fetching, cache management)
  - Framer Motion animations
  - UI state management (upload modal states, etc.)

DOES NOT OWN (you handle):
  - Next.js API Routes (src/app/api/** — these touch secrets)
  - Supabase client configuration
  - Environment variable usage in server context
  - Any code that calls FastAPI directly

HANDOFF PROTOCOL (You → Kiro):
  Before Kiro builds any page or component that fetches data:
  1. You write the API contract (request shape + response shape)
     as a TypeScript interface in src/types/api.ts
  2. You confirm the endpoint is deployed and returning
     real data from the test environment
  3. Kiro builds against the contract — not against guesses

AI TOOLS (v0.dev, Claude, Cursor)
─────────────────────────────────────────────────────────────
VALID USE CASES:
  - Generating component boilerplate from design spec
  - Drafting Pydantic model definitions
  - Writing SQL query drafts for review
  - Generating test data insertion scripts

INVALID USE CASES:
  - Generating security-sensitive code (auth, RLS, secret handling)
  - Generating pipeline orchestrator logic without review
  - Generating Tremor chart components (v0.dev invents
    Tremor props that do not exist — write these manually)

REVIEW RULE FOR AI-GENERATED CODE:
  Every generated file is reviewed line-by-line before
  committing. "The AI wrote it" is not a merge approval.
  Undiscovered bugs in AI-generated code are your bugs.
```

### 8.2 Daily Coordination Protocol

```
START OF DAY (10 minutes)
  - You: confirm what FastAPI endpoints are available today
  - Kiro: confirm which components need those endpoints
  - Agree on: what is the single most important thing to
    ship by end of day?

END OF DAY (15 minutes)
  - Demo: show the one thing that was shipped on real data
  - Log: any blockers discovered today
  - Plan: first task tomorrow (specific, not category)
  - Run: secret audit grep before any push to main

WEEKLY (Fridays, 30 minutes)
  - Review: pipeline accuracy stats (OCR confidence mean,
    category fallback rate from ai_audit_log)
  - Review: any P0/P1 bugs from the week
  - Confirm: are V-phase gate criteria met?
  - Plan: next week's sprint priorities
```

### 8.3 Communication Contracts

```
API CONTRACT FORMAT (You writes, Kiro consumes)
// src/types/api.ts

// Example: GET /api/dashboard/summary
interface DashboardSummaryResponse {
  total_spend: number           // sum of all transaction amounts
  transaction_count: number     // count of all transactions
  top_category: string          // category with highest total spend
  top_category_amount: number   // amount for top category
  last_transaction_date: string // ISO 8601
  intelligence_level: number    // 1-4
  total_receipts_uploaded: number
}

// These types are source of truth.
// Kiro codes against them. You build APIs that match them.
// Mismatch = you fix the API OR update the type with reason.
```

---

## 9. Risk Register

### 9.1 Technical Risks

```
RISK-T01: NVIDIA NIM API Rate Limits
Probability: Medium (during peak testing)
Impact: High (blocks all V1 development)
Mitigation:
  - Use a real test receipt, not a photo burst
  - During batch testing: throttle to 3 concurrent calls
  - If rate limited: back off 60s, use exponential retry
  - Phase 4: async queue absorbs burst
Trigger: > 3 consecutive 429 responses
Action: Switch to single-image testing, check NIM dashboard

RISK-T02: Groq Model Version Change
Probability: Low (quarterly model updates)
Impact: Medium (category drift)
Mitigation:
  - Model version pinned: "llama-3.3-70b-versatile"
  - Run category_drift_test() from PROMPT_STRATEGY §9.3
    after any Groq notification of model change
  - 10 test merchant cases must all pass before deploying
Trigger: Category accuracy drops below 90% in ai_audit_log
Action: Run drift test, fix prompt if needed

RISK-T03: Gemini Insight Hallucinations
Probability: Low (PROMPT_STRATEGY.md mitigations in place)
Impact: High (incorrect financial data shown to users)
Mitigation:
  - Number citation audit after each Gemini call
  - Banned phrase scan (PROMPT_STRATEGY §9.3)
  - Deterministic fallback for all Gemini failures
  - All insights must cite numbers from computed_patterns
Trigger: Any insight body contains a number not in pre-computed data
Action: Trigger fallback, log to ai_audit_log, investigate prompt

RISK-T04: Supabase ap-south-1 Outage
Probability: Very Low (99.9% SLA on Pro)
Impact: Critical (full outage)
Mitigation:
  - TanStack Query stale cache shows last data during brief outages
  - Error states show friendly message, not stack trace
  - No mitigation for extended outage — Supabase dependency is intentional
Trigger: Supabase status.supabase.com shows incident
Action: Wait for recovery; post user-facing status message

RISK-T05: Vercel 60s Timeout Breach
Probability: Low-Medium (if NIM is slow at p95)
Impact: Medium (upload fails for some users)
Mitigation:
  - V4 async queue eliminates this risk entirely
  - Before V4: monitor NIM p95 latency in ai_audit_log
  - If p95 > 10s on >5% of calls: accelerate V4 queue work
Trigger: ai_audit_log shows avg OCR response > 5s
Action: Profile NIM call, check image size (should be < 2MB)

RISK-T06: Railway Cold Start During Peak
Probability: Low-Medium (after deploys)
Impact: Low (15s window of failed uploads)
Mitigation:
  - Railway auto-restart on health check failure
  - Health check every 30s (INFRA.md §8.4)
  - Upload failure shows retry option (not a permanent error)
Trigger: /health returns 503 for 3 consecutive checks
Action: Railway auto-restarts; monitor for recurring crashes
```

### 9.2 Product Risks

```
RISK-P01: Cold Start Drop-off (Level 1 Abandonment)
Probability: High (for users who upload only 1 receipt)
Impact: Medium (acquisition cost wasted)
Mitigation:
  - Onboarding nudge to upload 3 receipts in first session
  - Skeleton KPI cards show what's coming (teaser state)
  - Individual receipt value is immediate (digital record)
  - Monthly digest re-engages dormant users
Trigger: < 50% of new users reach Level 2 within 7 days
Action: Review onboarding copy, add more explicit teaser content

RISK-P02: Low OCR Confidence on Indian Thermal Receipts
Probability: Medium (common receipt type in India)
Impact: High (user's most common receipts rejected)
Mitigation:
  - Test NVIDIA NIM specifically on thermal receipts
    (grocery, restaurant, petrol) before V1 launch
  - If confidence < 0.50 on thermal: adjust prompt or
    lower rejection threshold from 0.30 to 0.20
  - Fallback: manual entry option (V2 addition)
Trigger: > 15% of uploads hitting failed_ocr status
Action: Sample failed images, identify pattern, adjust prompt

RISK-P03: Category Accuracy Below Expectations
Probability: Low-Medium (12-category taxonomy is broad)
Impact: Medium (user corrects frequently, loses trust)
Mitigation:
  - High-confidence merchant list in prompt
    (Swiggy, Zomato, BigBasket, etc.)
  - merchant_history injection from Day 1 of V2
  - Amber confidence dot signals need to review
Trigger: > 20% of transactions end up corrected in V2
Action: Audit most-corrected categories, add to disambiguation
        rules in CATEGORIZATION_SYSTEM_PROMPT

RISK-P04: Insights Feel Generic
Probability: Medium (if computed_patterns are sparse)
Impact: High (this is the product's main value prop)
Mitigation:
  - Insights gated to Level 4 (10+ receipts minimum)
  - Specific data points mandatory in each insight
    (PROMPT_STRATEGY §4.2 constraint)
  - Number citation audit ensures no hallucinated numbers
  - Deterministic fallback ensures something useful shows
    even when Gemini is verbose-but-vague
Trigger: User feedback: "insights are obvious / not useful"
Action: Review ai_audit_log for fallback_reason patterns,
        tighten Gemini prompt constraints
```

---

## 10. Success Metrics

### 10.1 V1 — Pipeline Integrity

```
METRIC                         TARGET           MEASUREMENT
─────────────────────────────────────────────────────────────────
OCR success rate               > 92%            ai_audit_log:
  (confidence >= 0.30)                          1 - (failed_ocr / total)

OCR mean confidence            > 0.72           AVG(confidence) in
                                                ai_audit_log WHERE stage='ocr'

Categorization accuracy        > 88%            1 - (Other / total)
  (non-fallback rate)                           ai_audit_log WHERE
                                                stage='categorize'

Pipeline p50 latency           < 3,500ms        ai_audit_log:
  (upload to results)                           AVG(response_time_ms)

Pipeline p95 latency           < 8,000ms        ai_audit_log:
  (upload to results)                           PERCENTILE(95, response_time_ms)

Intelligence level progression Level 4 by       Profile query: users who
  (first-time users)           receipt 10       reached total_receipts >= 10
```

### 10.2 V2 — User Retention

```
METRIC                         TARGET           MEASUREMENT
─────────────────────────────────────────────────────────────────
Week 2 retention               > 40%            Users with ≥ 1 upload
  (uploaded in week 1 and 2)                    in each of first 2 weeks

Level 2 reach within 7 days   > 55%            Users with
                                                total_receipts >= 3
                                                within 7 days of signup

Category correction rate       > 10%            COUNT(is_manually_corrected)
  (sign of engagement)         (healthy signal)  / total transactions

Email digest open rate         > 25%            Resend dashboard
  (monthly digest)                              (industry avg: 20-25%)

Referral conversion rate       > 15%            referred users who upload
                                                >= 3 receipts / total
                                                referred signups

Free-to-Pro conversion        > 5%             Stripe: free users
  (at 25 receipt limit)                         who upgrade on limit hit
```

### 10.3 V3 — Insight Accuracy

```
METRIC                         TARGET           MEASUREMENT
─────────────────────────────────────────────────────────────────
Subscription detection         < 10%            Manual review of 50
  false positive rate                           flagged subscriptions

Budget alert precision         > 70%            Flagged categories
  (alerts that are real)                        that actually overspent
                                                at month end

Insight engagement             > 60%            % of Level 4 users who
  (viewed insights page)                        visit /insights monthly

Personalization improvement    > 15%            Reduction in category
  (correction rate drops)                       correction rate after
                                                V3 vs. V2 baseline

Health Score distribution      Bell curve        Distribution check:
  (not clustering at extremes) centered ~55-65  AVG(health_score) across
                                                all Level 4 users
```

### 10.4 V4 — System Stability

```
METRIC                         TARGET           MEASUREMENT
─────────────────────────────────────────────────────────────────
Uptime (FastAPI service)       > 99.5%          Uptime Robot monthly report

Fallback rate (any stage)      < 5%             ai_audit_log:
                                                COUNT(used_fallback=TRUE)
                                                / total calls

Dashboard load time (p95)      < 200ms          After materialized view:
                                                server response time

Queue depth (peak hour)        < 50 jobs        Redis queue monitoring

AI cost per 1,000 receipts     < $0.60          Provider dashboards
                                                (target from AI_STACK §5.1)
```

### 10.5 V5 — Product Differentiation

```
METRIC                         TARGET           MEASUREMENT
─────────────────────────────────────────────────────────────────
AI Advisor engagement          > 30%            % of eligible users
  (users with 18mo data)       monthly use      using advisor monthly

Business tier adoption         > 100 orgs       Stripe: Business tier
  (within 90 days of launch)                    subscription count

Net Promoter Score             > 50             Quarterly in-app survey
  (NPS from Pro users)                          (10-point scale, NPS calc)

User LTV (Pro × 12 months)     > ₹3,600         Stripe: cohort analysis
  (annual Pro retention)                        Year 1 Pro retention
```

---

## APPENDIX A — Daily Task Template

```
DATE: ___________
PHASE: V___ Day ___

TODAY'S SINGLE MOST IMPORTANT DELIVERY:
[Specific file/function/endpoint — not a category]

TASKS (specific, not vague):
□ [file.py] implement [function_name()]
□ [api/route.ts] implement [GET/POST] [/path]
□ [component.tsx] implement [ComponentName] with [specific behavior]

BLOCKERS (known before starting):
□ [blocker] — resolution: [specific action]

END OF DAY CHECKLIST:
□ Manual test: [specific test with real data]
□ Secret audit passed (grep finds zero results)
□ No .env files staged for commit
□ Kiro unblocked for tomorrow's work

SLIP LOG (if any task slips):
[task that slipped] → reason → moved to [new day]
Slip reason (circle one): BLOCKED | UNDERESTIMATED | SCOPE CHANGE
```

---

## APPENDIX B — V1–V5 Summary Timeline

```
V1 — Core System
  Duration: 5 days
  End state: Working pipeline, real data, deployed
  Gate:      10 receipts processed, Level 4 reached

V2 — Product Layer
  Duration: 7 days
  End state: Usable daily, insights live, growth mechanics active
  Gate:      Week 2 retention > 40%, insights generating

V3 — Decision Engine
  Duration: 14 days (2 weeks)
  End state: FinSight earns the name "Decision Engine"
  Gate:      Subscription detection, forecast, tax export live
             and used by real users

V4 — Scale + Advanced AI
  Duration: 15 days (3 weeks)
  End state: Stable at 1,000-10,000 users
  Gate:      Async queue live, merchant intelligence live,
             p95 dashboard < 200ms

V5 — Differentiation
  Duration: Ongoing (12+ months post-V4)
  End state: Capabilities no competitor can replicate
  Gate:      18+ months data per user, 1,000+ Pro users

TOTAL TO V3 (production-ready product):   ~26 working days
TOTAL TO V4 (scale-ready product):        ~41 working days
TOTAL TO V5 (differentiated product):     12+ months
```

---

*End of FinSight TIMELINE.md v1.0.0*
*This document governs execution sequencing and sprint discipline.*
*Product decisions: PRODUCT_EVOLUTION.md · Architecture: TECH_STACK.md v2.0*
*AI pipeline: AI_STACK.md v1.0 · Infrastructure: INFRA.md v1.0*
*Prompts: PROMPT_STRATEGY.md v1.0*
*This is a living document — update it when phases complete,*
*timelines slip, or gate criteria change. An outdated execution*
*plan is no plan.*
