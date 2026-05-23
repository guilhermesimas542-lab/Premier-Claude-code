
-- B.1: Drop legacy ai_credit_packages (3 rows, 0 references in production)
ALTER TABLE public.ai_credit_purchase DROP COLUMN IF EXISTS package_id;
DROP TABLE IF EXISTS public.ai_credit_packages CASCADE;

-- B.2: Add checkout_url to products_catalog
ALTER TABLE public.products_catalog
  ADD COLUMN IF NOT EXISTS checkout_url text;

-- B.3: Add unlimited_until to ai_credit_extras
ALTER TABLE public.ai_credit_extras
  ADD COLUMN IF NOT EXISTS unlimited_until timestamptz;

-- B.4.1: Update check_and_debit_credit to bypass debit when unlimited is active
CREATE OR REPLACE FUNCTION public.check_and_debit_credit(p_user_id uuid, p_source text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tier text;
  v_quota int;
  v_row ai_credit_weekly%ROWTYPE;
  v_extras_bonus int := 0;
  v_extras_purchased int := 0;
  v_unlimited_until timestamptz;
  v_week_start date;
  v_resets_at timestamptz;
  v_debit_type text;
BEGIN
  SELECT main_tier::text INTO v_tier FROM public.users WHERE id = p_user_id;
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- Unlimited bypass
  SELECT unlimited_until INTO v_unlimited_until
  FROM public.ai_credit_extras WHERE user_id = p_user_id;

  IF v_unlimited_until IS NOT NULL AND v_unlimited_until > now() THEN
    INSERT INTO public.ai_credit_log (user_id, event_type, amount, reason, metadata)
    VALUES (p_user_id, 'unlimited_use', 0, p_source,
            jsonb_build_object('unlimited_until', v_unlimited_until, 'tier', v_tier));
    RETURN jsonb_build_object(
      'success', true,
      'debit_type', 'unlimited',
      'unlimited_until', v_unlimited_until,
      'tier', v_tier
    );
  END IF;

  v_quota := CASE v_tier
    WHEN 'free' THEN 0
    WHEN 'basic' THEN 1
    WHEN 'pro' THEN 3
    WHEN 'premium' THEN 3
    WHEN 'ultra' THEN 3
    WHEN 'diamante' THEN 5
    ELSE 0
  END;

  v_week_start := date_trunc('week', (NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamp)::date;

  SELECT * INTO v_row FROM public.ai_credit_weekly WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_credit_weekly (user_id, weekly_quota, weekly_used, week_start_date, last_tier)
    VALUES (p_user_id, v_quota, 0, v_week_start, v_tier)
    RETURNING * INTO v_row;
  END IF;

  IF v_row.week_start_date < v_week_start OR v_row.last_tier IS DISTINCT FROM v_tier THEN
    UPDATE public.ai_credit_weekly
    SET weekly_used = CASE WHEN v_row.week_start_date < v_week_start THEN 0 ELSE v_row.weekly_used END,
        week_start_date = v_week_start,
        weekly_quota = v_quota,
        last_tier = v_tier,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;
  END IF;

  v_resets_at := ((v_week_start + INTERVAL '7 days')::timestamp AT TIME ZONE 'America/Sao_Paulo');

  IF v_row.weekly_used < v_row.weekly_quota THEN
    UPDATE public.ai_credit_weekly
    SET weekly_used = weekly_used + 1, updated_at = NOW()
    WHERE user_id = p_user_id;
    v_debit_type := 'weekly';

    SELECT COALESCE(balance_bonus, 0), COALESCE(balance_purchased, 0)
    INTO v_extras_bonus, v_extras_purchased
    FROM public.ai_credit_extras WHERE user_id = p_user_id;
  ELSE
    SELECT balance_bonus, balance_purchased
    INTO v_extras_bonus, v_extras_purchased
    FROM public.ai_credit_extras WHERE user_id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
      v_extras_bonus := 0;
      v_extras_purchased := 0;
    END IF;

    IF v_extras_bonus > 0 THEN
      UPDATE public.ai_credit_extras SET balance_bonus = balance_bonus - 1, updated_at = NOW()
      WHERE user_id = p_user_id;
      v_debit_type := 'extras_bonus';
      v_extras_bonus := v_extras_bonus - 1;
    ELSIF v_extras_purchased > 0 THEN
      UPDATE public.ai_credit_extras SET balance_purchased = balance_purchased - 1, updated_at = NOW()
      WHERE user_id = p_user_id;
      v_debit_type := 'extras_purchased';
      v_extras_purchased := v_extras_purchased - 1;
    ELSE
      INSERT INTO public.ai_credit_log (user_id, event_type, amount, reason, metadata)
      VALUES (p_user_id, 'denied', 0, p_source,
              jsonb_build_object('reason', 'insufficient_credits', 'tier', v_tier));
      RETURN jsonb_build_object(
        'success', false,
        'error', 'insufficient_credits',
        'balance', jsonb_build_object(
          'weekly_remaining', 0,
          'weekly_quota', v_row.weekly_quota,
          'extras_bonus', 0,
          'extras_purchased', 0
        ),
        'resets_at', v_resets_at,
        'tier', v_tier
      );
    END IF;
  END IF;

  INSERT INTO public.ai_credit_log (user_id, event_type, amount, reason, metadata)
  VALUES (p_user_id, 'debit', -1, p_source,
          jsonb_build_object('debit_type', v_debit_type, 'tier', v_tier));

  SELECT * INTO v_row FROM public.ai_credit_weekly WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', jsonb_build_object(
      'weekly_remaining', v_row.weekly_quota - v_row.weekly_used,
      'weekly_quota', v_row.weekly_quota,
      'extras_bonus', v_extras_bonus,
      'extras_purchased', v_extras_purchased
    ),
    'debit_type', v_debit_type,
    'resets_at', v_resets_at,
    'tier', v_tier
  );
END;
$function$;

-- B.4.2: Update get_credit_balance to expose unlimited_until
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tier text;
  v_quota int;
  v_weekly_used int := 0;
  v_week_start_row date;
  v_extras_bonus int := 0;
  v_extras_purchased int := 0;
  v_unlimited_until timestamptz;
  v_week_start date;
  v_resets_at timestamptz;
  v_last_tier text;
BEGIN
  SELECT main_tier::text INTO v_tier FROM public.users WHERE id = p_user_id;
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  v_quota := CASE v_tier
    WHEN 'free' THEN 0
    WHEN 'basic' THEN 1
    WHEN 'pro' THEN 3
    WHEN 'premium' THEN 3
    WHEN 'ultra' THEN 3
    WHEN 'diamante' THEN 5
    ELSE 0
  END;

  v_week_start := date_trunc('week', (NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamp)::date;
  v_resets_at := ((v_week_start + INTERVAL '7 days')::timestamp AT TIME ZONE 'America/Sao_Paulo');

  SELECT weekly_used, week_start_date, last_tier
  INTO v_weekly_used, v_week_start_row, v_last_tier
  FROM public.ai_credit_weekly WHERE user_id = p_user_id;

  IF v_week_start_row IS NULL OR v_week_start_row < v_week_start OR v_last_tier IS DISTINCT FROM v_tier THEN
    v_weekly_used := 0;
  END IF;

  SELECT COALESCE(balance_bonus, 0), COALESCE(balance_purchased, 0), unlimited_until
  INTO v_extras_bonus, v_extras_purchased, v_unlimited_until
  FROM public.ai_credit_extras WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'balance', jsonb_build_object(
      'weekly_remaining', GREATEST(v_quota - v_weekly_used, 0),
      'weekly_quota', v_quota,
      'extras_bonus', COALESCE(v_extras_bonus, 0),
      'extras_purchased', COALESCE(v_extras_purchased, 0)
    ),
    'unlimited_until', v_unlimited_until,
    'unlimited_active', (v_unlimited_until IS NOT NULL AND v_unlimited_until > now()),
    'resets_at', v_resets_at
  );
END;
$function$;

-- B.4.3: grant_unlimited_access(p_user_id, p_days, p_purchase_id)
CREATE OR REPLACE FUNCTION public.grant_unlimited_access(
  p_user_id uuid,
  p_days integer,
  p_purchase_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current timestamptz;
  v_new timestamptz;
BEGIN
  IF p_days <= 0 THEN RETURN jsonb_build_object('success', false, 'reason', 'days_must_be_positive'); END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found');
  END IF;

  SELECT unlimited_until INTO v_current FROM ai_credit_extras WHERE user_id = p_user_id;
  -- If already has unlimited and it's in the future, extend from there. Otherwise from now.
  IF v_current IS NOT NULL AND v_current > now() THEN
    v_new := v_current + (p_days || ' days')::interval;
  ELSE
    v_new := now() + (p_days || ' days')::interval;
  END IF;

  INSERT INTO ai_credit_extras (user_id, unlimited_until) VALUES (p_user_id, v_new)
    ON CONFLICT (user_id) DO UPDATE SET unlimited_until = v_new, updated_at = now();

  INSERT INTO ai_credit_log (user_id, event_type, amount, reason, metadata)
    VALUES (p_user_id, 'grant_unlimited', 0, 'compra de acesso ilimitado',
            jsonb_build_object('purchase_id', p_purchase_id, 'days', p_days, 'unlimited_until', v_new));

  RETURN jsonb_build_object('success', true, 'unlimited_until', v_new);
END;
$function$;
