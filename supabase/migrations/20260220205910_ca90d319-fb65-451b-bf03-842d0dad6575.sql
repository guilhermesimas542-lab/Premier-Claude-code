-- Make title optional with empty default in content_banners
ALTER TABLE public.content_banners ALTER COLUMN title SET DEFAULT '';
