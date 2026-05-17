-- Add GST metadata columns to transactions table
-- Enables CA-ready expense reports and ITC tracking for Indian SMBs

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS gst_head      TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate      TEXT,
  ADD COLUMN IF NOT EXISTS itc_eligible  BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN transactions.gst_head     IS 'Indian GST expense head (e.g. Food Services, IT & Software Services)';
COMMENT ON COLUMN transactions.gst_rate     IS 'Applicable GST rate (e.g. 18%, 5%)';
COMMENT ON COLUMN transactions.itc_eligible IS 'Whether Input Tax Credit can be claimed on this expense';
