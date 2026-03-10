import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { mockGetUser } from '@/mocks/user';
import { useGamification } from '@/contexts/GamificationContext';

export function DailyCheckinHandler() {
  const { sendXpEvent } = useGamification();
  const hasFired = useRef(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Retry up to 10 times (every 500ms) to find user in DB
  useEffect(() => {
    const mockUser = mockGetUser();
    if (!mockUser?.email) return;

    let attempts = 0;
    const maxAttempts = 10;
    let cancelled = false;

    const tryFetch = async () => {
      if (cancelled) return;
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', mockUser.email)
        .maybeSingle();

      if (cancelled) return;

      if (user?.id) {
        setUserId(user.id);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryFetch, 500);
      }
    };

    tryFetch();
    return () => { cancelled = true; };
  }, []);

  // Fire DAILY_LOGIN once when userId is available
  useEffect(() => {
    if (userId && !hasFired.current) {
      hasFired.current = true;
      sendXpEvent('DAILY_LOGIN');
    }
  }, [userId, sendXpEvent]);

  return null;
}
