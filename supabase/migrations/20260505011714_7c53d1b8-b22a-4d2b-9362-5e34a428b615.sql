UPDATE public.features SET included_in_premium = true WHERE key = 'mercados_secundarios';

DO $$
DECLARE v_premium boolean; v_diamante boolean;
BEGIN
  SELECT included_in_premium, included_in_diamante INTO v_premium, v_diamante FROM features WHERE key = 'mercados_secundarios';
  IF NOT (v_premium AND v_diamante) THEN
    RAISE EXCEPTION 'mercados_secundarios deve estar em premium=true, diamante=true. Got premium=%, diamante=%', v_premium, v_diamante;
  END IF;
END $$;