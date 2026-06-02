
-- B.1 Drop tabela legada
DROP TABLE IF EXISTS public.ai_credit_daily CASCADE;

-- B.2 Criar ai_credit_weekly
CREATE TABLE public.ai_credit_weekly (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  weekly_quota int NOT NULL DEFAULT 0,
  weekly_used int NOT NULL DEFAULT 0,
  week_start_date date NOT NULL,
  last_tier text,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_credit_weekly ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_credit_weekly_admin_all ON public.ai_credit_weekly
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY ai_credit_weekly_self_read ON public.ai_credit_weekly
  FOR SELECT USING (auth.uid() = user_id);

-- B.3 Refatorar check_and_debit_credit (DROP antiga assinatura)
DROP FUNCTION IF EXISTS public.check_and_debit_credit(uuid, boolean);
DROP FUNCTION IF EXISTS public.check_and_debit_credit(uuid, text);

CREATE OR REPLACE FUNCTION public.check_and_debit_credit(
  p_user_id uuid,
  p_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_quota int;
  v_row ai_credit_weekly%ROWTYPE;
  v_extras_bonus int := 0;
  v_extras_purchased int := 0;
  v_week_start date;
  v_resets_at timestamptz;
  v_debit_type text;
BEGIN
  SELECT main_tier::text INTO v_tier FROM public.users WHERE id = p_user_id;
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
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
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_debit_credit(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_debit_credit(uuid, text) TO service_role;

-- B.4 Refatorar get_credit_balance (read-only, mesma assinatura)
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_quota int;
  v_weekly_used int := 0;
  v_week_start_row date;
  v_extras_bonus int := 0;
  v_extras_purchased int := 0;
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

  -- Lazy reset virtual (não escreve): se semana mudou ou tier mudou, considera used=0
  IF v_week_start_row IS NULL OR v_week_start_row < v_week_start OR v_last_tier IS DISTINCT FROM v_tier THEN
    v_weekly_used := 0;
  END IF;

  SELECT COALESCE(balance_bonus, 0), COALESCE(balance_purchased, 0)
  INTO v_extras_bonus, v_extras_purchased
  FROM public.ai_credit_extras WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'balance', jsonb_build_object(
      'weekly_remaining', GREATEST(v_quota - v_weekly_used, 0),
      'weekly_quota', v_quota,
      'extras_bonus', COALESCE(v_extras_bonus, 0),
      'extras_purchased', COALESCE(v_extras_purchased, 0)
    ),
    'resets_at', v_resets_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_credit_balance(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_credit_balance(uuid) TO authenticated, service_role;
