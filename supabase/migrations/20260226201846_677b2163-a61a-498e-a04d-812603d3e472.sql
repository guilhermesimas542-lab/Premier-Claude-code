ALTER TABLE public.content_entries ADD COLUMN result TEXT NOT NULL DEFAULT 'pending';
CREATE INDEX idx_content_entries_result ON public.content_entries(result);
CREATE INDEX idx_content_entries_result_date ON public.content_entries(result, date DESC);