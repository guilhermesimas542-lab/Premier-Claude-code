
-- Parte 1: Adicionar coluna first_access_at
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_access_at timestamptz DEFAULT NULL;

-- Backfill: setar first_access_at para usuários que já têm sessões reais
UPDATE public.users u
SET first_access_at = sub.first_session
FROM (
  SELECT user_id, MIN(session_start_at) AS first_session
  FROM public.sessions
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id
  AND u.first_access_at IS NULL;

-- Parte 2: RPC auxiliar update_user_access
CREATE OR REPLACE FUNCTION public.update_user_access(
  p_user_id uuid, 
  p_now timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.users 
  SET 
    last_seen_at = p_now,
    first_access_at = COALESCE(first_access_at, p_now)
  WHERE id = p_user_id;
END;
$function$;

-- Parte 2: Reescrever get_or_create_user (overload 1 - só email)
CREATE OR REPLACE FUNCTION public.get_or_create_user(p_email text)
 RETURNS users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user public.users;
  v_default_house_id uuid;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE email = lower(trim(p_email));
  IF v_user.id IS NULL THEN
    SELECT id INTO v_default_house_id FROM public.betting_houses WHERE is_default = true LIMIT 1;
    INSERT INTO public.users (email, betting_house_id)
    VALUES (lower(trim(p_email)), v_default_house_id)
    RETURNING * INTO v_user;
  END IF;
  RETURN v_user;
END;
$function$;

-- Parte 2: Reescrever get_or_create_user (overload 2 - email + phone)
CREATE OR REPLACE FUNCTION public.get_or_create_user(p_email text, p_phone text DEFAULT NULL::text)
 RETURNS users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user public.users;
  v_default_house_id uuid;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE email = lower(trim(p_email));
  IF v_user.id IS NULL THEN
    SELECT id INTO v_default_house_id FROM public.betting_houses WHERE is_default = true LIMIT 1;
    INSERT INTO public.users (email, phone, betting_house_id)
    VALUES (lower(trim(p_email)), p_phone, v_default_house_id)
    RETURNING * INTO v_user;
  ELSE
    IF p_phone IS NOT NULL THEN
      UPDATE public.users SET phone = p_phone WHERE id = v_user.id;
      v_user.phone := p_phone;
    END IF;
  END IF;
  RETURN v_user;
END;
$function$;
