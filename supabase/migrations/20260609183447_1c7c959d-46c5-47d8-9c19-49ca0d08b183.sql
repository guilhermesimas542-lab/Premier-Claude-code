-- Função de limpeza diária (retention policies)
CREATE OR REPLACE FUNCTION public.cleanup_retention_policies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events_deleted bigint;
  v_raw_webhooks_deleted bigint;
  v_webhooks_deleted bigint;
  v_ai_cache_deleted bigint;
  v_app_errors_deleted bigint;
BEGIN
  WITH d AS (
    DELETE FROM public.events
    WHERE event_name IN (
      'screen_view','screen_time','card_click',
      'view_entries','app_open','session_start'
    )
    AND created_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_events_deleted FROM d;

  WITH d AS (
    DELETE FROM public.raw_webhook_logs
    WHERE created_at < NOW() - INTERVAL '7 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_raw_webhooks_deleted FROM d;

  -- ATENÇÃO: webhook_logs usa received_at (não created_at)
  WITH d AS (
    DELETE FROM public.webhook_logs
    WHERE received_at < NOW() - INTERVAL '7 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_webhooks_deleted FROM d;

  WITH d AS (
    DELETE FROM public.ai_tip_cache
    WHERE created_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_ai_cache_deleted FROM d;

  WITH d AS (
    DELETE FROM public.app_errors
    WHERE created_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_app_errors_deleted FROM d;

  RETURN jsonb_build_object(
    'executed_at', NOW(),
    'events_deleted', v_events_deleted,
    'raw_webhooks_deleted', v_raw_webhooks_deleted,
    'webhooks_deleted', v_webhooks_deleted,
    'ai_cache_deleted', v_ai_cache_deleted,
    'app_errors_deleted', v_app_errors_deleted
  );
END;
$$;

-- Garante extensão pg_cron habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento prévio (se existir) para idempotência
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup_retention_policies_daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Agenda execução diária às 04:00 UTC (01:00 BRT)
SELECT cron.schedule(
  'cleanup_retention_policies_daily',
  '0 4 * * *',
  $$SELECT public.cleanup_retention_policies();$$
);