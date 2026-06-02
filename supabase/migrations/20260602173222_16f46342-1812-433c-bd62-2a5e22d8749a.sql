-- Adiciona coluna channel nas jornadas (se não existir)
ALTER TABLE public.crm_journeys
  ADD COLUMN IF NOT EXISTS channel text
  CHECK (channel IN ('email','sms','telegram_group','telegram_x1','whatsapp','push','popup'));

-- Adiciona coluna channel nos templates de jornada (se não existir)
ALTER TABLE public.crm_journey_templates
  ADD COLUMN IF NOT EXISTS channel text
  CHECK (channel IN ('email','sms','telegram_group','telegram_x1','whatsapp','push','popup'));

-- Força o PostgREST a reler o schema
NOTIFY pgrst, 'reload schema';