
CREATE OR REPLACE FUNCTION public.admin_replay_payt_webhook(p_log_id uuid, p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log public.webhook_logs%ROWTYPE;
  v_payload jsonb;
  v_email text;
  v_status text;
  v_product_codes text[];
  v_code text;
  v_tx_id text;
  v_user public.users;
  v_catalog_row record;
  v_tier_to_set text;
  v_highest_rank int := -1;
  v_entitlements text[] := ARRAY[]::text[];
  v_current_tier text;
  v_amount numeric;
  v_tier_rank jsonb := jsonb_build_object(
    'free',0,'basic',1,'pro',2,'premium',3,'ultra',4,'diamante',5
  );
  v_unique_key text;
  v_link_title text;
BEGIN
  SELECT * INTO v_log FROM public.webhook_logs WHERE id = p_log_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'log_not_found');
  END IF;
  IF v_log.processed_ok = true AND NOT p_force THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_processed');
  END IF;
  IF v_log.provider <> 'payt' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_payt');
  END IF;

  v_payload := v_log.raw_payload;
  v_status := v_payload->>'status';
  IF v_status <> 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_paid', 'status', v_status);
  END IF;

  v_email := lower(trim(v_payload->'customer'->>'email'));
  v_tx_id := coalesce(v_payload->>'transaction_id', v_payload->>'cart_id');
  v_link_title := lower(coalesce(v_payload->'link'->>'title', ''));

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_email');
  END IF;

  -- Collect all product codes (main + items + order_bumps), with LXGO9W remap
  v_product_codes := ARRAY[]::text[];
  v_code := trim(coalesce(v_payload->'product'->>'code', ''));
  IF v_code <> '' THEN
    IF v_code = 'LXGO9W' THEN
      IF v_link_title LIKE '%odds altas%' THEN v_code := 'LY7ON2';
      ELSIF v_link_title LIKE '%alavancagem%' THEN v_code := 'RDEVAP';
      END IF;
    END IF;
    v_product_codes := array_append(v_product_codes, v_code);
  END IF;

  IF jsonb_typeof(v_payload->'product'->'items') = 'array' THEN
    FOR v_code IN SELECT trim(value->>'code') FROM jsonb_array_elements(v_payload->'product'->'items')
    LOOP
      IF v_code IS NULL OR v_code = '' THEN CONTINUE; END IF;
      IF v_code = 'LXGO9W' THEN
        IF v_link_title LIKE '%odds altas%' THEN v_code := 'LY7ON2';
        ELSIF v_link_title LIKE '%alavancagem%' THEN v_code := 'RDEVAP';
        END IF;
      END IF;
      v_product_codes := array_append(v_product_codes, v_code);
    END LOOP;
  END IF;

  IF jsonb_typeof(v_payload->'order_bumps') = 'array' THEN
    FOR v_code IN SELECT trim(value->'product'->>'code') FROM jsonb_array_elements(v_payload->'order_bumps')
    LOOP
      IF v_code IS NULL OR v_code = '' THEN CONTINUE; END IF;
      IF v_code = 'LXGO9W' THEN
        IF v_link_title LIKE '%odds altas%' THEN v_code := 'LY7ON2';
        ELSIF v_link_title LIKE '%alavancagem%' THEN v_code := 'RDEVAP';
        END IF;
      END IF;
      v_product_codes := array_append(v_product_codes, v_code);
    END LOOP;
  END IF;

  -- Dedupe
  SELECT array_agg(DISTINCT c) INTO v_product_codes
  FROM unnest(v_product_codes) c WHERE c IS NOT NULL AND c <> '';

  IF v_product_codes IS NULL OR array_length(v_product_codes, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_product_codes');
  END IF;

  -- Rank-aggregation across all matched catalog rows
  FOR v_catalog_row IN
    SELECT *
    FROM public.products_catalog
    WHERE provider = 'payt'
      AND trim(provider_product_id) = ANY(v_product_codes)
      AND active = true
      AND coalesce(product_type, 'plan') NOT IN ('ai_credit_pack', 'ai_credit_unlimited')
  LOOP
    IF v_catalog_row.tier IS NOT NULL AND coalesce((v_tier_rank->>v_catalog_row.tier)::int, -1) > v_highest_rank THEN
      v_highest_rank := (v_tier_rank->>v_catalog_row.tier)::int;
      v_tier_to_set := v_catalog_row.tier;
    END IF;
    IF v_catalog_row.entitlement_key IS NOT NULL THEN
      v_entitlements := array_append(v_entitlements, v_catalog_row.entitlement_key);
    END IF;
  END LOOP;

  -- Dedupe entitlements
  SELECT array_agg(DISTINCT e) INTO v_entitlements
  FROM unnest(v_entitlements) e;
  v_entitlements := coalesce(v_entitlements, ARRAY[]::text[]);

  IF v_tier_to_set IS NULL AND array_length(v_entitlements, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_catalog_match', 'codes', v_product_codes);
  END IF;

  -- Idempotência: se já existe order para esse tx, não cria duplicada,
  -- mas com p_force=true ainda aplica tier/entitlements (pode ser que a order
  -- exista mas o upgrade não tenha ocorrido).
  IF v_tx_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE provider = 'payt' AND provider_order_id = v_tx_id
  ) AND NOT p_force THEN
    UPDATE public.webhook_logs SET processed_ok = true, error_message = null WHERE id = p_log_id;
    RETURN jsonb_build_object('ok', true, 'reason', 'order_already_exists');
  END IF;

  -- Get or create user
  v_user := public.get_or_create_user(v_email, null);

  -- Upgrade tier (rank-only)
  IF v_tier_to_set IS NOT NULL THEN
    SELECT main_tier::text INTO v_current_tier FROM public.users WHERE id = v_user.id;
    IF (v_tier_rank->>v_tier_to_set)::int > coalesce((v_tier_rank->>v_current_tier)::int, 0) THEN
      UPDATE public.users
      SET main_tier = v_tier_to_set::main_tier, origin = 'webhook'
      WHERE id = v_user.id;
    ELSE
      UPDATE public.users SET origin = COALESCE(origin, 'webhook') WHERE id = v_user.id;
    END IF;
  END IF;

  -- Grant entitlements (revoke existing active + insert new)
  FOREACH v_code IN ARRAY v_entitlements LOOP
    UPDATE public.entitlements
      SET status = 'revoked'
      WHERE user_id = v_user.id
        AND product_key::text = v_code
        AND status = 'active';
    INSERT INTO public.entitlements(user_id, product_key, source, status, starts_at, ends_at)
      VALUES (v_user.id, v_code::product_key, 'purchase', 'active', now(), null);
  END LOOP;

  -- Insert order (idempotência via UNIQUE(provider, provider_order_id))
  v_amount := coalesce((v_payload->'transaction'->>'total_price')::numeric / 100, 0);
  v_unique_key := 'payt:' || coalesce(v_tx_id, p_log_id::text);

  BEGIN
    INSERT INTO public.orders(
      provider, provider_order_id, provider_event_id, event_name, buyer_email,
      user_id, status, paid_at, amount, product_ids, unique_key, is_test, raw_payload
    )
    VALUES (
      'payt', coalesce(v_tx_id, p_log_id::text), v_tx_id, 'Purchase_Order_Confirmed',
      v_email, v_user.id, 'paid', now(), v_amount,
      v_product_codes, v_unique_key, false, v_payload
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO public.events(user_id, event_name, metadata)
  VALUES (v_user.id, 'payment_purchase', jsonb_build_object(
    'provider', 'payt',
    'product_ids', v_product_codes,
    'tier', v_tier_to_set,
    'entitlements', v_entitlements,
    'email', v_email,
    'replayed', true,
    'forced', p_force
  ));

  UPDATE public.webhook_logs SET processed_ok = true, error_message = null WHERE id = p_log_id;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_user.id,
    'tier_set', v_tier_to_set,
    'entitlements', v_entitlements,
    'codes', v_product_codes,
    'tx_id', v_tx_id,
    'forced', p_force
  );
END;
$function$;
