GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journey_steps TO authenticated;
GRANT ALL ON public.crm_journey_steps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journey_edges TO authenticated;
GRANT ALL ON public.crm_journey_edges TO service_role;

ALTER TABLE public.crm_journey_steps ALTER COLUMN channel DROP NOT NULL;