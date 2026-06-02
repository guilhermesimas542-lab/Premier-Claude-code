CREATE TABLE IF NOT EXISTS public.ai_bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  tip_cache_id UUID REFERENCES public.ai_tip_cache(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_bug_reports_status_created
  ON public.ai_bug_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_bug_reports_user
  ON public.ai_bug_reports(user_id, created_at DESC);

ALTER TABLE public.ai_bug_reports ENABLE ROW LEVEL SECURITY;