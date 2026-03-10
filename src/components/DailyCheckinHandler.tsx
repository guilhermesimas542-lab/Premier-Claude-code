import { useEffect, useRef } from 'react';
import { useGamification } from '@/hooks/useGamification';

export function DailyCheckinHandler() {
  const { userId, sendXpEvent } = useGamification();
  const hasFired = useRef(false);

  useEffect(() => {
    if (userId && !hasFired.current) {
      hasFired.current = true;
      sendXpEvent('DAILY_LOGIN');
    }
  }, [userId, sendXpEvent]);

  return null;
}
