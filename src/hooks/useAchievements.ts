import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getTodayInBrazil } from '@/lib/timezone';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  category: 'permanent' | 'streak' | 'daily' | 'special';
  condition_type: string;
  condition_value: any;
  is_active: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement_date: string | null;
  granted_by: string;
}

export function useAchievements(userId: string | null) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const achPromise = supabase.from('achievements').select('*').eq('is_active', true) as any;
    const uaPromise = userId
      ? (supabase.from('user_achievements').select('*').eq('user_id', userId) as any)
      : Promise.resolve({ data: [] });

    const [{ data: achData }, { data: uaData }] = await Promise.all([achPromise, uaPromise]);

    setAchievements((achData ?? []) as Achievement[]);
    setUserAchievements((uaData ?? []) as UserAchievement[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Listen for achievement updates from useGamification
  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener('achievements-updated', handler);
    return () => window.removeEventListener('achievements-updated', handler);
  }, [fetchAll]);

  const isUnlocked = useCallback((achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  }, [userAchievements]);

  const isUnlockedToday = useCallback((achievementId: string) => {
    const today = getTodayInBrazil();
    return userAchievements.some(ua => ua.achievement_id === achievementId && ua.achievement_date === today);
  }, [userAchievements]);

  const permanentAchievements = achievements.filter(a => a.category === 'permanent');
  const streakAchievements = achievements.filter(a => a.category === 'streak').sort((a, b) => {
    const daysA = a.condition_value?.days ?? 0;
    const daysB = b.condition_value?.days ?? 0;
    return daysA - daysB;
  });
  const dailyAchievements = achievements.filter(a => a.category === 'daily');
  const specialAchievements = achievements.filter(a => a.category === 'special');

  const unlockedPermanentCount = permanentAchievements.filter(a => isUnlocked(a.id)).length;
  const unlockedStreakCount = streakAchievements.filter(a => isUnlocked(a.id)).length;

  return {
    achievements,
    userAchievements,
    loading,
    isUnlocked,
    isUnlockedToday,
    permanentAchievements,
    streakAchievements,
    dailyAchievements,
    specialAchievements,
    unlockedPermanentCount,
    unlockedStreakCount,
    refetch: fetchAll,
  };
}
