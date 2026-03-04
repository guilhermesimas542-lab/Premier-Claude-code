
CREATE TABLE public.funnel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  step_index INTEGER,
  step_option TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  house_id UUID REFERENCES public.betting_houses(id) ON DELETE SET NULL,
  session_id TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_funnel_analytics_entity ON public.funnel_analytics(entity_type, entity_id);
CREATE INDEX idx_funnel_analytics_event ON public.funnel_analytics(event_type);
CREATE INDEX idx_funnel_analytics_created ON public.funnel_analytics(created_at);

ALTER TABLE public.funnel_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_funnel_analytics" ON public.funnel_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_funnel_analytics" ON public.funnel_analytics FOR SELECT USING (public.is_admin());
