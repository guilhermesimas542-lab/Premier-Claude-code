CREATE TABLE IF NOT EXISTS public.ai_altenar_championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_football_league_id INTEGER NOT NULL UNIQUE,
  altenar_champ_id INTEGER NOT NULL,
  altenar_cat_id INTEGER,
  altenar_sport_id INTEGER NOT NULL DEFAULT 66,
  league_name TEXT NOT NULL,
  country TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_sync_events_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aac_active ON public.ai_altenar_championships(active);

ALTER TABLE public.ai_altenar_championships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aac_read" ON public.ai_altenar_championships
  FOR SELECT USING (true);

CREATE POLICY "aac_admin_all" ON public.ai_altenar_championships
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.ai_match_altenar_map
  ADD COLUMN IF NOT EXISTS altenar_event_url TEXT;

INSERT INTO public.ai_altenar_championships
  (api_football_league_id, altenar_champ_id, altenar_cat_id, league_name, country)
VALUES
  (71, 11318, 593, 'Brasileirão A', 'Brasil')
ON CONFLICT (api_football_league_id) DO UPDATE SET
  altenar_champ_id = EXCLUDED.altenar_champ_id,
  altenar_cat_id = EXCLUDED.altenar_cat_id,
  league_name = EXCLUDED.league_name,
  country = EXCLUDED.country,
  updated_at = now();