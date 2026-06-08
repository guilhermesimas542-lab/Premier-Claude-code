GRANT UPDATE ON fa_sessions, fa_steps, fa_options TO anon;

CREATE POLICY fa_sessions_anon_update ON fa_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY fa_steps_anon_update ON fa_steps FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY fa_options_anon_update ON fa_options FOR UPDATE TO anon USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';