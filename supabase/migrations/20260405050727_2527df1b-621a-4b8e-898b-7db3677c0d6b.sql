
UPDATE public.users
SET 
  last_seen_at = NULL,
  first_access_at = NULL
WHERE 
  last_seen_at IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (last_seen_at - created_at))) < 10;
