CREATE TABLE IF NOT EXISTS public.crm_journey_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'custom',
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journey_templates TO authenticated;
GRANT ALL ON public.crm_journey_templates TO service_role;

ALTER TABLE public.crm_journey_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_journey_templates_admin_all" ON public.crm_journey_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_crm_journey_templates_created_at
  ON public.crm_journey_templates (created_at DESC);

CREATE TRIGGER crm_journey_templates_set_updated_at
  BEFORE UPDATE ON public.crm_journey_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();