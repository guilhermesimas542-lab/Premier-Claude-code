GRANT INSERT ON fa_sessions, fa_steps, fa_options, fa_step_events TO anon;

DROP POLICY IF EXISTS fa_sessions_anon_insert    ON fa_sessions;

DROP POLICY IF EXISTS fa_steps_anon_insert       ON fa_steps;

DROP POLICY IF EXISTS fa_options_anon_insert     ON fa_options;

DROP POLICY IF EXISTS fa_step_events_anon_insert ON fa_step_events;

CREATE POLICY fa_sessions_anon_insert    ON fa_sessions    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY fa_steps_anon_insert       ON fa_steps       FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY fa_options_anon_insert     ON fa_options     FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY fa_step_events_anon_insert ON fa_step_events FOR INSERT TO anon WITH CHECK (true);

NOTIFY pgrst, 'reload schema';