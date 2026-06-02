CREATE OR REPLACE FUNCTION public.seed_service_role_key(p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'service_role_key';
  IF v_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_id, p_value, 'service_role_key', 'CRM cron service role key');
    RETURN jsonb_build_object('ok', true, 'action', 'updated', 'id', v_id);
  END IF;
  v_id := vault.create_secret(p_value, 'service_role_key', 'CRM cron service role key');
  RETURN jsonb_build_object('ok', true, 'action', 'created', 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.seed_service_role_key(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_service_role_key(text) TO service_role;