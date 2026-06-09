ALTER TABLE crm_journeys
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS canvas jsonb NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';