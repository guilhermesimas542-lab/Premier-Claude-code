
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
  -- Tenta encontrar usuário existente
  SELECT * INTO v_user FROM public.users WHERE email = lower(trim(p_email));
  
  -- Se não encontrar, cria novo com casa padrão
  IF v_user.id IS NULL THEN
    SELECT id INTO v_default_house_id FROM public.betting_houses WHERE is_default = true LIMIT 1;
    
    INSERT INTO public.users (email, betting_house_id)
    VALUES (lower(trim(p_email)), v_default_house_id)
    RETURNING * INTO v_user;
  END IF;
  
  -- Atualiza last_seen_at
  UPDATE public.users SET last_seen_at = now() WHERE id = v_user.id;
  
  RETURN v_user;
END;
$function$;
