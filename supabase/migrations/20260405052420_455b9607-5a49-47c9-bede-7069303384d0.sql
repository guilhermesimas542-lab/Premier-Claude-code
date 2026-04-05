UPDATE public.users
SET first_access_at = created_at
WHERE first_access_at IS NOT NULL
  AND last_seen_at IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (first_access_at - last_seen_at))) < 5;