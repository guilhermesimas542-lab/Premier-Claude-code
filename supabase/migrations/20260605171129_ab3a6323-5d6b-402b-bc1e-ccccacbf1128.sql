ALTER TABLE public.crm_journey_step_events
  ADD COLUMN IF NOT EXISTS converted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_value_cents integer,
  ADD COLUMN IF NOT EXISTS conversion_order_id text;

CREATE INDEX IF NOT EXISTS idx_journey_step_events_converted
  ON public.crm_journey_step_events(step_id) WHERE converted;

NOTIFY pgrst, 'reload schema';