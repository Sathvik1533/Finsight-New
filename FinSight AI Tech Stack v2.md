# FINSIGHT — TECH_STACK.md
## Financial Decision Engine — Technical Architecture
```
Version:        2.0.0
Classification: Internal — Engineering Architecture
Status:         Active — Implementation Contract
Supersedes:     TECH_STACK.md v1.1.0
Consumes:       PRD_v2.md · UI_GENERATOR_SPEC.md v2.0 · STAGE_GUIDE.md v1.1
Scale Target:   10,000+ concurrent users
AI Pipeline:    Multi-model (NVIDIA NIM + Groq + Gemini) + Decision Engine
```

---

## DOCUMENT AUTHORITY

This document governs every technology decision in FinSight. No library, service, API, or infrastructure component may be added, removed, or replaced without a documented justification traceable to this document. Every choice here has a reason. If the reason no longer applies, the choice should be revisited.

---

# SECTION 1 — TECH STACK PHILOSOPHY

## 1.1 Why Multi-Model AI (Not Single-Model)

The original v1.1 architecture used Gemini 2.0 Flash for all three AI tasks: OCR extraction, categorization, and insight generation. This was correct for Phase 1 — minimizing moving parts in an unvalidated system is rational. As of v2.0, the architecture adopts a multi-model pipeline for reasons that are not aesthetic — they are economic and performance-driven.

**The core argument for specialization:**

A general-purpose model like Gemini 2.0 Flash is excellent at reasoning and language generation. It is not the best available model for vision-heavy structured extraction from photographs of physical documents. A model purpose-trained on visual understanding at high parameter count — NVIDIA NIM's Llama 3.2 90B Vision — outperforms general models on the specific task of reading thermal paper, interpreting degraded text, and extracting structured data from cluttered receipt layouts. Using the best model for each task produces better output quality at equivalent or lower cost than forcing a single model to do all three.

**The cost argument:**

Calling one large general model for every stage of a 3-stage pipeline is expensive at scale. Groq's Llama 3.3 70B runs on custom LPU hardware and delivers categorization responses in under 300ms at a fraction of the cost of a frontier model API call. Categorization is a structured classification task — it does not require frontier model reasoning capability. Routing categorization to Groq and reserving Gemini for insight generation (which does require reasoning) reduces per-receipt processing cost by an estimated 45% at scale while maintaining or improving quality.

**The latency argument:**

Sequential model calls are the bottleneck in the pipeline. Groq's LPU hardware delivers sub-second inference on 70B parameter models. This is not achievable with Gemini or OpenAI APIs on comparable models. For the categorization step — which fires synchronously and blocks the user-facing result — Groq's latency advantage directly improves the perceived speed of the upload experience.

## 1.2 Multi-Model vs Single-Model — Explicit Tradeoff Table

| Dimension | Single-Model (Gemini Only) | Multi-Model (NVIDIA + Groq + Gemini) |
|---|---|---|
| Operational complexity | Low — 1 API key, 1 SDK | Higher — 3 providers, 3 SDKs, 3 failure modes |
| OCR quality on degraded receipts | Good | Superior (90B vision model purpose-built for this) |
| Categorization latency | ~800ms (Gemini Flash) | ~250ms (Groq LPU) |
| Insight reasoning quality | Excellent (Gemini) | Excellent (Gemini, unchanged) |
| Per-receipt cost at 20k uploads/month | ~$12/month | ~$6.50/month (estimated) |
| Failure surface | Single provider outage = full outage | Provider-specific failures containable |
| Implementation in Phase 1 | ✅ Correct choice | ❌ Premature complexity |
| Implementation in Phase 2+ | ❌ Suboptimal | ✅ Correct choice |

**The transition from v1.1 (single-model) to v2.0 (multi-model) happens at Phase 2.** Phase 1 retains the Gemini-only pipeline to minimize moving parts during initial validation. The multi-model pipeline is introduced in Phase 2 after the system is stable and processing real traffic.

## 1.3 Cost vs. Accuracy vs. Latency Optimization Map

Each pipeline stage is optimized for its dominant constraint:

```
STAGE 1 — OCR EXTRACTION
  Dominant constraint: ACCURACY
  Failure cost: High — errors corrupt the user's permanent transaction record
  Model choice: NVIDIA NIM Llama 3.2 90B Vision (highest vision accuracy available)
  Latency tolerance: Up to 4 seconds (user sees processing animation)

STAGE 2 — CATEGORIZATION
  Dominant constraint: LATENCY + COST
  Failure cost: Medium — can be corrected by user in Phase 2
  Model choice: Groq Llama 3.3 70B (sub-300ms, structured output, low cost)
  Latency tolerance: Under 500ms (sequential with OCR)

STAGE 3 — INSIGHT GENERATION
  Dominant constraint: REASONING QUALITY
  Failure cost: Low — insights are advisory, not transactional data
  Model choice: Gemini 2.0 Flash (best reasoning-per-cost available)
  Latency tolerance: Up to 8 seconds (async, not blocking upload flow)

STAGE 4 — DECISION ENGINE
  Dominant constraint: DETERMINISM + AUDITABILITY
  Failure cost: High — incorrect tax estimates or subscription detection are trust violations
  Computation: SQL + Python (deterministic), Gemini for narrative only
  Latency tolerance: Computed offline, results surfaced asynchronously
```

## 1.4 Decision Engine — Why It Exists

The Decision Engine is the architectural component that separates FinSight from an analytics dashboard. Analytics dashboards show what happened. Decision engines surface what it means and what to do about it.

The three user segments defined in PRD_v2.md §1.4 each have a specific decision the product should help them make:

- **Freelancers** need to know: "What is my estimated tax liability based on this month's business expenses?"
- **Salaried professionals** need to know: "Which subscriptions am I paying for that I didn't consciously choose to keep?"
- **Business operators** need to know: "Which expense categories are leaking budget relative to my historical baseline?"

None of these are answered by showing spending charts. They require the system to compute a conclusion from the data and surface it as a decision-relevant output. This is qualitatively different from insight generation (observations) — it is decision support (conclusions with action implications).

The Decision Engine is implemented as a Python module within the FastAPI service, not as a separate microservice. It is triggered after the intelligence level reaches Level 3 and runs on the full transaction corpus.

---

# SECTION 2 — FRONTEND STACK

## 2.1 Framework — Next.js 14 App Router

**Role:** Application shell, server-side rendering, routing, BFF coordination, and static generation. Next.js is the only frontend framework used. No Create React App, no Vite-served SPA.

**Why App Router specifically:** The App Router's React Server Components enable the dashboard's initial data to be fetched server-side and streamed to the client without a loading spinner on first paint. For a dashboard that users open expecting to see their data immediately, this matters. The layout-level data fetching pattern means the sidebar (with the Intelligence Meter's current count) and the page content can be fetched in parallel rather than sequentially.

**Rendering strategy:**

| Route | Strategy | Justification |
|---|---|---|
| `/` | SSG | Never changes per-user. Built at deploy time. |
| `/auth` | SSG | Static form. No user data. |
| `/dashboard` | SSR + Client hydration | User-specific. React Query manages updates after initial paint. |
| `/receipts` | SSR + Client hydration | Paginated list. Filter changes managed client-side via React Query. |
| `/receipts/[id]` | SSR | Single record. Server-fetched, minimal interactivity. |
| `/insights` | SSR + Client hydration | Charts require `'use client'` — Tremor does not SSR. Data server-fetched. |
| `/settings` | SSR | Profile data. Low interactivity. Form mutations via React Query. |

**Note:** `/receipts/[id]` — plural, sub-route of `/receipts` list. There is no `/receipt/[id]` singular route anywhere in the codebase.

## 2.2 Styling — Tailwind CSS v3

**Role:** The only styling mechanism. No CSS modules, no styled-components, no inline style objects (except for Framer Motion `style` props during animation).

**Design token integration:** `tailwind.config.ts` extends the default theme with all FinSight design tokens (colors, spacing, typography, glass effects). See UI_GENERATOR_SPEC.md §2 for the complete token set. Tailwind's JIT compiler ensures unused classes are purged in production — no bloat.

**Why not v4:** Tailwind v4 uses a fundamentally different configuration approach. The team explicitly uses Tremor v3, which is built against Tailwind v3. Version mismatch between Tremor and Tailwind creates class conflicts that are time-consuming to debug. Upgrade path exists when Tremor ships v4 compatibility.

## 2.3 UI Component Libraries

### shadcn/ui

**Role:** Primitive UI components — Dialog (upload modal container), AlertDialog (confirmation dialogs), Select (category filter, currency preference), Tooltip (confidence dot), Progress (confidence bar, plan usage), Badge (status chips), Toast (upload success/failure), Sheet (mobile upload bottom sheet), Tabs (auth page sign-in/sign-up).

**Critical:** shadcn components are **copied into the project** (`src/components/ui/`) and not installed as a package dependency. This means they are fully controllable — their Tailwind classes are overridden to match FinSight's design system, not shadcn's default slate theme.

**What NOT to use from shadcn:** Card (use GlassCard organism), Button (use AmberButton/SecondaryButton atoms), Table (use TransactionRow organism). These components have visual opinions that conflict with the glassmorphism design system.

### Tremor v3

**Role:** All data visualization. DonutChart (category distribution), AreaChart (weekly spending trend), BarChart (category comparison, horizontal), SparkAreaChart (optional KPI sparklines in V2). Tremor is configured via the Tailwind theme to use FinSight's amber/indigo palette.

**Why Tremor over Recharts or Victory:** Tremor charts are Tailwind-native and accept color tokens directly from the Tailwind config. No manual color array management. `showAnimation={true}` provides chart entrance animations without additional Framer Motion configuration. Recharts requires significantly more boilerplate for the same visual output.

**What NOT to do with Tremor:** Do not generate Tremor chart code via v0.dev. v0.dev invents Tremor props that do not exist. Write Tremor chart components manually.

### Framer Motion

**Role:** Intelligence level unlock animations (spring physics on card reveals), upload processing step checkmarks (spring bounce), Intelligence Meter fill animation (spring on `scaleX`/`scaleY`), page transitions (opacity + x offset), modal entrance/exit.

**Not used for:** CSS-level animations (skeleton shimmer, Intelligence Meter Level 4 shimmer, orbital upload ring). These are CSS `@keyframes` — Framer Motion for CSS animations is unnecessary overhead.

**Key constraint:** Framer Motion components require `'use client'` directive. Server Components that use Framer Motion must be split into a server data-fetching wrapper and a client animation shell.

## 2.4 State Management — TanStack Query + React Context

### TanStack Query (React Query v5)

**Role:** All async server state — fetching, caching, invalidation, and background refetching. Every API call in FinSight uses TanStack Query. No manual `useState` + `useEffect` for async data.

**Query key convention:**
```
['user', 'profile']                         → user profile + receipt count
['dashboard', 'summary']                    → KPI metrics
['receipts', page, category, range]         → paginated receipt list
['receipts', id]                            → single receipt detail
['insights']                                → latest insight set
['decision-engine', 'output', userId]       → Decision Engine results
```

**Configuration:**
```typescript
// Stale time by query type:
user/profile:        0ms     (refetch after every upload — drives Intelligence Meter)
dashboard/summary:   60s     (acceptable stale for KPI cards)
receipts list:       60s     (paginated — fresh enough)
single receipt:      5min    (rarely changes after processing)
insights:            30min   (expensive to generate — cache aggressively)
decision-engine:     1hr     (batch computation — not real-time)
```

**Post-upload invalidation sequence (order matters):**
```
1. invalidate ['user', 'profile']      → triggers Intelligence Meter re-render
2. invalidate ['dashboard', 'summary'] → refreshes KPI cards
3. invalidate ['receipts']             → refreshes receipt list
4. After profile refetch: check for level change → trigger unlock animation
```

### React Context + useReducer

**Role:** Global UI state that does not come from the server — upload modal open/closed state, upload state machine (idle/uploading/processing/complete/error/limit_reached), sidebar collapsed/expanded state.

**Not used for:** Server data. TanStack Query owns all server state. React Context is not a server-state management solution.

## 2.5 Form Handling — React Hook Form + Zod

**Role:** Auth forms (sign-in, sign-up with Zod validation), Settings profile form, category correction dropdown (Phase 2).

**Why React Hook Form:** Minimal re-renders on field change. Performance matters on the auth form where real-time validation is expected. Zod schema reuse — the same Zod schema used for client-side form validation can be reused for server-side validation in Next.js API routes.

---

# SECTION 3 — BACKEND STACK

## 3.1 Architecture Overview

FinSight uses a two-tier backend:

**Tier 1 — Next.js API Routes (BFF Layer):** Runs on Vercel serverless functions. Handles session validation, file ingestion, storage coordination, and orchestration. Calls FastAPI for AI work. Max execution time: 10 seconds (Vercel hobby limit; 60 seconds on Pro). Every route is stateless.

**Tier 2 — Python FastAPI (AI Service):** Runs on Railway as a persistent container. Handles all AI model calls, the Decision Engine computation, and direct Supabase writes via service role key. No Vercel timeout applies here. One Railway instance in Phase 1; horizontal scaling in Phase 4.

This split is non-negotiable. The Vercel 10-second limit makes it physically impossible to complete two sequential AI model calls (NVIDIA OCR + Groq categorization) within a serverless function. FastAPI on Railway has no execution time limit.

## 3.2 Next.js API Routes — Complete Route Map

```
AUTHENTICATION
POST   /api/auth/callback
  → Supabase OAuth code exchange → redirect to /dashboard
  → No external calls

RECEIPT PIPELINE
POST   /api/receipts/upload
  → Session validation → Free tier gate → MIME + size check
  → Supabase Storage upload → receipts row creation
  → FastAPI /analyze/receipt call (synchronous, awaited)
  → Return extraction + categorization to client
  Security: user ID from session token only

GET    /api/receipts?page&category&range
  → Session validation → paginated query with filters
  → Returns: { receipts, transactions, total, page }

GET    /api/receipts/[id]
  → Session validation → single receipt + transaction + signed URL
  → Signed URL: 1-hour expiry, server-side generation only

PATCH  /api/receipts/[id]
  → Session validation → update category + set is_manually_corrected=true
  → Used in Phase 2

DELETE /api/receipts/[id]
  → Session validation → delete storage object + transaction row + receipt row
  → Order: storage first (if this fails, receipt is not orphaned in DB)

INSIGHTS
GET    /api/insights
  → Returns most recent insights row from DB — no FastAPI call
  → Fast: database read only

POST   /api/insights
  → Session validation → fetch recent transactions
  → FastAPI /insights/generate call → persist result → return to client

DASHBOARD
GET    /api/dashboard/summary
  → Session validation → aggregated query (total, top category, weekly, breakdown)
  → Phase 4: reads from materialized view instead of live query

DECISION ENGINE
GET    /api/decision-engine/output
  → Returns cached Decision Engine output from DB
  → Fast: database read only (engine runs in background)

MONETIZATION
POST   /api/webhooks/stripe
  → Stripe signature verification → update subscription_tier in profiles (Phase 2)
```

**Security contract — every route, no exceptions:**
- Supabase session extracted from httpOnly cookie via `@supabase/ssr`
- `session.user.id` is the only source of user ID — never `req.body.user_id`
- File uploads: MIME type validated server-side (client MIME type ignored)
- All database queries include the user's ID as a filter condition

## 3.3 FastAPI Service — Architecture

**Language:** Python 3.11
**Framework:** FastAPI 0.111.0 with uvicorn 0.29.0
**Deployment:** Railway persistent container
**Memory:** 512MB minimum, 1GB recommended for Phase 2+

### Endpoint Map

```
POST /analyze/receipt
  Auth: X-Internal-Secret header
  Body: { image_base64: string, user_id: string, receipt_id: string }
  Pipeline: NVIDIA OCR → Groq Categorization → Supabase write → Decision Engine update
  Response: { status, extraction, categorization, processing_time_ms, decision_signals }
  Error 422: OCR confidence below threshold
  Error 401: Invalid internal secret
  Error 500: Any AI provider failure

POST /insights/generate
  Auth: X-Internal-Secret header
  Body: { user_id: string, transactions: list, time_range: string }
  Pipeline: Gemini insight generation → Health Score computation → Supabase write
  Response: { insights, health_score, score_breakdown, recommendations }

POST /decision-engine/run
  Auth: X-Internal-Secret header
  Body: { user_id: string }
  Pipeline: Fetch transactions → Run all Decision Engine modules → Write results
  Response: { tax_estimate, subscriptions, budget_alerts, leakage_signals }
  Note: Triggered async after Level 3+ is reached or by background scheduler

GET  /health
  Auth: None
  Response: { status: "ok", models: { nvidia: bool, groq: bool, gemini: bool } }
  Note: Checks all three AI provider connections on startup
```

### Request Lifecycle for `/analyze/receipt`

```
STEP 1: Secret validation (< 1ms)
  → Reject if X-Internal-Secret invalid

STEP 2: Image decoding (< 50ms)
  → base64 → bytes → PIL Image
  → PDF first-page extraction if needed

STEP 3: NVIDIA NIM OCR (1,500–3,500ms)
  → HTTP call to NIM API endpoint
  → Response: structured extraction JSON
  → If raw_confidence < 0.30: raise ValueError, mark receipt failed

STEP 4: Groq Categorization (200–400ms)
  → HTTP call to Groq API
  → Structured output via response_format=JSON
  → If confidence < 0.50: override category to "Other"

STEP 5: Supabase writes (50–150ms total)
  → Insert transaction row
  → Update receipt row (status, processed_at, gemini_response)
  → RPC increment_receipt_count(user_id)

STEP 6: Decision Engine signal update (async, non-blocking)
  → Fire-and-forget background task
  → Updates decision_engine_signals table for this user

STEP 7: Return response (< 1ms)
  → { status, extraction, categorization, processing_time_ms }

TOTAL EXPECTED: 2,000–4,200ms (p50), < 8,000ms (p95)
```

### Async Processing Design

Phase 1 uses synchronous processing: the HTTP response waits for all pipeline steps to complete. This is acceptable because the user expects to wait (the processing animation plays for ≥ 1.6 seconds regardless).

Phase 4 introduces async processing for high-volume periods:
- BullMQ queue (Redis-backed) receives upload jobs
- FastAPI workers consume from the queue
- Client polls for completion via Supabase Realtime subscription on the `receipts` row `status` field
- User sees "Processing 2 of 5 in queue" rather than a spinner

The queue-based approach is not implemented until processing volume creates measurable latency degradation. Building it prematurely adds operational complexity without benefit.

---

# SECTION 4 — DATABASE

## 4.1 Database Platform

**Platform:** Supabase-managed PostgreSQL 15
**Region:** `ap-south-1` (Mumbai) — primary user base is India; latency to this region matters
**Plan:** Supabase Pro — required for PITR backups, custom SMTP, and PgBouncer connection pooling
**Connection pooling:** PgBouncer in transaction mode for API routes (stateless). Session mode for admin operations.

## 4.2 Schema Design

Execute tables in this order — foreign key constraints require it.

```sql
-- ═══════════════════════════════════════════════════════
-- TABLE 1: profiles (extends Supabase auth.users)
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name               TEXT,
  currency_preference     VARCHAR(3)  DEFAULT 'INR',
  intelligence_level      INTEGER     DEFAULT 1,        -- 1|2|3|4 — updated by SQL function
  total_receipts_uploaded INTEGER     DEFAULT 0,
  subscription_tier       VARCHAR(10) DEFAULT 'free',   -- 'free'|'pro'|'business'
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- TABLE 2: receipts (raw upload + processing metadata)
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.receipts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path     TEXT        NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending', -- pending|processing|complete|failed
  processing_error TEXT,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  raw_ocr_text     TEXT,
  ai_model_used    VARCHAR(30),                   -- 'nvidia-llama-3.2-90b'|'gemini-2.0-flash'
  ocr_confidence   NUMERIC(4,3),                  -- raw_confidence from OCR model
  gemini_response  JSONB                          -- full multi-model response for debugging
);

-- ═══════════════════════════════════════════════════════
-- TABLE 3: transactions (normalized financial records)
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.transactions (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receipt_id            UUID           REFERENCES public.receipts(id) ON DELETE SET NULL,
  merchant              TEXT,
  amount                NUMERIC(12, 2) NOT NULL,
  currency              VARCHAR(3)     DEFAULT 'INR',
  transaction_date      DATE           NOT NULL,
  category              VARCHAR(50)    NOT NULL,
  subcategory           VARCHAR(50),
  confidence            NUMERIC(4, 3),              -- categorization model confidence
  categorization_model  VARCHAR(30),               -- 'groq-llama-3.3-70b'|'gemini-2.0-flash'
  is_business_expense   BOOLEAN        DEFAULT FALSE,
  is_manually_corrected BOOLEAN        DEFAULT FALSE,
  is_anomalous          BOOLEAN        DEFAULT FALSE, -- set by anomaly detection (Phase 2)
  is_subscription       BOOLEAN        DEFAULT FALSE, -- set by subscription detector (Phase 3)
  user_note             TEXT,
  created_at            TIMESTAMPTZ    DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- TABLE 4: insights (AI-generated snapshots)
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.insights (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  time_range        VARCHAR(10) DEFAULT '30d',
  insight_texts     JSONB       NOT NULL,   -- string[]
  health_score      INTEGER,                -- 0–100
  score_breakdown   JSONB,                  -- { consistency, diversification, anomaly, trend }
  recommendations   JSONB,                  -- string[] — Phase 3 addition
  transaction_count INTEGER,
  generation_model  VARCHAR(30)             -- 'gemini-2.0-flash'
);

-- ═══════════════════════════════════════════════════════
-- TABLE 5: decision_engine_outputs (Decision Engine results)
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.decision_engine_outputs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  computed_at           TIMESTAMPTZ DEFAULT NOW(),
  time_range            VARCHAR(10) DEFAULT '30d',

  -- Tax Estimation Module
  estimated_tax_liability  NUMERIC(12, 2),          -- INR
  tax_deductible_total     NUMERIC(12, 2),
  tax_computation_basis    JSONB,                   -- breakdown of what was counted

  -- Subscription Detection Module
  detected_subscriptions   JSONB,                  -- array of { merchant, amount, frequency, last_date }
  subscription_monthly_total NUMERIC(12, 2),

  -- Budget Leakage Module
  leakage_signals          JSONB,                  -- array of { category, current, baseline, delta_pct }
  high_risk_categories     TEXT[],

  -- Narrative (Gemini-generated, references the above)
  decision_narrative       TEXT,                   -- human-readable summary of decisions

  is_current               BOOLEAN DEFAULT TRUE    -- only one row per user is current at a time
);
```

## 4.3 Database Functions and Triggers

```sql
-- ═══════════════════════════════════════════════════════
-- TRIGGER: Auto-create profile on signup
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, currency_preference,
    intelligence_level, total_receipts_uploaded, subscription_tier)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    'INR', 1, 0, 'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ═══════════════════════════════════════════════════════
-- FUNCTION: Atomically increment count + recalculate level
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_receipt_count(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_receipts_uploaded = total_receipts_uploaded + 1,
    intelligence_level = CASE
      WHEN total_receipts_uploaded + 1 >= 10 THEN 4
      WHEN total_receipts_uploaded + 1 >= 6  THEN 3
      WHEN total_receipts_uploaded + 1 >= 3  THEN 2
      ELSE 1
    END,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════
-- FUNCTION: Flag current Decision Engine output as stale
-- Called before inserting a new output for the same user
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION archive_decision_engine_output(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.decision_engine_outputs
  SET is_current = FALSE
  WHERE user_id = user_id_param AND is_current = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4.4 Row Level Security Policies

RLS is the primary data isolation mechanism. It operates at the database level — no application-layer filtering can substitute for it.

**Critical:** Bare `USING()` clauses in Postgres apply only to SELECT. All CRUD operations must be covered explicitly with the correct clause type.

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_engine_outputs ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- RECEIPTS
CREATE POLICY "receipts_select_own" ON public.receipts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "receipts_insert_own" ON public.receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "receipts_update_own" ON public.receipts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "receipts_delete_own" ON public.receipts
  FOR DELETE USING (auth.uid() = user_id);

-- TRANSACTIONS
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- INSIGHTS: SELECT only (FastAPI writes via service role key — bypasses RLS intentionally)
CREATE POLICY "insights_select_own" ON public.insights
  FOR SELECT USING (auth.uid() = user_id);

-- DECISION ENGINE OUTPUTS: SELECT only (same pattern as insights)
CREATE POLICY "decision_outputs_select_own" ON public.decision_engine_outputs
  FOR SELECT USING (auth.uid() = user_id);
```

## 4.5 Indexing Strategy

```sql
-- TRANSACTIONS — primary analytics queries
CREATE INDEX idx_transactions_user_date
  ON public.transactions(user_id, transaction_date DESC);

CREATE INDEX idx_transactions_user_category
  ON public.transactions(user_id, category);

CREATE INDEX idx_transactions_user_category_date
  ON public.transactions(user_id, category, transaction_date DESC);
-- ^ Covers anomaly detection query (user + category + recent date range)

CREATE INDEX idx_transactions_merchant_trgm
  ON public.transactions USING GIN (merchant gin_trgm_ops);
-- ^ Phase 2: full-text search on merchant name. Requires pg_trgm extension.

CREATE INDEX idx_transactions_subscription_flag
  ON public.transactions(user_id, is_subscription)
  WHERE is_subscription = TRUE;
-- ^ Partial index: only indexes subscription-flagged rows. Small, fast.

CREATE INDEX idx_transactions_anomaly_flag
  ON public.transactions(user_id, is_anomalous)
  WHERE is_anomalous = TRUE;
-- ^ Partial index: anomaly queries touch a small fraction of all transactions.

-- RECEIPTS
CREATE INDEX idx_receipts_user_status
  ON public.receipts(user_id, status);

CREATE INDEX idx_receipts_user_uploaded
  ON public.receipts(user_id, uploaded_at DESC);

-- INSIGHTS
CREATE INDEX idx_insights_user_generated
  ON public.insights(user_id, generated_at DESC);

-- DECISION ENGINE OUTPUTS
CREATE INDEX idx_decision_outputs_user_current
  ON public.decision_engine_outputs(user_id, is_current)
  WHERE is_current = TRUE;
-- ^ Only one current row per user — this index is tiny and extremely fast.
```

## 4.6 Phase 4 — Materialized Views

At 10,000+ users with 30+ transactions/month each, the live dashboard summary query scanning the transactions table becomes a bottleneck. Materialized views pre-aggregate the most expensive queries.

```sql
-- Category totals by user and period (refreshed every 6 hours)
CREATE MATERIALIZED VIEW mv_user_category_totals AS
SELECT
  user_id,
  category,
  DATE_TRUNC('month', transaction_date) AS period,
  SUM(amount)                            AS total_spend,
  COUNT(*)                               AS transaction_count,
  AVG(amount)                            AS avg_transaction
FROM public.transactions
WHERE is_manually_corrected = FALSE OR is_manually_corrected IS NULL
GROUP BY user_id, category, DATE_TRUNC('month', transaction_date);

CREATE UNIQUE INDEX ON mv_user_category_totals(user_id, category, period);

-- Refresh job (pg_cron or external scheduler):
-- SELECT cron.schedule('refresh-category-totals', '0 */6 * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_category_totals');
```

---

# SECTION 5 — STORAGE

## 5.1 Platform and Bucket Configuration

**Platform:** Supabase Storage (S3-compatible, backed by AWS S3 in `ap-south-1`)
**Bucket name:** `receipts`
**Access mode:** Private — no public URLs generated
**Path structure:** `{user_id}/{receipt_id}/{unix_timestamp}.{ext}`

The user_id prefix is the first path component, which enables the storage RLS policy to use `(storage.foldername(name))[1]` to enforce per-user access without a database lookup.

## 5.2 Storage RLS Policies

```sql
-- Upload: user can only write to their own folder
CREATE POLICY "storage_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Read: user can only read from their own folder
CREATE POLICY "storage_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete: user can only delete from their own folder
CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 5.3 Signed URL Strategy

Receipt images are never served via public URLs. Access is controlled exclusively through signed URLs generated server-side with a 1-hour expiry.

```typescript
// Server-side only — in Next.js API route (GET /api/receipts/[id])
const { data: signedData } = await supabase.storage
  .from('receipts')
  .createSignedUrl(receipt.storage_path, 3600) // 3600 seconds = 1 hour
```

**Rules:**
- Signed URL generation happens in Next.js API routes using the server-side Supabase client (anon key + session). The server-side client has session context, so RLS applies — a user cannot generate a signed URL for another user's file.
- The signed URL is returned to the client as part of the `GET /api/receipts/[id]` response. The client uses it directly in an `<img>` tag.
- Signed URLs are not stored in the database. They are generated on demand. Caching the signed URL client-side for the 1-hour validity is acceptable.

## 5.4 FastAPI Image Access

FastAPI reads receipt images in the upload pipeline via the base64 string forwarded from the Next.js BFF — not by fetching from Supabase Storage. This means FastAPI never needs the signed URL and never holds storage credentials beyond the service role key for writes.

---

# SECTION 6 — AI STACK

## 6.1 OCR Layer — NVIDIA NIM Llama 3.2 90B Vision

### Model Selection Justification

The 90B parameter Llama 3.2 Vision model deployed via NVIDIA NIM is the strongest commercially available open-weights vision model at the time of this architecture. The selection reasoning:

**Parameter count matters for receipt OCR.** Receipts are visually complex: small fonts, thermal printing artifacts, varying layouts, rotated text, multiple column alignment, overlapping elements. Smaller vision models (7B–13B) miss characters in degraded sections. At 90B parameters, the model has significantly more capacity to attend to fine-grained visual details that smaller models hallucinate or miss.

**NVIDIA NIM vs. calling the model directly.** NVIDIA NIM provides an optimized inference endpoint with TensorRT optimization and guaranteed SLA. Calling the Hugging Face or Together AI deployment of the same model produces inconsistent latency. NIM's deployment is production-grade in a way that raw model hosting is not.

**Structured JSON output.** The model is prompted to return JSON only. NIM's API supports `response_format` constraints to enforce valid JSON output, reducing post-processing failures from malformed responses.

### Configuration

```python
# fastapi/ai_clients/nvidia_nim.py
from openai import AsyncOpenAI  # NIM uses OpenAI-compatible API

nim_client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_NIM_API_KEY"),
)

async def extract_receipt(image_base64: str) -> dict:
    response = await nim_client.chat.completions.create(
        model="meta/llama-3.2-90b-vision-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    },
                    {
                        "type": "text",
                        "text": OCR_EXTRACTION_PROMPT
                    }
                ]
            }
        ],
        temperature=0.0,     # Deterministic output for structured extraction
        max_tokens=1024,
        response_format={"type": "json_object"},
        timeout=12.0         # Fail fast — 12s hard limit
    )
    return json.loads(response.choices[0].message.content)
```

### OCR Prompt Design

```python
# fastapi/prompts/ocr_extraction_v1.py
OCR_EXTRACTION_PROMPT = """
Analyze this receipt image. Extract structured data and return ONLY a valid JSON object.
No explanation. No markdown. No code blocks.

Required fields (return null for fields you cannot determine with confidence):
{
  "merchant": "exact name as printed on receipt — null if unreadable",
  "total_amount": "final amount paid as number only, no currency symbol — null if absent or ambiguous",
  "currency": "ISO 4217 code inferred from ₹/Rs/INR/$ symbols — default 'INR'",
  "date": "YYYY-MM-DD format — null if absent or unreadable",
  "line_items": [{"name": str, "quantity": number, "price": number}] or null,
  "payment_method": "cash|card|upi|other — null if not visible",
  "receipt_type": "restaurant|retail|fuel|grocery|medical|transport|other",
  "raw_confidence": "float 0.0-1.0 — your confidence that extracted data is accurate"
}

Rules:
- Return null for uncertain fields rather than guessing
- total_amount is the GRAND TOTAL (after tax, after discounts)
- For Indian receipts with DD/MM/YYYY dates, convert to YYYY-MM-DD
- raw_confidence below 0.30 indicates the receipt should not be processed
"""
```

## 6.2 Categorization Layer — Groq Llama 3.3 70B

### Model Selection Justification

**Why Groq:** Groq's custom Language Processing Unit (LPU) hardware achieves sub-300ms inference for 70B parameter models. This is 3–5× faster than running the same model on GPU clusters. Categorization happens synchronously in the upload pipeline — every millisecond of categorization latency adds to the user's perceived wait time.

**Why Llama 3.3 70B:** The categorization task is a structured classification problem: given transaction metadata, output one of 12 categories plus a confidence score. This requires instruction-following ability and contextual reasoning, but not frontier-model capability. Llama 3.3 70B performs comparably to much larger models on structured classification tasks. Using a 70B model via Groq is both cheaper and faster than using a frontier model.

**Structured output:** Groq's API supports `response_format={"type": "json_object"}` to enforce JSON output. The categorization prompt is engineered for structured compliance — the model never needs to reason through the format.

### Configuration

```python
# fastapi/ai_clients/groq_client.py
from groq import AsyncGroq

groq_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

async def categorize_transaction(extraction_json: dict, user_context: dict = None) -> dict:
    # user_context: dict of {merchant: category} from user's correction history (Phase 3+)
    context_block = ""
    if user_context:
        context_lines = [f"- {m}: {c}" for m, c in user_context.items()]
        context_block = f"\nUser's known merchant categories:\n" + "\n".join(context_lines)

    response = await groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": CATEGORIZATION_SYSTEM_PROMPT + context_block
            },
            {
                "role": "user",
                "content": f"Transaction data: {json.dumps(extraction_json)}"
            }
        ],
        temperature=0.0,
        max_tokens=256,       # Categorization response is small
        response_format={"type": "json_object"},
        timeout=5.0           # Groq is fast — 5s is a generous timeout
    )
    return json.loads(response.choices[0].message.content)
```

### Categorization Prompt Design

```python
# fastapi/prompts/categorization_v1.py
VALID_CATEGORIES = [
    "Food & Dining", "Groceries", "Transportation", "Shopping & Retail",
    "Entertainment & Leisure", "Health & Medical", "Travel & Accommodation",
    "Utilities & Bills", "Software & Subscriptions", "Business & Professional",
    "Education", "Other"
]

CATEGORIZATION_SYSTEM_PROMPT = f"""
You are a financial transaction categorizer for Indian users.
Classify the transaction into exactly one category.

Valid categories: {', '.join(VALID_CATEGORIES)}

High-confidence merchant mappings (use these if merchant matches):
- Swiggy, Zomato, EatSure: Food & Dining
- BigBasket, Blinkit, Zepto, DMart: Groceries
- Ola, Uber, Rapido, BMTC, IRCTC: Transportation
- Amazon, Flipkart, Myntra, Ajio: Shopping & Retail
- BookMyShow, PVR, INOX: Entertainment & Leisure
- Practo, PharmEasy, Apollo: Health & Medical
- Netflix, Spotify, Adobe, Notion, Slack: Software & Subscriptions
- MakeMyTrip, GoIbibo, OYO, Airbnb: Travel & Accommodation

Return ONLY this JSON structure:
{{
  "category": "exact name from valid categories list",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence maximum",
  "subcategory": "more specific label or null",
  "is_business_expense": true or false
}}
"""
```

## 6.3 Insight Layer — Google Gemini 2.0 Flash

### Model Selection Justification

Insight generation is a reasoning-intensive task: the model reads a corpus of transaction data, identifies patterns, computes implications, and generates natural-language statements that are specific, accurate, and actionable. This requires frontier-model reasoning capability — specifically, the ability to hold the entire transaction corpus in context and draw conclusions that span multiple transactions and time periods.

Gemini 2.0 Flash is the best cost-performance model for this task in the current landscape. It handles a 200-transaction input context without degradation, produces specific insight statements (not generic observations), and costs ~$0.075/1M tokens — making it viable at scale.

**Why not Groq for insights:** Groq's strength is speed for structured output tasks. Insight generation is an open-ended reasoning task that benefits from Gemini's RLHF alignment and instruction-following on complex multi-step analytical prompts. Groq's models produce lower-quality insights on financial analytical reasoning compared to Gemini.

### Configuration

```python
# fastapi/ai_clients/gemini_client.py
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_insights(transactions: list, time_range: str, patterns: dict) -> dict:
    model = genai.GenerativeModel("gemini-2.0-flash")
    
    prompt = INSIGHT_GENERATION_PROMPT.format(
        time_range=time_range,
        transaction_count=len(transactions),
        transactions=json.dumps(transactions[:100], indent=2),  # Cap at 100 for token budget
        patterns=json.dumps(patterns, indent=2)
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.3,    # Some variation in phrasing, but grounded in data
            max_output_tokens=1024,
        )
    )

    raw = response.text.strip()
    if raw.startswith("```"):   # Strip code fences — Gemini occasionally wraps JSON
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw.strip())
```

## 6.4 AI Orchestration — Backend-Controlled

**Absolute rule: The frontend never calls an AI provider API directly.**

All three AI providers (NVIDIA NIM, Groq, Gemini) are called exclusively from within the FastAPI service. The Next.js BFF calls FastAPI. The browser calls Next.js API routes. There is no path from the browser to any AI provider.

**Reasons this is non-negotiable:**

1. API keys in browser code are browser-visible and extractable by any user who opens DevTools.
2. The AI pipeline requires Python-specific libraries (Pillow for image processing, google-generativeai for Gemini) that do not run in Next.js.
3. Orchestration logic (confidence thresholds, fallback behavior, retry with different models) belongs in a server that can be updated without client deployments.

**Environment variable assignment:**

```
NVIDIA_NIM_API_KEY  → FastAPI .env only. Never in Next.js.
GROQ_API_KEY        → FastAPI .env only. Never in Next.js.
GEMINI_API_KEY      → FastAPI .env only. Never in Next.js.
```

---

# SECTION 7 — DECISION ENGINE

## 7.1 Architecture Overview

The Decision Engine is a Python module within the FastAPI service, not a separate microservice. It runs as a background task after the main pipeline completes, and its results are persisted in `decision_engine_outputs`. The frontend reads these results from the database — it does not trigger real-time computation.

```
TRIGGER: After upload reaches Level 3+ — OR — background scheduler (daily, Phase 4)
INPUT:   All transactions for user in the selected time range
MODULES: Tax Estimator → Subscription Detector → Budget Leakage Analyzer
OUTPUT:  decision_engine_outputs row for the user
```

The Decision Engine is deterministic for all computation and uses Gemini only for generating the human-readable narrative that contextualizes the computed outputs. The distinction is critical: **the numbers come from SQL + Python, the words come from Gemini.**

## 7.2 Module 1 — Tax Estimation (Freelancer Segment)

**Target user:** Freelancers and solo business operators with `is_business_expense = TRUE` transactions.

**What it computes:**

```
Inputs:
  - All transactions flagged is_business_expense = TRUE
  - User's subscription_tier (for data history access)

Computation:
  1. Total business expense spend for the financial year period (April–March for India)
  2. Categorized business spend breakdown:
     - Software & Subscriptions (SaaS tools — typically fully deductible)
     - Food & Dining (client entertainment — 50% deductible under ITR)
     - Travel & Accommodation (fully deductible with receipts)
     - Business & Professional (fully deductible)

  3. Estimated deductible total:
     deductible = (software_total × 1.0)
               + (dining_total × 0.5)     ← 50% deductibility assumption
               + (travel_total × 1.0)
               + (professional_total × 1.0)

  4. Simplified GST estimate (for registered business users):
     If transaction amounts suggest GST-inclusive pricing:
     gst_component = total_business_spend × 0.18  ← 18% GST assumed (most common)
     (Phase 3 refinement: detect actual GST from line items if present)

  5. Income tax reduction estimate:
     tax_saved_estimate = deductible_total × 0.30  ← 30% tax bracket assumption
     (Note: FinSight does not know the user's actual tax bracket. This uses 30% as a
      conservative upper-bound estimate. Users are shown the assumption clearly.)
```

**Output:**
```json
{
  "estimated_deductible_total": 24500.00,
  "tax_liability_reduction_estimate": 7350.00,
  "business_expense_breakdown": {
    "software": 8400.00,
    "dining_50pct": 3000.00,
    "travel": 12000.00,
    "professional": 1100.00
  },
  "computation_basis": "ITR Section 37 — Business expenditure",
  "disclaimer": "These are estimates. Consult a CA for actual tax computation.",
  "data_period": "FY2024-25 Apr–Mar"
}
```

**Edge cases:**
- User has no `is_business_expense = TRUE` transactions: module returns null outputs with a note: "No business expenses flagged yet. Mark expenses as business-related in the receipt detail view."
- Mixed personal/business user: the module processes only business-flagged transactions — it does not attempt to infer which personal transactions might be business expenses.
- GST-inclusive vs GST-exclusive receipts: in Phase 2, the OCR extraction captures line items including GST. Phase 3 refines the tax estimate using actual GST amounts from receipts rather than the flat 18% assumption.

## 7.3 Module 2 — Subscription Detection (All Segments)

**What it detects:**

A transaction qualifies as a detected subscription if:
1. The same merchant appears in at least 2 separate calendar months.
2. The transaction dates are within ±3 days of the same day-of-month across occurrences.
3. The transaction amounts are within 10% of each other across occurrences.

```python
# fastapi/decision_engine/subscription_detector.py

def detect_subscriptions(transactions: list[dict]) -> list[dict]:
    from collections import defaultdict

    merchant_occurrences = defaultdict(list)
    for t in transactions:
        merchant_occurrences[t['merchant']].append({
            'date': t['transaction_date'],
            'amount': float(t['amount']),
            'id': t['id']
        })

    subscriptions = []
    for merchant, occurrences in merchant_occurrences.items():
        if len(occurrences) < 2:
            continue

        # Sort by date
        occurrences.sort(key=lambda x: x['date'])

        # Check date regularity (within ±3 days of same day-of-month)
        days_of_month = [o['date'].day for o in occurrences]
        day_range = max(days_of_month) - min(days_of_month)
        if day_range > 6:  # ±3 days tolerance
            continue

        # Check amount consistency (within 10%)
        amounts = [o['amount'] for o in occurrences]
        avg_amount = sum(amounts) / len(amounts)
        max_deviation = max(abs(a - avg_amount) / avg_amount for a in amounts)
        if max_deviation > 0.10:
            continue

        subscriptions.append({
            'merchant': merchant,
            'amount': round(avg_amount, 2),
            'frequency': 'monthly',
            'occurrences': len(occurrences),
            'last_date': str(occurrences[-1]['date']),
            'annual_cost': round(avg_amount * 12, 2)
        })

    return subscriptions
```

**Output in decision_engine_outputs:**
```json
{
  "detected_subscriptions": [
    {
      "merchant": "Netflix",
      "amount": 649.00,
      "frequency": "monthly",
      "occurrences": 3,
      "last_date": "2025-01-15",
      "annual_cost": 7788.00
    },
    {
      "merchant": "Adobe Creative Cloud",
      "amount": 1675.40,
      "frequency": "monthly",
      "occurrences": 2,
      "last_date": "2025-01-08",
      "annual_cost": 20104.80
    }
  ],
  "subscription_monthly_total": 2324.40,
  "subscription_annual_total": 27892.80
}
```

**Edge cases:**
- Annual subscriptions (one payment per year): 1 occurrence does not qualify. These are missed in Phase 2 and detected in Phase 3 via a separate heuristic (large one-time payment from a known SaaS vendor).
- Subscriptions with variable amounts (e.g., Uber One with usage fees added): the 10% tolerance handles small variations. Large variable charges (20%+) correctly prevent false subscription detection.
- Trial periods followed by regular billing: the first occurrence may have a $0 or discounted amount. The 10% tolerance will exclude it from the average calculation if it deviates significantly.

## 7.4 Module 3 — Budget Leakage Detection (All Segments)

**What it detects:** Categories where current spending is running significantly above the user's historical baseline, with enough time remaining in the month to act on the information.

```
Computation:
  For each category with ≥ 5 transactions in history:

  1. Trailing baseline: average monthly spend in this category
     over the past 3 complete months

  2. Current month pace: (spend_so_far / days_elapsed) × days_in_month

  3. Leakage signal:
     IF current_pace > (baseline × 1.35)   ← 35% above baseline
     AND days_remaining_in_month > 10       ← enough time to act
     THEN flag as leakage

  4. Severity:
     35%–60% above baseline: MODERATE
     60%+ above baseline:    HIGH
```

**Output:**
```json
{
  "leakage_signals": [
    {
      "category": "Food & Dining",
      "current_month_pace": 8420.00,
      "trailing_baseline": 5800.00,
      "delta_pct": 45.2,
      "severity": "MODERATE",
      "days_remaining": 14
    },
    {
      "category": "Shopping & Retail",
      "current_month_pace": 12300.00,
      "trailing_baseline": 6100.00,
      "delta_pct": 101.6,
      "severity": "HIGH",
      "days_remaining": 14
    }
  ],
  "high_risk_categories": ["Shopping & Retail"]
}
```

**Cold start protection:** Below 5 transactions in a category, no baseline is established and no leakage detection runs. This prevents false alerts in the early data accumulation phase.

## 7.5 Decision Narrative — Gemini Layer

After the three modules compute their outputs, Gemini 2.0 Flash generates a human-readable narrative that contextualizes the numbers:

```python
# fastapi/decision_engine/narrative_generator.py

async def generate_decision_narrative(
    tax_output: dict,
    subscriptions: list,
    leakage_signals: list,
    user_segment: str  # 'freelancer'|'professional'|'business'
) -> str:
    prompt = f"""
You are a financial intelligence assistant. Generate a concise narrative (3-5 sentences)
summarizing the following financial decision signals for a {user_segment}.

Tax analysis: {json.dumps(tax_output)}
Subscription analysis: {json.dumps(subscriptions)}
Budget leakage: {json.dumps(leakage_signals)}

Rules:
- Start with the most significant finding
- Reference specific amounts and percentages
- Be specific, not vague ("₹7,350 in potential tax savings" not "significant tax savings")
- Do not give investment or legal advice
- Acknowledge that tax estimates require CA verification
- Under 100 words total
"""
    response = gemini_model.generate_content(prompt)
    return response.text.strip()
```

## 7.6 Decision Engine Trigger Logic

```python
# fastapi/decision_engine/engine.py

async def run_decision_engine(user_id: str):
    """Background task — fire-and-forget from main pipeline."""

    # Check if user has sufficient data
    profile = await fetch_profile(user_id)
    if profile['intelligence_level'] < 3:
        return  # Level 3 minimum — requires 6+ receipts

    # Fetch transactions (90-day window for Decision Engine)
    transactions = await fetch_transactions(user_id, days=90)
    if len(transactions) < 5:
        return  # Minimum transaction threshold

    # Run all modules
    tax_output    = compute_tax_estimate(transactions)
    subscriptions = detect_subscriptions(transactions)
    leakage       = detect_budget_leakage(transactions, user_id)

    # Generate narrative
    narrative = await generate_decision_narrative(
        tax_output, subscriptions, leakage,
        user_segment=infer_user_segment(transactions)
    )

    # Archive previous output, insert new
    await supabase.rpc('archive_decision_engine_output', {'user_id_param': user_id})
    await supabase.table('decision_engine_outputs').insert({
        'user_id':                   user_id,
        'tax_computation_basis':     tax_output,
        'estimated_tax_liability':   tax_output.get('tax_liability_reduction_estimate'),
        'tax_deductible_total':      tax_output.get('estimated_deductible_total'),
        'detected_subscriptions':    subscriptions,
        'subscription_monthly_total': sum(s['amount'] for s in subscriptions),
        'leakage_signals':           leakage['leakage_signals'],
        'high_risk_categories':      leakage['high_risk_categories'],
        'decision_narrative':        narrative,
        'is_current':                True
    }).execute()
```

---

# SECTION 8 — API LAYER

## 8.1 Authentication Architecture

All Next.js API routes use Supabase's `@supabase/ssr` server client to extract and validate the session from the httpOnly cookie. No custom JWT parsing. No session tokens in request bodies. No API keys in client code.

```typescript
// Pattern used in every protected API route
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id  // ONLY source of user ID — never from request body
  // ...
}
```

FastAPI routes use the `X-Internal-Secret` header for service-to-service authentication. This header is validated on every protected endpoint before any processing:

```python
def verify_internal_secret(x_internal_secret: str = Header(...)):
    if x_internal_secret != os.getenv("FASTAPI_SECRET_KEY"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return x_internal_secret

# Applied to all routes except /health
app.include_router(analyze.router, dependencies=[Depends(verify_internal_secret)])
app.include_router(insights.router, dependencies=[Depends(verify_internal_secret)])
app.include_router(decision_engine.router, dependencies=[Depends(verify_internal_secret)])
```

## 8.2 Rate Limiting

**Phase 1–2:** Rate limiting enforced at the application level.

**Upload endpoint (`POST /api/receipts/upload`):**
- Free tier: checked against `total_receipts_uploaded` monthly limit (20). HTTP 402 on limit reached.
- Pro tier: no volume limit. Implicit rate limiting via the 12-second processing time.

**Phase 4:** Rate limiting moves to Vercel Edge Middleware, enforced before requests reach API routes.

```typescript
// middleware.ts — Phase 4 addition
const rateLimits = {
  '/api/receipts/upload': {
    free: { requests: 5, window: '1h' },   // 5 uploads/hour on free tier
    pro:  { requests: 60, window: '1h' },  // 60 uploads/hour on Pro
  }
}
```

## 8.3 Validation

Every API route validates its input before processing. Validation uses Zod in Next.js and Pydantic in FastAPI.

**Next.js API route validation pattern:**
```typescript
import { z } from 'zod'

const uploadSchema = z.object({
  // File validation is done programmatically — Zod handles metadata
})

// MIME type validation (server-side):
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
if (!ALLOWED_TYPES.includes(file.type)) {
  return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
}

if (file.size > 10 * 1024 * 1024) {
  return NextResponse.json({ error: 'File too large — max 10MB' }, { status: 400 })
}
```

**FastAPI request validation (Pydantic):**
```python
from pydantic import BaseModel, validator

class AnalyzeRequest(BaseModel):
    image_base64: str
    user_id: str
    receipt_id: str

    @validator('image_base64')
    def validate_base64(cls, v):
        import base64
        try:
            base64.b64decode(v, validate=True)
        except Exception:
            raise ValueError('Invalid base64 encoding')
        return v

    @validator('user_id', 'receipt_id')
    def validate_uuid(cls, v):
        import uuid
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError('Invalid UUID format')
        return v
```

## 8.4 Error Handling

**Error response contract (Next.js API routes):**
```typescript
// All errors return this shape:
{
  error:   string,    // Human-readable message
  code?:   string,    // Machine-readable error code (for client logic)
  details?: unknown   // Debug info (non-production only)
}

// Error codes used by client logic:
'LIMIT_REACHED'    → 402 — trigger upgrade prompt (not error state)
'UNAUTHORIZED'     → 401 — redirect to /auth
'INVALID_FILE'     → 400 — show specific file error in upload modal
'PROCESSING_FAILED'→ 422 — show "try a clearer photo" in upload modal
```

**FastAPI error handling pattern:**
```python
@router.post("/analyze/receipt")
async def analyze_receipt(request: AnalyzeRequest):
    try:
        # ... pipeline steps
    except ValueError as e:
        # Confidence threshold failure — user error
        await update_receipt_status(request.receipt_id, 'failed', str(e))
        raise HTTPException(status_code=422, detail=str(e))
    except httpx.TimeoutException:
        # AI provider timeout — infrastructure error
        await update_receipt_status(request.receipt_id, 'failed', 'AI provider timeout')
        raise HTTPException(status_code=504, detail="AI processing timed out — please retry")
    except Exception as e:
        # Unexpected — log and fail gracefully
        logger.error(f"Pipeline failure for receipt {request.receipt_id}: {e}", exc_info=True)
        await update_receipt_status(request.receipt_id, 'failed', f"Processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Processing failed — please retry")
```

---

# SECTION 9 — DATA FLOW

## 9.1 Complete Request Lifecycle — Receipt Upload

```
BROWSER
  [1] User drops file in upload modal
  [2] useUpload hook calls fetch('/api/receipts/upload', {method:'POST', body:formData})
  [3] Upload modal transitions to PROCESSING state (animation begins)

NEXT.JS BFF  (Vercel serverless — timeout: 60s on Pro)
  [4] Extract session from httpOnly cookie → get user_id
  [5] Check free tier limit → 402 if exceeded
  [6] Validate MIME type + file size → 400 if invalid
  [7] Upload buffer to Supabase Storage → get storage_path
  [8] INSERT receipts row (status='pending') → get receipt_id
  [9] Encode buffer to base64
  [10] POST to FastAPI /analyze/receipt with { image_base64, user_id, receipt_id }
  [11] Await FastAPI response (synchronous, up to 12s)

FASTAPI SERVICE  (Railway persistent container — no timeout)
  [12] Validate X-Internal-Secret header
  [13] Decode base64 → PIL Image
  [14] Call NVIDIA NIM (OCR) → get extraction JSON (1.5–3.5s)
  [15] If confidence < 0.30 → raise ValueError → UPDATE receipts status='failed'
  [16] Call Groq (categorization) with extraction JSON (0.2–0.4s)
  [17] If confidence < 0.50 → override category to 'Other'
  [18] INSERT transactions row → UPDATE receipts status='complete'
  [19] RPC increment_receipt_count(user_id)
  [20] Fire background task: run_decision_engine(user_id) [non-blocking]
  [21] Return { status, extraction, categorization, processing_time_ms }

NEXT.JS BFF  (resumed after await)
  [22] Return FastAPI response to browser
  [23] HTTP response complete

BROWSER  (resumed after fetch resolves)
  [24] useUpload hook receives response
  [25] setState('complete') → modal transitions to RESULTS state
  [26] queryClient.invalidateQueries(['user','profile'])  → refetch profile
  [27] queryClient.invalidateQueries(['dashboard','summary'])
  [28] queryClient.invalidateQueries(['receipts'])
  [29] Profile refetch returns new total_receipts_uploaded
  [30] useIntelligenceLevel(profile) → compute new level
  [31] If level increased → trigger unlock animation sequence
  [32] Dashboard re-renders with new data
```

**Total elapsed time:** Steps 1–24: 3–8 seconds (upload + OCR + categorization + DB writes). Steps 25–32: < 500ms (cache invalidation + React re-render).

## 9.2 Decision Engine Data Flow (Background)

```
FASTAPI BACKGROUND TASK  (fire-and-forget after step 20 above)
  [A] check profile.intelligence_level >= 3
  [B] fetch all transactions for user (90d window)
  [C] run_tax_estimator(transactions)
  [D] run_subscription_detector(transactions)
  [E] run_leakage_detector(transactions, user_id)
  [F] Call Gemini (narrative generation) → 1–3s
  [G] RPC archive_decision_engine_output(user_id)
  [H] INSERT decision_engine_outputs row

BROWSER  (next time user loads /insights or /dashboard)
  [I] GET /api/decision-engine/output
  [J] Returns current decision_engine_outputs row from DB
  [K] Renders DecisionPanel component with tax/subscription/leakage outputs
```

## 9.3 Caching Strategy

| Data | Client Cache | Server Cache | Invalidation |
|---|---|---|---|
| User profile | React Query, 0ms stale | None | After every upload |
| Dashboard summary | React Query, 60s stale | None (Phase 1–3) / Redis (Phase 4) | After upload, after deletion |
| Receipt list | React Query, 60s stale | None | After upload, after deletion |
| Single receipt | React Query, 5min stale | None | After category correction |
| Insights | React Query, 30min stale | None | After POST /api/insights |
| Decision Engine output | React Query, 1hr stale | None | After Decision Engine run |
| Signed URLs | Browser, 1hr (URL expiry) | None | Generated on demand |

**Cache invalidation triggers (complete list):**
- `POST /api/receipts/upload` success → invalidate profile, dashboard, receipts
- `DELETE /api/receipts/[id]` → invalidate profile (count may affect level display), dashboard, receipts
- `PATCH /api/receipts/[id]` (category correction) → invalidate single receipt, dashboard, insights (category distribution changed)
- `POST /api/insights` → invalidate insights
- Decision Engine background task completes → invalidate decision-engine output (via Supabase Realtime subscription, Phase 4)

---

# SECTION 10 — DEV TOOLS AND INFRASTRUCTURE

## 10.1 Version Control

**Platform:** GitHub
**Branch strategy:**
- `main` — production. Protected. No direct pushes. Requires PR + passing CI.
- `develop` — integration branch. All feature branches merge here first.
- `feat/*` — feature branches. One branch per stage/feature.
- `fix/*` — bug fix branches.
- `security/*` — security-only changes. Fast-tracked to `main`.

## 10.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:    { branches: [main, develop] }
  pull_request: { branches: [main] }

jobs:
  # MUST PASS — blocks merge if any exposed secret is found
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan for exposed secrets in frontend
        run: |
          if grep -r "AIza\|NVIDIA_NIM\|GROQ_API\|service_role\|GEMINI_API" \
            --include="*.ts" --include="*.tsx" src/; then
            echo "::error::SECRET FOUND IN FRONTEND CODE — BUILD BLOCKED"
            exit 1
          fi

  # TypeScript compile check
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npx tsc --noEmit

  # Lint
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npx eslint src/

  # FastAPI Python checks
  fastapi-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install ruff mypy pydantic
      - run: cd fastapi && ruff check . && mypy main.py
```

## 10.3 Deployment — Vercel (Next.js)

- **Auto-deploy** from `main` branch on every push.
- **Preview deployments** from every PR — full environment with non-production Supabase project.
- **Environment variables** set per-environment in Vercel dashboard (not committed to repo).
- `NEXT_PUBLIC_APP_URL` must be updated to the Vercel production URL before launch.
- Build command: `next build`. No custom build scripts.

## 10.4 Deployment — Railway (FastAPI)

- Dockerfile-based deployment from the `fastapi/` subdirectory.
- `RAILWAY_DOCKERFILE_PATH=fastapi/Dockerfile` set in Railway config.
- Health check: `GET /health` — Railway restarts the container if this returns non-200 for 3 consecutive checks.
- Memory: 1GB recommended (512MB minimum). Image processing with Pillow is memory-intensive for large PDFs.
- **`ALLOWED_ORIGINS` must be set to the production Vercel URL** before the first production deployment. Leaving this as `localhost:3000` in production blocks all browser uploads.

## 10.5 Supabase Configuration

- **Region:** `ap-south-1` — not negotiable. The primary user base is in India. Every millisecond of database latency matters.
- **Backup:** PITR (Point-in-Time Recovery) enabled. Daily automated snapshots retained for 7 days.
- **Auth settings:** Update Site URL and Redirect URLs to production domain before launch.
- **Email:** Configure custom SMTP in Supabase dashboard — Supabase's default SMTP has low deliverability.

---

# SECTION 11 — PERFORMANCE STRATEGY

## 11.1 Rendering Strategy by Data Type

**SSR for initial load:** Dashboard, Receipts, and Insights pages fetch their initial data server-side via React Server Components. The first paint shows real data, not a loading skeleton. This is particularly important on the Dashboard where the Intelligence Meter and transaction list should appear immediately.

**Client-side for interactions:** Filter changes, pagination, and post-upload updates are managed entirely client-side via TanStack Query. No full page navigation for these interactions.

**Static for marketing:** The landing page and auth page are statically generated at build time. These are the only pages guaranteed to load instantly regardless of database or AI service status.

## 11.2 Lazy Loading

**Chart components:** All Tremor chart components require `'use client'` and are loaded lazily with `next/dynamic`:

```typescript
import dynamic from 'next/dynamic'

const SpendingDonut = dynamic(
  () => import('@/components/charts/SpendingDonut'),
  {
    ssr: false,              // Charts cannot SSR — Tremor uses browser APIs
    loading: () => <SkeletonBlock className="h-48 w-48 rounded-full" />
  }
)
```

This prevents chart code from being included in the initial HTML payload and ensures the skeleton shows during code loading.

**Upload modal:** Loaded lazily since it is not rendered until the user clicks the upload button.

**Decision Engine panel:** Loaded lazily — it appears below the fold on the insights page.

## 11.3 Image Optimization

- Receipt images served via Supabase Storage signed URLs — not through Next.js Image optimization (Next.js Image cannot optimize images served from arbitrary signed URLs without configuration).
- Thumbnail images (52×52px in transaction rows) fetched from Supabase Storage with the `transform` parameter to resize server-side: `createSignedUrl(path, 3600, { transform: { width: 104, height: 104 } })` (2× for retina displays).
- The full-size image in the receipt detail view is the original signed URL — no transformation.

## 11.4 Async Processing Queue (Phase 4)

When processing volume exceeds sustainable synchronous throughput, the upload pipeline moves to a queue-based architecture:

```
Browser → POST /api/receipts/upload
  → Immediately returns { receipt_id, status: 'queued' }
  → Does NOT await FastAPI response

FastAPI
  → Receipt job added to BullMQ queue in Redis
  → Worker picks up job → runs full pipeline
  → Updates receipts.status in Supabase

Browser
  → Supabase Realtime subscription watches receipts.status for this receipt_id
  → When status changes to 'complete': fetch results → update UI
  → When status changes to 'failed': show error state
```

The Realtime subscription replaces the synchronous wait. From the user's perspective: the modal shows a "queued" state with position indicator instead of the processing animation, then transitions to results when the backend completes.

---

# SECTION 12 — COST OPTIMIZATION

## 12.1 Per-Receipt Cost Breakdown (Phase 2+ Multi-Model)

| Stage | Model | Estimated Cost per Receipt |
|---|---|---|
| OCR Extraction | NVIDIA NIM Llama 3.2 90B Vision | ~$0.00042 (1,400 input tokens × $0.30/1M) |
| Categorization | Groq Llama 3.3 70B | ~$0.00008 (300 tokens × $0.27/1M) |
| Insight Generation (triggered, not per-receipt) | Gemini 2.0 Flash | ~$0.00025/generation (amortized over 10 receipts) |
| Decision Engine narrative | Gemini 2.0 Flash | ~$0.00015/generation (amortized over 20 receipts) |
| **Total per receipt** | | **~$0.00058** |

At 20,000 receipts/month: **~$11.60/month** in AI API costs.
At 200,000 receipts/month (10,000 active Pro users): **~$116/month**.

## 12.2 AI Call Routing Logic

```
EVERY RECEIPT → NVIDIA NIM (mandatory, highest accuracy)
EVERY RECEIPT → Groq (mandatory, lowest latency)
EVERY RECEIPT THAT REACHES LEVEL 3+ → Decision Engine runs (once per upload, background)
INSIGHT GENERATION: Only when:
  - User explicitly clicks "Refresh Insights"
  - User reaches a new intelligence level (maximum 3 times in user lifetime)
  - Background scheduler (daily, Phase 4 — Pro users only)
```

**Never call Gemini for:**
- Categorization (Groq handles this faster and cheaper)
- Health score sub-scores (computed deterministically in Python)
- Subscription detection (pure SQL/Python logic)
- Budget leakage computation (pure SQL/Python logic)

**Always call Gemini for:**
- Insight text generation (requires reasoning capability)
- Decision Engine narrative (context synthesis from multiple outputs)
- Anomaly sub-score in Health Score v2 (requires qualitative judgment)

## 12.3 Batching Strategies

**Insight generation batching (Phase 4):** For users who have not explicitly triggered insight refresh, the background scheduler runs insight generation in batches during off-peak hours (2–4am IST). This staggers Gemini API calls across time rather than concentrating them during peak usage periods, reducing the risk of hitting rate limits.

**Decision Engine batching:** The Decision Engine runs once per day per user as a background job (Phase 4). For 10,000 users, this means ~420 runs/hour distributed evenly through the day. At ~$0.00015/run, this costs ~$1.50/day or ~$45/month at full scale.

## 12.4 Token Reduction Strategies

**OCR prompt engineering:** The NVIDIA NIM prompt is kept under 200 tokens. The receipt image is the large input — prompt bloat adds cost without improving accuracy.

**Transaction corpus capping:** Insight generation caps at 100 transactions per call (see §6.3 implementation). Users with 500+ transactions get a representative sample rather than the full corpus. Sampling strategy: most recent 70 + 30 random historical. This preserves recency while maintaining statistical coverage.

**Categorization context:** The user's merchant correction history is included in the Groq prompt only when it is non-empty. New users pay no additional token cost for empty context.

---

# SECTION 13 — FUTURE EXTENSIONS

These technologies are explicitly **NOT used in Phase 1 or Phase 2**. Each has a defined entry condition.

## 13.1 LangChain — AI Orchestration Framework

**What it is:** A framework for building applications that chain multiple AI model calls, manage prompt templates, and abstract over different LLM providers.

**Why not in Phase 1–2:**
- The FinSight pipeline is 3 sequential calls with clear interfaces between them. LangChain adds an abstraction layer over a system that is already simple enough to understand without abstraction.
- LangChain introduces its own breaking changes and version management overhead. A startup at Phase 1 cannot afford to debug LangChain's abstraction leaks while also debugging its own business logic.
- The pipeline is not complex enough to justify a framework. Three AI calls, cleanly separated into three Python modules, is the right architecture at this scale.

**Entry condition (Phase 3–4):** When the Decision Engine requires dynamic prompt selection based on user segment, or when the system needs to handle branching pipeline logic (e.g., "if this is a restaurant receipt in a business context, add a step to check whether it could be a client entertainment deduction"), LangChain's routing and chain composition become genuinely useful.

## 13.2 LangGraph — Multi-Agent Orchestration

**What it is:** A library for building stateful multi-agent AI systems where different agents handle different subtasks and can call each other based on graph-defined logic.

**Why not in Phase 1–3:**
- FinSight's pipeline is a linear sequence with a branch point (confidence threshold rejection). It is not a multi-agent system.
- Multi-agent architectures add latency through agent coordination overhead. The upload pipeline must complete in under 12 seconds. Multi-agent coordination would make this harder, not easier, to achieve.
- The complexity LangGraph manages (state handoffs between agents, graph traversal, agent memory) does not exist in the current product.

**Entry condition (Phase 4+):** When FinSight evolves to include a conversational financial advisor interface — where a user can ask "why did my health score go down this month?" and the system must route the question to the right analytical agent (anomaly detector, trend analyzer, or insight generator), maintain conversation context, and synthesize a coherent response — LangGraph becomes the right tool. This is a V3 feature.

## 13.3 Vector Database (Semantic Search)

**What it would enable:** Semantic search over receipts and transactions ("find all receipts from my gym" even if the merchant is stored as "Cult.Fit" not "gym"), semantic merchant clustering (grouping merchants that serve the same function even with different names), and embedding-based recommendation for spending patterns similar to other users.

**Why not in Phase 1–3:**
- FinSight's search in Phase 2 is full-text on the `merchant` field using PostgreSQL's `pg_trgm` extension. This covers 90% of search use cases without embedding infrastructure.
- Semantic search on financial data introduces a significant data sensitivity concern: embeddings encode meaning from sensitive transaction data. Storing embeddings in a separate vector database (Pinecone, Weaviate, Qdrant) adds a data security surface that must be evaluated carefully.
- The operational cost of maintaining embedding currency (re-embedding when new transactions arrive) adds background processing burden that Phase 1–3 do not need.

**Entry condition (Phase 4):** When users have 500+ transactions and the `pg_trgm` search returns insufficient recall for merchant name variations (e.g., "Uber" not finding "Uber Technologies Inc"), or when the product introduces a "similar spending profile" comparison feature, embedding infrastructure becomes justified. Initial implementation uses pgvector (PostgreSQL extension) to avoid introducing an entirely separate database for embeddings.

---

# APPENDIX — ENVIRONMENT VARIABLE REGISTRY

## Complete Variable List by Service

```
NEXT.JS (.env.local and Vercel dashboard)
────────────────────────────────────────────────────────
# NEXT_PUBLIC_ (safe in browser bundle — maximum 3 variables)
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key (safe — RLS enforces data isolation)
NEXT_PUBLIC_APP_URL=             # https://finsight.vercel.app (production)

# Server-only (API routes only — never NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=       # NEVER NEXT_PUBLIC_ — ever
FASTAPI_INTERNAL_URL=            # Railway service URL
FASTAPI_SECRET_KEY=              # Shared secret — minimum 32 chars, random

FASTAPI (.env and Railway env vars)
────────────────────────────────────────────────────────
# AI providers
NVIDIA_NIM_API_KEY=              # NVIDIA build.nvidia.com API key
GROQ_API_KEY=                    # console.groq.com API key
GEMINI_API_KEY=                  # Google AI Studio API key

# Supabase (FastAPI's own copy)
SUPABASE_URL=                    # Same value as NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=       # Same value as Next.js copy — separate variable

# Service security
FASTAPI_SECRET_KEY=              # Must match Next.js value exactly
ALLOWED_ORIGINS=                 # Production: https://finsight.vercel.app

# Phase 4 additions
REDIS_URL=                       # Redis connection string (BullMQ queue)
SENTRY_DSN=                      # Error tracking
```

## Secret Exposure Scan Command

Run before every production deployment:

```bash
# Scan Next.js source for any exposed AI secrets
grep -r "NVIDIA_NIM_API_KEY\|GROQ_API_KEY\|GEMINI_API_KEY\|service_role\|AIza" \
  --include="*.ts" --include="*.tsx" src/

# Expected output: ZERO RESULTS
# Any result is a blocking security issue — do not deploy
```

---

# APPENDIX — CLAUDE.md (Builder Agent Context File)

Place at project root exactly as written. Claude Code reads this at every session start.

```markdown
# FinSight — CLAUDE.md

## What This Product Is
FinSight is a Financial Decision Engine, not an expense tracker.
Core pipeline: Receipt upload → NVIDIA NIM OCR → Groq categorization →
Supabase storage → Gemini insights → Decision Engine → UI

## Tech Stack Summary
Frontend:    Next.js 14 App Router + Tailwind + Tremor + shadcn/ui + Framer Motion
BFF:         Next.js API Routes (Vercel)
AI Service:  Python FastAPI (Railway) — orchestrates all 3 AI providers
Database:    Supabase PostgreSQL with RLS
Storage:     Supabase Storage (private bucket)
Auth:        Supabase Auth (email + Google OAuth)

## AI Provider Assignment (Never Swap These)
NVIDIA NIM Llama 3.2 90B Vision → OCR extraction only
Groq Llama 3.3 70B              → Categorization only
Gemini 2.0 Flash                → Insights + Decision narrative

## Security Rules (Never Violate)
1. NVIDIA_NIM_API_KEY lives in FastAPI only — never in any Next.js file
2. GROQ_API_KEY lives in FastAPI only — never in any Next.js file
3. GEMINI_API_KEY lives in FastAPI only — never in any Next.js file
4. SUPABASE_SERVICE_ROLE_KEY is never NEXT_PUBLIC_ and never in src/
5. User ID always comes from session token — never from request body
6. No AI provider is called directly from the browser or Next.js — always through FastAPI

## Route Conventions
/receipts/[id]  — receipt detail (plural, sub-route). There is NO /receipt/[id].

## Intelligence Level Source of Truth
Use useIntelligenceLevel(profile) hook in all UI components.
Derive from profile.total_receipts_uploaded — never from profile.intelligence_level directly.
profile.intelligence_level is for server-side page gating only.

## Decision Engine Rules
- Runs in background (non-blocking) after each upload when intelligence_level >= 3
- Tax estimation: business-flagged transactions only, 30% tax bracket assumption
- Subscription detection: same merchant, same day-of-month ±3 days, same amount ±10%
- Budget leakage: 35%+ above trailing 3-month baseline with >10 days remaining in month
- Gemini generates the narrative only — all computations are deterministic Python

## Commit Convention
feat: / fix: / security: / refactor: / chore:
Commit after every working state. Never commit .env files.
Pre-commit: run the secret scan grep before every push.
```

---

*End of FINSIGHT TECH_STACK.md v2.0.0*
*Supersedes TECH_STACK.md v1.1.0 in all respects.*
*Architecture decisions documented here are binding.*
*PRD authority: PRD_v2.md · UI authority: UI_GENERATOR_SPEC.md v2.0*
