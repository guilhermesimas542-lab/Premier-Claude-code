CREATE TABLE IF NOT EXISTS public.user_popup_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  popup_id UUID NOT NULL REFERENCES public.popups(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, popup_id)
);

CREATE INDEX idx_user_popup_views_user_id ON public.user_popup_views(user_id);
CREATE INDEX idx_user_popup_views_popup_id ON public.user_popup_views(popup_id);

ALTER TABLE public.user_popup_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all" ON public.user_popup_views FOR SELECT USING (true);
CREATE POLICY "Allow insert for all" ON public.user_popup_views FOR INSERT WITH CHECK (true);