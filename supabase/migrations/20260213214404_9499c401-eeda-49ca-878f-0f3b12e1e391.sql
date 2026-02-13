CREATE OR REPLACE FUNCTION public.check_is_admin_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails WHERE email = lower(trim(p_email))
  )
$$;