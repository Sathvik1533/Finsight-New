# FINSIGHT — DATABASE_SCHEMA_SQL.md
## Production PostgreSQL Schema (Supabase)
```
Version:        2.0.0
Classification: Internal — Database Architecture
Platform:       Supabase PostgreSQL 15 · Region: ap-south-1 (Mumbai)
Consumes:       TECH_STACK_v2.md · WORKFLOW.md · TASKS.md · PRD_v2.md
Execution:      Supabase SQL Editor — run sections in the numbered order below
```

---

## EXECUTION ORDER (MANDATORY)

Run these sections **in sequence**. Foreign key constraints require it.
Skipping or reordering will produce constraint violations.

```
01. Extensions
02. Core Tables (profiles → receipts → transactions → insights →
                 decision_engine_outputs → conversations)
03. Constraints and CHECK clauses
04. Functions and Triggers
05. Row Level Security — enable + policies
06. Indexes (standard)
07. Phase 2 additions (pg_trgm + search indexes)
08. Phase 4 additions (pgvector + materialized views)
09. Storage bucket policies
10. Verification queries
```

---

# ══════════════════════════════════════════════════════════════════
# 01. EXTENSIONS
# ══════════════════════════════════════════════════════════════════
#
# pg_trgm   → full-text similarity search on merchant names (Phase 2)
# vector    → pgvector for semantic embedding search (Phase 4)
# pg_cron   → scheduled background jobs (Phase 4 materialized view refresh)
#
# All three are enabled now to prevent schema changes that would require
# ALTER TABLE later. Enabling an extension is a no-op if unused.

```sql
-- Enable trigram extension for ILIKE-style fuzzy search
-- Required before idx_transactions_merchant_trgm can be created
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pgvector for semantic search on merchant embeddings (Phase 4)
-- VECTOR column type will be added in Phase 4 migration
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_cron for scheduled materialized view refresh (Phase 4)
-- If not available on your Supabase plan, use an external cron instead
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

# ══════════════════════════════════════════════════════════════════
# 02. CORE TABLES
# ══════════════════════════════════════════════════════════════════

## 2.1 profiles

```sql
-- ─────────────────────────────────────────────────────────────────
-- profiles: extends Supabase auth.users with application-level data.
--
-- DESIGN DECISIONS:
--   id references auth.users(id) ON DELETE CASCADE — deleting from
--   Supabase Auth automatically cascades through all downstream tables.
--
--   intelligence_level is maintained by the increment_receipt_count()
--   SQL function, not by application code. Keeping it in the DB ensures
--   consistency across concurrent uploads and removes a race condition
--   that would exist if it were computed in Python.
--
--   subscription_tier is updated by the Stripe webhook handler (Phase 2).
--   It controls the free-tier gate in the upload route.
--
--   updated_at is kept in sync via the set_updated_at() trigger defined
--   in §04.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                      UUID         NOT NULL,
  full_name               TEXT,
  currency_preference     VARCHAR(3)   NOT NULL DEFAULT 'INR',
  intelligence_level      SMALLINT     NOT NULL DEFAULT 1,
  total_receipts_uploaded INTEGER      NOT NULL DEFAULT 0,
  subscription_tier       VARCHAR(10)  NOT NULL DEFAULT 'free',
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Primary key
  CONSTRAINT profiles_pkey PRIMARY KEY (id),

  -- Foreign key to Supabase Auth — cascade delete removes all user data
  -- when the auth.users row is deleted (GDPR account deletion path)
  CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,

  -- intelligence_level must be 1, 2, 3, or 4 — no other values are valid
  CONSTRAINT profiles_intelligence_level_check
    CHECK (intelligence_level BETWEEN 1 AND 4),

  -- total_receipts_uploaded can only grow — a delete does not decrement it
  -- (level earned = level kept)
  CONSTRAINT profiles_total_receipts_check
    CHECK (total_receipts_uploaded >= 0),

  -- subscription_tier must be one of three known values
  CONSTRAINT profiles_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'pro', 'business')),

  -- currency_preference is a 3-character ISO 4217 code
  CONSTRAINT profiles_currency_check
    CHECK (char_length(currency_preference) = 3)
);

COMMENT ON TABLE public.profiles IS
  'One row per authenticated user. Extends auth.users with app-level state.';
COMMENT ON COLUMN public.profiles.intelligence_level IS
  '1=Bootstrap(0-2), 2=Pattern(3-5), 3=Visual(6-9), 4=Full(10+). Updated atomically by increment_receipt_count().';
COMMENT ON COLUMN public.profiles.total_receipts_uploaded IS
  'Monotonically increasing. Receipt deletion does NOT decrement this. Level earned = level kept.';
COMMENT ON COLUMN public.profiles.subscription_tier IS
  'free|pro|business. Updated by Stripe webhook (Phase 2). Controls upload limits in BFF.';
```

---

## 2.2 receipts

```sql
-- ─────────────────────────────────────────────────────────────────
-- receipts: raw upload metadata + AI pipeline state.
--
-- DESIGN DECISIONS:
--   This table is the pipeline's audit trail. Every processing state
--   is tracked here. Debugging a failed OCR run requires the
--   processing_error and gemini_response columns.
--
--   receipt_id is generated by Next.js (crypto.randomUUID()), NOT by
--   the database default. This is because the ID must be known before
--   the row exists — it is passed to FastAPI as part of the pipeline
--   call body.
--
--   storage_path follows the pattern {user_id}/{receipt_id}/{ts}.{ext}.
--   This structure allows the Supabase Storage RLS policy to enforce
--   per-user isolation using (storage.foldername(name))[1] = auth.uid().
--
--   ai_model_used stores which OCR model processed this receipt.
--   This is critical for debugging quality issues after a model upgrade.
--
--   gemini_response is JSONB containing the full multi-model response:
--   { extraction: {...}, categorization: {...}, processing_time_ms: int }
--   Storing it enables re-processing and quality analysis without
--   re-uploading the original image.
--
--   uploaded_at vs processed_at: uploaded_at is set on INSERT and never
--   changes. processed_at is set by FastAPI when the pipeline completes
--   using datetime.now(timezone.utc).isoformat() — NOT the SQL string
--   "now()" which would store a literal string, not a timestamp.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.receipts (
  id               UUID         NOT NULL,
  user_id          UUID         NOT NULL,
  storage_path     TEXT         NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  raw_ocr_text     TEXT,
  ai_model_used    VARCHAR(50),
  ocr_confidence   NUMERIC(4,3),
  gemini_response  JSONB,

  -- Primary key
  CONSTRAINT receipts_pkey PRIMARY KEY (id),

  -- Foreign key: user must have a profile row
  CONSTRAINT receipts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- status must be one of four known pipeline states
  CONSTRAINT receipts_status_check
    CHECK (status IN ('pending', 'processing', 'complete', 'failed')),

  -- OCR confidence is a probability: 0.000 to 1.000
  CONSTRAINT receipts_ocr_confidence_check
    CHECK (ocr_confidence IS NULL OR ocr_confidence BETWEEN 0.0 AND 1.0),

  -- storage_path must be non-empty — empty path would break signed URL generation
  CONSTRAINT receipts_storage_path_nonempty
    CHECK (char_length(storage_path) > 0)
);

COMMENT ON TABLE public.receipts IS
  'One row per uploaded file. Tracks the full AI pipeline lifecycle from pending to complete/failed.';
COMMENT ON COLUMN public.receipts.status IS
  'pending=uploaded not yet processed, processing=FastAPI running, complete=transaction created, failed=pipeline error';
COMMENT ON COLUMN public.receipts.gemini_response IS
  'Full multi-model JSON: {extraction:{...}, categorization:{...}, processing_time_ms:int}. For debugging only.';
COMMENT ON COLUMN public.receipts.processed_at IS
  'Set by FastAPI using datetime.now(timezone.utc).isoformat(). Never set via SQL NOW() or the string "now()".';
COMMENT ON COLUMN public.receipts.ai_model_used IS
  'e.g. nvidia-llama-3.2-90b (Phase 2+) or gemini-2.0-flash (Phase 1). Tracks which model ran OCR.';
```

---

## 2.3 transactions

```sql
-- ─────────────────────────────────────────────────────────────────
-- transactions: normalized financial records. The canonical data unit.
--
-- DESIGN DECISIONS:
--   receipt_id uses ON DELETE SET NULL — if a receipt is deleted, the
--   transaction record is preserved. Financial history is permanent.
--   The receipt image is gone but the transaction amount/category stays.
--
--   transaction_date is DATE, not TIMESTAMPTZ. Receipts show a calendar
--   date, not a time. Using DATE prevents timezone conversion bugs.
--   The server-side SQL fallback is CURRENT_DATE, not Python datetime.
--
--   amount is NUMERIC(12,2): supports up to ₹9,999,999,999.99. Valid
--   for large business purchases. Not FLOAT — never use float for money.
--
--   confidence is NUMERIC(4,3): three decimal places (0.000–1.000).
--   This is the categorization model's confidence, not the OCR confidence.
--   Both are stored independently: OCR confidence is on receipts table.
--
--   is_manually_corrected: when a user overrides the AI category, this
--   becomes TRUE. The original AI category is preserved in
--   receipts.gemini_response.categorization. Corrections feed the
--   personalized categorization context in Phase 3.
--
--   is_anomalous: set by the anomaly detection module in Phase 2.
--   Requires min 5 prior transactions in the category (cold start guard).
--   Z-score threshold: 2.5 standard deviations above category mean.
--
--   is_subscription: set by the subscription detector in Phase 3.
--   Criteria: same merchant, ±3 days, ±10% amount, across 2+ months.
--
--   user_note: free-text annotation by the user. Not used for AI input.
--
--   merchant_embedding: VECTOR(1536) column added in Phase 4 migration.
--   Populated by text-embedding-3-small via FastAPI async task.
--   Enables semantic search ("gym" → "Cult.Fit").
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.transactions (
  id                    UUID           NOT NULL,
  user_id               UUID           NOT NULL,
  receipt_id            UUID,
  merchant              TEXT,
  amount                NUMERIC(12,2)  NOT NULL,
  currency              VARCHAR(3)     NOT NULL DEFAULT 'INR',
  transaction_date      DATE           NOT NULL,
  category              VARCHAR(60)    NOT NULL,
  subcategory           VARCHAR(60),
  confidence            NUMERIC(4,3),
  categorization_model  VARCHAR(50),
  is_business_expense   BOOLEAN        NOT NULL DEFAULT FALSE,
  is_manually_corrected BOOLEAN        NOT NULL DEFAULT FALSE,
  is_anomalous          BOOLEAN        NOT NULL DEFAULT FALSE,
  is_subscription       BOOLEAN        NOT NULL DEFAULT FALSE,
  user_note             TEXT,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Primary key
  CONSTRAINT transactions_pkey PRIMARY KEY (id),

  -- Foreign key: user must have a profile
  CONSTRAINT transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- receipt_id SET NULL on receipt deletion — transaction record survives
  CONSTRAINT transactions_receipt_id_fkey
    FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL,

  -- amount must be non-negative (refunds handled as positive amounts in V1)
  CONSTRAINT transactions_amount_check
    CHECK (amount >= 0),

  -- confidence is a probability: 0.000 to 1.000
  CONSTRAINT transactions_confidence_check
    CHECK (confidence IS NULL OR confidence BETWEEN 0.0 AND 1.0),

  -- currency is a 3-char ISO 4217 code
  CONSTRAINT transactions_currency_check
    CHECK (char_length(currency) = 3),

  -- category must not be empty — 'Other' is the explicit fallback
  CONSTRAINT transactions_category_nonempty
    CHECK (char_length(category) > 0)
);

COMMENT ON TABLE public.transactions IS
  'One row per receipt (typically). The canonical financial record. Persists even after receipt deletion.';
COMMENT ON COLUMN public.transactions.receipt_id IS
  'SET NULL on receipt deletion — the transaction amount and category outlive the receipt image.';
COMMENT ON COLUMN public.transactions.transaction_date IS
  'DATE type (not TIMESTAMPTZ). Extracted from receipt. CURRENT_DATE used as server-side fallback.';
COMMENT ON COLUMN public.transactions.amount IS
  'NUMERIC(12,2) — never FLOAT for monetary values. Supports up to ₹9,999,999,999.99.';
COMMENT ON COLUMN public.transactions.is_anomalous IS
  'Set by anomaly_detector.py. Z-score > 2.5 above category mean. Requires min 5 prior transactions.';
COMMENT ON COLUMN public.transactions.is_subscription IS
  'Set by subscription_detector.py. Same merchant, ±3 day-of-month, ±10% amount, 2+ months.';
COMMENT ON COLUMN public.transactions.is_manually_corrected IS
  'TRUE after user overrides AI category. Original AI category preserved in receipts.gemini_response.';
COMMENT ON COLUMN public.transactions.categorization_model IS
  'e.g. groq-llama-3.3-70b (Phase 2+) or gemini-2.0-flash (Phase 1). Tracks which model categorized.';
```

---

## 2.4 insights

```sql
-- ─────────────────────────────────────────────────────────────────
-- insights: AI-generated snapshots. Append-only. Never updated.
--
-- DESIGN DECISIONS:
--   A new row is inserted each time insights are regenerated.
--   Previous rows are NEVER deleted or updated. The UI always reads
--   the most recent row (ORDER BY generated_at DESC LIMIT 1).
--   Historical insights are available for trend analysis.
--
--   insight_texts is JSONB storing string[]. AI outputs are flexible
--   in format and should not be broken into separate rows — that would
--   require schema changes for every prompt engineering iteration.
--
--   score_breakdown is JSONB: { consistency, diversification, anomaly, trend }
--   where consistency and diversification are deterministic Python,
--   anomaly and trend involve AI assistance. Storing as JSONB allows
--   the breakdown schema to evolve without migrations.
--
--   recommendations is JSONB (string[]) — added in Phase 3. NULL in
--   Phase 1-2 rows. The UI checks for null before rendering.
--
--   health_score is INTEGER 0-100. Enforced with a CHECK constraint.
--   The CASE expression in the app clamps to this range but the DB
--   constraint is the last line of defense.
--
--   generation_model is stored for future A/B testing between Gemini
--   model versions.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.insights (
  id                UUID        NOT NULL,
  user_id           UUID        NOT NULL,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_range        VARCHAR(10) NOT NULL DEFAULT '30d',
  insight_texts     JSONB       NOT NULL DEFAULT '[]'::JSONB,
  health_score      SMALLINT,
  score_breakdown   JSONB,
  recommendations   JSONB,
  transaction_count INTEGER,
  generation_model  VARCHAR(50),

  -- Primary key
  CONSTRAINT insights_pkey PRIMARY KEY (id),

  -- Foreign key
  CONSTRAINT insights_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- health_score is 0–100 if present
  CONSTRAINT insights_health_score_check
    CHECK (health_score IS NULL OR health_score BETWEEN 0 AND 100),

  -- time_range must be one of two valid values
  CONSTRAINT insights_time_range_check
    CHECK (time_range IN ('30d', '90d')),

  -- transaction_count must be non-negative
  CONSTRAINT insights_transaction_count_check
    CHECK (transaction_count IS NULL OR transaction_count >= 0),

  -- insight_texts must be a JSON array (not object)
  CONSTRAINT insights_texts_is_array
    CHECK (jsonb_typeof(insight_texts) = 'array')
);

COMMENT ON TABLE public.insights IS
  'Append-only AI insight snapshots. Never updated — new row per generation. UI reads latest by generated_at DESC.';
COMMENT ON COLUMN public.insights.insight_texts IS
  'JSONB string array. AI-generated observations starting with specific data points (amount/% not vague claims).';
COMMENT ON COLUMN public.insights.score_breakdown IS
  'JSONB: {consistency:int, diversification:int, anomaly:int, trend:int}. Weights: 30/25/25/20.';
COMMENT ON COLUMN public.insights.recommendations IS
  'NULL in Phase 1-2. JSONB string array added in Phase 3. Always check IS NOT NULL before rendering.';
```

---

## 2.5 decision_engine_outputs

```sql
-- ─────────────────────────────────────────────────────────────────
-- decision_engine_outputs: results from the Decision Engine modules.
--
-- DESIGN DECISIONS:
--   is_current flag: only ONE row per user is ever is_current = TRUE.
--   Before inserting a new row, archive_decision_engine_output() sets
--   all previous rows to is_current = FALSE. This is atomic via the
--   SECURITY DEFINER function called by FastAPI using the service role.
--
--   Previous rows are NEVER deleted. This creates a history of decision
--   outputs that enables: (a) "how have my subscriptions changed?" and
--   (b) debugging why a past estimate was wrong.
--
--   tax_computation_basis is JSONB, not TEXT:
--   { software: num, dining_50pct: num, travel: num, professional: num }
--   This allows the frontend to render a breakdown table without parsing
--   free-text. The disclaimer and data_period are included as string
--   fields within this JSONB object.
--
--   detected_subscriptions is JSONB array:
--   [{ merchant, amount, frequency, occurrences, last_date, annual_cost }]
--
--   leakage_signals is JSONB array:
--   [{ category, current_month_pace, trailing_baseline, delta_pct, severity, days_remaining }]
--
--   high_risk_categories is TEXT[] (not JSONB) — it is a simple string
--   array used for quick filtering and badge rendering. TEXT[] is more
--   appropriate than JSONB for arrays of primitive strings.
--
--   decision_narrative is plain TEXT. It is Gemini-generated prose
--   (< 100 words). It is displayed as-is in the UI. No parsing required.
--
--   All numeric columns use NUMERIC(12,2) for INR amounts.
--   NEVER use FLOAT for monetary values.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.decision_engine_outputs (
  id                         UUID          NOT NULL,
  user_id                    UUID          NOT NULL,
  computed_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  time_range                 VARCHAR(10)   NOT NULL DEFAULT '90d',

  -- ── Tax Estimation Module ────────────────────────────────────────
  -- NULL when user has no business-flagged transactions
  estimated_tax_liability    NUMERIC(12,2),
  tax_deductible_total       NUMERIC(12,2),
  -- JSONB: { software, dining_50pct, travel, professional, disclaimer, data_period }
  tax_computation_basis      JSONB,

  -- ── Subscription Detection Module ───────────────────────────────
  -- NULL when no subscriptions detected
  detected_subscriptions     JSONB,
  subscription_monthly_total NUMERIC(12,2),

  -- ── Budget Leakage Module ────────────────────────────────────────
  -- NULL when no categories exceed the 35% baseline threshold
  leakage_signals            JSONB,
  -- TEXT[] for fast UI rendering — avoids JSONB parsing for simple list
  high_risk_categories       TEXT[],

  -- ── Gemini Narrative ────────────────────────────────────────────
  -- < 100 words. References specific INR amounts. Includes CA disclaimer.
  decision_narrative         TEXT,

  -- ── Lifecycle ───────────────────────────────────────────────────
  -- Only one row per user is TRUE. archive_decision_engine_output()
  -- sets previous rows to FALSE before a new row is inserted.
  is_current                 BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Primary key
  CONSTRAINT decision_engine_outputs_pkey PRIMARY KEY (id),

  -- Foreign key
  CONSTRAINT decision_engine_outputs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- time_range validation
  CONSTRAINT decision_outputs_time_range_check
    CHECK (time_range IN ('30d', '90d')),

  -- tax amounts must be non-negative when present
  CONSTRAINT decision_outputs_tax_liability_check
    CHECK (estimated_tax_liability IS NULL OR estimated_tax_liability >= 0),
  CONSTRAINT decision_outputs_deductible_check
    CHECK (tax_deductible_total IS NULL OR tax_deductible_total >= 0),
  CONSTRAINT decision_outputs_subscription_total_check
    CHECK (subscription_monthly_total IS NULL OR subscription_monthly_total >= 0),

  -- detected_subscriptions must be a JSON array when present
  CONSTRAINT decision_outputs_subscriptions_is_array
    CHECK (detected_subscriptions IS NULL OR jsonb_typeof(detected_subscriptions) = 'array'),

  -- leakage_signals must be a JSON array when present
  CONSTRAINT decision_outputs_leakage_is_array
    CHECK (leakage_signals IS NULL OR jsonb_typeof(leakage_signals) = 'array')
);

COMMENT ON TABLE public.decision_engine_outputs IS
  'Decision Engine results. Append-only. is_current=TRUE marks the active row. One active row per user max.';
COMMENT ON COLUMN public.decision_engine_outputs.is_current IS
  'Only one TRUE row per user at any time. archive_decision_engine_output() flips previous rows to FALSE.';
COMMENT ON COLUMN public.decision_engine_outputs.tax_computation_basis IS
  'JSONB breakdown: {software:₹N, dining_50pct:₹N, travel:₹N, professional:₹N, disclaimer:str, data_period:str}';
COMMENT ON COLUMN public.decision_engine_outputs.detected_subscriptions IS
  'JSONB array: [{merchant, amount, frequency, occurrences, last_date, annual_cost}]. NULL if none detected.';
COMMENT ON COLUMN public.decision_engine_outputs.leakage_signals IS
  'JSONB array: [{category, current_month_pace, trailing_baseline, delta_pct, severity, days_remaining}]';
COMMENT ON COLUMN public.decision_engine_outputs.high_risk_categories IS
  'TEXT[] of category names where severity=HIGH. Used for fast UI badge rendering without JSONB parsing.';
```

---

## 2.6 conversations (Phase 5)

```sql
-- ─────────────────────────────────────────────────────────────────
-- conversations: LangGraph agent conversation threads.
--
-- DESIGN DECISIONS:
--   Created now to avoid a schema migration when Phase 5 begins.
--   The table is empty until the LangGraph agent (P5-BE-001) is live.
--
--   thread_id is application-generated (UUID string). A user can have
--   multiple conversation threads (one per session, or one per topic).
--   The UI stores thread_id in the URL param for persistence.
--
--   messages is JSONB array of LangGraph message objects:
--   [{ role: 'user'|'assistant', content: str, timestamp: ISO8601 }]
--   Stored as a single JSONB column because LangGraph's checkpointer
--   serializes the full state. Keeping as JSONB avoids building a
--   custom deserialization layer.
--
--   MAX_MESSAGES: the application trims messages to the last 20 turns
--   before persisting. This prevents unbounded growth. The DB does not
--   enforce this — the constraint lives in the application.
--
--   updated_at is kept current by the set_updated_at() trigger so
--   "most recent conversation" queries use this column.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id         UUID        NOT NULL,
  user_id    UUID        NOT NULL,
  thread_id  TEXT        NOT NULL,
  messages   JSONB       NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Primary key
  CONSTRAINT conversations_pkey PRIMARY KEY (id),

  -- Foreign key
  CONSTRAINT conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- thread_id must be non-empty
  CONSTRAINT conversations_thread_id_nonempty
    CHECK (char_length(thread_id) > 0),

  -- messages must be a JSON array
  CONSTRAINT conversations_messages_is_array
    CHECK (jsonb_typeof(messages) = 'array'),

  -- unique thread per user (one conversation thread per thread_id per user)
  CONSTRAINT conversations_user_thread_unique
    UNIQUE (user_id, thread_id)
);

COMMENT ON TABLE public.conversations IS
  'LangGraph agent conversation threads (Phase 5). Empty until P5-BE-001 is deployed.';
COMMENT ON COLUMN public.conversations.thread_id IS
  'Application-generated UUID string. Stored in URL param for cross-session persistence.';
COMMENT ON COLUMN public.conversations.messages IS
  'JSONB array of LangGraph messages: [{role:user|assistant, content:str, timestamp:ISO8601}]. Max 20 turns in app.';
```

---

# ══════════════════════════════════════════════════════════════════
# 03. STORAGE DESIGN (Supabase Storage — not a DB table)
# ══════════════════════════════════════════════════════════════════
#
# This is a design reference, not executable SQL.
# Execute these in the Supabase Storage dashboard.

```sql
-- ─────────────────────────────────────────────────────────────────
-- BUCKET: receipts (private)
--
-- Path structure: {user_id}/{receipt_id}/{unix_timestamp}.{ext}
--
-- The user_id as the FIRST path component is intentional:
-- (storage.foldername(name))[1] extracts the first path segment,
-- allowing the RLS policy below to enforce per-user isolation
-- without a JOIN to the profiles table.
--
-- Signed URLs: 1-hour expiry, generated server-side in Next.js API
-- routes only. Never generated in browser code or FastAPI.
-- ─────────────────────────────────────────────────────────────────

-- Create bucket via dashboard: name='receipts', public=false

-- Storage RLS policies (run in Supabase SQL editor):
CREATE POLICY "storage_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

# ══════════════════════════════════════════════════════════════════
# 04. FUNCTIONS AND TRIGGERS
# ══════════════════════════════════════════════════════════════════

## 4.1 handle_new_user — auto-creates profile on signup

```sql
-- ─────────────────────────────────────────────────────────────────
-- Fires AFTER INSERT on auth.users.
-- Creates the corresponding public.profiles row.
--
-- SECURITY DEFINER: runs as the function owner (postgres), not the
-- calling role. Required because auth.users is in the auth schema
-- which is not directly accessible to the anon/authenticated roles.
--
-- raw_user_meta_data: populated by Supabase Auth from the OAuth
-- provider or from the options.data object in supabase.auth.signUp().
-- Google OAuth sets full_name; email signup sets it from the form.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    currency_preference,
    intelligence_level,
    total_receipts_uploaded,
    subscription_tier
  )
  VALUES (
    NEW.id,
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    'INR',
    1,
    0,
    'free'
  )
  -- ON CONFLICT handles edge cases where a profile row already exists
  -- (e.g., user was created via admin API before OAuth signup)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger: fires after every new row in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auto-creates public.profiles row when a user signs up. SECURITY DEFINER. Handles both email and OAuth flows.';
```

---

## 4.2 increment_receipt_count — atomic count + level update

```sql
-- ─────────────────────────────────────────────────────────────────
-- Called by FastAPI via Supabase RPC after every successful receipt
-- processing pipeline.
--
-- ATOMIC: both the count increment and the level recalculation
-- happen in a single UPDATE statement. There is no window where
-- total_receipts_uploaded and intelligence_level can be inconsistent.
--
-- LEVEL THRESHOLDS (from PRD_v2.md §5):
--   1 = 0–2 receipts  (Bootstrap)
--   2 = 3–5 receipts  (Pattern Emergence)
--   3 = 6–9 receipts  (Visual Intelligence)
--   4 = 10+ receipts  (Full Intelligence)
--
-- The CASE expression uses (total_receipts_uploaded + 1) — the NEW
-- value AFTER incrementing — to compute the correct level.
--
-- RETURNS: the new intelligence_level so FastAPI can detect level
-- changes and trigger the Decision Engine or unlock notification.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_receipt_count(
  user_id_param UUID
)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_level SMALLINT;
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
  WHERE id = user_id_param
  RETURNING intelligence_level INTO new_level;

  -- If the user_id does not exist, new_level will be NULL.
  -- This should never happen in production (profile is created on signup)
  -- but the caller should handle a NULL return defensively.
  RETURN new_level;
END;
$$;

COMMENT ON FUNCTION public.increment_receipt_count(UUID) IS
  'Atomically increments total_receipts_uploaded and recalculates intelligence_level. Returns new level.';
```

---

## 4.3 archive_decision_engine_output — single active row per user

```sql
-- ─────────────────────────────────────────────────────────────────
-- Called by FastAPI via Supabase RPC immediately before inserting
-- a new decision_engine_outputs row.
--
-- Ensures the is_current=TRUE invariant: only one row per user
-- can be is_current=TRUE at any time.
--
-- WHY NOT A UNIQUE PARTIAL INDEX?
--   A UNIQUE partial index on (user_id) WHERE is_current=TRUE would
--   enforce uniqueness at the DB level, but it would REJECT the insert
--   instead of archiving the previous row. The archive-first approach
--   is deliberate: we want the history preserved, not rejected.
--
-- IDEMPOTENT: calling this function multiple times for the same user
-- is safe. All rows are already FALSE after the first call.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_decision_engine_output(
  user_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.decision_engine_outputs
  SET is_current = FALSE
  WHERE user_id = user_id_param
    AND is_current = TRUE;
END;
$$;

COMMENT ON FUNCTION public.archive_decision_engine_output(UUID) IS
  'Sets all is_current=TRUE rows to FALSE for a user. Must be called before inserting a new DE output row.';
```

---

## 4.4 get_category_stats — anomaly detection baseline

```sql
-- ─────────────────────────────────────────────────────────────────
-- Used by anomaly_detector.py to compute the Z-score baseline for
-- a given user + category combination.
--
-- Returns mean, stddev, and count for the specified time window.
-- The caller (Python) is responsible for:
--   1. Checking count >= 5 (cold start guard) before flagging
--   2. Computing Z-score: (new_amount - mean) / stddev
--   3. Flagging if Z-score > 2.5
--
-- Returning a single row with 3 fields is more efficient than
-- fetching all transactions into Python and computing there.
--
-- COALESCE(stddev, 0): STDDEV_POP returns NULL when count = 1.
-- A zero stddev means any non-zero deviation is effectively infinite
-- Z-score — the cold start guard in Python prevents false positives.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_category_stats(
  user_id_param  UUID,
  category_param TEXT,
  days_param     INTEGER DEFAULT 30
)
RETURNS TABLE (
  mean    NUMERIC,
  stddev  NUMERIC,
  cnt     BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    AVG(amount)                                        AS mean,
    COALESCE(STDDEV_POP(amount), 0)                    AS stddev,
    COUNT(*)                                           AS cnt
  FROM public.transactions
  WHERE user_id        = user_id_param
    AND category       = category_param
    AND transaction_date >= CURRENT_DATE - days_param
    AND is_manually_corrected = FALSE;  -- exclude corrections from baseline
$$;

COMMENT ON FUNCTION public.get_category_stats(UUID, TEXT, INTEGER) IS
  'Returns mean/stddev/count for anomaly detection baseline. Called by FastAPI anomaly_detector.py.';
```

---

## 4.5 set_updated_at — auto-maintain updated_at timestamps

```sql
-- ─────────────────────────────────────────────────────────────────
-- Generic trigger function: sets updated_at = NOW() on any UPDATE.
-- Attached to profiles and conversations tables.
--
-- NOT needed for receipts (updated_at is not tracked — use uploaded_at/processed_at)
-- NOT needed for transactions (immutable records — corrections create new version context)
-- NOT needed for insights / decision_engine_outputs (append-only, no updates)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Attach to profiles
CREATE OR REPLACE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Attach to conversations
CREATE OR REPLACE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON FUNCTION public.set_updated_at() IS
  'Generic trigger: sets updated_at=NOW() before any UPDATE. Attached to profiles and conversations.';
```

---

# ══════════════════════════════════════════════════════════════════
# 05. ROW LEVEL SECURITY
# ══════════════════════════════════════════════════════════════════
#
# CRITICAL: RLS is the PRIMARY data isolation mechanism.
# No application-layer filtering substitutes for it.
#
# RULE: Bare USING() applies only to SELECT.
# Every operation (SELECT, INSERT, UPDATE, DELETE) must be
# covered with the correct clause. This was a known bug in v1.1.
#
# FastAPI writes to insights, decision_engine_outputs, and transactions
# using the SERVICE ROLE KEY which BYPASSES RLS entirely.
# This is intentional and secure: FastAPI is a trusted internal service
# running on Railway. The service role key never touches Next.js.

```sql
-- ── Enable RLS on all tables ──────────────────────────────────────
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_engine_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations           ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ─────────────────────────────────────────────────────
-- Client (anon key + session) can SELECT, INSERT, and UPDATE own row.
-- DELETE is not needed: cascade from auth.users handles deletion.
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── RECEIPTS ─────────────────────────────────────────────────────
-- Client can perform all CRUD on own receipts.
-- The delete flow removes storage object FIRST, then the receipt row.
CREATE POLICY "receipts_select_own" ON public.receipts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "receipts_insert_own" ON public.receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "receipts_update_own" ON public.receipts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "receipts_delete_own" ON public.receipts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── TRANSACTIONS ──────────────────────────────────────────────────
-- Client can SELECT, UPDATE (category correction in Phase 2), DELETE.
-- FastAPI INSERTS via service role key (bypasses RLS).
-- Client does not INSERT transactions directly — never via the browser.
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── INSIGHTS ─────────────────────────────────────────────────────
-- Client can only SELECT.
-- FastAPI INSERTs via service role key (bypasses RLS).
-- No client-side write path exists for insights.
CREATE POLICY "insights_select_own" ON public.insights
  FOR SELECT
  USING (auth.uid() = user_id);

-- ── DECISION ENGINE OUTPUTS ───────────────────────────────────────
-- Client can only SELECT.
-- FastAPI INSERTs and UPDATEs via service role key (bypasses RLS).
-- archive_decision_engine_output() runs as SECURITY DEFINER (postgres role).
CREATE POLICY "decision_outputs_select_own" ON public.decision_engine_outputs
  FOR SELECT
  USING (auth.uid() = user_id);

-- ── CONVERSATIONS ─────────────────────────────────────────────────
-- Client can SELECT, INSERT, and UPDATE own conversation threads.
-- FastAPI may also write via service role key for LangGraph checkpointer.
CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

# ══════════════════════════════════════════════════════════════════
# 06. INDEXES — PHASE 1 (STANDARD)
# ══════════════════════════════════════════════════════════════════
#
# INDEX STRATEGY:
#   - Composite indexes are ordered: most-selective column first
#   - Partial indexes target sparse boolean flags (anomaly, subscription)
#   - TIMESTAMPTZ/DATE columns use DESC to support ORDER BY ... DESC queries
#   - JSONB columns are not indexed in Phase 1 — Phase 4 adds GIN on specific keys

```sql
-- ── PROFILES ─────────────────────────────────────────────────────
-- subscription_tier is used in the free-tier gate check on every upload
CREATE INDEX idx_profiles_subscription_tier
  ON public.profiles(subscription_tier);

-- ── RECEIPTS ─────────────────────────────────────────────────────
-- Every receipt query filters by user_id
CREATE INDEX idx_receipts_user_id
  ON public.receipts(user_id);

-- Dashboard "recent receipts" and pagination
CREATE INDEX idx_receipts_user_uploaded
  ON public.receipts(user_id, uploaded_at DESC);

-- Pipeline recovery: find stuck "processing" receipts older than 5 minutes
CREATE INDEX idx_receipts_user_status
  ON public.receipts(user_id, status);

-- ── TRANSACTIONS ─────────────────────────────────────────────────
-- Primary analytics query: all transactions for a user sorted by date
-- Used by: dashboard summary, insights generation, DE data fetch
CREATE INDEX idx_transactions_user_date
  ON public.transactions(user_id, transaction_date DESC);

-- Category-level analytics: spending by category per user
-- Used by: SpendingDonut chart, CategoryBarChart, leakage detection baseline
CREATE INDEX idx_transactions_user_category
  ON public.transactions(user_id, category);

-- Compound: user + category + date — covers anomaly detection query
-- (user + category + recent window) without index scan + filter
CREATE INDEX idx_transactions_user_category_date
  ON public.transactions(user_id, category, transaction_date DESC);

-- Partial index: subscription-flagged rows only
-- Only a small fraction of rows are subscriptions — full index is wasteful
CREATE INDEX idx_transactions_subscription_flag
  ON public.transactions(user_id, is_subscription)
  WHERE is_subscription = TRUE;

-- Partial index: anomaly-flagged rows only
-- Same reasoning — anomalous rows are a small minority
CREATE INDEX idx_transactions_anomaly_flag
  ON public.transactions(user_id, is_anomalous)
  WHERE is_anomalous = TRUE;

-- Business expense filter: used by tax estimator to filter quickly
CREATE INDEX idx_transactions_business_expense
  ON public.transactions(user_id, is_business_expense)
  WHERE is_business_expense = TRUE;

-- receipt_id lookup: used when deleting a receipt to find its transaction
CREATE INDEX idx_transactions_receipt_id
  ON public.transactions(receipt_id)
  WHERE receipt_id IS NOT NULL;

-- ── INSIGHTS ─────────────────────────────────────────────────────
-- "Latest insight" query: SELECT ... ORDER BY generated_at DESC LIMIT 1
CREATE INDEX idx_insights_user_generated
  ON public.insights(user_id, generated_at DESC);

-- ── DECISION ENGINE OUTPUTS ───────────────────────────────────────
-- The only query pattern: find the current row for a user
-- is_current = TRUE partial index: tiny, maximally fast
CREATE INDEX idx_decision_outputs_user_current
  ON public.decision_engine_outputs(user_id, is_current)
  WHERE is_current = TRUE;

-- ── CONVERSATIONS ─────────────────────────────────────────────────
-- Look up a specific thread for a user
CREATE INDEX idx_conversations_user_thread
  ON public.conversations(user_id, thread_id);

-- Most recent conversations per user
CREATE INDEX idx_conversations_user_updated
  ON public.conversations(user_id, updated_at DESC);
```

---

# ══════════════════════════════════════════════════════════════════
# 07. PHASE 2 ADDITIONS — SEARCH AND PATTERN DETECTION
# ══════════════════════════════════════════════════════════════════
#
# Execute after Phase 1 is live and pg_trgm extension is confirmed active.
# Gate: ≥ 200 active users with Level 2+ data (per TASKS.md P2-BE-001).

```sql
-- ── Merchant full-text search (pg_trgm GIN index) ─────────────────
-- Enables: WHERE merchant ILIKE '%swiggy%' using the GIN index
-- instead of a sequential scan. Required for the receipts search bar.
-- pg_trgm extension must be enabled before this index can be created.
CREATE INDEX idx_transactions_merchant_trgm
  ON public.transactions
  USING GIN (merchant gin_trgm_ops);

-- ── User merchant corrections view ───────────────────────────────
-- Used by the personalized categorization context in Phase 3.
-- This view returns the top corrected merchant→category mappings
-- for a given user, ordered by correction frequency.
-- FastAPI calls get_user_merchant_context() which queries this.
CREATE OR REPLACE VIEW public.user_merchant_corrections AS
SELECT
  user_id,
  merchant,
  category,
  COUNT(*) AS correction_count
FROM public.transactions
WHERE is_manually_corrected = TRUE
  AND merchant IS NOT NULL
  AND char_length(merchant) > 0
GROUP BY user_id, merchant, category
ORDER BY user_id, correction_count DESC;

COMMENT ON VIEW public.user_merchant_corrections IS
  'Top manual category corrections per user. Used by personalized categorization context (Phase 3).';
```

---

# ══════════════════════════════════════════════════════════════════
# 08. PHASE 4 ADDITIONS — SCALE AND VECTOR INTELLIGENCE
# ══════════════════════════════════════════════════════════════════
#
# Execute ONLY when:
#   - Phase 3 is complete AND
#   - ≥ 1,000 active users AND
#   - Dashboard summary query exceeds 200ms at p95
#
# pgvector column and index: execute when P4-BE-002 is started.

```sql
-- ── pgvector: merchant semantic embeddings ────────────────────────
-- Adds a 1536-dimension vector column for OpenAI text-embedding-3-small.
-- NULL initially — populated by FastAPI async task after each transaction.
-- Enables: WHERE merchant_embedding <=> query_embedding (cosine similarity)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS merchant_embedding VECTOR(1536);

-- IVFFlat index for approximate nearest neighbor search
-- lists=100: tune based on total rows (rule: sqrt(total_rows))
-- IMPORTANT: build this index AFTER populating embeddings for existing rows,
-- not before. An empty index provides no benefit.
CREATE INDEX idx_transactions_merchant_vector
  ON public.transactions
  USING ivfflat (merchant_embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON COLUMN public.transactions.merchant_embedding IS
  'OpenAI text-embedding-3-small (1536-dim). Populated async by FastAPI after each transaction. NULL until populated.';

-- ── Materialized view: category totals by user and period ─────────
-- Pre-aggregates the most expensive dashboard query.
-- CONCURRENTLY refresh does not block reads — critical for production.
-- Refreshed every 6 hours via pg_cron (or external scheduler).
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_user_category_totals AS
SELECT
  user_id,
  category,
  DATE_TRUNC('month', transaction_date)  AS period,
  SUM(amount)                             AS total_spend,
  COUNT(*)                                AS transaction_count,
  AVG(amount)                             AS avg_transaction
FROM public.transactions
WHERE (is_manually_corrected = FALSE OR is_manually_corrected IS NULL)
  AND amount > 0   -- exclude zero-amount fallback transactions from totals
GROUP BY
  user_id,
  category,
  DATE_TRUNC('month', transaction_date);

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_category_totals_unique
  ON public.mv_user_category_totals(user_id, category, period);

-- Additional index for querying by user + period
CREATE INDEX IF NOT EXISTS idx_mv_category_totals_user_period
  ON public.mv_user_category_totals(user_id, period DESC);

-- Schedule refresh (uncomment when pg_cron is confirmed available):
-- SELECT cron.schedule(
--   'refresh-category-totals',
--   '0 */6 * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_category_totals'
-- );

COMMENT ON MATERIALIZED VIEW public.mv_user_category_totals IS
  'Pre-aggregated category totals. REFRESH CONCURRENTLY every 6 hours. Used by GET /api/dashboard/summary.';

-- ── GIN index on JSONB for Decision Engine query patterns ─────────
-- Enables fast containment queries like:
-- WHERE detected_subscriptions @> '[{"merchant": "Netflix"}]'
CREATE INDEX IF NOT EXISTS idx_decision_outputs_subscriptions_gin
  ON public.decision_engine_outputs
  USING GIN (detected_subscriptions jsonb_path_ops)
  WHERE detected_subscriptions IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_decision_outputs_leakage_gin
  ON public.decision_engine_outputs
  USING GIN (leakage_signals jsonb_path_ops)
  WHERE leakage_signals IS NOT NULL;
```

---

# ══════════════════════════════════════════════════════════════════
# 09. VERIFICATION QUERIES
# ══════════════════════════════════════════════════════════════════
#
# Run after executing sections 01–08 to confirm everything is correct.
# Every query should return the expected result before going to production.

```sql
-- ── 1. RLS enabled on all tables ─────────────────────────────────
-- Expected: 6 rows, all with rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ── 2. RLS policies exist for all tables ─────────────────────────
-- Expected: at least 14 policies across all 6 tables
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- ── 3. All indexes exist ──────────────────────────────────────────
-- Expected: ≥ 15 indexes in Phase 1 (more in Phase 2/4)
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ── 4. All functions exist ────────────────────────────────────────
-- Expected: handle_new_user, increment_receipt_count,
--           archive_decision_engine_output, get_category_stats, set_updated_at
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- ── 5. handle_new_user trigger is active ─────────────────────────
-- Expected: 1 row with event_manipulation = INSERT
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ── 6. Test increment_receipt_count atomicity ─────────────────────
-- Replace with a real test user UUID before running
-- Expected: intelligence_level = 2 after 3rd call
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  returned_level SMALLINT;
BEGIN
  -- Create a minimal profile for testing
  INSERT INTO public.profiles (id, intelligence_level, total_receipts_uploaded)
  VALUES (test_user_id, 1, 0);

  -- Simulate 3 receipt uploads
  PERFORM public.increment_receipt_count(test_user_id);
  PERFORM public.increment_receipt_count(test_user_id);
  SELECT public.increment_receipt_count(test_user_id) INTO returned_level;

  -- Verify level = 2 after 3 receipts
  ASSERT returned_level = 2,
    FORMAT('Expected level 2 after 3 receipts, got %s', returned_level);

  -- Clean up
  DELETE FROM public.profiles WHERE id = test_user_id;

  RAISE NOTICE 'increment_receipt_count test PASSED';
END;
$$;

-- ── 7. Test archive_decision_engine_output idempotency ───────────
-- Expected: only 1 is_current=TRUE row after archiving + inserting
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.profiles (id) VALUES (test_user_id);

  -- Insert 2 "current" rows
  INSERT INTO public.decision_engine_outputs (id, user_id, is_current)
  VALUES (gen_random_uuid(), test_user_id, TRUE),
         (gen_random_uuid(), test_user_id, TRUE);

  -- Archive all
  PERFORM public.archive_decision_engine_output(test_user_id);

  -- Verify zero current rows after archiving
  ASSERT (
    SELECT COUNT(*) FROM public.decision_engine_outputs
    WHERE user_id = test_user_id AND is_current = TRUE
  ) = 0, 'Expected 0 current rows after archive';

  -- Insert a new current row
  INSERT INTO public.decision_engine_outputs (id, user_id, is_current)
  VALUES (gen_random_uuid(), test_user_id, TRUE);

  -- Verify exactly 1 current row
  ASSERT (
    SELECT COUNT(*) FROM public.decision_engine_outputs
    WHERE user_id = test_user_id AND is_current = TRUE
  ) = 1, 'Expected exactly 1 current row';

  DELETE FROM public.profiles WHERE id = test_user_id;
  RAISE NOTICE 'archive_decision_engine_output test PASSED';
END;
$$;

-- ── 8. CHECK constraints are active ──────────────────────────────
-- Each of these should raise an error — run individually and expect failure:

-- Should fail: intelligence_level = 5 is invalid
-- INSERT INTO public.profiles (id, intelligence_level)
--   VALUES ('00000000-0000-0000-0000-000000000001', 5);

-- Should fail: amount cannot be negative
-- INSERT INTO public.transactions (id, user_id, amount, transaction_date, category)
--   VALUES (gen_random_uuid(), gen_random_uuid(), -100.00, CURRENT_DATE, 'Other');

-- Should fail: health_score = 150 is out of range
-- INSERT INTO public.insights (id, user_id, health_score)
--   VALUES (gen_random_uuid(), gen_random_uuid(), 150);

-- ── 9. Extensions are active ─────────────────────────────────────
-- Expected: 3 rows for pg_trgm, vector, pg_cron
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_trgm', 'vector', 'pg_cron')
ORDER BY extname;

-- ── 10. Storage bucket exists and is private ─────────────────────
-- Run in Supabase dashboard → Storage → Buckets
-- Expected: 'receipts' bucket with public = false
SELECT name, public
FROM storage.buckets
WHERE name = 'receipts';
```

---

# ══════════════════════════════════════════════════════════════════
# APPENDIX A — COLUMN REFERENCE QUICK LOOKUP
# ══════════════════════════════════════════════════════════════════

```
TABLE: profiles
  id                      UUID        PK, FK → auth.users(id) CASCADE
  full_name               TEXT        NULL allowed (Google OAuth may not provide)
  currency_preference     VARCHAR(3)  CHECK len=3, DEFAULT 'INR'
  intelligence_level      SMALLINT    CHECK 1–4, DEFAULT 1
  total_receipts_uploaded INTEGER     CHECK >= 0, DEFAULT 0
  subscription_tier       VARCHAR(10) CHECK IN ('free','pro','business'), DEFAULT 'free'
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW() (trigger-maintained)

TABLE: receipts
  id               UUID        PK (Next.js-generated, not DB default)
  user_id          UUID        FK → profiles(id) CASCADE
  storage_path     TEXT        NOT NULL, CHECK len > 0
  status           VARCHAR(20) CHECK IN ('pending','processing','complete','failed')
  processing_error TEXT        NULL — populated only on failure
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  processed_at     TIMESTAMPTZ NULL — set by FastAPI, not SQL NOW()
  raw_ocr_text     TEXT        NULL — merchant name for quick display
  ai_model_used    VARCHAR(50) NULL — 'nvidia-llama-3.2-90b' or 'gemini-2.0-flash'
  ocr_confidence   NUMERIC(4,3) NULL CHECK 0.0–1.0 — from NVIDIA NIM response
  gemini_response  JSONB       NULL — full multi-model response for debugging

TABLE: transactions
  id                    UUID           PK
  user_id               UUID           FK → profiles(id) CASCADE
  receipt_id            UUID           FK → receipts(id) SET NULL
  merchant              TEXT           NULL (handwritten receipts may not yield merchant)
  amount                NUMERIC(12,2)  NOT NULL CHECK >= 0
  currency              VARCHAR(3)     NOT NULL CHECK len=3, DEFAULT 'INR'
  transaction_date      DATE           NOT NULL (server CURRENT_DATE fallback)
  category              VARCHAR(60)    NOT NULL CHECK len > 0
  subcategory           VARCHAR(60)    NULL
  confidence            NUMERIC(4,3)   NULL CHECK 0.0–1.0 — categorization confidence
  categorization_model  VARCHAR(50)    NULL — 'groq-llama-3.3-70b' or 'gemini-2.0-flash'
  is_business_expense   BOOLEAN        NOT NULL DEFAULT FALSE
  is_manually_corrected BOOLEAN        NOT NULL DEFAULT FALSE
  is_anomalous          BOOLEAN        NOT NULL DEFAULT FALSE (Phase 2 Z-score detection)
  is_subscription       BOOLEAN        NOT NULL DEFAULT FALSE (Phase 3 pattern detection)
  user_note             TEXT           NULL
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
  merchant_embedding    VECTOR(1536)   NULL (Phase 4 — added via ALTER TABLE)

TABLE: insights
  id                UUID        PK
  user_id           UUID        FK → profiles(id) CASCADE
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  time_range        VARCHAR(10) CHECK IN ('30d','90d'), DEFAULT '30d'
  insight_texts     JSONB       NOT NULL DEFAULT '[]', CHECK jsonb_typeof = 'array'
  health_score      SMALLINT    NULL CHECK 0–100
  score_breakdown   JSONB       NULL — {consistency,diversification,anomaly,trend}
  recommendations   JSONB       NULL — string[] (Phase 3)
  transaction_count INTEGER     NULL CHECK >= 0
  generation_model  VARCHAR(50) NULL — 'gemini-2.0-flash'

TABLE: decision_engine_outputs
  id                         UUID          PK
  user_id                    UUID          FK → profiles(id) CASCADE
  computed_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  time_range                 VARCHAR(10)   CHECK IN ('30d','90d'), DEFAULT '90d'
  estimated_tax_liability    NUMERIC(12,2) NULL CHECK >= 0
  tax_deductible_total       NUMERIC(12,2) NULL CHECK >= 0
  tax_computation_basis      JSONB         NULL — breakdown + disclaimer + data_period
  detected_subscriptions     JSONB         NULL — [{merchant,amount,frequency,...}]
  subscription_monthly_total NUMERIC(12,2) NULL CHECK >= 0
  leakage_signals            JSONB         NULL — [{category,pace,baseline,delta,...}]
  high_risk_categories       TEXT[]        NULL — category names at HIGH severity
  decision_narrative         TEXT          NULL — < 100 words, Gemini-generated
  is_current                 BOOLEAN       NOT NULL DEFAULT TRUE

TABLE: conversations (Phase 5)
  id         UUID        PK
  user_id    UUID        FK → profiles(id) CASCADE
  thread_id  TEXT        NOT NULL CHECK len > 0, UNIQUE with user_id
  messages   JSONB       NOT NULL DEFAULT '[]', CHECK jsonb_typeof = 'array'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() (trigger-maintained)
```

---

# ══════════════════════════════════════════════════════════════════
# APPENDIX B — RLS MATRIX
# ══════════════════════════════════════════════════════════════════

```
                    SELECT   INSERT   UPDATE   DELETE   NOTES
─────────────────────────────────────────────────────────────────────
profiles            ✅ own    ✅ own    ✅ own    ─        CASCADE handles delete
receipts            ✅ own    ✅ own    ✅ own    ✅ own
transactions        ✅ own    ✅ own    ✅ own    ✅ own
insights            ✅ own    ─         ─         ─        FastAPI writes via service role
decision_outputs    ✅ own    ─         ─         ─        FastAPI writes via service role
conversations       ✅ own    ✅ own    ✅ own    ─        LangGraph may use service role

─ = No client-side policy needed for this operation
✅ own = Policy exists: auth.uid() = user_id (or id for profiles)

SERVICE ROLE KEY bypasses ALL RLS policies.
Used by: FastAPI for INSERT/UPDATE on all tables.
Never accessible from: browser code, Next.js src/ files, client-side JS.
```

---

# ══════════════════════════════════════════════════════════════════
# APPENDIX C — PHASE MIGRATION SUMMARY
# ══════════════════════════════════════════════════════════════════

```
PHASE 1 (Run now — all of sections 01–06 + 09):
  ✅ All 6 tables created
  ✅ All functions and triggers
  ✅ Full RLS on all tables
  ✅ Phase 1 standard indexes
  ✅ Storage bucket + RLS policies

PHASE 2 (Run after P2-BE-001 gate condition met):
  ✅ Section 07: GIN trgm index on merchant
  ✅ Section 07: user_merchant_corrections view
  NOTE: transactions.is_anomalous and is_subscription already exist in Phase 1 schema.
        No ALTER TABLE needed.

PHASE 4 (Run after P4-BE-002 gate condition met):
  ✅ Section 08: ALTER TABLE transactions ADD COLUMN merchant_embedding VECTOR(1536)
  ✅ Section 08: IVFFlat index on merchant_embedding
  ✅ Section 08: mv_user_category_totals materialized view
  ✅ Section 08: GIN indexes on JSONB columns in decision_engine_outputs
  ✅ Schedule REFRESH via pg_cron

PHASE 5 (conversations table already created in Phase 1 — no migration needed):
  ✅ conversations table ready for LangGraph checkpointer
```

---

*End of FINSIGHT DATABASE_SCHEMA_SQL.md v2.0.0*
*Aligns with: TECH_STACK_v2.md · WORKFLOW.md · TASKS.md · PRD_v2.md*
*Execute sections 01–06 + 09 for Phase 1. Sections 07–08 are gated.*
