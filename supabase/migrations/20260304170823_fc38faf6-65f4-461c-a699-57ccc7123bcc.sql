ALTER TABLE public.content_banners ADD COLUMN IF NOT EXISTS action_type text NOT NULL DEFAULT 'external_link';
ALTER TABLE public.content_banners ADD COLUMN IF NOT EXISTS action_value text;