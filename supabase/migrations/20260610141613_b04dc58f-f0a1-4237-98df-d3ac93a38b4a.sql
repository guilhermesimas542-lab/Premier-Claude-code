GRANT SELECT, UPDATE ON public.crm_popup_deliveries TO anon, authenticated;

DROP POLICY IF EXISTS "crm_popup_deliveries_user_read" ON public.crm_popup_deliveries;
CREATE POLICY "crm_popup_deliveries_user_read"
  ON public.crm_popup_deliveries
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "crm_popup_deliveries_user_update" ON public.crm_popup_deliveries;
CREATE POLICY "crm_popup_deliveries_user_update"
  ON public.crm_popup_deliveries
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);