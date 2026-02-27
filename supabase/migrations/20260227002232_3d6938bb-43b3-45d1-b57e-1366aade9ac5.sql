
-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Anyone can read teams
CREATE POLICY "Anyone can read teams" ON public.teams
  FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert teams" ON public.teams
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update teams" ON public.teams
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete teams" ON public.teams
  FOR DELETE USING (public.is_admin());

-- Create team_logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('team_logos', 'team_logos', true);

-- Allow authenticated users to upload to team_logos
CREATE POLICY "Authenticated users can upload team logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team_logos' AND auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Public read access for team logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team_logos');

-- Allow authenticated users to update/delete
CREATE POLICY "Authenticated users can update team logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team_logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete team logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team_logos' AND auth.role() = 'authenticated');
