
-- Add missing columns to content_banners
ALTER TABLE public.content_banners
  ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'futebol',
  ADD COLUMN IF NOT EXISTS tag text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtitle text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create storage bucket for banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read
CREATE POLICY "Public read banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

-- Admins can upload
CREATE POLICY "Admins upload banners" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banners' AND public.is_admin());

-- Admins can delete
CREATE POLICY "Admins delete banners" ON storage.objects
  FOR DELETE USING (bucket_id = 'banners' AND public.is_admin());

-- Admins can update
CREATE POLICY "Admins update banners" ON storage.objects
  FOR UPDATE USING (bucket_id = 'banners' AND public.is_admin());
