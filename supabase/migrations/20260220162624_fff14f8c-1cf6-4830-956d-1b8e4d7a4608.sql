
-- Add popup columns to betting_houses
ALTER TABLE public.betting_houses
  ADD COLUMN IF NOT EXISTS popup_welcome_image TEXT,
  ADD COLUMN IF NOT EXISTS popup_welcome_link TEXT,
  ADD COLUMN IF NOT EXISTS popup_basic_image TEXT,
  ADD COLUMN IF NOT EXISTS popup_basic_link TEXT,
  ADD COLUMN IF NOT EXISTS popup_pro_image TEXT,
  ADD COLUMN IF NOT EXISTS popup_pro_link TEXT,
  ADD COLUMN IF NOT EXISTS popup_ultra_image TEXT,
  ADD COLUMN IF NOT EXISTS popup_ultra_link TEXT,
  ADD COLUMN IF NOT EXISTS popup_alavancagem_image TEXT,
  ADD COLUMN IF NOT EXISTS popup_alavancagem_link TEXT,
  ADD COLUMN IF NOT EXISTS popup_odds_altas_image TEXT,
  ADD COLUMN IF NOT EXISTS popup_odds_altas_link TEXT,
  ADD COLUMN IF NOT EXISTS popup_live_telegram_image TEXT,
  ADD COLUMN IF NOT EXISTS popup_live_telegram_link TEXT;

-- Create popups storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('popups', 'popups', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for popups bucket (without IF NOT EXISTS)
CREATE POLICY "Popups publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'popups');

CREATE POLICY "Anyone can upload to popups"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'popups');

CREATE POLICY "Anyone can update popups"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'popups');

CREATE POLICY "Anyone can delete popups"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'popups');
