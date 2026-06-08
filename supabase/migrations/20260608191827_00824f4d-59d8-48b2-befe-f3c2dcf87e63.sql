
GRANT SELECT ON public.fa_sessions, public.fa_steps, public.fa_options, public.fa_step_events TO anon, authenticated;
GRANT ALL ON public.fa_sessions, public.fa_steps, public.fa_options, public.fa_step_events TO service_role;

DROP POLICY IF EXISTS fa_sessions_anon_select    ON public.fa_sessions;
DROP POLICY IF EXISTS fa_steps_anon_select       ON public.fa_steps;
DROP POLICY IF EXISTS fa_options_anon_select     ON public.fa_options;
DROP POLICY IF EXISTS fa_step_events_anon_select ON public.fa_step_events;

CREATE POLICY fa_sessions_anon_select    ON public.fa_sessions    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY fa_steps_anon_select       ON public.fa_steps       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY fa_options_anon_select     ON public.fa_options     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY fa_step_events_anon_select ON public.fa_step_events FOR SELECT TO anon, authenticated USING (true);

NOTIFY pgrst, 'reload schema';
