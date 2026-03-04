
CREATE OR REPLACE FUNCTION public.get_or_create_user(p_email text, p_phone text DEFAULT NULL)
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
    
    INSERT INTO public.users (email, phone, betting_house_id)
    VALUES (lower(trim(p_email)), p_phone, v_default_house_id)
    RETURNING * INTO v_user;
  ELSE
    -- Atualiza telefone se fornecido e usuário já existe
    IF p_phone IS NOT NULL THEN
      UPDATE public.users SET phone = p_phone WHERE id = v_user.id;
      v_user.phone := p_phone;
    END IF;
  END IF;
  
  -- Atualiza last_seen_at
  UPDATE public.users SET last_seen_at = now() WHERE id = v_user.id;
  
  RETURN v_user;
END;
$function$;
