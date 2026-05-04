
-- ============================================================
-- MIGRATION 05 — CUTOVER DE TIERS (basic/pro/ultra → premium/diamante)
-- ============================================================

-- 1) SNAPSHOT pré-migração (preserva estado atual)
CREATE TABLE IF NOT EXISTS public.users_premigration_snapshot AS
SELECT 
  id,
  email,
  main_tier AS legacy_main_tier,
  betting_house_id,
  origin,
  created_at,
  first_access_at,
  last_seen_at,
  now() AS snapshot_taken_at
FROM public.users;

-- Garante RLS no snapshot (admin-only)
ALTER TABLE public.users_premigration_snapshot ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'users_premigration_snapshot'
      AND policyname = 'Admins can read snapshot'
  ) THEN
    CREATE POLICY "Admins can read snapshot"
      ON public.users_premigration_snapshot
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

-- 2) Adiciona valores novos ao enum main_tier (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'premium' AND enumtypid = 'main_tier'::regtype) THEN
    ALTER TYPE main_tier ADD VALUE 'premium';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'diamante' AND enumtypid = 'main_tier'::regtype) THEN
    ALTER TYPE main_tier ADD VALUE 'diamante';
  END IF;
END $$;
