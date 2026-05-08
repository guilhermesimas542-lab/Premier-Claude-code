import { useState, useEffect } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { CHILE_TZ } from '@/lib/timezone';

export function RealTimeClock() {
  const [time, setTime] = useState(() =>
    formatInTimeZone(new Date(), CHILE_TZ, 'dd/MM/yyyy HH:mm:ss')
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTime(formatInTimeZone(new Date(), CHILE_TZ, 'dd/MM/yyyy HH:mm:ss'));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-xs text-gray-400 whitespace-nowrap font-mono">
      🕐 {time} (Brasília)
    </span>
  );
}
