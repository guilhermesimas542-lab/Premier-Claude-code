
CREATE OR REPLACE FUNCTION public.get_allowed_tiers(user_tier main_tier)
 RETURNS main_tier[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF user_tier = 'free' THEN
    RETURN ARRAY['free']::main_tier[];
  ELSIF user_tier = 'premium' THEN
    RETURN ARRAY['premium']::main_tier[];
  ELSIF user_tier = 'diamante' THEN
    RETURN ARRAY['premium', 'diamante']::main_tier[];
  -- Legacy: ultra is now treated as diamante
  ELSIF user_tier = 'ultra' THEN
    RETURN ARRAY['premium', 'diamante']::main_tier[];
  ELSIF user_tier = 'basic' THEN
    RETURN ARRAY['basic']::main_tier[];
  ELSIF user_tier = 'pro' THEN
    RETURN ARRAY['basic', 'pro']::main_tier[];
  END IF;
  RETURN ARRAY['free']::main_tier[];
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_feature(p_user uuid, p_feature text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH u AS (
    SELECT main_tier FROM public.users WHERE id = p_user
  ),
  f AS (
    SELECT * FROM public.features WHERE key = p_feature
  )
  SELECT
    EXISTS (
      SELECT 1 FROM u, f
      WHERE (u.main_tier = 'premium'  AND f.included_in_premium)
         OR (u.main_tier = 'diamante' AND (f.included_in_premium OR f.included_in_diamante))
         -- Legacy ultra behaves like diamante
         OR (u.main_tier = 'ultra'    AND (f.included_in_premium OR f.included_in_diamante))
    )
    OR EXISTS (
      SELECT 1 FROM public.entitlements e
      WHERE e.user_id = p_user
        AND e.product_key::text = p_feature
        AND e.status = 'active'
        AND (e.ends_at IS NULL OR e.ends_at > now())
    )
    OR EXISTS (
      SELECT 1 FROM u
      WHERE (u.main_tier = 'basic' AND p_feature = 'odds_safes')
         OR (u.main_tier = 'pro'   AND p_feature IN ('odds_safes','odds_pro'))
    );
$function$;
