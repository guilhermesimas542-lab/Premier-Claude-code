/**
 * Eventos disponíveis no nó "Condição" da jornada.
 * - Engajamento: opened/clicked/converted (avaliados via crm_journey_step_events / financial_events)
 * - Status do funil (Payt): nomes reais de event_name gravados em financial_events
 *   pelo webhook Payt (ver supabase/functions/payment-webhook/index.ts).
 */

export const ENGAGEMENT_EVENTS = ["opened", "clicked", "converted", "logged_in"] as const;
export type EngagementEvent = (typeof ENGAGEMENT_EVENTS)[number];

/** value = event_name exato gravado em financial_events */
export const FUNNEL_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "payt_pending", label: "Pedido criado" },
  { value: "payt_waiting_boleto", label: "Aguardando boleto" },
  { value: "payt_waiting_pix", label: "Aguardando PIX" },
  { value: "Purchase_Order_Confirmed", label: "Pagamento confirmado / Compra confirmada" },
  { value: "Purchase_Refunded", label: "Reembolso" },
  { value: "payt_chargedback", label: "Chargeback" },
  { value: "Subscription_Cancelled", label: "Cancelado" },
  { value: "payt_expired", label: "Expirado" },
];

export const FUNNEL_STATUS_VALUES = new Set(FUNNEL_STATUS_OPTIONS.map((o) => o.value));

export function isFunnelStatusEvent(event: string): boolean {
  return FUNNEL_STATUS_VALUES.has(event);
}

export function isLoginEvent(event: string): boolean {
  return event === "logged_in";
}

export const ENGAGEMENT_OPTIONS: Array<{ value: EngagementEvent; label: string }> = [
  { value: "opened", label: "Abriu" },
  { value: "clicked", label: "Clicou" },
  { value: "converted", label: "Converteu" },
  { value: "logged_in", label: "Fez login" },
];
