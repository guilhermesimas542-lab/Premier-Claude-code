
CREATE TABLE IF NOT EXISTS public.ai_tipster_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  disabled_message text NOT NULL DEFAULT 'Estamos atualizando o sistema. A IA Tipster estará disponível em breve.',
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  updated_by uuid,
  CONSTRAINT singleton_row CHECK (id = 1)
);

ALTER TABLE public.ai_tipster_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_tipster_settings_admin_all ON public.ai_tipster_settings;
CREATE POLICY ai_tipster_settings_admin_all ON public.ai_tipster_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS ai_tipster_settings_public_read ON public.ai_tipster_settings;
CREATE POLICY ai_tipster_settings_public_read ON public.ai_tipster_settings
  FOR SELECT USING (true);

INSERT INTO public.ai_tipster_settings (id, is_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_ai_tipster_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'enabled', is_enabled,
    'message', disabled_message
  )
  FROM public.ai_tipster_settings
  WHERE id = 1
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_tipster_status()
  TO anon, authenticated, service_role;
