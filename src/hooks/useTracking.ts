import { useCallback } from 'react';
import { trackEvent } from '@/lib/api';

type EventName = 
  | 'app_open'
  | 'click_banner'
  | 'view_entries'
  | 'click_entry'
  | 'open_popup_vitalicio'
  | 'click_buy_vitalicio'
  | 'click_buy_plan'
  | 'view_sport'
  | 'view_casino'
  | 'view_support'
  | 'click_telegram'
  | 'click_betsite';

export function useTracking() {
  const track = useCallback(async (eventName: EventName, metadata?: Record<string, unknown>) => {
    try {
      await trackEvent(eventName, metadata);
    } catch (error) {
      console.error('Erro ao registrar evento:', error);
    }
  }, []);

  return { track };
}
