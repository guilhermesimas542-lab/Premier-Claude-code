UPDATE public.users
SET first_access_at = last_seen_at
WHERE last_seen_at IS NOT NULL
  AND first_access_at IS NULL;