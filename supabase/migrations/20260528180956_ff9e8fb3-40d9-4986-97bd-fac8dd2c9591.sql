CREATE OR REPLACE FUNCTION public.crm_save_channel_secret(
  p_channel text,
  p_key text,
  p_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_secret_name text := 'crm_' || p_channel || '_' || p_key;
  v_existing_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_value IS NULL OR length(p_value) = 0 THEN
    RAISE EXCEPTION 'empty_value';
  END IF;
  SELECT id INTO v_existing_id FROM vault.secrets WHERE name = v_secret_name;
  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_value, v_secret_name, NULL, NULL);
  ELSE
    PERFORM vault.create_secret(p_value, v_secret_name, 'CRM Premier FC secret');
  END IF;
  UPDATE public.crm_channel_settings
  SET config = jsonb_set(
        COALESCE(config, '{}'::jsonb) - p_key,
        '{secrets_set}',
        COALESCE(
          (
            SELECT to_jsonb(array_agg(DISTINCT s))
            FROM unnest(
              COALESCE(
                ARRAY(SELECT jsonb_array_elements_text(config -> 'secrets_set')),
                '{}'::text[]
              ) || ARRAY[p_key]
            ) AS s
          ),
          to_jsonb(ARRAY[p_key])
        )
      ),
      updated_at = NOW()
  WHERE channel = p_channel;
  RETURN jsonb_build_object('ok', true, 'channel', p_channel, 'key', p_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_clear_channel_secret(
  p_channel text,
  p_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_secret_name text := 'crm_' || p_channel || '_' || p_key;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM vault.secrets WHERE name = v_secret_name;
  UPDATE public.crm_channel_settings
  SET config = jsonb_set(
        COALESCE(config, '{}'::jsonb),
        '{secrets_set}',
        COALESCE(
          (
            SELECT to_jsonb(array_agg(s))
            FROM unnest(
              ARRAY(SELECT jsonb_array_elements_text(config -> 'secrets_set'))
            ) AS s
            WHERE s <> p_key
          ),
          '[]'::jsonb
        )
      ),
      updated_at = NOW()
  WHERE channel = p_channel;
  RETURN jsonb_build_object('ok', true, 'channel', p_channel, 'key', p_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_get_channel_secret(
  p_channel text,
  p_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_secret_name text := 'crm_' || p_channel || '_' || p_key;
  v_value text;
BEGIN
  IF current_setting('role', true) <> 'service_role'
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT decrypted_secret INTO v_value
  FROM vault.decrypted_secrets
  WHERE name = v_secret_name;
  RETURN v_value;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_save_channel_secret(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_save_channel_secret(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.crm_clear_channel_secret(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_clear_channel_secret(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.crm_get_channel_secret(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_get_channel_secret(text, text) TO service_role;