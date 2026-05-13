ALTER TABLE public.ai_user_rejected_fixtures
  ADD COLUMN IF NOT EXISTS rejected_team_id INTEGER,
  ADD COLUMN IF NOT EXISTS rejected_league_ids INTEGER[];

ALTER TABLE public.ai_user_rejected_fixtures
  ALTER COLUMN fixture_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rejections_team
  ON public.ai_user_rejected_fixtures(user_id, query_normalized, rejected_team_id)
  WHERE rejected_team_id IS NOT NULL;
