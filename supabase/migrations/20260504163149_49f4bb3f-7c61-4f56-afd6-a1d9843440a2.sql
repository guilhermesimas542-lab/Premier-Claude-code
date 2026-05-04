BEGIN;

CREATE TABLE IF NOT EXISTS public.users_pending_review (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  legacy_main_tier main_tier NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users_pending_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pending review"
  ON public.users_pending_review FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.users_pending_review (user_id, email, legacy_main_tier, reason)
SELECT u.id, u.email, u.main_tier,
       'no financial_event in last 90 days and tier != free'
FROM public.users u
WHERE u.main_tier <> 'free'
  AND NOT EXISTS (
    SELECT 1 FROM public.financial_events fe
    WHERE lower(fe.email) = u.email
      AND fe.created_at > now() - interval '90 days'
  )
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.user_has_feature(p_user uuid, p_feature text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH u AS (
    SELECT main_tier FROM public.users WHERE id = p_user
  ),
  f AS (
    SELECT * FROM public.features WHERE key = p_feature
  ),
  pending AS (
    SELECT 1 FROM public.users_pending_review WHERE user_id = p_user
  )
  SELECT
    EXISTS (
      SELECT 1 FROM u, f
      WHERE (u.main_tier = 'premium'  AND f.included_in_premium)
         OR (u.main_tier = 'diamante' AND (f.included_in_premium OR f.included_in_diamante))
    )
    OR EXISTS (
      SELECT 1 FROM public.entitlements e
      WHERE e.user_id = p_user
        AND e.product_key::text = p_feature
        AND e.status = 'active'
        AND (e.ends_at IS NULL OR e.ends_at > now())
    )
    OR EXISTS (
      SELECT 1 FROM u, pending
      WHERE (u.main_tier = 'basic' AND p_feature = 'odds_safes')
         OR (u.main_tier IN ('pro','ultra') AND p_feature IN ('odds_safes','odds_pro'))
    );
$$;

DO $$
DECLARE v_pending int; v_vitalicio int;
BEGIN
  SELECT count(*) INTO v_pending FROM public.users_pending_review;
  SELECT count(*) INTO v_vitalicio FROM public.entitlements
    WHERE product_key = 'acesso_vitalicio' AND status = 'active';
  RAISE NOTICE 'pending_review=%, vitalicio_active=% (deve continuar 471)',
    v_pending, v_vitalicio;
END $$;

COMMIT;