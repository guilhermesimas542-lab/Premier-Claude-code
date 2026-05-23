
-- B.1: Lock public-read RLS policies on AI tables
DROP POLICY IF EXISTS ai_tip_cache_read ON public.ai_tip_cache;
CREATE POLICY ai_tip_cache_admin_read ON public.ai_tip_cache
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS ai_match_altenar_read ON public.ai_match_altenar_map;
CREATE POLICY ai_match_altenar_admin_read ON public.ai_match_altenar_map
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS aac_read ON public.ai_altenar_championships;
CREATE POLICY aac_admin_read ON public.ai_altenar_championships
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS ai_team_aliases_read ON public.ai_team_aliases;
CREATE POLICY ai_team_aliases_admin_read ON public.ai_team_aliases
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS ai_credit_packages_read ON public.ai_credit_packages;
CREATE POLICY ai_credit_packages_authenticated_read ON public.ai_credit_packages
  FOR SELECT USING (auth.role() = 'authenticated');

-- B.2: Beta allowlist table
CREATE TABLE IF NOT EXISTS public.ai_beta_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by text,
  notes text
);

ALTER TABLE public.ai_beta_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_beta_allowlist_admin_all ON public.ai_beta_allowlist
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.ai_beta_allowlist (email, added_by, notes) VALUES
  ('teste@exemplo.com', 'migration', 'imported from hardcoded list'),
  ('hugofm350@gmail.com', 'migration', 'imported from hardcoded list'),
  ('gabriel.fedds@icloud.com', 'migration', 'imported from hardcoded list')
ON CONFLICT (email) DO NOTHING;
