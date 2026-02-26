
-- Add nickname and avatar_id to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS nickname VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(50) DEFAULT 'avatar_default_1';

-- Create user_gamification table
CREATE TABLE public.user_gamification (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  total_xp INT DEFAULT 0 NOT NULL,
  current_level INT DEFAULT 1 NOT NULL,
  current_streak INT DEFAULT 0 NOT NULL,
  longest_streak INT DEFAULT 0 NOT NULL,
  last_login_date DATE,
  total_logins INT DEFAULT 0 NOT NULL,
  friends_invited INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all" ON public.user_gamification FOR SELECT USING (true);
CREATE POLICY "Allow insert for service" ON public.user_gamification FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for service" ON public.user_gamification FOR UPDATE USING (true);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID REFERENCES public.users(id),
  referred_user_id UUID REFERENCES public.users(id) UNIQUE,
  xp_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all" ON public.referrals FOR SELECT USING (true);
CREATE POLICY "Allow insert for service" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for service" ON public.referrals FOR UPDATE USING (true);

-- Create xp_events log table
CREATE TABLE public.xp_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  xp_amount INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all" ON public.xp_events FOR SELECT USING (true);
CREATE POLICY "Allow insert for service" ON public.xp_events FOR INSERT WITH CHECK (true);
