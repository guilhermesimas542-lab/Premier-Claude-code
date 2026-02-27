
CREATE TABLE public.pay_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  associated_plan TEXT NOT NULL,
  has_intro_popup BOOLEAN DEFAULT false,
  popup_config JSONB DEFAULT '{}'::jsonb,
  quiz_questions JSONB DEFAULT '[]'::jsonb,
  checkout_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pay_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pay_cards" ON public.pay_cards FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow read for all pay_cards" ON public.pay_cards FOR SELECT USING (true);
