ALTER TABLE public.fa_sessions ADD COLUMN IF NOT EXISTS gtm_index_id text;

CREATE TABLE IF NOT EXISTS public.fa_touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  gtm_index_id text,
  src_raw text,
  fbclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, SELECT ON public.fa_touches TO anon;
GRANT SELECT ON public.fa_touches TO authenticated;
GRANT ALL ON public.fa_touches TO service_role;

ALTER TABLE public.fa_touches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert touches" ON public.fa_touches
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "auth read touches" ON public.fa_touches
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_fa_touches_session ON public.fa_touches (session_id, created_at);