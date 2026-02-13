
-- RPC: get_display_tips
-- Returns today's active tips with display_status (unlocked/locked/expired)
-- Respects tier access rules and addon entitlements

CREATE OR REPLACE FUNCTION public.get_display_tips(p_email text)
RETURNS TABLE (
  id uuid,
  date date,
  title text,
  category text,
  category_explanation text,
  condition_to_win text,
  classification text,
  justification text,
  odd numeric,
  tier_required main_tier,
  addon_required product_key,
  starts_at timestamptz,
  expires_at timestamptz,
  link text,
  team1_name text,
  team1_shirt_variant text,
  team1_primary_color text,
  team1_secondary_color text,
  team2_name text,
  team2_shirt_variant text,
  team2_primary_color text,
  team2_secondary_color text,
  metadata jsonb,
  created_at timestamptz,
  display_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user public.users;
  v_user_tier main_tier;
  v_allowed_tiers main_tier[];
  v_active_addons product_key[];
BEGIN
  -- Get or create user
  SELECT * INTO v_user FROM public.get_or_create_user(p_email);
  v_user_tier := v_user.main_tier;
  v_allowed_tiers := public.get_allowed_tiers(v_user_tier);
  
  -- Get active addon entitlements
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
    ce.metadata, ce.created_at,
    CASE
      -- Priority 1: Expiration (starts_at + 10min passed)
      WHEN ce.starts_at IS NOT NULL AND (ce.starts_at + interval '10 minutes') < now() THEN 'expired'
      -- Priority 2: expires_at passed
      WHEN ce.expires_at IS NOT NULL AND ce.expires_at < now() THEN 'expired'
      -- Priority 3: Addon-based access
      WHEN ce.addon_required IS NOT NULL AND ce.addon_required = ANY(v_active_addons) THEN 'unlocked'
      -- Priority 4: Tier-based access (only for non-addon entries)
      WHEN ce.addon_required IS NULL AND ce.tier_required = ANY(v_allowed_tiers) THEN 'unlocked'
      -- Default: locked
      ELSE 'locked'
    END AS display_status
  FROM public.content_entries ce
  WHERE ce.active = true
    AND ce.date = CURRENT_DATE
    -- Free users see ALL entries; paid users never see free-tier entries
    AND (
      v_user_tier = 'free'
      OR ce.tier_required != 'free'
      OR ce.addon_required IS NOT NULL
    )
  ORDER BY
    -- Active entries first, expired last
    CASE
      WHEN ce.starts_at IS NOT NULL AND (ce.starts_at + interval '10 minutes') < now() THEN 1
      WHEN ce.expires_at IS NOT NULL AND ce.expires_at < now() THEN 1
      ELSE 0
    END ASC,
    ce.created_at DESC;
END;
$$;
