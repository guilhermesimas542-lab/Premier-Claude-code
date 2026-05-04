DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== BEFORE: distribuicao tier_required + addon_required ===';
  FOR r IN
    SELECT tier_required::text AS tier, COALESCE(addon_required::text,'NULL') AS addon, COUNT(*) AS c
    FROM public.content_entries
    GROUP BY tier_required, addon_required
    ORDER BY 1,2
  LOOP
    RAISE NOTICE 'tier=% addon=% count=%', r.tier, r.addon, r.c;
  END LOOP;
END $$;

UPDATE public.content_entries SET feature_required = 'odds_safes'  WHERE tier_required = 'basic' AND addon_required IS NULL;
UPDATE public.content_entries SET feature_required = 'odds_pro'    WHERE tier_required = 'pro'   AND addon_required IS NULL;
UPDATE public.content_entries SET feature_required = 'alavancagem' WHERE tier_required = 'pro'   AND addon_required = 'alavancagem';
UPDATE public.content_entries SET feature_required = 'odds_pro'    WHERE tier_required = 'pro'   AND addon_required = 'desaltas';
UPDATE public.content_entries SET feature_required = 'odds_pro'    WHERE tier_required = 'ultra' AND addon_required IS NULL;
UPDATE public.content_entries SET feature_required = NULL          WHERE tier_required = 'free'  AND addon_required IS NULL;

DO $$
DECLARE
  r record;
  v_bad int;
BEGIN
  RAISE NOTICE '=== AFTER: distribuicao feature_required ===';
  FOR r IN
    SELECT COALESCE(feature_required,'NULL') AS feat, COUNT(*) AS c
    FROM public.content_entries
    GROUP BY feature_required
    ORDER BY 1
  LOOP
    RAISE NOTICE 'feature=% count=%', r.feat, r.c;
  END LOOP;

  SELECT COUNT(*) INTO v_bad
  FROM public.content_entries
  WHERE tier_required <> 'free' AND feature_required IS NULL;
  RAISE NOTICE '=== Tips nao-free com feature_required NULL: % ===', v_bad;
END $$;