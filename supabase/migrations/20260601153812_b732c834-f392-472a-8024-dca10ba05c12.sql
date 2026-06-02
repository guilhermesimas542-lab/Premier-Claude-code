CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.crm_process_pending_schedules()
RETURNS TABLE (dispatched_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_project_url text := 'https://jdzndbkimjwtxpldmigi.supabase.co';
  v_service_key text;
  v_row         record;
BEGIN
  SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE EXCEPTION 'service_role_key não encontrada no Vault';
  END IF;

  FOR v_row IN
    SELECT id
      FROM public.crm_schedules
     WHERE status = 'scheduled'
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= now()
     ORDER BY scheduled_at ASC
     LIMIT 25
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM net.http_post(
      url     := v_project_url || '/functions/v1/crm-process-schedule',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object('schedule_id', v_row.id, 'dry_run', true)
    );
    dispatched_id := v_row.id;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crm-process-pending-schedules') THEN
    PERFORM cron.unschedule('crm-process-pending-schedules');
  END IF;
END $$;

SELECT cron.schedule(
  'crm-process-pending-schedules',
  '* * * * *',
  $cron$ SELECT public.crm_process_pending_schedules(); $cron$
);