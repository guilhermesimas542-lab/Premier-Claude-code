
-- 3) Atualiza get_allowed_tiers para o novo modelo
CREATE OR REPLACE FUNCTION public.get_allowed_tiers(user_tier main_tier)
RETURNS main_tier[]
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF user_tier = 'free' THEN
    RETURN ARRAY['free']::main_tier[];
  ELSIF user_tier = 'premium' THEN
    RETURN ARRAY['premium']::main_tier[];
  ELSIF user_tier = 'diamante' THEN
    RETURN ARRAY['premium', 'diamante']::main_tier[];
  -- Retrocompat para users ainda em pending_review
  ELSIF user_tier = 'basic' THEN
    RETURN ARRAY['basic']::main_tier[];
  ELSIF user_tier = 'pro' THEN
    RETURN ARRAY['basic', 'pro']::main_tier[];
  ELSIF user_tier = 'ultra' THEN
    RETURN ARRAY['basic', 'pro', 'ultra']::main_tier[];
  END IF;

  RETURN ARRAY['free']::main_tier[];
END;
$$;

-- 4) CUTOVER: basic/pro → premium, ultra → diamante
-- Exclui users em users_pending_review (mantêm tier legado)
UPDATE public.users
SET main_tier = 'premium'::main_tier
WHERE main_tier IN ('basic'::main_tier, 'pro'::main_tier)
  AND id NOT IN (SELECT user_id FROM public.users_pending_review);

UPDATE public.users
SET main_tier = 'diamante'::main_tier
WHERE main_tier = 'ultra'::main_tier
  AND id NOT IN (SELECT user_id FROM public.users_pending_review);
