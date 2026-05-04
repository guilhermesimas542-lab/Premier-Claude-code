UPDATE public.content_entries
SET feature_required = CASE
  WHEN addon_required = 'alavancagem' THEN 'alavancagem'
  WHEN addon_required = 'desaltas'    THEN 'odds_pro'
  WHEN tier_required = 'basic'        THEN 'odds_safes'
  WHEN tier_required IN ('pro','ultra') THEN 'odds_pro'
END
WHERE feature_required IS NULL AND tier_required != 'free';