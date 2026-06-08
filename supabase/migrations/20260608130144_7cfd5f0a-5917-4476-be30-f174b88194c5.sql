ALTER TABLE public.crm_journey_steps DROP CONSTRAINT IF EXISTS crm_journey_steps_node_type_check;
ALTER TABLE public.crm_journey_steps ADD CONSTRAINT crm_journey_steps_node_type_check
  CHECK (node_type IN ('trigger','message','wait','condition','tag','stage'));

ALTER TABLE public.crm_journey_steps
  ADD COLUMN IF NOT EXISTS parent_step_id uuid REFERENCES public.crm_journey_steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journey_steps_parent ON public.crm_journey_steps(parent_step_id);

NOTIFY pgrst, 'reload schema';