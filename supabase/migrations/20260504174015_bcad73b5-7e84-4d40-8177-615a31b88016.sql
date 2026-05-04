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
    -- Nova lógica: tiers premium/diamante via features
    EXISTS (
      SELECT 1 FROM u, f
      WHERE (u.main_tier = 'premium'  AND f.included_in_premium)
         OR (u.main_tier = 'diamante' AND (f.included_in_premium OR f.included_in_diamante))
    )
    -- Entitlements ativos (inclui vitalício com ends_at IS NULL)
    OR EXISTS (
      SELECT 1 FROM public.entitlements e
      WHERE e.user_id = p_user
        AND e.product_key::text = p_feature
        AND e.status = 'active'
        AND (e.ends_at IS NULL OR e.ends_at > now())
    )
    -- LEGACY UNIVERSAL: durante a transição, qualquer user com tier legado mantém acesso
    -- basic       -> odds_safes
    -- pro / ultra -> odds_safes + odds_pro
    OR EXISTS (
      SELECT 1 FROM u
      WHERE (u.main_tier = 'basic' AND p_feature = 'odds_safes')
         OR (u.main_tier IN ('pro','ultra') AND p_feature IN ('odds_safes','odds_pro'))
    );
$function$;