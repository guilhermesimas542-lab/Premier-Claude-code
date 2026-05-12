ALTER TABLE ai_tip_cache
  ADD COLUMN IF NOT EXISTS hit_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE ai_tip_cache
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ai_tip_cache_hit_count
  ON ai_tip_cache(hit_count DESC, generated_at DESC);

CREATE OR REPLACE FUNCTION public.increment_tip_hit(p_tip_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_tip_cache
  SET hit_count = COALESCE(hit_count, 0) + 1,
      last_used_at = now()
  WHERE id = p_tip_id;
END;
$$;