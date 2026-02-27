
-- Add missing columns to popups table for marketing popup support
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS button_text TEXT;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS button_url TEXT;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS trigger_delay_seconds INTEGER DEFAULT 0;

-- Add product_id to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS product_id UUID;
