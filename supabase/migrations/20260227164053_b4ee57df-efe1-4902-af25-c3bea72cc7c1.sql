
-- Add new columns to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'sport';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT 'primary';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS button_text_access TEXT DEFAULT 'Acessar';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS button_text_acquire TEXT DEFAULT 'Adquirir Agora';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS requires_access BOOLEAN DEFAULT FALSE;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS access_field TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
