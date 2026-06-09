
CREATE OR REPLACE FUNCTION pg_temp.drop_all_policies(p_table text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=p_table LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, p_table);
  END LOOP;
END $$;

-- entitlements
SELECT pg_temp.drop_all_policies('entitlements');
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entitlements_read_all" ON public.entitlements FOR SELECT USING (true);
CREATE POLICY "entitlements_admin_write" ON public.entitlements FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- financial_events
SELECT pg_temp.drop_all_policies('financial_events');
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_events_admin_read" ON public.financial_events FOR SELECT TO authenticated
  USING (public.is_admin());

-- orders
SELECT pg_temp.drop_all_policies('orders');
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- user_achievements
SELECT pg_temp.drop_all_policies('user_achievements');
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_read_all" ON public.user_achievements FOR SELECT USING (true);

-- user_gamification
SELECT pg_temp.drop_all_policies('user_gamification');
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_gamification_read_all" ON public.user_gamification FOR SELECT USING (true);

-- xp_events
SELECT pg_temp.drop_all_policies('xp_events');
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_events_read_all" ON public.xp_events FOR SELECT USING (true);

-- referrals
SELECT pg_temp.drop_all_policies('referrals');
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_read_all" ON public.referrals FOR SELECT USING (true);

-- push_subscriptions
SELECT pg_temp.drop_all_policies('push_subscriptions');
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subs_admin_read" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (public.is_admin());

-- webhook_logs
SELECT pg_temp.drop_all_policies('webhook_logs');
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_logs_admin_read" ON public.webhook_logs FOR SELECT TO authenticated
  USING (public.is_admin());

-- sessions
SELECT pg_temp.drop_all_policies('sessions');
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_admin_read" ON public.sessions FOR SELECT TO authenticated
  USING (public.is_admin());

-- admin_last_seen
SELECT pg_temp.drop_all_policies('admin_last_seen');
ALTER TABLE public.admin_last_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_last_seen_admin_all" ON public.admin_last_seen FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- user_feedback
SELECT pg_temp.drop_all_policies('user_feedback');
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_feedback_admin_all" ON public.user_feedback FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- crm_popup_deliveries
SELECT pg_temp.drop_all_policies('crm_popup_deliveries');
ALTER TABLE public.crm_popup_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_popup_deliveries_admin_all" ON public.crm_popup_deliveries FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ai_beta_allowlist (allow public read for beta gate, admin write only)
SELECT pg_temp.drop_all_policies('ai_beta_allowlist');
ALTER TABLE public.ai_beta_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_beta_allowlist_admin_write" ON public.ai_beta_allowlist FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "ai_beta_allowlist_read_all" ON public.ai_beta_allowlist FOR SELECT USING (true);

-- STORAGE: popups (public read, admin write)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND (qual ILIKE '%popups%' OR with_check ILIKE '%popups%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "popups_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'popups');
CREATE POLICY "popups_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'popups' AND public.is_admin());
CREATE POLICY "popups_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'popups' AND public.is_admin())
  WITH CHECK (bucket_id = 'popups' AND public.is_admin());
CREATE POLICY "popups_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'popups' AND public.is_admin());

-- STORAGE: team_logos
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND (qual ILIKE '%team_logos%' OR with_check ILIKE '%team_logos%'
                OR qual ILIKE '%team-logos%' OR with_check ILIKE '%team-logos%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "team_logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'team_logos');
CREATE POLICY "team_logos_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team_logos' AND public.is_admin());
CREATE POLICY "team_logos_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team_logos' AND public.is_admin())
  WITH CHECK (bucket_id = 'team_logos' AND public.is_admin());
CREATE POLICY "team_logos_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team_logos' AND public.is_admin());

-- STORAGE: crm-creatives (private, admin only)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND (qual ILIKE '%crm-creatives%' OR with_check ILIKE '%crm-creatives%'
                OR qual ILIKE '%crm_creatives%' OR with_check ILIKE '%crm_creatives%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "crm_creatives_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'crm-creatives' AND public.is_admin())
  WITH CHECK (bucket_id = 'crm-creatives' AND public.is_admin());
