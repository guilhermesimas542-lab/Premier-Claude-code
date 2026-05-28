BEGIN;

-- Helper trigger function
CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====== 1. crm_audiences ======
CREATE TABLE public.crm_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
GRANT ALL ON public.crm_audiences TO service_role;
ALTER TABLE public.crm_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_audiences_admin_all ON public.crm_audiences FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX crm_audiences_created_by_idx ON public.crm_audiences(created_by);
CREATE INDEX crm_audiences_created_at_idx ON public.crm_audiences(created_at DESC);
CREATE TRIGGER crm_audiences_updated_at
  BEFORE UPDATE ON public.crm_audiences
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
COMMENT ON TABLE public.crm_audiences IS 'Filtros reutilizáveis compartilhados entre Schedules e Jornadas';
COMMENT ON COLUMN public.crm_audiences.filters IS 'JSONB: { plans: [], status: [], days_since_login: {gte,lte}, opt_ins: [], origin: ''payt''|''db_app'' }';

-- ====== 2. crm_schedules ======
CREATE TABLE public.crm_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN (
    'email','sms','telegram_group','telegram_x1','whatsapp','push','popup'
  )),
  audience_id uuid REFERENCES public.crm_audiences(id) ON DELETE SET NULL,
  audience_filters jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','scheduled','sending','sent','failed','paused'
  )),
  reach_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  open_count int NOT NULL DEFAULT 0,
  click_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_schedules_audience_check CHECK (
    audience_id IS NOT NULL OR audience_filters IS NOT NULL
  )
);
GRANT ALL ON public.crm_schedules TO service_role;
ALTER TABLE public.crm_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_schedules_admin_all ON public.crm_schedules FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX crm_schedules_status_idx ON public.crm_schedules(status);
CREATE INDEX crm_schedules_channel_idx ON public.crm_schedules(channel);
CREATE INDEX crm_schedules_scheduled_at_idx ON public.crm_schedules(scheduled_at);
CREATE INDEX crm_schedules_created_at_idx ON public.crm_schedules(created_at DESC);
CREATE TRIGGER crm_schedules_updated_at
  BEFORE UPDATE ON public.crm_schedules
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
COMMENT ON TABLE public.crm_schedules IS 'Disparos pontuais ou agendados por canal';
COMMENT ON COLUMN public.crm_schedules.content IS 'Email: {subject, body, html}. SMS/Push/Tel: {body}. WhatsApp: {body, template_id}';

-- ====== 3. crm_schedule_events ======
CREATE TABLE public.crm_schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.crm_schedules(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_identifier text,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','sent','delivered','failed','opened','clicked','bounced'
  )),
  provider_message_id text,
  error_code text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
GRANT ALL ON public.crm_schedule_events TO service_role;
ALTER TABLE public.crm_schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_schedule_events_admin_all ON public.crm_schedule_events FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX crm_schedule_events_schedule_idx ON public.crm_schedule_events(schedule_id);
CREATE INDEX crm_schedule_events_recipient_idx ON public.crm_schedule_events(recipient_user_id);
CREATE INDEX crm_schedule_events_status_idx ON public.crm_schedule_events(status);
CREATE INDEX crm_schedule_events_created_at_idx ON public.crm_schedule_events(created_at DESC);
CREATE TRIGGER crm_schedule_events_updated_at
  BEFORE UPDATE ON public.crm_schedule_events
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
COMMENT ON TABLE public.crm_schedule_events IS 'Log granular: 1 linha por destinatário, com status do envio e webhooks dos third-parties';

-- ====== 4. crm_channel_settings ======
CREATE TABLE public.crm_channel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL UNIQUE CHECK (channel IN (
    'email','sms','telegram_group','telegram_x1','whatsapp','push','popup'
  )),
  provider text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_test_at timestamptz,
  last_test_success boolean,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
GRANT ALL ON public.crm_channel_settings TO service_role;
ALTER TABLE public.crm_channel_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_channel_settings_admin_all ON public.crm_channel_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER crm_channel_settings_updated_at
  BEFORE UPDATE ON public.crm_channel_settings
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();
COMMENT ON TABLE public.crm_channel_settings IS 'Configuração e status de integração dos 7 canais. ⚠️ Chaves de API ideal usar Supabase Vault.';

-- ====== 5. SEED ======
INSERT INTO public.crm_channel_settings (channel, provider, active, notes) VALUES
  ('email',          'resend',           false, 'Configurar RESEND_API_KEY como secret'),
  ('sms',            'sms_funnel',       false, 'Configurar SMS_FUNNEL_KEY como secret'),
  ('telegram_group', 'telegram_direct',  false, 'Configurar TELEGRAM_BOT_TOKEN e GROUP_ID'),
  ('telegram_x1',    'sendpulse',        false, 'Sem filtro por cliente (broadcast SendPulse)'),
  ('whatsapp',       'whatsapp_official',false, 'Configurar credenciais WhatsApp Business API'),
  ('push',           'pending',          false, 'Ferramenta de push notification a definir'),
  ('popup',          'pending',          false, 'Decidir: dev interno ou ferramenta externa')
ON CONFLICT (channel) DO NOTHING;

COMMIT;