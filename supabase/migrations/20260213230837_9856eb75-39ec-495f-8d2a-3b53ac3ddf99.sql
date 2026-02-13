
-- Add status column with default 'active'
ALTER TABLE public.content_banners ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Migrate existing data
UPDATE public.content_banners SET status = CASE WHEN active = true THEN 'active' ELSE 'inactive' END;

-- Drop the old active column
ALTER TABLE public.content_banners DROP COLUMN active;

-- Update RLS policies that reference the old column (they don't reference active directly, so no change needed)
