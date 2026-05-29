import type { ChannelKey } from "./channels";

/**
 * Versão client-side dos mock providers (mesmas regras do mockProviders.ts da edge function).
 * Decide status final do envio simulado e gera metadata.
 *
 * Taxas (idênticas à 1.6b):
 *   - 95% delivered, 5% failed
 *   - 40% open (canais que suportam)
 *   - 8% click do total ≈ 20% dos opens (subset)
 */

const SEND_SUCCESS_RATE = 0.95;
const OPEN_RATE = 0.40;
const CLICK_RATE_OF_OPENS = 0.20;

const CAPS: Record<
  ChannelKey,
  { blocked: boolean; supportsOpen: boolean; supportsClick: boolean; providerLabel: string }
> = {
  email:          { blocked: false, supportsOpen: true,  supportsClick: true,  providerLabel: "resend_mock" },
  sms:            { blocked: false, supportsOpen: false, supportsClick: false, providerLabel: "sms_funnel_mock" },
  telegram_group: { blocked: false, supportsOpen: false, supportsClick: true,  providerLabel: "telegram_mock" },
  telegram_x1:    { blocked: false, supportsOpen: false, supportsClick: false, providerLabel: "sendpulse_mock" },
  whatsapp:       { blocked: false, supportsOpen: true,  supportsClick: true,  providerLabel: "whatsapp_mock" },
  push:           { blocked: true,  supportsOpen: false, supportsClick: false, providerLabel: "push_pending" },
  popup:          { blocked: true,  supportsOpen: false, supportsClick: false, providerLabel: "popup_pending" },
};

export type MockEventStatus = "delivered" | "failed" | "opened" | "clicked";

export interface MockEventResult {
  status: MockEventStatus;
  provider_message_id?: string;
  error_code?: string;
  error_message?: string;
  metadata: Record<string, unknown>;
}

function randomMessageId(channel: ChannelKey): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `mock_${channel}_${Date.now()}_${rand}`;
}

function jitterTimestamp(baseMs: number, minMin = 1, maxMin = 60): string {
  const offsetMs = (minMin + Math.random() * (maxMin - minMin)) * 60_000;
  return new Date(baseMs + offsetMs).toISOString();
}

/**
 * Simula 1 envio mock para 1 destinatário num canal.
 * Decisão estatística: delivered/failed/opened/clicked.
 */
export function simulateMockSend(channel: ChannelKey): MockEventResult {
  const caps = CAPS[channel];
  const now = Date.now();
  const sentAt = new Date(now).toISOString();

  if (caps.blocked) {
    return {
      status: "failed",
      error_code: "channel_blocked",
      error_message: "Integração pendente para este canal.",
      metadata: {
        mock: true,
        mode: "2.5_client",
        provider: caps.providerLabel,
        blocked_channel: true,
        attempted_at: sentAt,
      },
    };
  }

  if (Math.random() >= SEND_SUCCESS_RATE) {
    return {
      status: "failed",
      error_code: "provider_error",
      error_message: "Falha simulada (mock 5%).",
      metadata: {
        mock: true,
        mode: "2.5_client",
        provider: caps.providerLabel,
        attempted_at: sentAt,
      },
    };
  }

  let finalStatus: MockEventStatus = "delivered";
  const openedAt =
    caps.supportsOpen && Math.random() < OPEN_RATE ? jitterTimestamp(now, 1, 60) : null;

  let clickedAt: string | null = null;
  if (openedAt && caps.supportsClick && Math.random() < CLICK_RATE_OF_OPENS) {
    clickedAt = jitterTimestamp(Date.parse(openedAt), 1, 30);
  } else if (!caps.supportsOpen && caps.supportsClick) {
    // canais com click direto sem open (telegram_group)
    if (Math.random() < OPEN_RATE * CLICK_RATE_OF_OPENS) {
      clickedAt = jitterTimestamp(now, 5, 120);
    }
  }

  if (clickedAt) finalStatus = "clicked";
  else if (openedAt) finalStatus = "opened";

  return {
    status: finalStatus,
    provider_message_id: randomMessageId(channel),
    metadata: {
      mock: true,
      mode: "2.5_client",
      provider: caps.providerLabel,
      sent_at: sentAt,
      ...(openedAt && { opened_at: openedAt }),
      ...(clickedAt && { clicked_at: clickedAt }),
    },
  };
}

/** Converte (delay_value, delay_unit) em milissegundos. */
export function delayToMs(value: number, unit: "minute" | "hour" | "day" | "week"): number {
  const factor =
    unit === "minute" ? 60_000 :
    unit === "hour"   ? 3_600_000 :
    unit === "day"    ? 86_400_000 :
    /* week */          604_800_000;
  return value * factor;
}
