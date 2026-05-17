-- 002_contractors_risk.sql
-- Adds contractor accountability layer + risk scoring foundation
-- Run in Supabase SQL Editor after 001_phase1_complete.sql

CREATE TABLE IF NOT EXISTS contractors (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         text NOT NULL,
  role         text,
  contact      text,
  status       text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  risk_score   integer DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_reason  text,
  risk_action  text DEFAULT 'pay' CHECK (risk_action IN ('pay', 'hold', 'investigate')),
  total_paid   numeric(12,2) DEFAULT 0,
  last_update  timestamptz DEFAULT now(),
  notes        text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractors_owner" ON contractors
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Link receipts to contractors (additive — does not break existing receipts)
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS contractor_id uuid REFERENCES contractors(id);

CREATE INDEX IF NOT EXISTS idx_contractors_user     ON contractors(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_contractor  ON receipts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractors_risk     ON contractors(user_id, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_contractors_inactive ON contractors(user_id, last_update);
