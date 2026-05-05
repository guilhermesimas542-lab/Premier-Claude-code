BEGIN;

UPDATE features SET included_in_premium = true,  included_in_diamante = true
  WHERE key = 'odds_ultra';

UPDATE features SET included_in_premium = false, included_in_diamante = true
  WHERE key = 'mercados_secundarios';

UPDATE features SET included_in_diamante = true
  WHERE key IN ('odds_safes','odds_pro','odds_ultra','mercados_secundarios',
                'alavancagem','multiplas_bingo','esportes_americanos');

UPDATE features SET included_in_premium = true
  WHERE key IN ('odds_safes','odds_pro','odds_ultra');

UPDATE features SET included_in_premium = false
  WHERE key IN ('mercados_secundarios','alavancagem','multiplas_bingo','esportes_americanos');

DO $$
DECLARE r record; v_bad int := 0;
BEGIN
  FOR r IN SELECT key, included_in_premium, included_in_diamante FROM features
           WHERE key IN ('odds_safes','odds_pro','odds_ultra','mercados_secundarios',
                         'alavancagem','multiplas_bingo','esportes_americanos')
  LOOP
    RAISE NOTICE '% -- premium=% diamante=%', r.key, r.included_in_premium, r.included_in_diamante;
  END LOOP;

  SELECT count(*) INTO v_bad FROM features
   WHERE key IN ('odds_safes','odds_pro','odds_ultra') AND included_in_premium = false;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Premium nao tem as 3 features esperadas'; END IF;

  SELECT count(*) INTO v_bad FROM features
   WHERE key = 'mercados_secundarios' AND included_in_premium = true;
  IF v_bad > 0 THEN RAISE EXCEPTION 'mercados_secundarios ainda em Premium'; END IF;

  RAISE NOTICE 'Features OK';
END $$;

COMMIT;