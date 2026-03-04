import { supabase } from '@/integrations/supabase/client';

interface FunnelTrackParams {
  entityType: 'popup' | 'paycard';
  entityId: string;
  eventType: 'view' | 'step' | 'final_view' | 'checkout_click' | 'exit';
  stepIndex?: number;
  stepOption?: string;
  houseId?: string | null;
}

export async function trackFunnel(params: FunnelTrackParams) {
  try {
    const deviceId = localStorage.getItem('premier_device_id') || undefined;
    const sessionId = localStorage.getItem('premier_session_id') || undefined;

    await (supabase.from('funnel_analytics' as any) as any).insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      event_type: params.eventType,
      step_index: params.stepIndex ?? null,
      step_option: params.stepOption ?? null,
      user_id: null,
      house_id: params.houseId ?? null,
      session_id: sessionId ?? null,
      device_id: deviceId ?? null,
    });
  } catch (e) {
    console.warn('[funnelTracker] erro ao registrar evento:', e);
  }
}
