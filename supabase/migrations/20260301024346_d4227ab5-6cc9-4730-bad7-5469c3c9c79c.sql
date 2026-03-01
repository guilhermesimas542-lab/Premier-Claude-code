
CREATE TABLE public.app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  house_id UUID REFERENCES public.betting_houses(id) ON DELETE SET NULL,
  user_email TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_fingerprint TEXT NOT NULL,
  screen TEXT,
  component TEXT,
  properties JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert errors" ON public.app_errors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read errors" ON public.app_errors
  FOR SELECT USING (public.is_admin());
