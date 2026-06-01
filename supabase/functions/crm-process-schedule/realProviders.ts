// ============================================================
// realProviders — providers REAIS (Pilar 4 parcial).
//
// Atualmente só o canal SMS está plugado (SMS Dev — smsdev.com.br).
// Os demais canais continuam usando mockProviders.ts.
// ============================================================

import type { Recipient, SendResult } from "./mockProviders.ts";

interface SmsContent {
  body?: string | null;
  [key: string]: unknown;
}

const SMSDEV_ENDPOINT = "https://api.smsdev.com.br/v1/send";

/**
 * Normaliza pra formato E.164-ish que o SMS Dev aceita: só dígitos,
 * com DDI 55 na frente se ainda não estiver presente.
 *   "(71) 98137-9776" -> "5571981379776"
 *   "5571981379776"   -> "5571981379776"
 */
function normalizeBrPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}

function buildMessage(body: string | null | undefined): string {
  const txt = (body ?? "").trim();
  if (!txt) return "Premier FC";
  if (/^premier\s*fc/i.test(txt)) return txt;
  return "Premier FC: " + txt;
}

export async function sendBatchSmsReal(
  recipients: Recipient[],
  content: SmsContent | null | undefined,
  apiKey: string
): Promise<SendResult[]> {
  const msg = buildMessage(content?.body ?? null);
  const sentAt = new Date().toISOString();

  const results: SendResult[] = [];

  for (const r of recipients) {
    const recipientUserId =
      r.id && !r.id.startsWith("audience_member:") ? r.id : null;
    const phone = normalizeBrPhone(r.phone);
    const identifier = phone ?? r.phone ?? r.email ?? r.id;

    if (!phone) {
      results.push({
        recipient_user_id: recipientUserId,
        recipient_identifier: identifier,
        status: "failed",
        error_code: "no_phone",
        error_message: "Destinatário sem telefone válido.",
        metadata: { provider: "smsdev", attempted_at: sentAt },
      });
      continue;
    }

    try {
      const resp = await fetch(SMSDEV_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
          type: 9,
          number: phone,
          msg,
        }),
      });

      const text = await resp.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // resposta não-JSON → trata como erro
      }
      const data = Array.isArray(parsed) ? parsed[0] : parsed;

      if (data && String(data.situacao).toUpperCase() === "OK") {
        results.push({
          recipient_user_id: recipientUserId,
          recipient_identifier: phone,
          status: "delivered",
          provider_message_id: data.id ? String(data.id) : undefined,
          metadata: {
            provider: "smsdev",
            sent_at: sentAt,
            http_status: resp.status,
          },
        });
      } else {
        results.push({
          recipient_user_id: recipientUserId,
          recipient_identifier: phone,
          status: "failed",
          error_code: "smsdev_error",
          error_message:
            (data && (data.descricao ?? data.descricaoStatus ?? data.message)) ??
            (text ? text.slice(0, 200) : `http_${resp.status}`),
          metadata: {
            provider: "smsdev",
            attempted_at: sentAt,
            http_status: resp.status,
            raw: parsed ?? text?.slice(0, 500),
          },
        });
      }
    } catch (e: any) {
      results.push({
        recipient_user_id: recipientUserId,
        recipient_identifier: phone,
        status: "failed",
        error_code: "smsdev_exception",
        error_message: e?.message ?? String(e),
        metadata: { provider: "smsdev", attempted_at: sentAt },
      });
    }
  }

  return results;
}
