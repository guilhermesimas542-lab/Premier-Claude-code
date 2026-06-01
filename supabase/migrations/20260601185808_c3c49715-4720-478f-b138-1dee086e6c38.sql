CREATE TABLE IF NOT EXISTS public.crm_popup_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.crm_schedules(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  shown_at timestamptz,
  acted_at timestamptz,
  CONSTRAINT crm_popup_deliveries_status_check
    CHECK (status IN ('pending','shown','clicked','dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_crm_popup_deliveries_user_status
  ON public.crm_popup_deliveries (user_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_popup_deliveries_schedule
  ON public.crm_popup_deliveries (schedule_id);

GRANT SELECT, UPDATE ON public.crm_popup_deliveries TO anon, authenticated;
GRANT ALL ON public.crm_popup_deliveries TO service_role;

ALTER TABLE public.crm_popup_deliveries ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY crm_popup_deliveries_admin_all
  ON public.crm_popup_deliveries
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public read (app filters by user_id client-side — mesmo padrão de events/entitlements
-- deste projeto, que usa mock login sem auth.uid()).
CREATE POLICY crm_popup_deliveries_public_read
  ON public.crm_popup_deliveries
  FOR SELECT
  USING (true);

-- Public update (app só atualiza status/shown_at/acted_at da própria linha pelo id).
CREATE POLICY crm_popup_deliveries_public_update
  ON public.crm_popup_deliveries
  FOR UPDATE
  USING (true)
  WITH CHECK (true);