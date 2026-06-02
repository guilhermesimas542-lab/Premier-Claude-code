-- ============================================================
-- Sub-fase 2.1 — Schema de Jornadas (CRM Premier FC)
--
-- STATUS: arquivo local — NÃO aplicado em produção.
-- Quando aprovado, transformar em migration:
--   supabase/migrations/<timestamp>_crm_journeys.sql
--
-- 4 tabelas:
--   crm_journeys              — definição da jornada
--   crm_journey_steps         — passos ordenados
--   crm_journey_enrollments   — leads inscritos
--   crm_journey_step_events   — log granular por step/lead
--
-- Padrões seguidos do schema de Schedules (1.2):
--   - UUID PK com gen_random_uuid()
--   - RLS habilitada + policy is_admin() em todas
--   - Trigger updated_at em todas
--   - FK com ON DELETE adequado
--   - Indexes em status/foreign keys/created_at
-- ============================================================

-- ============================================================
-- 1. crm_journeys
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,

  -- Trigger: quando um lead entra na jornada
  --   onboarding         → novo cadastro
  --   upgrade            → upgrade de plano
  --   churn_inactive     → X dias sem login
  --   manual             → entrada manual via admin
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'onboarding','upgrade','churn_inactive','manual'
  )),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Exemplo trigger_config:
  --   churn_inactive: { "days_inactive": 7 }
  --   upgrade:        { "from_plan": "free", "to_plan": "premium" }

  -- Audiência (reusa filtros de Schedules) — opcional como "guard"
  audience_id uuid REFERENCES public.crm_audiences(id) ON DELETE SET NULL,
  audience_filters jsonb,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','active','paused','archived'
  )),

  -- Estatísticas agregadas (cacheadas)
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Estrutura sugerida de stats:
  --   { "active": 120, "completed": 340, "cancelled": 12, "completion_rate": 0.65 }

  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_journeys_status     ON public.crm_journeys (status);
CREATE INDEX IF NOT EXISTS idx_crm_journeys_trigger    ON public.crm_journeys (trigger_type);
CREATE INDEX IF NOT EXISTS idx_crm_journeys_created_at ON public.crm_journeys (created_at DESC);

-- ============================================================
-- 2. crm_journey_steps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_journey_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.crm_journeys(id) ON DELETE CASCADE,

  step_order int NOT NULL,

  channel text NOT NULL CHECK (channel IN (
    'email','sms','telegram_group','telegram_x1','whatsapp','push','popup'
  )),

  -- Mesmo formato do crm_schedules.content (varia por canal)
  content jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Delay relativo ao step anterior (ou ao enrollment, no primeiro step)
  delay_value int NOT NULL DEFAULT 0,
  delay_unit text NOT NULL DEFAULT 'day' CHECK (delay_unit IN (
    'minute','hour','day','week'
  )),

  -- Sub-filtro opcional aplicado no envio deste step específico
  audience_filters jsonb,

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),

  UNIQUE (journey_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_crm_journey_steps_journey ON public.crm_journey_steps (journey_id, step_order);

-- ============================================================
-- 3. crm_journey_enrollments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_journey_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.crm_journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  current_step_id uuid REFERENCES public.crm_journey_steps(id) ON DELETE SET NULL,
  current_step_at timestamptz, -- quando entrou no step atual (base para o delay do próximo)

  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active','completed','cancelled','churned'
  )),

  enrolled_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Regra de negócio crítica: sem duplicidade de jornadas
  -- (mesmo lead não pode estar 2x ativo na mesma jornada).
  -- Permitimos reentrada após completed/cancelled, então a unicidade é
  -- apenas para enrollments ativos — controlada por índice parcial.
  CONSTRAINT crm_journey_enrollments_user_journey UNIQUE (journey_id, user_id, enrolled_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_journey_enrollments_active
  ON public.crm_journey_enrollments (journey_id, user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_journey  ON public.crm_journey_enrollments (journey_id);
CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_user     ON public.crm_journey_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_status   ON public.crm_journey_enrollments (status);
CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_step     ON public.crm_journey_enrollments (current_step_id);

-- ============================================================
-- 4. crm_journey_step_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_journey_step_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.crm_journey_enrollments(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.crm_journey_steps(id) ON DELETE CASCADE,

  channel text NOT NULL,
  content_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','sent','delivered','failed','opened','clicked','skipped'
  )),

  provider_message_id text,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_journey_step_events_enrollment ON public.crm_journey_step_events (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_crm_journey_step_events_step       ON public.crm_journey_step_events (step_id);
CREATE INDEX IF NOT EXISTS idx_crm_journey_step_events_status     ON public.crm_journey_step_events (status);

-- ============================================================
-- Triggers updated_at — assume função public.set_updated_at() existente
-- (criada no schema de Schedules 1.2)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_crm_journeys_updated_at            ON public.crm_journeys;
DROP TRIGGER IF EXISTS trg_crm_journey_steps_updated_at       ON public.crm_journey_steps;
DROP TRIGGER IF EXISTS trg_crm_journey_enrollments_updated_at ON public.crm_journey_enrollments;
DROP TRIGGER IF EXISTS trg_crm_journey_step_events_updated_at ON public.crm_journey_step_events;

CREATE TRIGGER trg_crm_journeys_updated_at
  BEFORE UPDATE ON public.crm_journeys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_crm_journey_steps_updated_at
  BEFORE UPDATE ON public.crm_journey_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_crm_journey_enrollments_updated_at
  BEFORE UPDATE ON public.crm_journey_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_crm_journey_step_events_updated_at
  BEFORE UPDATE ON public.crm_journey_step_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS — mesma policy is_admin() do schema de Schedules
-- ============================================================
ALTER TABLE public.crm_journeys              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_journey_steps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_journey_enrollments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_journey_step_events   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_journeys_admin_all              ON public.crm_journeys;
DROP POLICY IF EXISTS crm_journey_steps_admin_all         ON public.crm_journey_steps;
DROP POLICY IF EXISTS crm_journey_enrollments_admin_all   ON public.crm_journey_enrollments;
DROP POLICY IF EXISTS crm_journey_step_events_admin_all   ON public.crm_journey_step_events;

CREATE POLICY crm_journeys_admin_all
  ON public.crm_journeys
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY crm_journey_steps_admin_all
  ON public.crm_journey_steps
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY crm_journey_enrollments_admin_all
  ON public.crm_journey_enrollments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY crm_journey_step_events_admin_all
  ON public.crm_journey_step_events
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- FIM — 2.1 schema das jornadas
-- ============================================================
