import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { mockGetUser } from '@/mocks/user';
import { toast } from 'sonner';

export interface GamificationData {
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
  total_logins: number;
  friends_invited: number;
}

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 100, 3: 300, 4: 600, 5: 1000,
  6: 1500, 7: 2100, 8: 2800, 9: 3600, 10: 4500,
};

export function getXpForLevel(level: number): number {
  return LEVEL_THRESHOLDS[level] || 0;
}

export function getXpProgress(totalXp: number, currentLevel: number) {
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(Math.min(currentLevel + 1, 10));
  const xpInLevel = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progress = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;
  return { xpInLevel, xpNeeded, progress, nextLevelXp };
}

export function useGamification() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID from email
  useEffect(() => {
    const mockUser = mockGetUser();
    if (!mockUser) { setLoading(false); return; }

    const fetchUserId = async () => {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', mockUser.email)
        .maybeSingle();
      if (user?.id) setUserId(user.id);
      else setLoading(false);
    };
    fetchUserId();
  }, []);

  // Fetch gamification data
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: gData } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    setData(gData as GamificationData | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId, fetchData]);

  const sendXpEvent = useCallback(async (event: string) => {
    if (!userId) return null;
    try {
      const { data: result, error } = await supabase.functions.invoke('handle-xp-events', {
        body: { event, userId },
      });
      if (!error && result?.success) {
        fetchData(); // refresh
        
        // Show achievement toasts
        if (result.newAchievements && result.newAchievements.length > 0) {
          for (const ach of result.newAchievements) {
            toast(`${ach.icon} ${ach.name}`, {
              description: `+${ach.xp_reward} XP`,
              duration: 4000,
              style: {
                background: '#0a0a0a',
                border: '1px solid rgba(255,215,0,0.4)',
                color: '#FFD700',
              },
            });
          }
        }
      }
      return result;
    } catch {
      return null;
    }
  }, [userId, fetchData]);

  return { data, loading, userId, sendXpEvent, refetch: fetchData };
}
