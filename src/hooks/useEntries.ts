import { useState, useEffect, useCallback } from 'react';
import { getEntries, trackEvent, EntriesResponse } from '@/lib/api';
import { format } from 'date-fns';

export interface DisplayEntry {
  id: string;
  date: string;
  tier_required: string;
  addon_required: string | null;
  locked: boolean;
  display_title: string;
  display_market: string | null;
  display_odd: number | null;
}

interface UseEntriesReturn {
  entries: DisplayEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEntries(date?: string): UseEntriesReturn {
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDate = date || format(new Date(), 'yyyy-MM-dd');

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEntries(targetDate);

      if (response.success && response.entries) {
        setEntries(response.entries as unknown as DisplayEntry[]);
        
        // Track view_entries event
        await trackEvent('view_entries', { date: targetDate });
      } else {
        setError('Erro ao carregar entradas');
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    isLoading,
    error,
    refetch: fetchEntries,
  };
}
