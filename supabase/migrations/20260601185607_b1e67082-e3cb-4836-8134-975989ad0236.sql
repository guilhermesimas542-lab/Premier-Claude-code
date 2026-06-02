CREATE OR REPLACE FUNCTION public.crm_process_pending_schedules()
 RETURNS TABLE(dispatched_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_project_url text := 'https://jdzndbkimjwtxpldmigi.supabase.co';
  v_service_key text;
  v_row         record;
  v_dry_run     boolean;
BEGIN
  SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE EXCEPTION 'service_role_key não encontrada no Vault';
  END IF;

  FOR v_row IN
    SELECT id, channel
      FROM public.crm_schedules
     WHERE status = 'scheduled'
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= now()
     ORDER BY scheduled_at ASC
     LIMIT 25
     FOR UPDATE SKIP LOCKED
  LOOP
    -- Canais com provider real plugado: SMS (SMS Dev) e Push (Web Push VAPID).
    -- Demais canais continuam em mock (dry_run=true).
    v_dry_run := (v_row.channel NOT IN ('sms', 'push'));

    PERFORM net.http_post(
      url     := v_project_url || '/functions/v1/crm-process-schedule',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object('schedule_id', v_row.id, 'dry_run', v_dry_run)
    );
    dispatched_id := v_row.id;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$function$;