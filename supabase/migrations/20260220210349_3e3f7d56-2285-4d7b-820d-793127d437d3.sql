-- Create popups table for funnel/quiz popup system
CREATE TABLE public.popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  betting_house_id UUID REFERENCES public.betting_houses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  target_audience TEXT NOT NULL DEFAULT 'all',
  image_url TEXT,
  question_1_text TEXT,
  question_1_options JSONB,
  question_2_text TEXT,
  question_2_options JSONB,
  question_3_text TEXT,
  question_3_options JSONB,
  final_title TEXT,
  final_benefits JSONB,
  checkout_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

-- Everyone can read active popups
CREATE POLICY "Allow public read popups"
  ON public.popups FOR SELECT USING (true);

-- Only admins can manage popups
CREATE POLICY "Admins can manage popups"
  ON public.popups FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
