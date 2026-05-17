-- ══════════════════════════════════════════════════════════════════
-- FINSIGHT DATABASE SCHEMA — PHASE 1 ONLY
-- ══════════════════════════════════════════════════════════════════
-- Version: 2.0.0
-- Execute in: Supabase SQL Editor
-- Region: ap-south-1 (Mumbai)
-- 
-- SECTIONS INCLUDED:
--   01. Extensions
--   02. Core Tables
--   03. Constraints (embedded in table definitions)
--   04. Functions & Triggers
--   05. Row Level Security
--   06. Indexes (Phase 1 standard only)
--   09. Verification Queries (run separately after this completes)
--
-- EXCLUDED (Phase 2/4):
--   07. pg_trgm search indexes
--   08. pgvector + materialized views
-- ══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════
-- 01. EXTENSIONS
-- ══════════════════════════════════════════════════════════════════

-- Enable trigram extension for future fuzzy search (Phase 2)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pgvector for semantic search (Phase 4)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_cron for scheduled jobs (Phase 4)
-- Note: May not be available on all Supabase plans
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ══════════════════════════════════════════════════════════════════
-- 02. CORE TABLES
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 2.1 profiles
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                      UUID         NOT NULL,
  full_name               TEXT,
  currency_preference     VARCHAR(3)   NOT NULL DEFAULT 'INR',
  intelligence_level      SMALLINT     NOT NULL DEFAULT 1,
  total_receipts_uploaded INTEGER      NOT NULL DEFAULT 0,
  subscription_tier       VARCHAR(10)  NOT NULL DEFAULT 'free',
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_intelligence_level_check
    CHECK (intelligence_level BETWEEN 1 AND 4),
  CONSTRAINT profiles_total_receipts_check
    CHECK (total_receipts_uploaded >= 0),
  CONSTRAINT profiles_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'pro', 'business')),
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


-- ──────────────────────────────────────────────────────────────────
-- 2.2 receipts
-- ──────────────────────────────────────────────────────────────────
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

  CONSTRAINT receipts_pkey PRIMARY KEY (id),
  CONSTRAINT receipts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT receipts_status_check
    CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  CONSTRAINT receipts_ocr_confidence_check
    CHECK (ocr_confidence IS NULL OR ocr_confidence BETWEEN 0.0 AND 1.0),
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


-- ──────────────────────────────────────────────────────────────────
-- 2.3 transactions
-- ──────────────────────────────────────────────────────────────────
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

  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT transactions_receipt_id_fkey
    FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL,
  CONSTRAINT transactions_amount_check
    CHECK (amount >= 0),
  CONSTRAINT transactions_confidence_check
    CHECK (confidence IS NULL OR confidence BETWEEN 0.0 AND 1.0),
  CONSTRAINT transactions_currency_check
    CHECK (char_length(currency) = 3),
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


-- ──────────────────────────────────────────────────────────────────
-- 2.4 insights
-- ──────────────────────────────────────────────────────────────────
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

  CONSTRAINT insights_pkey PRIMARY KEY (id),
  CONSTRAINT insights_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT insights_health_score_check
    CHECK (health_score IS NULL OR health_score BETWEEN 0 AND 100),
  CONSTRAINT insights_time_range_check
    CHECK (time_range IN ('30d', '90d')),
  CONSTRAINT insights_transaction_count_check
    CHECK (transaction_count IS NULL OR transaction_count >= 0),
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


-- ──────────────────────────────────────────────────────────────────
-- 2.5 decision_engine_outputs
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE public.decision_engine_outputs (
  id                         UUID          NOT NULL,
  user_id                    UUID          NOT NULL,
  computed_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  time_range                 VARCHAR(10)   NOT NULL DEFAULT '90d',
  estimated_tax_liability    NUMERIC(12,2),
  tax_deductible_total       NUMERIC(12,2),
  tax_computation_basis      JSONB,
  detected_subscriptions     JSONB,
  subscription_monthly_total NUMERIC(12,2),
  leakage_signals            JSONB,
  high_risk_categories       TEXT[],
  decision_narrative         TEXT,
  is_current                 BOOLEAN       NOT NULL DEFAULT TRUE,

  CONSTRAINT decision_engine_outputs_pkey PRIMARY KEY (id),
  CONSTRAINT decision_engine_outputs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT decision_outputs_time_range_check
    CHECK (time_range IN ('30d', '90d')),
  CONSTRAINT decision_outputs_tax_liability_check
    CHECK (estimated_tax_liability IS NULL OR estimated_tax_liability >= 0),
  CONSTRAINT decision_outputs_deductible_check
    CHECK (tax_deductible_total IS NULL OR tax_deductible_total >= 0),
  CONSTRAINT decision_outputs_subscription_total_check
    CHECK (subscription_monthly_total IS NULL OR subscription_monthly_total >= 0),
  CONSTRAINT decision_outputs_subscriptions_is_array
    CHECK (detected_subscriptions IS NULL OR jsonb_typeof(detected_subscriptions) = 'array'),
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


-- ──────────────────────────────────────────────────────────────────
-- 2.6 conversations (Phase 5 — created now to avoid future migration)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id         UUID        NOT NULL,
  user_id    UUID        NOT NULL,
  thread_id  TEXT        NOT NULL,
  messages   JSONB       NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT conversations_thread_id_nonempty
    CHECK (char_length(thread_id) > 0),
  CONSTRAINT conversations_messages_is_array
    CHECK (jsonb_typeof(messages) = 'array'),
  CONSTRAINT conversations_user_thread_unique
    UNIQUE (user_id, thread_id)
);

COMMENT ON TABLE public.conversations IS
  'LangGraph agent conversation threads (Phase 5). Empty until P5-BE-001 is deployed.';
COMMENT ON COLUMN public.conversations.thread_id IS
  'Application-generated UUID string. Stored in URL param for cross-session persistence.';
COMMENT ON COLUMN public.conversations.messages IS
  'JSONB array of LangGraph messages: [{role:user|assistant, content:str, timestamp:ISO8601}]. Max 20 turns in app.';


-- ══════════════════════════════════════════════════════════════════
-- 04. FUNCTIONS AND TRIGGERS
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 4.1 handle_new_user — auto-creates profile on signup
-- ──────────────────────────────────────────────────────────────────
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
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auto-creates public.profiles row when a user signs up. SECURITY DEFINER. Handles both email and OAuth flows.';


-- ──────────────────────────────────────────────────────────────────
-- 4.2 increment_receipt_count — atomic count + level update
-- ──────────────────────────────────────────────────────────────────
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

  RETURN new_level;
END;
$$;

COMMENT ON FUNCTION public.increment_receipt_count(UUID) IS
  'Atomically increments total_receipts_uploaded and recalculates intelligence_level. Returns new level.';


-- ──────────────────────────────────────────────────────────────────
-- 4.3 archive_decision_engine_output — single active row per user
-- ──────────────────────────────────────────────────────────────────
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


-- ──────────────────────────────────────────────────────────────────
-- 4.4 get_category_stats — anomaly detection baseline
-- ──────────────────────────────────────────────────────────────────
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
    AND is_manually_corrected = FALSE;
$$;

COMMENT ON FUNCTION public.get_category_stats(UUID, TEXT, INTEGER) IS
  'Returns mean/stddev/count for anomaly detection baseline. Called by FastAPI anomaly_detector.py.';


-- ──────────────────────────────────────────────────────────────────
-- 4.5 set_updated_at — auto-maintain updated_at timestamps
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON FUNCTION public.set_updated_at() IS
  'Generic trigger: sets updated_at=NOW() before any UPDATE. Attached to profiles and conversations.';


-- ══════════════════════════════════════════════════════════════════
-- 05. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_engine_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations           ENABLE ROW LEVEL SECURITY;

-- PROFILES
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

-- RECEIPTS
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

-- TRANSACTIONS
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

-- INSIGHTS
CREATE POLICY "insights_select_own" ON public.insights
  FOR SELECT
  USING (auth.uid() = user_id);

-- DECISION ENGINE OUTPUTS
CREATE POLICY "decision_outputs_select_own" ON public.decision_engine_outputs
  FOR SELECT
  USING (auth.uid() = user_id);

-- CONVERSATIONS
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


-- ══════════════════════════════════════════════════════════════════
-- 06. INDEXES — PHASE 1 (STANDARD)
-- ══════════════════════════════════════════════════════════════════

-- PROFILES
CREATE INDEX idx_profiles_subscription_tier
  ON public.profiles(subscription_tier);

-- RECEIPTS
CREATE INDEX idx_receipts_user_id
  ON public.receipts(user_id);

CREATE INDEX idx_receipts_user_uploaded
  ON public.receipts(user_id, uploaded_at DESC);

CREATE INDEX idx_receipts_user_status
  ON public.receipts(user_id, status);

-- TRANSACTIONS
CREATE INDEX idx_transactions_user_date
  ON public.transactions(user_id, transaction_date DESC);

CREATE INDEX idx_transactions_user_category
  ON public.transactions(user_id, category);

CREATE INDEX idx_transactions_user_category_date
  ON public.transactions(user_id, category, transaction_date DESC);

CREATE INDEX idx_transactions_subscription_flag
  ON public.transactions(user_id, is_subscription)
  WHERE is_subscription = TRUE;

CREATE INDEX idx_transactions_anomaly_flag
  ON public.transactions(user_id, is_anomalous)
  WHERE is_anomalous = TRUE;

CREATE INDEX idx_transactions_business_expense
  ON public.transactions(user_id, is_business_expense)
  WHERE is_business_expense = TRUE;

CREATE INDEX idx_transactions_receipt_id
  ON public.transactions(receipt_id)
  WHERE receipt_id IS NOT NULL;

-- INSIGHTS
CREATE INDEX idx_insights_user_generated
  ON public.insights(user_id, generated_at DESC);

-- DECISION ENGINE OUTPUTS
CREATE INDEX idx_decision_outputs_user_current
  ON public.decision_engine_outputs(user_id, is_current)
  WHERE is_current = TRUE;

-- CONVERSATIONS
CREATE INDEX idx_conversations_user_thread
  ON public.conversations(user_id, thread_id);

CREATE INDEX idx_conversations_user_updated
  ON public.conversations(user_id, updated_at DESC);


-- ══════════════════════════════════════════════════════════════════
-- STORAGE POLICIES (run separately in Supabase Storage dashboard)
-- ══════════════════════════════════════════════════════════════════

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
