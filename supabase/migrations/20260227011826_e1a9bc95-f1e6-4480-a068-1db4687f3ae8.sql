
CREATE TABLE public.market_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction TEXT NOT NULL UNIQUE,
  market TEXT NOT NULL,
  market_explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.market_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage market_predictions"
ON public.market_predictions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Allow read for all"
ON public.market_predictions
FOR SELECT
USING (true);
