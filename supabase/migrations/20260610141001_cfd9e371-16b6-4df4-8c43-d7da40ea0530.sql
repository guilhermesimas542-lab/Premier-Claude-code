
-- Popup deliveries: adiciona controle de expiração + contagem de exibições.
ALTER TABLE public.crm_popup_deliveries
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_views integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- Permite status 'expired' (auto-marcado quando passa do expires_at).
ALTER TABLE public.crm_popup_deliveries
  DROP CONSTRAINT IF EXISTS crm_popup_deliveries_status_check;
ALTER TABLE public.crm_popup_deliveries
  ADD CONSTRAINT crm_popup_deliveries_status_check
  CHECK (status IN ('pending','shown','clicked','dismissed','expired'));

-- Índice para a query de fila (user_id + status + ordem cronológica).
CREATE INDEX IF NOT EXISTS idx_crm_popup_deliveries_queue
  ON public.crm_popup_deliveries (user_id, status, created_at);
