CREATE TABLE IF NOT EXISTS public.ai_user_rejected_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query_normalized TEXT NOT NULL,
  fixture_id BIGINT NOT NULL,
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_rejections_user_query
  ON public.ai_user_rejected_fixtures(user_id, query_normalized, expires_at);

CREATE INDEX IF NOT EXISTS idx_rejections_expires
  ON public.ai_user_rejected_fixtures(expires_at);

ALTER TABLE public.ai_user_rejected_fixtures ENABLE ROW LEVEL SECURITY;

-- Admins podem ler tudo (debug)
CREATE POLICY "rejections_admin_read" ON public.ai_user_rejected_fixtures
  FOR SELECT USING (is_admin());

-- Edge functions usam service role (bypassa RLS naturalmente);
-- bloqueamos acesso direto de clientes anon/authenticated.
