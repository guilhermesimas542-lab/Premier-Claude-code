-- Concede entitlement "desaltas" (Odds Altas) aos compradores PayT afetados
INSERT INTO public.entitlements (user_id, product_key, source, status, starts_at)
SELECT DISTINCT ON (u.id)
  u.id,
  'desaltas'::public.product_key,
  'purchase'::public.entitlement_source,
  'active'::public.entitlement_status,
  wl.received_at
FROM public.webhook_logs wl
JOIN public.users u ON u.email = lower(trim(wl.buyer_email))
WHERE wl.provider = 'payt'
  AND wl.raw_payload->'product'->>'code' = 'LXGO9W'
  AND wl.raw_payload->'link'->>'title' ILIKE '%odds altas%'
  AND NOT EXISTS (
    SELECT 1 FROM public.entitlements e
    WHERE e.user_id = u.id AND e.product_key = 'desaltas'
  )
ORDER BY u.id, wl.received_at ASC;

-- Concede entitlement "alavancagem" aos compradores PayT afetados
INSERT INTO public.entitlements (user_id, product_key, source, status, starts_at)
SELECT DISTINCT ON (u.id)
  u.id,
  'alavancagem'::public.product_key,
  'purchase'::public.entitlement_source,
  'active'::public.entitlement_status,
  wl.received_at
FROM public.webhook_logs wl
JOIN public.users u ON u.email = lower(trim(wl.buyer_email))
WHERE wl.provider = 'payt'
  AND wl.raw_payload->'product'->>'code' = 'LXGO9W'
  AND wl.raw_payload->'link'->>'title' ILIKE '%alavancagem%'
  AND NOT EXISTS (
    SELECT 1 FROM public.entitlements e
    WHERE e.user_id = u.id AND e.product_key = 'alavancagem'
  )
ORDER BY u.id, wl.received_at ASC;