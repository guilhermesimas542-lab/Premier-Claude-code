-- Permitir leitura pública de objetos no bucket crm-creatives
CREATE POLICY "crm_creatives_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-creatives');

-- Upload/editar/remover só para admin
CREATE POLICY "crm_creatives_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'crm-creatives' AND public.is_admin());

CREATE POLICY "crm_creatives_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'crm-creatives' AND public.is_admin());

CREATE POLICY "crm_creatives_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'crm-creatives' AND public.is_admin());