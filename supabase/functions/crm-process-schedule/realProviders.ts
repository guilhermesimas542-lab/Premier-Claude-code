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

// ============================================================
// Web Push real (VAPID) — usa o helper compartilhado em _shared/webpush.ts
// que já é usado pela edge function send-push-notification.
// ============================================================

import { sendPushToSubscription, type WebPushSubscription } from "../_shared/webpush.ts";

interface PushContent {
  title?: string | null;
  body?: string | null;
  [key: string]: unknown;
}

export interface PushVapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export async function sendBatchPushReal(
  recipients: Recipient[],
  content: PushContent | null | undefined,
  supabase: any,
  vapid: PushVapidKeys
): Promise<SendResult[]> {
  const title = (content?.title ?? "").toString().trim() || "Premier FC";
  const bodyText = (content?.body ?? "").toString().trim() || "";
  const sentAt = new Date().toISOString();
  const results: SendResult[] = [];

  // Filtra ids reais (UUID, descarta audience_member sintéticos)
  const userIds = recipients
    .map((r) => r.id)
    .filter((id) => !!id && !id.startsWith("audience_member:"));

  // Mapa user_id → array de subscriptions
  const subsByUser = new Map<string, Array<{ subscription_object: any }>>();
  if (userIds.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const slice = userIds.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("user_id, subscription_object")
        .in("user_id", slice);
      if (error) {
        console.error("[CRM][push] erro lendo push_subscriptions:", error);
        continue;
      }
      for (const row of (data ?? []) as any[]) {
        const arr = subsByUser.get(row.user_id) ?? [];
        arr.push({ subscription_object: row.subscription_object });
        subsByUser.set(row.user_id, arr);
      }
    }
  }

  for (const r of recipients) {
    const recipientUserId =
      r.id && !r.id.startsWith("audience_member:") ? r.id : null;
    const identifier = r.email ?? r.phone ?? r.id;

    if (!recipientUserId) {
      results.push({
        recipient_user_id: null,
        recipient_identifier: identifier,
        status: "failed",
        error_code: "no_push_subscription",
        error_message: "Destinatário sem user_id rastreável.",
        metadata: { provider: "web_push", attempted_at: sentAt },
      });
      continue;
    }

    const subs = subsByUser.get(recipientUserId) ?? [];
    if (subs.length === 0) {
      results.push({
        recipient_user_id: recipientUserId,
        recipient_identifier: identifier,
        status: "failed",
        error_code: "no_push_subscription",
        error_message: "Usuário sem subscription ativa.",
        metadata: { provider: "web_push", attempted_at: sentAt },
      });
      continue;
    }

    for (const { subscription_object } of subs) {
      const sub = subscription_object as WebPushSubscription | null;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        results.push({
          recipient_user_id: recipientUserId,
          recipient_identifier: identifier,
          status: "failed",
          error_code: "invalid_subscription",
          error_message: "Subscription malformada.",
          metadata: { provider: "web_push", attempted_at: sentAt },
        });
        continue;
      }

      try {
        const resp = await sendPushToSubscription(
          sub,
          { title, body: bodyText },
          vapid.publicKey,
          vapid.privateKey,
          vapid.subject
        );

        if (resp.ok || resp.status === 201) {
          results.push({
            recipient_user_id: recipientUserId,
            recipient_identifier: identifier,
            status: "delivered",
            metadata: {
              provider: "web_push",
              sent_at: sentAt,
              http_status: resp.status,
              endpoint_host: new URL(sub.endpoint).host,
            },
          });
        } else if (resp.status === 410 || resp.status === 404) {
          // Subscription expirada → remove
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", recipientUserId);
          results.push({
            recipient_user_id: recipientUserId,
            recipient_identifier: identifier,
            status: "failed",
            error_code: "subscription_expired",
            error_message: `Subscription expirada (HTTP ${resp.status}) — removida.`,
            metadata: {
              provider: "web_push",
              attempted_at: sentAt,
              http_status: resp.status,
            },
          });
        } else {
          results.push({
            recipient_user_id: recipientUserId,
            recipient_identifier: identifier,
            status: "failed",
            error_code: "push_error",
            error_message: `HTTP ${resp.status}`,
            metadata: {
              provider: "web_push",
              attempted_at: sentAt,
              http_status: resp.status,
            },
          });
        }
      } catch (e: any) {
        results.push({
          recipient_user_id: recipientUserId,
          recipient_identifier: identifier,
          status: "failed",
          error_code: "push_exception",
          error_message: e?.message ?? String(e),
          metadata: { provider: "web_push", attempted_at: sentAt },
        });
      }
    }
  }

  return results;
}

// ============================================================
// Popup interno — enfileira uma delivery por usuário em
// crm_popup_deliveries. A exibição é feita pelo app no carregamento.
// ============================================================

interface PopupContent {
  title?: string | null;
  body?: string | null;
  cta?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export async function sendBatchPopupReal(
  recipients: Recipient[],
  content: PopupContent | null | undefined,
  scheduleId: string,
  supabase: any
): Promise<SendResult[]> {
  const sentAt = new Date().toISOString();
  const normalizedContent = {
    title: (content?.title ?? "").toString().trim() || "Premier FC",
    body: (content?.body ?? "").toString().trim() || "",
    cta: content?.cta ?? null,
  };

  const results: SendResult[] = [];
  const toInsert: Array<{
    schedule_id: string;
    user_id: string;
    content: any;
    status: string;
    recipient_index: number;
  }> = [];

  recipients.forEach((r, idx) => {
    const recipientUserId =
      r.id && !r.id.startsWith("audience_member:") ? r.id : null;
    const identifier = r.email ?? r.phone ?? r.id;

    if (!recipientUserId) {
      results.push({
        recipient_user_id: null,
        recipient_identifier: identifier,
        status: "failed",
        error_code: "no_user",
        error_message: "Popup só pode ser enfileirado para usuários logados.",
        metadata: { provider: "popup_internal", attempted_at: sentAt },
      });
      return;
    }

    toInsert.push({
      schedule_id: scheduleId,
      user_id: recipientUserId,
      content: normalizedContent,
      status: "pending",
      recipient_index: idx,
    });

    // placeholder result preenchido após o insert
    results.push({
      recipient_user_id: recipientUserId,
      recipient_identifier: identifier,
      status: "failed",
      error_code: "popup_pending_insert",
      error_message: "Aguardando insert...",
      metadata: { provider: "popup_internal", attempted_at: sentAt },
    });
  });

  if (toInsert.length === 0) return results;

  const payload = toInsert.map(({ recipient_index: _i, ...rest }) => rest);
  const { data, error } = await supabase
    .from("crm_popup_deliveries")
    .insert(payload)
    .select("id, user_id");

  if (error) {
    console.error("[CRM][popup] erro inserindo deliveries:", error);
    toInsert.forEach((row) => {
      const r = results[row.recipient_index];
      r.status = "failed";
      r.error_code = "popup_insert_failed";
      r.error_message = error.message;
      r.metadata = { ...r.metadata, db_error: error.message };
    });
    return results;
  }

  // Map user_id -> delivery_id (1:1 nesta janela; se houver duplicidade,
  // pega o primeiro)
  const idByUser = new Map<string, string>();
  for (const row of (data ?? []) as any[]) {
    if (!idByUser.has(row.user_id)) idByUser.set(row.user_id, row.id);
  }

  for (const row of toInsert) {
    const r = results[row.recipient_index];
    const deliveryId = idByUser.get(row.user_id);
    r.status = "delivered";
    r.error_code = undefined;
    r.error_message = undefined;
    r.provider_message_id = deliveryId;
    r.metadata = {
      provider: "popup_internal",
      sent_at: sentAt,
      delivery_id: deliveryId,
    };
  }

  return results;
}
