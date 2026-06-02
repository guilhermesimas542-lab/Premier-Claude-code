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
  image_url?: string | null;
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
  const imageUrl = (content?.image_url ?? "").toString().trim() || null;
  const sentAt = new Date().toISOString();
  const results: SendResult[] = [];

  const pushPayload: { title: string; body: string; image?: string } = { title, body: bodyText };
  if (imageUrl) pushPayload.image = imageUrl;

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
          pushPayload as any,
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
// Telegram x1 (SendPulse) — broadcast pra todos assinantes do bot.
// ============================================================

export async function sendBroadcastTelegramX1Real(
  text: string, title: string, botId: string, apiId: string, apiSecret: string,
): Promise<SendResult> {
  const fail = (code: string, msg: string): SendResult => ({
    recipient_user_id: null, recipient_identifier: "broadcast", status: "failed",
    error_code: code, error_message: msg,
    metadata: { provider: "sendpulse", broadcast: true, real: true },
  });
  // 1. OAuth (token vale 1h)
  const t = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: apiId, client_secret: apiSecret }),
  });
  const tj = await t.json().catch(() => ({}));
  if (!t.ok || !tj?.access_token) return fail("sendpulse_auth_error", tj?.error_description ?? "Falha no OAuth do SendPulse");
  // 2. Broadcast pra todos os assinantes do bot
  const c = await fetch("https://api.sendpulse.com/telegram/campaigns/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tj.access_token}` },
    body: JSON.stringify({ title: (title || "Premier FC").slice(0, 255), bot_id: botId, messages: [{ type: "text", message: { text } }] }),
  });
  const cj = await c.json().catch(() => ({}));
  if (!c.ok || cj?.success === false) return fail("sendpulse_send_error", typeof cj?.message === "string" ? cj.message : JSON.stringify(cj).slice(0, 300));
  const id = cj?.data?.id ?? cj?.id ?? null;
  return { recipient_user_id: null, recipient_identifier: "broadcast", status: "delivered",
    provider_message_id: id ? String(id) : undefined,
    metadata: { provider: "sendpulse", broadcast: true, real: true } };
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

// ============================================================
// Telegram grupo — 1 mensagem direto pro grupo via Bot API.
// ============================================================

export async function sendTelegramGroupReal(
  text: string, botToken: string, chatId: string,
): Promise<SendResult> {
  const base = {
    recipient_user_id: null as string | null,
    recipient_identifier: `telegram_group:${chatId}`,
    metadata: { provider: "telegram", group: true, real: true },
  };
  try {
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok || j?.ok !== true) {
      return { ...base, status: "failed", error_code: "telegram_send_error", error_message: j?.description ?? `HTTP ${resp.status}` };
    }
    return { ...base, status: "delivered", provider_message_id: j?.result?.message_id ? String(j.result.message_id) : undefined };
  } catch (e) {
    return { ...base, status: "failed", error_code: "telegram_network_error", error_message: String(e) };
  }
}

// ============================================================
// Email real (Resend) — envio em lote via endpoint /emails/batch.
// Lê API key do Vault e from_email/from_name/reply_to de crm_channel_settings.config.
// Mantém o caminho destinatário-a-destinatário (passa por sendBatch),
// e dentro do "chunk" do index.ts faz UM POST /emails/batch (até 100 por vez).
// ============================================================

interface EmailContent {
  subject?: string | null;
  body?: string | null;
  [key: string]: unknown;
}

export interface EmailSenderConfig {
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
}

const RESEND_BATCH_ENDPOINT = "https://api.resend.com/emails/batch";
const RESEND_BATCH_MAX = 100;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bodyToHtml(body: string): string {
  const safe = escapeHtml(body).replace(/\r?\n/g, "<br>");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;">${safe}</div>`;
}

function buildFrom(cfg: EmailSenderConfig): string {
  const name = (cfg.fromName ?? "").toString().trim();
  const email = cfg.fromEmail.trim();
  return name ? `${name} <${email}>` : email;
}

export async function sendBatchEmailReal(
  recipients: Recipient[],
  content: EmailContent | null | undefined,
  apiKey: string,
  sender: EmailSenderConfig,
): Promise<SendResult[]> {
  const sentAt = new Date().toISOString();
  const subject = (content?.subject ?? "").toString().trim() || "Premier FC";
  const bodyText = (content?.body ?? "").toString();
  const html = bodyToHtml(bodyText);
  const from = buildFrom(sender);
  const replyTo = sender.replyTo?.trim() || null;

  const results: SendResult[] = new Array(recipients.length);

  // Pré-popula resultados e separa válidos (com email) dos sem email.
  const sendable: Array<{ idx: number; email: string; userId: string | null; identifier: string | null | undefined }> = [];
  recipients.forEach((r, idx) => {
    const userId = r.id && !r.id.startsWith("audience_member:") ? r.id : null;
    const email = (r.email ?? "").toString().trim();
    const identifier = email || r.phone || r.id;
    if (!email) {
      results[idx] = {
        recipient_user_id: userId,
        recipient_identifier: identifier,
        status: "failed",
        error_code: "no_email",
        error_message: "Destinatário sem email.",
        metadata: { provider: "resend", attempted_at: sentAt },
      };
      return;
    }
    sendable.push({ idx, email, userId, identifier });
  });

  for (let i = 0; i < sendable.length; i += RESEND_BATCH_MAX) {
    const slice = sendable.slice(i, i + RESEND_BATCH_MAX);
    const payload = slice.map((s) => {
      const obj: Record<string, unknown> = {
        from,
        to: [s.email],
        subject,
        html,
      };
      if (replyTo) obj.reply_to = replyTo;
      return obj;
    });

    try {
      const resp = await fetch(RESEND_BATCH_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        // resposta não-JSON
      }

      if (!resp.ok) {
        const errMsg =
          (parsed && (parsed.message ?? parsed.error?.message)) ??
          (text ? text.slice(0, 300) : `http_${resp.status}`);
        for (const s of slice) {
          results[s.idx] = {
            recipient_user_id: s.userId,
            recipient_identifier: s.identifier,
            status: "failed",
            error_code: "resend_error",
            error_message: errMsg,
            metadata: { provider: "resend", attempted_at: sentAt, http_status: resp.status },
          };
        }
        continue;
      }

      // Sucesso HTTP: parseia array de { id } ou { data: [{id}] }.
      const arr: any[] = Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed)
          ? parsed
          : [];

      slice.forEach((s, k) => {
        const item = arr[k];
        if (item && (item.id || item.email_id)) {
          results[s.idx] = {
            recipient_user_id: s.userId,
            recipient_identifier: s.identifier,
            status: "delivered",
            provider_message_id: String(item.id ?? item.email_id),
            metadata: { provider: "resend", sent_at: sentAt, http_status: resp.status },
          };
        } else if (item && (item.error || item.message)) {
          results[s.idx] = {
            recipient_user_id: s.userId,
            recipient_identifier: s.identifier,
            status: "failed",
            error_code: "resend_error",
            error_message:
              (typeof item.error === "string" ? item.error : item.error?.message) ??
              item.message ?? "Falha no envio.",
            metadata: { provider: "resend", attempted_at: sentAt, http_status: resp.status },
          };
        } else {
          // Sem id e sem erro explícito → trata como entregue (Resend devolve só ids no batch).
          results[s.idx] = {
            recipient_user_id: s.userId,
            recipient_identifier: s.identifier,
            status: "delivered",
            metadata: { provider: "resend", sent_at: sentAt, http_status: resp.status },
          };
        }
      });
    } catch (e: any) {
      for (const s of slice) {
        results[s.idx] = {
          recipient_user_id: s.userId,
          recipient_identifier: s.identifier,
          status: "failed",
          error_code: "resend_exception",
          error_message: e?.message ?? String(e),
          metadata: { provider: "resend", attempted_at: sentAt },
        };
      }
    }
  }

  // Garante que toda posição foi preenchida (caso algo escape).
  for (let i = 0; i < results.length; i++) {
    if (!results[i]) {
      const r = recipients[i];
      results[i] = {
        recipient_user_id: r.id && !r.id.startsWith("audience_member:") ? r.id : null,
        recipient_identifier: r.email ?? r.phone ?? r.id,
        status: "failed",
        error_code: "resend_unknown",
        error_message: "Resultado ausente.",
        metadata: { provider: "resend", attempted_at: sentAt },
      };
    }
  }

  return results;
}
