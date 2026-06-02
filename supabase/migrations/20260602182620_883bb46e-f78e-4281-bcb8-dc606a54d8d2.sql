DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'crm_creatives_admin_select'
  ) THEN
    CREATE POLICY "crm_creatives_admin_select"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'crm-creatives' AND public.is_admin());
  END IF;
END $$;