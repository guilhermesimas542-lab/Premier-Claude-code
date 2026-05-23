
CREATE POLICY ai_beta_allowlist_public_read ON public.ai_beta_allowlist
  FOR SELECT USING (true);
