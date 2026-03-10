
-- Create achievements table
CREATE TABLE public.achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('permanent', 'streak', 'daily', 'special')),
  condition_type TEXT NOT NULL,
  condition_value JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_achievements table (no unique constraint - dailies can repeat)
CREATE TABLE public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  achievement_date DATE DEFAULT CURRENT_DATE,
  granted_by TEXT DEFAULT 'system'
);

-- Unique constraint only for non-daily achievements
CREATE UNIQUE INDEX idx_user_achievements_non_daily
  ON public.user_achievements (user_id, achievement_id)
  WHERE achievement_date IS NULL;

-- Create special_achievement_entries table
CREATE TABLE public.special_achievement_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id),
  entry_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX idx_special_achievement_entries_entry_id ON public.special_achievement_entries(entry_id);

-- RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_achievement_entries ENABLE ROW LEVEL SECURITY;

-- Achievements: anyone can read, admins can manage
CREATE POLICY "Allow read for all achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User achievements: anyone can read, service can insert
CREATE POLICY "Allow read for all user_achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Allow insert user_achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);

-- Special achievement entries: anyone can read, admins can manage
CREATE POLICY "Allow read special_achievement_entries" ON public.special_achievement_entries FOR SELECT USING (true);
CREATE POLICY "Admins manage special_achievement_entries" ON public.special_achievement_entries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
