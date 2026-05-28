-- 1. Coluna kind em crm_audiences
ALTER TABLE public.crm_audiences
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'dynamic'
    CHECK (kind IN ('dynamic','static_list'));

-- 2. Tabela crm_audience_members
CREATE TABLE IF NOT EXISTS public.crm_audience_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id uuid NOT NULL REFERENCES public.crm_audiences(id) ON DELETE CASCADE,
  email text,
  phone text,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_audience_members_contact_check
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_audience_members TO authenticated;
GRANT ALL ON public.crm_audience_members TO service_role;

CREATE INDEX IF NOT EXISTS idx_crm_audience_members_audience
  ON public.crm_audience_members (audience_id);
CREATE INDEX IF NOT EXISTS idx_crm_audience_members_user
  ON public.crm_audience_members (user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_audience_members_email
  ON public.crm_audience_members (audience_id, email)
  WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_audience_members_phone
  ON public.crm_audience_members (audience_id, phone)
  WHERE phone IS NOT NULL;

-- 3. RLS — só admin
ALTER TABLE public.crm_audience_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_audience_members_admin_all ON public.crm_audience_members;
CREATE POLICY crm_audience_members_admin_all
  ON public.crm_audience_members
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());