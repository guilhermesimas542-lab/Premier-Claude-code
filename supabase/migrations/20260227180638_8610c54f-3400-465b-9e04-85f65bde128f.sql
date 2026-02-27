
-- 1. Add badges array column
ALTER TABLE public.cards ADD COLUMN badges TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Migrate existing badge_text data into badges array
UPDATE public.cards SET badges = ARRAY[badge_text] WHERE badge_text IS NOT NULL AND badge_text != '';

-- 3. Drop old badge_text column
ALTER TABLE public.cards DROP COLUMN badge_text;

-- 4. Add image_urls JSONB column
ALTER TABLE public.cards ADD COLUMN image_urls JSONB DEFAULT '{}'::JSONB;

-- 5. Migrate existing image_url data into image_urls
UPDATE public.cards SET image_urls = jsonb_build_object('mobile', image_url) WHERE image_url IS NOT NULL AND image_url != '';

-- 6. Drop old image_url column
ALTER TABLE public.cards DROP COLUMN image_url;
