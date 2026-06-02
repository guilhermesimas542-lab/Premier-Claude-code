-- Backfill log + insert para ai_credit_weekly
CREATE TABLE IF NOT EXISTS public.ai_credit_weekly_backfill_log (
  user_id uuid NOT NULL,
  main_tier text,
  backfilled_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_credit_weekly_backfill_log TO authenticated;
GRANT ALL ON public.ai_credit_weekly_backfill_log TO service_role;

ALTER TABLE public.ai_credit_weekly_backfill_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_backfill_log" ON public.ai_credit_weekly_backfill_log
  FOR SELECT TO authenticated USING (is_admin());

-- Log de quem foi backfilled (auditoria)
INSERT INTO public.ai_credit_weekly_backfill_log (user_id, main_tier)
SELECT u.id, u.main_tier::text
FROM public.users u
LEFT JOIN public.ai_credit_weekly w ON w.user_id = u.id
WHERE w.user_id IS NULL
  AND u.main_tier::text IN ('basic','pro','ultra','premium','diamante');

-- Backfill: cria row weekly com quota correta por tier; weekly_used=0
INSERT INTO public.ai_credit_weekly (user_id, weekly_quota, weekly_used, week_start_date, last_tier)
SELECT
  u.id,
  CASE
    WHEN u.main_tier::text = 'basic' THEN 1
    WHEN u.main_tier::text IN ('pro','premium','ultra') THEN 3
    WHEN u.main_tier::text = 'diamante' THEN 5
    ELSE 0
  END,
  0,
  date_trunc('week', (NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamp)::date,
  u.main_tier::text
FROM public.users u
LEFT JOIN public.ai_credit_weekly w ON w.user_id = u.id
WHERE w.user_id IS NULL
  AND u.main_tier::text IN ('basic','pro','ultra','premium','diamante');