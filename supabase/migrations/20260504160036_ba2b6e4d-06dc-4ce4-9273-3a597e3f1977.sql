-- ============================================
-- MIGRATION 01: Foundation
-- Enums + features table + content_entries.feature_required + products_catalog.pricing
-- NOTHING in cassino. NOTHING in vitalicio entitlements.
-- ============================================

-- 1.1 Extend main_tier enum (premium, diamante)
ALTER TYPE public.main_tier ADD VALUE IF NOT EXISTS 'premium';
ALTER TYPE public.main_tier ADD VALUE IF NOT EXISTS 'diamante';

-- 1.2 Extend product_key enum with FOOTBALL/TIPS features only
ALTER TYPE public.product_key ADD VALUE IF NOT EXISTS 'odds_safes';
ALTER TYPE public.product_key ADD VALUE IF NOT EXISTS 'odds_pro';
ALTER TYPE public.product_key ADD VALUE IF NOT EXISTS 'multiplas_bingo';
ALTER TYPE public.product_key ADD VALUE IF NOT EXISTS 'mercados_secundarios';
ALTER TYPE public.product_key ADD VALUE IF NOT EXISTS 'esportes_americanos';

-- 1.3 Features registry
CREATE TABLE IF NOT EXISTS public.features (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  included_in_premium boolean NOT NULL DEFAULT false,
  included_in_diamante boolean NOT NULL DEFAULT false,
  is_addon boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all features"
  ON public.features FOR SELECT USING (true);

CREATE POLICY "Admins manage features"
  ON public.features FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 1.4 content_entries.feature_required (text FK to features.key, nullable during transition)
ALTER TABLE public.content_entries
  ADD COLUMN IF NOT EXISTS feature_required text REFERENCES public.features(key);

CREATE INDEX IF NOT EXISTS idx_content_entries_feature_required
  ON public.content_entries(feature_required)
  WHERE feature_required IS NOT NULL;

-- 1.5 products_catalog.pricing (jsonb, for new PayT products)
ALTER TABLE public.products_catalog
  ADD COLUMN IF NOT EXISTS pricing jsonb NOT NULL DEFAULT '{}'::jsonb;
