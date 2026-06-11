DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'crm_telegram_group_bot_token';
  IF v_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_id, '8916743931:AAFwoBa84G-GiR9yoW-dTWAmnbxw11Ffpkc', 'crm_telegram_group_bot_token', NULL, NULL);
  ELSE
    PERFORM vault.create_secret('8916743931:AAFwoBa84G-GiR9yoW-dTWAmnbxw11Ffpkc', 'crm_telegram_group_bot_token', 'CRM Premier FC secret');
  END IF;
END $$;

UPDATE public.crm_channel_settings
SET config = jsonb_set(COALESCE(config,'{}'::jsonb), '{secrets_set}', '["bot_token"]'::jsonb),
    updated_at = NOW()
WHERE channel = 'telegram_group';