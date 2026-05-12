
-- ============ TABLES ============
CREATE TABLE public.ai_tip_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_key text NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('chat_prematch','live','prematch_prefill')),
  api_football_fixture_id bigint,
  altenar_event_id text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  content jsonb NOT NULL,
  source_data jsonb,
  tokens_input int DEFAULT 0,
  tokens_output int DEFAULT 0,
  tokens_cached int DEFAULT 0,
  generated_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  version int DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_credit_daily (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  daily_used int NOT NULL DEFAULT 0,
  cache_hits_today int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE TABLE public.ai_credit_extras (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance_bonus int NOT NULL DEFAULT 0,
  balance_purchased int NOT NULL DEFAULT 0,
  preview_used boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_credit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'consume_daily','consume_bonus','consume_purchased',
    'cache_hit_free','preview_use',
    'grant_bonus','grant_purchased',
    'refund_recorded_no_removal'
  )),
  amount int NOT NULL,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  price_brl numeric(10,2) NOT NULL,
  credits_amount int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_credit_purchase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.ai_credit_packages(id) ON DELETE SET NULL,
  amount_paid numeric(10,2) NOT NULL,
  credits_granted int NOT NULL,
  payment_provider text NOT NULL CHECK (payment_provider IN ('lastlink','payt','manual')),
  payment_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tip_cache_id uuid REFERENCES public.ai_tip_cache(id) ON DELETE CASCADE,
  feedback text NOT NULL CHECK (feedback IN ('up','down')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_match_altenar_map (
  api_football_fixture_id bigint PRIMARY KEY,
  altenar_event_id text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  league_id int,
  league_name text,
  kickoff_at timestamptz NOT NULL,
  confidence text NOT NULL DEFAULT 'exact' CHECK (confidence IN ('exact','fuzzy','manual')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_prematch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL,
  matches_processed int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  total_tokens_input int NOT NULL DEFAULT 0,
  total_tokens_output int NOT NULL DEFAULT 0,
  total_cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  errors jsonb
);

CREATE TABLE public.ai_featured_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_football_fixture_id bigint NOT NULL,
  date date NOT NULL,
  priority int NOT NULL DEFAULT 100,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto_top_league')),
  added_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (api_football_fixture_id, date)
);

CREATE TABLE public.ai_team_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_football_team_id int NOT NULL,
  alias text NOT NULL,
  priority int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (api_football_team_id, alias)
);

-- ============ INDEXES ============
-- Note: original spec used a partial unique index with `WHERE expires_at > now()`,
-- but Postgres requires IMMUTABLE functions in index predicates. Using a non-partial
-- index instead; uniqueness of "active" cache entries is enforced at the application layer.
CREATE INDEX idx_ai_tip_cache_key_type_expires
  ON public.ai_tip_cache (match_key, match_type, expires_at DESC);
CREATE INDEX idx_ai_tip_cache_expires ON public.ai_tip_cache (expires_at);
CREATE INDEX idx_ai_tip_cache_fixture ON public.ai_tip_cache (api_football_fixture_id);

CREATE INDEX idx_ai_credit_daily_user_date ON public.ai_credit_daily (user_id, date DESC);

CREATE INDEX idx_ai_credit_log_user_created ON public.ai_credit_log (user_id, created_at DESC);
CREATE INDEX idx_ai_credit_log_event_created ON public.ai_credit_log (event_type, created_at DESC);

CREATE INDEX idx_ai_credit_purchase_user ON public.ai_credit_purchase (user_id, created_at DESC);
CREATE INDEX idx_ai_credit_purchase_payment ON public.ai_credit_purchase (payment_provider, payment_id);

CREATE INDEX idx_ai_feedback_tip ON public.ai_feedback (tip_cache_id);

CREATE INDEX idx_ai_match_altenar_expires ON public.ai_match_altenar_map (expires_at);
CREATE INDEX idx_ai_match_altenar_kickoff ON public.ai_match_altenar_map (kickoff_at);

CREATE INDEX idx_ai_prematch_jobs_date ON public.ai_prematch_jobs (run_date DESC);

CREATE INDEX idx_ai_featured_date ON public.ai_featured_matches (date, priority);

CREATE INDEX idx_ai_team_aliases_team ON public.ai_team_aliases (api_football_team_id);
CREATE INDEX idx_ai_team_aliases_alias_lower ON public.ai_team_aliases (LOWER(alias));

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.check_and_debit_credit(
  p_user_id uuid,
  p_is_cache_hit boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tier main_tier;
  v_daily_limit int;
  v_daily_used int;
  v_cache_hits int;
  v_balance_bonus int;
  v_balance_purchased int;
  v_preview_used boolean;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT main_tier INTO v_tier FROM users WHERE id = p_user_id;
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
  END IF;
  IF v_tier IN ('diamante', 'ultra') THEN
    RETURN jsonb_build_object('allowed', true, 'source', 'unlimited');
  END IF;
  v_daily_limit := CASE v_tier
    WHEN 'free'    THEN 0
    WHEN 'basic'   THEN 3
    WHEN 'pro'     THEN 10
    WHEN 'premium' THEN 20
    ELSE 0
  END;
  INSERT INTO ai_credit_daily (user_id, date, daily_used, cache_hits_today)
    VALUES (p_user_id, v_today, 0, 0)
    ON CONFLICT (user_id, date) DO NOTHING;
  INSERT INTO ai_credit_extras (user_id, balance_bonus, balance_purchased, preview_used)
    VALUES (p_user_id, 0, 0, false)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT daily_used, cache_hits_today INTO v_daily_used, v_cache_hits
    FROM ai_credit_daily WHERE user_id = p_user_id AND date = v_today;
  SELECT balance_bonus, balance_purchased, preview_used
    INTO v_balance_bonus, v_balance_purchased, v_preview_used
    FROM ai_credit_extras WHERE user_id = p_user_id;
  IF p_is_cache_hit AND v_cache_hits < 50 THEN
    UPDATE ai_credit_daily SET cache_hits_today = cache_hits_today + 1, updated_at = now()
      WHERE user_id = p_user_id AND date = v_today;
    INSERT INTO ai_credit_log (user_id, event_type, amount, reason)
      VALUES (p_user_id, 'cache_hit_free', 0, 'cache hit dentro do teto diário');
    RETURN jsonb_build_object('allowed', true, 'source', 'cache_free', 'cache_hits_today', v_cache_hits + 1);
  END IF;
  IF v_daily_used < v_daily_limit THEN
    UPDATE ai_credit_daily SET daily_used = daily_used + 1, updated_at = now()
      WHERE user_id = p_user_id AND date = v_today;
    INSERT INTO ai_credit_log (user_id, event_type, amount, reason)
      VALUES (p_user_id, 'consume_daily', -1, 'consumo da cota diária');
    RETURN jsonb_build_object('allowed', true, 'source', 'daily', 'daily_remaining', v_daily_limit - v_daily_used - 1);
  END IF;
  IF v_balance_bonus > 0 THEN
    UPDATE ai_credit_extras SET balance_bonus = balance_bonus - 1, updated_at = now()
      WHERE user_id = p_user_id;
    INSERT INTO ai_credit_log (user_id, event_type, amount, reason)
      VALUES (p_user_id, 'consume_bonus', -1, 'consumo de bônus');
    RETURN jsonb_build_object('allowed', true, 'source', 'bonus', 'bonus_remaining', v_balance_bonus - 1);
  END IF;
  IF v_balance_purchased > 0 THEN
    UPDATE ai_credit_extras SET balance_purchased = balance_purchased - 1, updated_at = now()
      WHERE user_id = p_user_id;
    INSERT INTO ai_credit_log (user_id, event_type, amount, reason)
      VALUES (p_user_id, 'consume_purchased', -1, 'consumo de crédito comprado');
    RETURN jsonb_build_object('allowed', true, 'source', 'purchased', 'purchased_remaining', v_balance_purchased - 1);
  END IF;
  IF v_tier = 'free' AND NOT v_preview_used THEN
    UPDATE ai_credit_extras SET preview_used = true, updated_at = now()
      WHERE user_id = p_user_id;
    INSERT INTO ai_credit_log (user_id, event_type, amount, reason)
      VALUES (p_user_id, 'preview_use', 0, 'preview free consumido');
    RETURN jsonb_build_object('allowed', true, 'source', 'preview');
  END IF;
  RETURN jsonb_build_object('allowed', false, 'reason', 'insufficient_credits');
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_bonus_credits(
  p_user_id uuid, p_amount int, p_admin_id uuid DEFAULT NULL, p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_new_balance int;
BEGIN
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'reason', 'amount_must_be_positive'); END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found');
  END IF;
  INSERT INTO ai_credit_extras (user_id, balance_bonus) VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance_bonus = ai_credit_extras.balance_bonus + p_amount, updated_at = now()
    RETURNING balance_bonus INTO v_new_balance;
  INSERT INTO ai_credit_log (user_id, event_type, amount, reason, metadata)
    VALUES (p_user_id, 'grant_bonus', p_amount, p_reason, jsonb_build_object('admin_id', p_admin_id));
  RETURN jsonb_build_object('success', true, 'new_bonus_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_purchased_credits(
  p_user_id uuid, p_amount int, p_purchase_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_new_balance int;
BEGIN
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'reason', 'amount_must_be_positive'); END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found');
  END IF;
  INSERT INTO ai_credit_extras (user_id, balance_purchased) VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance_purchased = ai_credit_extras.balance_purchased + p_amount, updated_at = now()
    RETURNING balance_purchased INTO v_new_balance;
  INSERT INTO ai_credit_log (user_id, event_type, amount, reason, metadata)
    VALUES (p_user_id, 'grant_purchased', p_amount, 'compra de pacote de créditos', jsonb_build_object('purchase_id', p_purchase_id));
  RETURN jsonb_build_object('success', true, 'new_purchased_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
  v_tier main_tier;
  v_daily_limit int;
  v_daily_used int;
  v_cache_hits int;
  v_balance_bonus int := 0;
  v_balance_purchased int := 0;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT main_tier INTO v_tier FROM users WHERE id = p_user_id;
  IF v_tier IS NULL THEN RETURN jsonb_build_object('error', 'user_not_found'); END IF;
  v_daily_limit := CASE v_tier
    WHEN 'free' THEN 0 WHEN 'basic' THEN 3 WHEN 'pro' THEN 10
    WHEN 'premium' THEN 20 WHEN 'ultra' THEN -1 WHEN 'diamante' THEN -1
    ELSE 0 END;
  SELECT COALESCE(daily_used,0), COALESCE(cache_hits_today,0)
    INTO v_daily_used, v_cache_hits
    FROM ai_credit_daily WHERE user_id = p_user_id AND date = v_today;
  SELECT COALESCE(balance_bonus,0), COALESCE(balance_purchased,0)
    INTO v_balance_bonus, v_balance_purchased
    FROM ai_credit_extras WHERE user_id = p_user_id;
  RETURN jsonb_build_object(
    'tier', v_tier,
    'is_unlimited', v_daily_limit = -1,
    'daily_limit', GREATEST(v_daily_limit, 0),
    'daily_used', COALESCE(v_daily_used,0),
    'daily_remaining', CASE WHEN v_daily_limit = -1 THEN -1 ELSE GREATEST(v_daily_limit - COALESCE(v_daily_used,0), 0) END,
    'bonus', v_balance_bonus,
    'purchased', v_balance_purchased,
    'cache_hits_today', COALESCE(v_cache_hits,0),
    'cache_hits_limit', 50,
    'total_available', CASE WHEN v_daily_limit = -1 THEN -1 ELSE GREATEST(v_daily_limit - COALESCE(v_daily_used,0),0) + v_balance_bonus + v_balance_purchased END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_telemetry_dashboard(p_period_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - (p_period_days || ' days')::interval;
  v_input_cost_per_mtok numeric := 3.0;
  v_output_cost_per_mtok numeric := 15.0;
  v_cached_cost_per_mtok numeric := 0.30;
  v_result jsonb;
BEGIN
  IF NOT is_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  WITH agg AS (
    SELECT SUM(tokens_input) AS total_input, SUM(tokens_output) AS total_output,
           SUM(tokens_cached) AS total_cached, COUNT(*) AS total_generations
    FROM ai_tip_cache WHERE created_at >= v_since
  ),
  daily AS (
    SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, match_type,
           SUM(tokens_input + tokens_output) AS tokens_total, COUNT(*) AS gens
    FROM ai_tip_cache WHERE created_at >= v_since GROUP BY 1, 2 ORDER BY 1
  ),
  top_matches AS (
    SELECT match_key, SUM(tokens_input + tokens_output) AS total_tokens, COUNT(*) AS gens
    FROM ai_tip_cache WHERE created_at >= now() - interval '7 days'
    GROUP BY match_key ORDER BY total_tokens DESC LIMIT 10
  ),
  top_users AS (
    SELECT generated_by_user_id AS user_id, SUM(tokens_input + tokens_output) AS total_tokens, COUNT(*) AS gens
    FROM ai_tip_cache WHERE generated_by_user_id IS NOT NULL AND created_at >= now() - interval '7 days'
    GROUP BY generated_by_user_id ORDER BY total_tokens DESC LIMIT 10
  ),
  cache_stats AS (
    SELECT COUNT(*) FILTER (WHERE event_type = 'cache_hit_free') AS cache_hits,
           COUNT(*) FILTER (WHERE event_type IN ('consume_daily','consume_bonus','consume_purchased','preview_use')) AS misses
    FROM ai_credit_log WHERE created_at >= v_since
  )
  SELECT jsonb_build_object(
    'period_days', p_period_days,
    'summary', (SELECT to_jsonb(a) FROM agg a),
    'cost_estimate_usd', (
      SELECT ROUND(
        (COALESCE(total_input,0)::numeric / 1000000 * v_input_cost_per_mtok) +
        (COALESCE(total_output,0)::numeric / 1000000 * v_output_cost_per_mtok) +
        (COALESCE(total_cached,0)::numeric / 1000000 * v_cached_cost_per_mtok)
      , 4) FROM agg
    ),
    'daily_breakdown', (SELECT jsonb_agg(to_jsonb(d)) FROM daily d),
    'top_matches_7d', (SELECT jsonb_agg(to_jsonb(t)) FROM top_matches t),
    'top_users_7d', (SELECT jsonb_agg(to_jsonb(t)) FROM top_users t),
    'cache_hit_rate', (
      SELECT CASE WHEN (cache_hits + misses) = 0 THEN 0
                  ELSE ROUND(cache_hits::numeric / (cache_hits + misses) * 100, 2) END
      FROM cache_stats
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ============ RLS ============
ALTER TABLE public.ai_tip_cache         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_daily      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_extras     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_packages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_purchase   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_match_altenar_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prematch_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_featured_matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_team_aliases      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_tip_cache_read"  ON public.ai_tip_cache FOR SELECT USING (true);
CREATE POLICY "ai_tip_cache_admin" ON public.ai_tip_cache FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_credit_daily_self_or_admin" ON public.ai_credit_daily FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "ai_credit_daily_admin_write" ON public.ai_credit_daily FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_credit_extras_self_or_admin" ON public.ai_credit_extras FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "ai_credit_extras_admin_write" ON public.ai_credit_extras FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_credit_log_self_or_admin" ON public.ai_credit_log FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "ai_credit_log_admin_write" ON public.ai_credit_log FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_credit_purchase_self_or_admin" ON public.ai_credit_purchase FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "ai_credit_purchase_admin_write" ON public.ai_credit_purchase FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_credit_packages_read"  ON public.ai_credit_packages FOR SELECT USING (true);
CREATE POLICY "ai_credit_packages_admin" ON public.ai_credit_packages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_feedback_read_self_or_admin" ON public.ai_feedback FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "ai_feedback_insert_self" ON public.ai_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_feedback_admin_write" ON public.ai_feedback FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_match_altenar_read"  ON public.ai_match_altenar_map FOR SELECT USING (true);
CREATE POLICY "ai_match_altenar_admin" ON public.ai_match_altenar_map FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_prematch_jobs_admin" ON public.ai_prematch_jobs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_featured_matches_admin" ON public.ai_featured_matches FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ai_team_aliases_read"  ON public.ai_team_aliases FOR SELECT USING (true);
CREATE POLICY "ai_team_aliases_admin" ON public.ai_team_aliases FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============ SEEDS ============
INSERT INTO public.ai_credit_packages (slug, name, price_brl, credits_amount, sort_order) VALUES
  ('pacote_10',  '10 créditos',   9.90, 10,  10),
  ('pacote_30',  '30 créditos',  19.90, 30,  20),
  ('pacote_100', '100 créditos', 49.90, 100, 30)
ON CONFLICT (slug) DO NOTHING;

-- ============ GRANTS ============
GRANT EXECUTE ON FUNCTION public.check_and_debit_credit(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.grant_bonus_credits(uuid, int, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_purchased_credits(uuid, int, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_credit_balance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_telemetry_dashboard(int) TO authenticated, service_role;
