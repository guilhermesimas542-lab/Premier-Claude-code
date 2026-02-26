
DROP FUNCTION IF EXISTS public.get_display_tips(text);

CREATE OR REPLACE FUNCTION public.get_display_tips(p_email text)
 RETURNS TABLE(id uuid, date date, title text, category text, category_explanation text, condition_to_win text, classification text, justification text, odd numeric, tier_required main_tier, addon_required product_key, starts_at timestamp with time zone, expires_at timestamp with time zone, link text, team1_name text, team1_shirt_variant text, team1_primary_color text, team1_secondary_color text, team2_name text, team2_shirt_variant text, team2_primary_color text, team2_secondary_color text, team1_logo_url text, team2_logo_url text, metadata jsonb, created_at timestamp with time zone, display_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user public.users;
  v_user_tier main_tier;
  v_allowed_tiers main_tier[];
  v_active_addons product_key[];
BEGIN
  SELECT * INTO v_user FROM public.get_or_create_user(p_email);
  v_user_tier := v_user.main_tier;
  v_allowed_tiers := public.get_allowed_tiers(v_user_tier);
  
  SELECT COALESCE(array_agg(e.product_key), ARRAY[]::product_key[])
  INTO v_active_addons
  FROM public.entitlements e
  WHERE e.user_id = v_user.id
    AND e.status = 'active'
    AND (e.ends_at IS NULL OR e.ends_at > now());
  
  RETURN QUERY
  SELECT
    ce.id, ce.date, ce.title, ce.category, ce.category_explanation,
    ce.condition_to_win, ce.classification, ce.justification,
    ce.odd, ce.tier_required, ce.addon_required,
    ce.starts_at, ce.expires_at, ce.link,
    ce.team1_name, ce.team1_shirt_variant, ce.team1_primary_color, ce.team1_secondary_color,
    ce.team2_name, ce.team2_shirt_variant, ce.team2_primary_color, ce.team2_secondary_color,
    ce.team1_logo_url, ce.team2_logo_url,
    ce.metadata, ce.created_at,
    CASE
      WHEN ce.expires_at IS NOT NULL AND ce.expires_at < now() THEN 'expired'
      WHEN ce.starts_at IS NOT NULL AND (ce.starts_at + interval '1 hour') < now() THEN 'expired'
      WHEN ce.addon_required IS NOT NULL AND ce.addon_required = ANY(v_active_addons) THEN 'unlocked'
      WHEN ce.addon_required IS NULL AND ce.tier_required = ANY(v_allowed_tiers) THEN 'unlocked'
      ELSE 'locked'
    END AS display_status
  FROM public.content_entries ce
  WHERE ce.active = true
    AND ce.date = CURRENT_DATE
    AND (ce.starts_at IS NULL OR (ce.starts_at + interval '1 hour') > now())
    AND (ce.expires_at IS NULL OR ce.expires_at > now())
    AND (
      v_user_tier = 'free'
      OR ce.tier_required != 'free'
      OR ce.addon_required IS NOT NULL
    )
  ORDER BY ce.created_at DESC;
END;
$function$;
