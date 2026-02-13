
-- 1. Admin emails table (controle de acesso)
CREATE TABLE public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function (bypasses RLS, sem recursão)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails WHERE email = auth.email()
  )
$$;

-- 3. Policy admin_emails (somente admins veem/gerenciam)
CREATE POLICY "Admins full access admin_emails"
ON public.admin_emails FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  target_email text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access notifications"
ON public.notifications FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Adicionar colunas faltantes em content_entries
ALTER TABLE public.content_entries
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS team1_name text,
  ADD COLUMN IF NOT EXISTS team1_shirt_variant text DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS team1_primary_color text,
  ADD COLUMN IF NOT EXISTS team1_secondary_color text,
  ADD COLUMN IF NOT EXISTS team2_name text,
  ADD COLUMN IF NOT EXISTS team2_shirt_variant text DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS team2_primary_color text,
  ADD COLUMN IF NOT EXISTS team2_secondary_color text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS category_explanation text,
  ADD COLUMN IF NOT EXISTS condition_to_win text,
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS justification text,
  ADD COLUMN IF NOT EXISTS link text;

-- 6. Policies de UPDATE/DELETE para admins em tabelas existentes
CREATE POLICY "Admins can update banners"
ON public.content_banners FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete banners"
ON public.content_banners FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update entries"
ON public.content_entries FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete entries"
ON public.content_entries FOR DELETE
TO authenticated
USING (public.is_admin());
