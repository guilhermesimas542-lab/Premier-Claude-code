
ALTER TABLE public.products_catalog
ADD COLUMN IF NOT EXISTS bundle_name text NULL;

ALTER TABLE public.products_catalog
ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'plan';

UPDATE public.products_catalog SET product_type = 'plan' WHERE tier IS NOT NULL AND entitlement_key IS NULL;
UPDATE public.products_catalog SET product_type = 'addon' WHERE entitlement_key IS NOT NULL AND tier IS NULL;
