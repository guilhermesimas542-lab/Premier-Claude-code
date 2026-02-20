
-- 1. Create betting_houses table
CREATE TABLE public.betting_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  iframe_url TEXT NOT NULL DEFAULT '',
  aviator_url TEXT,
  roleta_url TEXT,
  mines_url TEXT,
  football_studio_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.betting_houses ENABLE ROW LEVEL SECURITY;

-- Public read access (frontend needs to read house data)
CREATE POLICY "Allow read for all" ON public.betting_houses
  FOR SELECT USING (true);

-- Only admins can manage houses
CREATE POLICY "Admins can manage betting_houses" ON public.betting_houses
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 2. Insert initial houses
INSERT INTO public.betting_houses (name, slug, iframe_url, is_default, is_active)
VALUES 
  ('Esportiva Bet', 'esportiva-bet', 'https://esportiva.bet', true, true),
  ('Vamo de Bet', 'vamo-de-bet', 'https://vamodebet.bet', false, true);

-- 3. Add betting_house_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS betting_house_id UUID REFERENCES public.betting_houses(id);

-- 4. Migrate all existing users to Vamo de Bet
UPDATE public.users
SET betting_house_id = (SELECT id FROM public.betting_houses WHERE slug = 'vamo-de-bet')
WHERE betting_house_id IS NULL;

-- 5. Add house-specific link columns to content_entries
ALTER TABLE public.content_entries ADD COLUMN IF NOT EXISTS link_house_1 TEXT;
ALTER TABLE public.content_entries ADD COLUMN IF NOT EXISTS link_house_2 TEXT;
ALTER TABLE public.content_entries ADD COLUMN IF NOT EXISTS link_house_3 TEXT;
