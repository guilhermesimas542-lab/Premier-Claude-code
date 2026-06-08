-- Funnel Analytics (fa_) — tabelas base

CREATE TABLE IF NOT EXISTS public.fa_sessions (
  id text PRIMARY KEY,
  funnel_slug text NOT NULL DEFAULT 'premier',
  variant text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip text, user_agent text, platform text, screen text, viewport text, language text,
  src text, fbclid text,
  utm_source text, utm_medium text, utm_campaign text,
  utm_id text, utm_content text, utm_term text,
  email text, phone text
);
CREATE INDEX IF NOT EXISTS idx_fa_sessions_funnel ON public.fa_sessions(funnel_slug, created_at);

GRANT SELECT ON public.fa_sessions TO authenticated;
GRANT INSERT, UPDATE ON public.fa_sessions TO anon, authenticated;
GRANT ALL ON public.fa_sessions TO service_role;

ALTER TABLE public.fa_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fa_sessions_admin_read ON public.fa_sessions FOR SELECT USING (public.is_admin());
CREATE POLICY fa_sessions_public_insert ON public.fa_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY fa_sessions_public_update ON public.fa_sessions FOR UPDATE USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.fa_steps (
  id text PRIMARY KEY,
  funnel_slug text NOT NULL DEFAULT 'premier',
  ordem int, nome text,
  tipo text CHECK (tipo IN ('button','options','loading','checkout','other')) DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fa_steps_funnel ON public.fa_steps(funnel_slug, ordem);

GRANT SELECT ON public.fa_steps TO anon, authenticated;
GRANT INSERT, UPDATE ON public.fa_steps TO anon, authenticated;
GRANT ALL ON public.fa_steps TO service_role;

ALTER TABLE public.fa_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY fa_steps_admin_read ON public.fa_steps FOR SELECT USING (public.is_admin());
CREATE POLICY fa_steps_public_insert ON public.fa_steps FOR INSERT WITH CHECK (true);
CREATE POLICY fa_steps_public_update ON public.fa_steps FOR UPDATE USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.fa_options (
  id text PRIMARY KEY,
  step_id text NOT NULL,
  letra text, indice int, rotulo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fa_options_step ON public.fa_options(step_id);

GRANT SELECT ON public.fa_options TO anon, authenticated;
GRANT INSERT, UPDATE ON public.fa_options TO anon, authenticated;
GRANT ALL ON public.fa_options TO service_role;

ALTER TABLE public.fa_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY fa_options_admin_read ON public.fa_options FOR SELECT USING (public.is_admin());
CREATE POLICY fa_options_public_insert ON public.fa_options FOR INSERT WITH CHECK (true);
CREATE POLICY fa_options_public_update ON public.fa_options FOR UPDATE USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.fa_step_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.fa_sessions(id) ON DELETE CASCADE,
  step_id text, step_index int,
  event_type text NOT NULL CHECK (event_type IN ('loaded','clicked','answered')),
  option_id text, value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fa_events_session ON public.fa_step_events(session_id);
CREATE INDEX IF NOT EXISTS idx_fa_events_step ON public.fa_step_events(step_id, event_type);
CREATE INDEX IF NOT EXISTS idx_fa_events_created ON public.fa_step_events(created_at);

GRANT SELECT ON public.fa_step_events TO authenticated;
GRANT INSERT ON public.fa_step_events TO anon, authenticated;
GRANT ALL ON public.fa_step_events TO service_role;

ALTER TABLE public.fa_step_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY fa_step_events_admin_read ON public.fa_step_events FOR SELECT USING (public.is_admin());
CREATE POLICY fa_step_events_public_insert ON public.fa_step_events FOR INSERT WITH CHECK (true);

NOTIFY pgrst, 'reload schema';