-- Migration: motor de CRM (jornadas + dispatch)
-- Gerada a partir do estado atual do banco de produção (snykhoctikatcpvlcoow) em 2026-06-23.
-- Versiona: funções, triggers, cron jobs e seed mínimo da tabela crm_journey_settings.
--
-- Pré-requisitos (NÃO versionados aqui — fazer manual no destino):
--   1. Extensões pg_cron e pg_net habilitadas
--   2. Secret 'service_role_key' no vault (sb_secret_… da Settings → API)
--      select vault.create_secret('<sb_secret_…>', 'service_role_key', 'service role key (new API key)');
--   3. Edge function 'crm-journey-dispatch' deployada (código em supabase/functions/)

-- ============================================
-- FUNÇÕES
-- ============================================

-- crm_channel_available
CREATE OR REPLACE FUNCTION public.crm_channel_available(p_user_id uuid, p_channel text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE p_channel
    WHEN 'email' THEN (SELECT NOT email_opt_out AND COALESCE(email,'')<>'' FROM users WHERE id=p_user_id)
    WHEN 'sms'   THEN (SELECT NOT sms_opt_out AND COALESCE(phone,'')<>'' FROM users WHERE id=p_user_id)
    WHEN 'push'  THEN (SELECT app_installed AND NOT push_opt_out
                       AND EXISTS(SELECT 1 FROM push_subscriptions s WHERE s.user_id=p_user_id)
                       FROM users WHERE id=p_user_id)
    WHEN 'popup' THEN EXISTS(SELECT 1 FROM users WHERE id=p_user_id)
    ELSE false END;
$function$;

-- crm_step_guard_ok
CREATE OR REPLACE FUNCTION public.crm_step_guard_ok(p_user_id uuid, p_guard text, p_anchor_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_guard IS NULL OR p_guard IN ('','none') THEN true
    WHEN p_guard='not_activated' THEN (SELECT activated_at IS NULL FROM users WHERE id=p_user_id)
    WHEN p_guard='first_win_and_not_diamante' THEN (SELECT first_win_at IS NOT NULL
        AND lower(COALESCE(main_tier::text,''))<>'diamante' FROM users WHERE id=p_user_id)
    WHEN p_guard='not_purchased' THEN (SELECT purchased_at IS NULL FROM users WHERE id=p_user_id)
    WHEN p_guard='still_inactive' THEN (SELECT last_seen_at IS NULL OR last_seen_at<=p_anchor_at
        FROM users WHERE id=p_user_id)
    ELSE true END;
$function$;

-- crm_enroll_match
CREATE OR REPLACE FUNCTION public.crm_enroll_match(p_user_id uuid, p_trigger_type text, p_anchor timestamp with time zone DEFAULT now(), p_payt_event text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_j record; v_count int := 0;
BEGIN
  IF p_user_id IS NULL THEN RETURN 0; END IF;
  FOR v_j IN
    SELECT j.id FROM public.crm_journeys j
     WHERE j.status='active' AND j.trigger_type=p_trigger_type
       AND EXISTS (SELECT 1 FROM public.crm_journey_steps s
                    WHERE s.journey_id=j.id AND s.node_type='message')
       AND (p_trigger_type<>'webhook_status'
            OR COALESCE(j.trigger_config->>'payt_event','') IN ('', COALESCE(p_payt_event,'')))
       AND NOT EXISTS (SELECT 1 FROM public.crm_journey_enrollments e
                        WHERE e.user_id=p_user_id AND e.journey_id=j.id)
  LOOP
    INSERT INTO public.crm_journey_enrollments(journey_id,user_id,status,anchor_at,enrolled_at,metadata)
    VALUES (v_j.id,p_user_id,'active',COALESCE(p_anchor,now()),now(),
            jsonb_build_object('trigger',p_trigger_type,'payt_event',p_payt_event))
    ON CONFLICT DO NOTHING;
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END$function$;

-- crm_enroll_poll
CREATE OR REPLACE FUNCTION public.crm_enroll_poll()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_j record; v_row record; v_total int := 0; v_days int;
BEGIN
  FOR v_j IN
    SELECT j.id,j.trigger_type,j.trigger_config,j.updated_at FROM public.crm_journeys j
     WHERE j.status='active' AND j.trigger_type IN ('onboarding','churn_inactive')
       AND EXISTS (SELECT 1 FROM public.crm_journey_steps s
                    WHERE s.journey_id=j.id AND s.node_type='message')
  LOOP
    IF v_j.trigger_type='onboarding' THEN
      FOR v_row IN
        SELECT u.id,u.created_at FROM public.users u
         WHERE u.created_at >= GREATEST(v_j.updated_at, now()-interval '7 days')
           AND NOT EXISTS (SELECT 1 FROM public.crm_journey_enrollments e
                            WHERE e.user_id=u.id AND e.journey_id=v_j.id)
      LOOP
        INSERT INTO public.crm_journey_enrollments(journey_id,user_id,status,anchor_at,enrolled_at,metadata)
        VALUES (v_j.id,v_row.id,'active',v_row.created_at,now(),jsonb_build_object('trigger','onboarding'))
        ON CONFLICT DO NOTHING; v_total:=v_total+1;
      END LOOP;
    ELSE
      v_days := COALESCE((v_j.trigger_config->>'days_inactive')::int, 7);
      FOR v_row IN
        SELECT u.id FROM public.users u
         WHERE u.last_seen_at IS NOT NULL
           AND u.last_seen_at <= now()-make_interval(days=>v_days)
           AND NOT EXISTS (SELECT 1 FROM public.crm_journey_enrollments e
                            WHERE e.user_id=u.id AND e.journey_id=v_j.id)
      LOOP
        INSERT INTO public.crm_journey_enrollments(journey_id,user_id,status,anchor_at,enrolled_at,metadata)
        VALUES (v_j.id,v_row.id,'active',now(),now(),jsonb_build_object('trigger','churn_inactive'))
        ON CONFLICT DO NOTHING; v_total:=v_total+1;
      END LOOP;
    END IF;
  END LOOP;
  RETURN v_total;
END$function$;

-- crm_users_trigger_events
CREATE OR REPLACE FUNCTION public.crm_users_trigger_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    IF NEW.main_tier IS DISTINCT FROM OLD.main_tier AND NEW.main_tier > OLD.main_tier THEN
      PERFORM public.crm_enroll_match(NEW.id,'upgrade',now(),NULL);
    END IF;
    IF NEW.last_checkout_started_at IS DISTINCT FROM OLD.last_checkout_started_at
       AND NEW.last_checkout_started_at IS NOT NULL THEN
      PERFORM public.crm_enroll_match(NEW.id,'webhook_status',now(),'pedido_criado');
    END IF;
    IF NEW.purchased_at IS DISTINCT FROM OLD.purchased_at AND NEW.purchased_at IS NOT NULL THEN
      PERFORM public.crm_enroll_match(NEW.id,'webhook_status',now(),'pagamento_confirmado');
    END IF;
    IF NEW.checkout_abandoned_at IS DISTINCT FROM OLD.checkout_abandoned_at
       AND NEW.checkout_abandoned_at IS NOT NULL THEN
      PERFORM public.crm_enroll_match(NEW.id,'webhook_status',now(),'cancelado');
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; -- CRM nunca trava escrita em users
  END;
  RETURN NEW;
END$function$;

-- crm_route_event
CREATE OR REPLACE FUNCTION public.crm_route_event(p_user_id uuid, p_event_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE u record;
BEGIN
  SELECT * INTO u FROM users WHERE id=p_user_id;
  IF p_event_type='checkout_abandoned' AND u.purchased_at IS NULL AND COALESCE(u.email,'')<>'' THEN
    PERFORM crm_journey_enroll(p_user_id,'J5',u.checkout_abandoned_at,u.abandoned_plan);
  ELSIF p_event_type='purchase_completed' THEN
    PERFORM crm_journey_exit(p_user_id,'J5','cancelled','purchased');
    PERFORM crm_journey_enroll(p_user_id,'J1',u.purchased_at,NULL);
  ELSIF p_event_type='account_activated' THEN
    PERFORM crm_journey_exit(p_user_id,'J1','completed','activated');
    PERFORM crm_journey_exit(p_user_id,'J3','completed','activated');
    PERFORM crm_journey_enroll(p_user_id,'J2',u.activated_at,NULL);
  END IF;
END
$function$;

-- crm_events_router
CREATE OR REPLACE FUNCTION public.crm_events_router()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.event_name IN ('purchase_completed','account_activated','first_bet_placed','checkout_abandoned')
  THEN PERFORM crm_route_event(NEW.user_id, NEW.event_name); END IF;
  RETURN NEW;
END
$function$;

-- crm_journey_enroll
CREATE OR REPLACE FUNCTION public.crm_journey_enroll(p_user_id uuid, p_system_key text, p_anchor_at timestamp with time zone, p_segment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_j uuid;
BEGIN
  SELECT id INTO v_j FROM crm_journeys WHERE system_key=p_system_key;
  IF v_j IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM crm_journey_enrollments
            WHERE user_id=p_user_id AND journey_id=v_j AND status='active') THEN RETURN; END IF;
  INSERT INTO crm_journey_enrollments(journey_id,user_id,status,anchor_at,enrolled_at,metadata)
  VALUES (v_j,p_user_id,'active',COALESCE(p_anchor_at,now()),now(),
          jsonb_build_object('segment',p_segment));
END
$function$;

-- crm_journey_exit
CREATE OR REPLACE FUNCTION public.crm_journey_exit(p_user_id uuid, p_system_key text, p_status text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_j uuid;
BEGIN
  SELECT id INTO v_j FROM crm_journeys WHERE system_key=p_system_key;
  IF v_j IS NULL THEN RETURN; END IF;
  UPDATE crm_journey_enrollments
     SET status=p_status, completed_at=now(),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('exit_reason',p_reason)
   WHERE user_id=p_user_id AND journey_id=v_j AND status='active';
END
$function$;

-- crm_enroll_j3_no_activation
CREATE OR REPLACE FUNCTION public.crm_enroll_j3_no_activation()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_j2_id uuid; v_j3_id uuid; v_row record; v_count int := 0;
BEGIN
  SELECT id INTO v_j2_id FROM public.crm_journeys WHERE system_key = 'J2' LIMIT 1;
  SELECT id INTO v_j3_id FROM public.crm_journeys WHERE system_key = 'J3' AND status = 'active' LIMIT 1;
  IF v_j3_id IS NULL THEN RETURN 0; END IF;
  FOR v_row IN
    SELECT u.id AS user_id, u.purchased_at FROM public.users u
     WHERE u.purchased_at IS NOT NULL AND u.purchased_at <= now() - interval '24 hours' AND u.activated_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM public.crm_journey_enrollments e WHERE e.user_id = u.id AND e.status = 'active' AND e.journey_id IN (COALESCE(v_j2_id, '00000000-0000-0000-0000-000000000000'::uuid), v_j3_id))
  LOOP
    PERFORM public.crm_journey_enroll(v_row.user_id, 'J3', v_row.purchased_at, NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $function$;

-- crm_enroll_j4_inactive
CREATE OR REPLACE FUNCTION public.crm_enroll_j4_inactive()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_j4_id uuid; v_row record; v_count int := 0;
BEGIN
  SELECT id INTO v_j4_id FROM public.crm_journeys WHERE system_key = 'J4' AND status = 'active' LIMIT 1;
  IF v_j4_id IS NULL THEN RETURN 0; END IF;
  FOR v_row IN
    SELECT u.id AS user_id, u.last_seen_at FROM public.users u
     WHERE u.activated_at IS NOT NULL AND u.last_seen_at IS NOT NULL AND u.last_seen_at <= now() - interval '3 days'
       AND NOT EXISTS (SELECT 1 FROM public.crm_journey_enrollments e WHERE e.user_id = u.id AND e.status = 'active' AND e.journey_id = v_j4_id)
  LOOP
    PERFORM public.crm_journey_enroll(v_row.user_id, 'J4', v_row.last_seen_at, NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $function$;

-- crm_checkpoint_j2_to_j3
CREATE OR REPLACE FUNCTION public.crm_checkpoint_j2_to_j3()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_j2_id uuid; v_row record; v_count int := 0;
BEGIN
  SELECT id INTO v_j2_id FROM public.crm_journeys WHERE system_key = 'J2' AND status = 'active' LIMIT 1;
  IF v_j2_id IS NULL THEN RETURN 0; END IF;
  FOR v_row IN
    SELECT e.user_id, u.purchased_at FROM public.crm_journey_enrollments e JOIN public.users u ON u.id = e.user_id
     WHERE e.journey_id = v_j2_id AND e.status = 'active' AND e.anchor_at IS NOT NULL
       AND now() >= e.anchor_at + interval '3 days' AND (u.last_seen_at IS NULL OR u.last_seen_at <= e.anchor_at)
  LOOP
    PERFORM public.crm_journey_exit(v_row.user_id, 'J2', 'cancelled', 'no_relogin');
    IF v_row.purchased_at IS NOT NULL THEN PERFORM public.crm_journey_enroll(v_row.user_id, 'J3', v_row.purchased_at, NULL); END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $function$;

-- crm_process_pending_schedules
CREATE OR REPLACE FUNCTION public.crm_process_pending_schedules()
 RETURNS TABLE(dispatched_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_project_url text := 'https://snykhoctikatcpvlcoow.supabase.co';
  v_service_key text; v_row record; v_dry_run boolean;
BEGIN
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_service_key IS NULL THEN RAISE EXCEPTION 'service_role_key não encontrada no Vault'; END IF;
  FOR v_row IN
    SELECT id, channel FROM public.crm_schedules
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()
    ORDER BY scheduled_at ASC LIMIT 25 FOR UPDATE SKIP LOCKED
  LOOP
    v_dry_run := (v_row.channel NOT IN ('sms', 'push', 'popup', 'telegram_x1', 'telegram_group', 'email'));
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/crm-process-schedule',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key),
      body := jsonb_build_object('schedule_id', v_row.id, 'dry_run', v_dry_run)
    );
    dispatched_id := v_row.id;
    RETURN NEXT;
  END LOOP;
  RETURN;
END; $function$;

-- crm_set_updated_at
CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$;

-- crm_clone_journey
CREATE OR REPLACE FUNCTION public.crm_clone_journey(p_journey_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_new uuid;
  r record;
  v_step uuid;
begin
  insert into public.crm_journeys (
    name, description, channel, color, status, trigger_type, trigger_config,
    audience_id, audience_filters, canvas, created_by
  )
  select
    name || ' (cópia)', description, channel, color, 'draft', trigger_type, trigger_config,
    audience_id, audience_filters,
    coalesce(canvas, '{}'::jsonb) || jsonb_build_object(
      'x', coalesce((canvas->>'x')::numeric, 0) + 60,
      'y', coalesce((canvas->>'y')::numeric, 0) + 60
    ),
    created_by
  from public.crm_journeys
  where id = p_journey_id
  returning id into v_new;

  if v_new is null then
    raise exception 'journey_not_found';
  end if;

  create temp table _m(old uuid, new uuid) on commit drop;

  for r in select * from public.crm_journey_steps where journey_id = p_journey_id loop
    insert into public.crm_journey_steps (
      journey_id, node_type, channel, content, config,
      delay_value, delay_unit, step_order, position
    )
    values (
      v_new, r.node_type, r.channel, r.content, r.config,
      r.delay_value, r.delay_unit, r.step_order, r.position
    )
    returning id into v_step;
    insert into _m values (r.id, v_step);
  end loop;

  update public.crm_journey_steps s
     set parent_step_id = mn.new
    from _m ms
    join public.crm_journey_steps o on o.id = ms.old
    join _m mn on mn.old = o.parent_step_id
   where s.id = ms.new and o.parent_step_id is not null;

  insert into public.crm_journey_edges (journey_id, source_step_id, target_step_id, branch)
  select v_new, msrc.new, mtgt.new, e.branch
    from public.crm_journey_edges e
    join _m msrc on msrc.old = e.source_step_id
    join _m mtgt on mtgt.old = e.target_step_id
   where e.journey_id = p_journey_id;

  return v_new;
end;
$function$;

-- crm_get_channel_secret
CREATE OR REPLACE FUNCTION public.crm_get_channel_secret(p_channel text, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
DECLARE v_secret_name text := 'crm_' || p_channel || '_' || p_key; v_value text;
BEGIN
  IF current_setting('role', true) <> 'service_role' AND auth.role() <> 'service_role' THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT decrypted_secret INTO v_value FROM vault.decrypted_secrets WHERE name = v_secret_name;
  RETURN v_value;
END; $function$;

-- crm_save_channel_secret
CREATE OR REPLACE FUNCTION public.crm_save_channel_secret(p_channel text, p_key text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
DECLARE v_secret_name text := 'crm_' || p_channel || '_' || p_key; v_existing_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_value IS NULL OR length(p_value) = 0 THEN RAISE EXCEPTION 'empty_value'; END IF;
  SELECT id INTO v_existing_id FROM vault.secrets WHERE name = v_secret_name;
  IF v_existing_id IS NOT NULL THEN PERFORM vault.update_secret(v_existing_id, p_value, v_secret_name, NULL, NULL);
  ELSE PERFORM vault.create_secret(p_value, v_secret_name, 'CRM Premier FC secret'); END IF;
  UPDATE public.crm_channel_settings
  SET config = jsonb_set(COALESCE(config, '{}'::jsonb) - p_key, '{secrets_set}',
        COALESCE((SELECT to_jsonb(array_agg(DISTINCT s)) FROM unnest(COALESCE(ARRAY(SELECT jsonb_array_elements_text(config -> 'secrets_set')), '{}'::text[]) || ARRAY[p_key]) AS s), to_jsonb(ARRAY[p_key]))),
      updated_at = NOW() WHERE channel = p_channel;
  RETURN jsonb_build_object('ok', true, 'channel', p_channel, 'key', p_key);
END; $function$;

-- crm_clear_channel_secret
CREATE OR REPLACE FUNCTION public.crm_clear_channel_secret(p_channel text, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
DECLARE v_secret_name text := 'crm_' || p_channel || '_' || p_key;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  DELETE FROM vault.secrets WHERE name = v_secret_name;
  UPDATE public.crm_channel_settings
  SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{secrets_set}',
        COALESCE((SELECT to_jsonb(array_agg(s)) FROM unnest(ARRAY(SELECT jsonb_array_elements_text(config -> 'secrets_set'))) AS s WHERE s <> p_key), '[]'::jsonb)),
      updated_at = NOW() WHERE channel = p_channel;
  RETURN jsonb_build_object('ok', true, 'channel', p_channel, 'key', p_key);
END; $function$;

-- ============================================
-- TRIGGERS
-- ============================================

-- drop+create pra ser idempotente
drop trigger if exists crm_audiences_updated_at on public.crm_audiences;
CREATE TRIGGER crm_audiences_updated_at BEFORE UPDATE ON public.crm_audiences FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists crm_channel_settings_updated_at on public.crm_channel_settings;
CREATE TRIGGER crm_channel_settings_updated_at BEFORE UPDATE ON public.crm_channel_settings FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists crm_journey_templates_set_updated_at on public.crm_journey_templates;
CREATE TRIGGER crm_journey_templates_set_updated_at BEFORE UPDATE ON public.crm_journey_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists crm_schedule_events_updated_at on public.crm_schedule_events;
CREATE TRIGGER crm_schedule_events_updated_at BEFORE UPDATE ON public.crm_schedule_events FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists crm_schedules_updated_at on public.crm_schedules;
CREATE TRIGGER crm_schedules_updated_at BEFORE UPDATE ON public.crm_schedules FOR EACH ROW EXECUTE FUNCTION crm_set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists trg_crm_journey_enrollments_updated_at on public.crm_journey_enrollments;
CREATE TRIGGER trg_crm_journey_enrollments_updated_at BEFORE UPDATE ON public.crm_journey_enrollments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists trg_crm_journey_step_events_updated_at on public.crm_journey_step_events;
CREATE TRIGGER trg_crm_journey_step_events_updated_at BEFORE UPDATE ON public.crm_journey_step_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists trg_crm_journey_steps_updated_at on public.crm_journey_steps;
CREATE TRIGGER trg_crm_journey_steps_updated_at BEFORE UPDATE ON public.crm_journey_steps FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists trg_crm_journeys_updated_at on public.crm_journeys;
CREATE TRIGGER trg_crm_journeys_updated_at BEFORE UPDATE ON public.crm_journeys FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- drop+create pra ser idempotente
drop trigger if exists trg_crm_route on public.events;
CREATE TRIGGER trg_crm_route AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION crm_events_router();

-- drop+create pra ser idempotente
drop trigger if exists trg_crm_users_trigger_events on public.users;
CREATE TRIGGER trg_crm_users_trigger_events AFTER UPDATE OF main_tier, purchased_at, checkout_abandoned_at, last_checkout_started_at ON public.users FOR EACH ROW EXECUTE FUNCTION crm_users_trigger_events();

-- ============================================
-- CRON JOBS
-- ============================================

-- Limpa jobs antigos com mesmo nome antes de reagendar (idempotente).
select cron.unschedule('crm-process-pending-schedules') where exists (select 1 from cron.job where jobname='crm-process-pending-schedules');
select cron.schedule('crm-process-pending-schedules', '* * * * *', ' SELECT public.crm_process_pending_schedules(); ');

select cron.unschedule('crm_enroll_j3_no_activation') where exists (select 1 from cron.job where jobname='crm_enroll_j3_no_activation');
select cron.schedule('crm_enroll_j3_no_activation', '*/15 * * * *', 'SELECT public.crm_enroll_j3_no_activation();');

select cron.unschedule('crm_enroll_j4_inactive') where exists (select 1 from cron.job where jobname='crm_enroll_j4_inactive');
select cron.schedule('crm_enroll_j4_inactive', '0 * * * *', 'SELECT public.crm_enroll_j4_inactive();');

select cron.unschedule('crm_checkpoint_j2_to_j3') where exists (select 1 from cron.job where jobname='crm_checkpoint_j2_to_j3');
select cron.schedule('crm_checkpoint_j2_to_j3', '5 * * * *', 'SELECT public.crm_checkpoint_j2_to_j3();');

select cron.unschedule('crm-mark-checkout-abandoned') where exists (select 1 from cron.job where jobname='crm-mark-checkout-abandoned');
select cron.schedule('crm-mark-checkout-abandoned', '*/5 * * * *', 'SELECT public.mark_checkout_abandoned();');

select cron.unschedule('crm_journey_dispatch') where exists (select 1 from cron.job where jobname='crm_journey_dispatch');
select cron.schedule('crm_journey_dispatch', '*/10 * * * *', ' select net.http_post(url:=''https://snykhoctikatcpvlcoow.supabase.co/functions/v1/crm-journey-dispatch'', headers:=jsonb_build_object(''Content-Type'',''application/json'',''Authorization'',''Bearer ''||(select decrypted_secret from vault.decrypted_secrets where name=''service_role_key'')), body:=''{}''::jsonb); ');

select cron.unschedule('crm_enroll_poll') where exists (select 1 from cron.job where jobname='crm_enroll_poll');
select cron.schedule('crm_enroll_poll', '*/5 * * * *', 'select public.crm_enroll_poll();');
