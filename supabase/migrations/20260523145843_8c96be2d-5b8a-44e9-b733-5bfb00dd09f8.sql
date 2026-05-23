
-- B.1: Trim global em provider_product_id
UPDATE public.products_catalog
SET provider_product_id = trim(provider_product_id)
WHERE provider_product_id <> trim(provider_product_id);

-- B.4: RPC de backfill — replica lógica essencial do webhook payment-webhook
-- de forma idempotente (usa orders.unique_key + provider_event_id) e respeita
-- política de "upgrade only" (TIER_RANK).
CREATE OR REPLACE FUNCTION public.admin_replay_payt_webhook(p_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.webhook_logs%ROWTYPE;
  v_payload jsonb;
  v_email text;
  v_status text;
  v_product_code text;
  v_tx_id text;
  v_user public.users;
  v_catalog_row record;
  v_tier_to_set text;
  v_entitlement text;
  v_current_tier text;
  v_amount numeric;
  v_tier_rank jsonb := jsonb_build_object(
    'free',0,'basic',1,'premium',2,'pro',2,'diamante',3,'ultra',3
  );
  v_unique_key text;
BEGIN
  SELECT * INTO v_log FROM public.webhook_logs WHERE id = p_log_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'log_not_found');
  END IF;
  IF v_log.processed_ok = true THEN
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
  v_product_code := trim(v_payload->'product'->>'code');
  v_tx_id := coalesce(v_payload->>'transaction_id', v_payload->>'cart_id');

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_email');
  END IF;
  IF v_product_code IS NULL OR v_product_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_product_code');
  END IF;

  -- Lookup catalog (trim-tolerant, active-only — alinhado com webhook)
  SELECT * INTO v_catalog_row
  FROM public.products_catalog
  WHERE provider = 'payt'
    AND trim(provider_product_id) = v_product_code
    AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'product_not_in_catalog', 'code', v_product_code);
  END IF;

  v_tier_to_set := v_catalog_row.tier;
  v_entitlement := v_catalog_row.entitlement_key;

  -- Idempotência: se já existe order para esse tx, marca log e sai
  IF v_tx_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE provider = 'payt' AND provider_order_id = v_tx_id
  ) THEN
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

  -- Grant entitlement
  IF v_entitlement IS NOT NULL THEN
    UPDATE public.entitlements
      SET status = 'revoked'
      WHERE user_id = v_user.id
        AND product_key::text = v_entitlement
        AND status = 'active';
    INSERT INTO public.entitlements(user_id, product_key, source, status, starts_at, ends_at)
      VALUES (v_user.id, v_entitlement::product_key, 'purchase', 'active', now(), null);
  END IF;

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
      ARRAY[v_product_code], v_unique_key, false, v_payload
    );
  EXCEPTION WHEN unique_violation THEN
    NULL; -- já existe
  END;

  -- Log de evento
  INSERT INTO public.events(user_id, event_name, metadata)
  VALUES (v_user.id, 'payment_purchase', jsonb_build_object(
    'provider', 'payt',
    'product_ids', ARRAY[v_product_code],
    'tier', v_tier_to_set,
    'entitlements', CASE WHEN v_entitlement IS NULL THEN ARRAY[]::text[] ELSE ARRAY[v_entitlement] END,
    'email', v_email,
    'replayed', true
  ));

  -- Marca log como processado
  UPDATE public.webhook_logs SET processed_ok = true, error_message = null WHERE id = p_log_id;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_user.id,
    'tier_set', v_tier_to_set,
    'entitlement', v_entitlement,
    'tx_id', v_tx_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_replay_payt_webhook(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_replay_payt_webhook(uuid) TO authenticated, service_role;
