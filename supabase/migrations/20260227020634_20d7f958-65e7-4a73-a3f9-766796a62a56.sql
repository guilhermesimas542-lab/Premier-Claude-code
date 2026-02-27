
-- Cards table
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  card_type TEXT NOT NULL DEFAULT 'info',
  checkout_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  target_audience TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cards" ON public.cards FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow read for all cards" ON public.cards FOR SELECT USING (true);

-- Funnel steps table
CREATE TABLE public.funnel_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT,
  option_d TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage funnel_steps" ON public.funnel_steps FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow read for all funnel_steps" ON public.funnel_steps FOR SELECT USING (true);
