DROP POLICY IF EXISTS fa_sessions_public_update ON public.fa_sessions;
DROP POLICY IF EXISTS fa_steps_public_update ON public.fa_steps;
DROP POLICY IF EXISTS fa_options_public_update ON public.fa_options;

REVOKE UPDATE ON public.fa_sessions FROM anon, authenticated;
REVOKE UPDATE ON public.fa_steps FROM anon, authenticated;
REVOKE UPDATE ON public.fa_options FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';