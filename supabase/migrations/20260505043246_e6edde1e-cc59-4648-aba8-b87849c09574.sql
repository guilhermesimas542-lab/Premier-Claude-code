DO $$
DECLARE
  v_basic_to_premium int;
  v_pro_to_premium int;
  v_ultra_to_diamante int;
  v_jone_updated int;
  v_legacy_remaining int;
BEGIN
  -- 1) basic → premium (exceto pending_review)
  UPDATE public.users
  SET main_tier = 'premium'
  WHERE main_tier = 'basic'
    AND id NOT IN (SELECT user_id FROM public.users_pending_review WHERE user_id IS NOT NULL)
    AND email <> 'jonemanuel01@hotmail.com';
  GET DIAGNOSTICS v_basic_to_premium = ROW_COUNT;

  -- 2) pro → premium (exceto pending_review)
  UPDATE public.users
  SET main_tier = 'premium'
  WHERE main_tier = 'pro'
    AND id NOT IN (SELECT user_id FROM public.users_pending_review WHERE user_id IS NOT NULL);
  GET DIAGNOSTICS v_pro_to_premium = ROW_COUNT;

  -- 3) ultra → diamante (exceto pending_review)
  UPDATE public.users
  SET main_tier = 'diamante'
  WHERE main_tier = 'ultra'
    AND id NOT IN (SELECT user_id FROM public.users_pending_review WHERE user_id IS NOT NULL);
  GET DIAGNOSTICS v_ultra_to_diamante = ROW_COUNT;

  -- 4) Override jonemanuel01 → diamante
  UPDATE public.users
  SET main_tier = 'diamante'
  WHERE email = 'jonemanuel01@hotmail.com';
  GET DIAGNOSTICS v_jone_updated = ROW_COUNT;

  -- 5) Validação: zero legacy fora do pending_review
  SELECT count(*) INTO v_legacy_remaining
  FROM public.users
  WHERE main_tier IN ('basic','pro','ultra')
    AND id NOT IN (SELECT user_id FROM public.users_pending_review WHERE user_id IS NOT NULL);

  IF v_legacy_remaining > 0 THEN
    RAISE EXCEPTION 'Validação falhou: % users com tier legacy fora do pending_review', v_legacy_remaining;
  END IF;

  RAISE NOTICE 'Tier upgrade OK | basic→premium=%, pro→premium=%, ultra→diamante=%, jonemanuel01=%, legacy_remaining_outside_pending=%',
    v_basic_to_premium, v_pro_to_premium, v_ultra_to_diamante, v_jone_updated, v_legacy_remaining;
END $$;