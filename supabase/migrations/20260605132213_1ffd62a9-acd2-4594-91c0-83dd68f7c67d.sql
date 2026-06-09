
ALTER TABLE public.crm_journey_steps
  ADD COLUMN IF NOT EXISTS node_type text NOT NULL DEFAULT 'message'
    CHECK (node_type IN ('trigger','message','wait','condition','tag')),
  ADD COLUMN IF NOT EXISTS position jsonb NOT NULL DEFAULT '{"x":0,"y":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.crm_journey_steps ALTER COLUMN step_order DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_journey_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.crm_journeys(id) ON DELETE CASCADE,
  source_step_id uuid NOT NULL REFERENCES public.crm_journey_steps(id) ON DELETE CASCADE,
  target_step_id uuid NOT NULL REFERENCES public.crm_journey_steps(id) ON DELETE CASCADE,
  branch text,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journey_edges TO authenticated;
GRANT ALL ON public.crm_journey_edges TO service_role;

CREATE INDEX IF NOT EXISTS idx_journey_edges_journey ON public.crm_journey_edges(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_edges_source ON public.crm_journey_edges(source_step_id);

ALTER TABLE public.crm_journey_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_journey_edges_admin_all ON public.crm_journey_edges;
CREATE POLICY crm_journey_edges_admin_all ON public.crm_journey_edges
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
