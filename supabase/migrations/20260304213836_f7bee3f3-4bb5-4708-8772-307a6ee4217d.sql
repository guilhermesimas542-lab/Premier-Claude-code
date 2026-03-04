
-- Add lastlink_product_uuid column to products_catalog
ALTER TABLE public.products_catalog ADD COLUMN lastlink_product_uuid uuid NULL;

-- Drop raw_webhook_logs table (no longer needed)
DROP TABLE IF EXISTS public.raw_webhook_logs;
