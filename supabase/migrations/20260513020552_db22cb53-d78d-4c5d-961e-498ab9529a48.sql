ALTER TABLE public.ai_match_altenar_map
  DROP CONSTRAINT IF EXISTS ai_match_altenar_map_confidence_check;

ALTER TABLE public.ai_match_altenar_map
  ALTER COLUMN confidence DROP DEFAULT;

ALTER TABLE public.ai_match_altenar_map
  ALTER COLUMN confidence TYPE numeric(3,2)
  USING NULLIF(confidence::text, '')::numeric;

ALTER TABLE public.ai_match_altenar_map
  ADD CONSTRAINT ai_match_altenar_map_confidence_range
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));