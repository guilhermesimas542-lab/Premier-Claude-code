ALTER TABLE public.popups 
  ADD COLUMN IF NOT EXISTS final_template text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS final_config jsonb DEFAULT '{}'::jsonb;