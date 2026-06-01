// ============================================================
// mockProviders — providers simulados para mock-first (Sub-fase 1.6b)
//
// Cada canal tem um provider que simula:
//   - Latência de round-trip à API (200-500ms por chunk)
//   - Taxa de sucesso de envio (95% delivered, 5% failed)
//   - Engagement (open/click) para canais que suportam
//
// Em Pilar 4, substituir cada mock por chamada real ao provider correspondente
// (Resend, SMS Funnel, etc.) mantendo a mesma interface SendResult.
// ============================================================

export type ChannelKey =
  | "email"
  | "sms"
  | "telegram_group"
  | "telegram_x1"
  | "whatsapp"
  | "push"
  | "popup";

export interface Recipient {
  id: string;
  email: string | null;
  phone: string | null;
  nickname?: string | null;
}

export interface SendResult {
  recipient_user_id: string | null;
  recipient_identifier: string;
  /** Estado final do event após todas as fases simuladas (envio + engajamento). */
  status: "delivered" | "failed" | "opened" | "clicked";
  provider_message_id?: string;
  error_code?: string;
  error_message?: string;
  metadata: Record<string, unknown>;
}

// ============================================================
// Constantes de simulação
// ============================================================

const SEND_SUCCESS_RATE = 0.95;
const OPEN_RATE = 0.40;
const CLICK_RATE_OF_OPENS = 0.20; // ~8% do total
const BATCH_LATENCY_MIN_MS = 200;
const BATCH_LATENCY_MAX_MS = 500;

// Capacidades por canal — espelha integrationStatus do catálogo do front
const CHANNEL_CAPABILITIES: Record<
  ChannelKey,
  { blocked: boolean; supportsOpen: boolean; supportsClick: boolean; providerLabel: string }
> = {
  email:          { blocked: false, supportsOpen: true,  supportsClick: true,  providerLabel: "resend_mock" },
  sms:            { blocked: false, supportsOpen: false, supportsClick: false, providerLabel: "sms_funnel_mock" },
  telegram_group: { blocked: false, supportsOpen: false, supportsClick: true,  providerLabel: "telegram_mock" },
  telegram_x1:    { blocked: false, supportsOpen: false, supportsClick: false, providerLabel: "sendpulse_mock" },
  whatsapp:       { blocked: false, supportsOpen: true,  supportsClick: true,  providerLabel: "whatsapp_mock" },
  push:           { blocked: false, supportsOpen: false, supportsClick: false, providerLabel: "web_push" },
  popup:          { blocked: true,  supportsOpen: false, supportsClick: false, providerLabel: "popup_pending" },
};

// ============================================================
// Helpers
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomLatency(): number {
  return (
    BATCH_LATENCY_MIN_MS +
    Math.random() * (BATCH_LATENCY_MAX_MS - BATCH_LATENCY_MIN_MS)
  );
}

function randomMessageId(channel: ChannelKey): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `mock_${channel}_${Date.now()}_${rand}`;
}

function pickIdentifier(channel: ChannelKey, r: Recipient): string {
  if (channel === "email") return r.email ?? r.id;
  if (channel === "sms" || channel === "whatsapp") return r.phone ?? r.email ?? r.id;
  return r.email ?? r.phone ?? r.id;
}

/**
 * Quando o destinatário vem de uma lista estática sem user_id no banco,
 * usamos um id sintético `audience_member:...` que NÃO é UUID válido.
 * Esse helper normaliza pra null antes de gravar em crm_schedule_events.
 */
function recipientUserIdOrNull(r: Recipient): string | null {
  if (!r.id) return null;
  if (r.id.startsWith("audience_member:")) return null;
  return r.id;
}

function jitterTimestamp(baseMs: number, minMin = 1, maxMin = 60): string {
  const offsetMs = (minMin + Math.random() * (maxMin - minMin)) * 60_000;
  return new Date(baseMs + offsetMs).toISOString();
}

// ============================================================
// Envio em lote (1 batch ≈ 1 chamada à API real do provider)
// ============================================================

export async function sendBatch(
  channel: ChannelKey,
  recipients: Recipient[]
): Promise<SendResult[]> {
  const caps = CHANNEL_CAPABILITIES[channel];

  // Simula round-trip à API do provider
  await sleep(randomLatency());

  const now = Date.now();
  const sentAt = new Date(now).toISOString();

  // Canais bloqueados (push/popup): força 100% failed
  if (caps.blocked) {
    return recipients.map((r) => ({
      recipient_user_id: recipientUserIdOrNull(r),
      recipient_identifier: pickIdentifier(channel, r),
      status: "failed" as const,
      error_code: "channel_blocked",
      error_message: "Integração pendente para este canal — configure em Configurações.",
      metadata: {
        mock: true,
        mode: "1.6b",
        provider: caps.providerLabel,
        blocked_channel: true,
        attempted_at: sentAt,
      },
    }));
  }

  return recipients.map((r) => {
    const identifier = pickIdentifier(channel, r);
    const delivered = Math.random() < SEND_SUCCESS_RATE;

    if (!delivered) {
      return {
        recipient_user_id: recipientUserIdOrNull(r),
        recipient_identifier: identifier,
        status: "failed" as const,
        error_code: "provider_error",
        error_message: "Falha simulada de envio (mock 5%).",
        metadata: {
          mock: true,
          mode: "1.6b",
          provider: caps.providerLabel,
          attempted_at: sentAt,
        },
      };
    }

    // Engagement (open / click) — mesma execução
    let finalStatus: SendResult["status"] = "delivered";
    const openedAt = caps.supportsOpen && Math.random() < OPEN_RATE
      ? jitterTimestamp(now, 1, 60)
      : null;
    const clickedAt =
      caps.supportsClick && openedAt !== null && Math.random() < CLICK_RATE_OF_OPENS
        ? jitterTimestamp(Date.parse(openedAt), 1, 30)
        : caps.supportsClick && !caps.supportsOpen && Math.random() < OPEN_RATE * CLICK_RATE_OF_OPENS
          // canais com click mas sem open (telegram_group): probabilidade direta de click
          ? jitterTimestamp(now, 5, 120)
          : null;

    if (clickedAt) finalStatus = "clicked";
    else if (openedAt) finalStatus = "opened";

    return {
      recipient_user_id: recipientUserIdOrNull(r),
      recipient_identifier: identifier,
      status: finalStatus,
      provider_message_id: randomMessageId(channel),
      metadata: {
        mock: true,
        mode: "1.6b",
        provider: caps.providerLabel,
        sent_at: sentAt,
        ...(openedAt && { opened_at: openedAt }),
        ...(clickedAt && { clicked_at: clickedAt }),
      },
    };
  });
}

// ============================================================
// Broadcast (Telegram x1) — 1 event sintético, sem destinatários rastreados
// ============================================================

export async function sendBroadcast(channel: ChannelKey): Promise<SendResult> {
  const caps = CHANNEL_CAPABILITIES[channel];
  await sleep(randomLatency());

  const sentAt = new Date().toISOString();
  const delivered = Math.random() < SEND_SUCCESS_RATE;

  if (!delivered) {
    return {
      recipient_user_id: null,
      recipient_identifier: "broadcast",
      status: "failed",
      error_code: "provider_error",
      error_message: "Falha simulada de broadcast (mock 5%).",
      metadata: {
        mock: true,
        mode: "1.6b",
        provider: caps.providerLabel,
        broadcast: true,
        attempted_at: sentAt,
      },
    };
  }

  return {
    recipient_user_id: null,
    recipient_identifier: "broadcast",
    status: "delivered",
    provider_message_id: randomMessageId(channel),
    metadata: {
      mock: true,
      mode: "1.6b",
      provider: caps.providerLabel,
      broadcast: true,
      sent_at: sentAt,
    },
  };
}

export function getChannelCapabilities(channel: ChannelKey) {
  return CHANNEL_CAPABILITIES[channel];
}
