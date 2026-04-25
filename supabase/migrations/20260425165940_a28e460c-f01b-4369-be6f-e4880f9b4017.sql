ALTER TABLE public.products_catalog 
DROP CONSTRAINT IF EXISTS products_catalog_provider_provider_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS products_catalog_unique_key 
ON public.products_catalog (
  provider, 
  provider_product_id, 
  COALESCE(entitlement_key, ''), 
  COALESCE(tier, '')
);