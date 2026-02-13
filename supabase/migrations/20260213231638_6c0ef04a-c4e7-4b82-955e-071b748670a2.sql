
-- Add target_audience column to content_banners
ALTER TABLE public.content_banners
ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'all';

-- Create banner_analytics table
CREATE TABLE public.banner_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id UUID NOT NULL REFERENCES public.content_banners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast aggregation
CREATE INDEX idx_banner_analytics_banner_event ON public.banner_analytics (banner_id, event_type);
CREATE INDEX idx_banner_analytics_banner_date ON public.banner_analytics (banner_id, created_at);

-- Enable RLS
ALTER TABLE public.banner_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (tracking from frontend)
CREATE POLICY "Allow insert for all" ON public.banner_analytics FOR INSERT WITH CHECK (true);

-- Anyone can read (admin needs aggregates)
CREATE POLICY "Allow read for all" ON public.banner_analytics FOR SELECT USING (true);
