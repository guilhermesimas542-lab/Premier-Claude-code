-- 1. crm_journeys
CREATE TABLE IF NOT EXISTS public.crm_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('onboarding','upgrade','churn_inactive','manual')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_id uuid REFERENCES public.crm_audiences(id) ON DELETE SET NULL,
  audience_filters jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journeys TO authenticated;
GRANT ALL ON public.crm_journeys TO service_role;
ALTER TABLE public.crm_journeys ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_crm_journeys_status     ON public.crm_journeys (status);
CREATE INDEX IF NOT EXISTS idx_crm_journeys_trigger    ON public.crm_journeys (trigger_type);
CREATE INDEX IF NOT EXISTS idx_crm_journeys_created_at ON public.crm_journeys (created_at DESC);

-- 2. crm_journey_steps
CREATE TABLE IF NOT EXISTS public.crm_journey_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.crm_journeys(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','telegram_group','telegram_x1','whatsapp','push','popup')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  delay_value int NOT NULL DEFAULT 0,
  delay_unit text NOT NULL DEFAULT 'day' CHECK (delay_unit IN ('minute','hour','day','week')),
  audience_filters jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (journey_id, step_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journey_steps TO authenticated;
GRANT ALL ON public.crm_journey_steps TO service_role;
ALTER TABLE public.crm_journey_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_crm_journey_steps_journey ON public.crm_journey_steps (journey_id, step_order);

-- 3. crm_journey_enrollments
CREATE TABLE IF NOT EXISTS public.crm_journey_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.crm_journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_step_id uuid REFERENCES public.crm_journey_steps(id) ON DELETE SET NULL,
  current_step_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled','churned')),
  enrolled_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT crm_journey_enrollments_user_journey UNIQUE (journey_id, user_id, enrolled_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journey_enrollments TO authenticated;
GRANT ALL ON public.crm_journey_enrollments TO service_role;
ALTER TABLE public.crm_journey_enrollments ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_journey_enrollments_active
  ON public.crm_journey_enrollments (journey_id, user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_journey  ON public.crm_journey_enrollments (journey_id);
CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_user     ON public.crm_journey_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_status   ON public.crm_journey_enrollments (status);
CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_step     ON public.crm_journey_enrollments (current_step_id);

-- 4. crm_journey_step_events
CREATE TABLE IF NOT EXISTS public.crm_journey_step_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.crm_journey_enrollments(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.crm_journey_steps(id) ON DELETE CASCADE,
  channel text NOT NULL,
  content_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','opened','clicked','skipped')),
  provider_message_id text,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journey_step_events TO authenticated;
GRANT ALL ON public.crm_journey_step_events TO service_role;
ALTER TABLE public.crm_journey_step_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_crm_journey_step_events_enrollment ON public.crm_journey_step_events (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_crm_journey_step_events_step       ON public.crm_journey_step_events (step_id);
CREATE INDEX IF NOT EXISTS idx_crm_journey_step_events_status     ON public.crm_journey_step_events (status);

-- Função updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_crm_journeys_updated_at            ON public.crm_journeys;
DROP TRIGGER IF EXISTS trg_crm_journey_steps_updated_at       ON public.crm_journey_steps;
DROP TRIGGER IF EXISTS trg_crm_journey_enrollments_updated_at ON public.crm_journey_enrollments;
DROP TRIGGER IF EXISTS trg_crm_journey_step_events_updated_at ON public.crm_journey_step_events;

CREATE TRIGGER trg_crm_journeys_updated_at BEFORE UPDATE ON public.crm_journeys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_journey_steps_updated_at BEFORE UPDATE ON public.crm_journey_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_journey_enrollments_updated_at BEFORE UPDATE ON public.crm_journey_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_journey_step_events_updated_at BEFORE UPDATE ON public.crm_journey_step_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS (só admin)
DROP POLICY IF EXISTS crm_journeys_admin_all              ON public.crm_journeys;
DROP POLICY IF EXISTS crm_journey_steps_admin_all         ON public.crm_journey_steps;
DROP POLICY IF EXISTS crm_journey_enrollments_admin_all   ON public.crm_journey_enrollments;
DROP POLICY IF EXISTS crm_journey_step_events_admin_all   ON public.crm_journey_step_events;

CREATE POLICY crm_journeys_admin_all ON public.crm_journeys
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY crm_journey_steps_admin_all ON public.crm_journey_steps
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY crm_journey_enrollments_admin_all ON public.crm_journey_enrollments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY crm_journey_step_events_admin_all ON public.crm_journey_step_events
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());