ALTER TABLE public.ai_tip_cache DROP CONSTRAINT IF EXISTS ai_tip_cache_match_type_check;
ALTER TABLE public.ai_tip_cache
  ADD CONSTRAINT ai_tip_cache_match_type_check
  CHECK (match_type IN ('chat_prematch','live_tip','aux_live_list','aux_odds','aux_standings','aux_upcoming','live'));