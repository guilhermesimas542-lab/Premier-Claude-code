// crm-journey-dispatch — envia os steps das jornadas (cron */10). Bundle achatado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sendBatchSmsReal,
  sendBatchPushReal,
  sendBatchPopupReal,
  sendBroadcastTelegramX1Real,
  sendTelegramGroupReal,
  sendBatchEmailReal,
  type EmailSenderConfig,
} from "./realProviders.ts";
import type { Recipient, SendResult } from "./mockProviders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type DelayUnit = "minute" | "hour" | "day" | "week";

function offsetMs(value: number, unit: DelayUnit): number {
  const v = Math.max(0, value | 0);
  switch (unit) {
    case "minute": return v * 60_000;
    case "hour":   return v * 3_600_000;
    case "day":    return v * 86_400_000;
    case "week":   return v * 604_800_000;
    default:       return v * 86_400_000;
  }
}

const SUPPORTED_CHANNELS = new Set([
  "email", "sms", "push", "popup", "telegram_x1", "telegram_group",
]);

interface Step {
  id: string;
  journey_id: string;
  step_order: number | null;
  channel: string | null;
  content: any;
  delay_value: number;
  delay_unit: DelayUnit;
  config: any;
  node_type: string;
}

interface Enrollment {
  id: string;
  journey_id: string;
  user_id: string;
  status: string;
  anchor_at: string | null;
  enrolled_at: string;
  current_step_id: string | null;
}

interface UserLite {
  id: string;
  email: string | null;
  phone: string | null;
  nickname?: string | null;
  full_name?: string | null;
  main_tier?: string | null;
}

// ---- merge tags: troca {nome}, {email}, {plano}, etc. pelos dados do lead ----
function renderTokens(text: string, user: UserLite): string {
  if (typeof text !== "string" || text.indexOf("{") === -1) return text;
  const localPart = user.email ? user.email.split("@")[0] : "";
  const nome = String(user.full_name || user.nickname || localPart || "").trim();
  const map: Record<string, string> = {
    nome, name: nome, nombre: nome,
    nick: user.nickname ?? "", nickname: user.nickname ?? "",
    email: user.email ?? "",
    plano: user.main_tier ?? "", plan: user.main_tier ?? "", tier: user.main_tier ?? "",
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => {
    const key = String(k).toLowerCase();
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : m;
  });
}

function applyTokens(content: any, user: UserLite): any {
  if (!content || typeof content !== "object") return content;
  const out: any = Array.isArray(content) ? [] : {};
  for (const [k, v] of Object.entries(content)) {
    if (typeof v === "string") out[k] = renderTokens(v, user);
    else if (v && typeof v === "object") out[k] = applyTokens(v, user);
    else out[k] = v;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const bearer = authHeader.replace("Bearer ", "");
  let authorized = bearer === SERVICE_KEY;
  if (!authorized) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdm } = await userClient.rpc("is_admin");
    authorized = isAdm === true;
  }
  if (!authorized) return json({ error: "forbidden" }, 403);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  const nowMs = now.getTime();

  const { data: settingsRow } = await supabase
    .from("crm_journey_settings")
    .select("dispatch_enabled, test_user_ids")
    .eq("id", 1)
    .maybeSingle();
  const dispatchEnabled = settingsRow?.dispatch_enabled === true;
  const testUserIds: Set<string> = new Set(
    Array.isArray(settingsRow?.test_user_ids) ? settingsRow!.test_user_ids : []
  );

  const { data: enrollments, error: enrErr } = await supabase
    .from("crm_journey_enrollments")
    .select("id, journey_id, user_id, status, anchor_at, enrolled_at, current_step_id")
    .eq("status", "active")
    .limit(2000);
  if (enrErr) return json({ error: "enrollments_fetch_failed", details: enrErr.message }, 500);

  if (!enrollments || enrollments.length === 0) {
    return json({ ok: true, dispatch_enabled: dispatchEnabled, enrollments: 0 });
  }

  const journeyIds = Array.from(new Set(enrollments.map((e: any) => e.journey_id)));
  const { data: allSteps, error: stepsErr } = await supabase
    .from("crm_journey_steps")
    .select("id, journey_id, step_order, channel, content, delay_value, delay_unit, config, node_type")
    .in("journey_id", journeyIds)
    .order("step_order", { ascending: true });
  if (stepsErr) return json({ error: "steps_fetch_failed", details: stepsErr.message }, 500);
  const stepsByJourney = new Map<string, Step[]>();
  for (const s of (allSteps ?? []) as Step[]) {
    if (s.node_type !== "message") continue;
    const arr = stepsByJourney.get(s.journey_id) ?? [];
    arr.push(s);
    stepsByJourney.set(s.journey_id, arr);
  }

  const userIds = Array.from(new Set(enrollments.map((e: any) => e.user_id)));
  const usersById = new Map<string, UserLite>();
  for (let i = 0; i < userIds.length; i += 500) {
    const slice = userIds.slice(i, i + 500);
    const { data: us } = await supabase
      .from("users")
      .select("id, email, phone, nickname, full_name, main_tier")
      .in("id", slice);
    for (const u of (us ?? []) as UserLite[]) usersById.set(u.id, u);
  }

  const credsCache: Record<string, any> = {};
  async function getCreds(channel: string): Promise<any> {
    if (credsCache[channel]) return credsCache[channel];
    if (channel === "sms") {
      const { data } = await supabase.rpc("crm_get_channel_secret", { p_channel: "sms", p_key: "api_key" });
      credsCache.sms = { apiKey: typeof data === "string" ? data : null };
    } else if (channel === "email") {
      const [{ data: keyData }, { data: cfgRow }] = await Promise.all([
        supabase.rpc("crm_get_channel_secret", { p_channel: "email", p_key: "api_key" }),
        supabase.from("crm_channel_settings").select("config").eq("channel", "email").maybeSingle(),
      ]);
      const cfg = (cfgRow as any)?.config ?? {};
      const fromEmail = typeof cfg.from_email === "string" ? cfg.from_email.trim() : "";
      credsCache.email = {
        apiKey: typeof keyData === "string" ? keyData : null,
        sender: fromEmail
          ? {
              fromEmail,
              fromName: typeof cfg.from_name === "string" ? cfg.from_name : null,
              replyTo: typeof cfg.reply_to === "string" ? cfg.reply_to : null,
            } as EmailSenderConfig
          : null,
      };
    } else if (channel === "push") {
      const pub = Deno.env.get("VAPID_PUBLIC_KEY");
      const priv = Deno.env.get("VAPID_PRIVATE_KEY");
      const subj = Deno.env.get("VAPID_SUBJECT");
      credsCache.push = pub && priv && subj ? { publicKey: pub, privateKey: priv, subject: subj } : null;
    } else if (channel === "telegram_x1") {
      const [{ data: apiId }, { data: apiSecret }, { data: cfgRow }] = await Promise.all([
        supabase.rpc("crm_get_channel_secret", { p_channel: "telegram_x1", p_key: "api_id" }),
        supabase.rpc("crm_get_channel_secret", { p_channel: "telegram_x1", p_key: "api_secret" }),
        supabase.from("crm_channel_settings").select("config").eq("channel", "telegram_x1").maybeSingle(),
      ]);
      credsCache.telegram_x1 = {
        apiId: typeof apiId === "string" ? apiId : null,
        apiSecret: typeof apiSecret === "string" ? apiSecret : null,
        botId: (cfgRow as any)?.config?.channel_id ?? null,
      };
    } else if (channel === "telegram_group") {
      const [{ data: botToken }, { data: cfgRow }] = await Promise.all([
        supabase.rpc("crm_get_channel_secret", { p_channel: "telegram_group", p_key: "bot_token" }),
        supabase.from("crm_channel_settings").select("config").eq("channel", "telegram_group").maybeSingle(),
      ]);
      credsCache.telegram_group = {
        botToken: typeof botToken === "string" ? botToken : null,
        chatId: (cfgRow as any)?.config?.chat_id ?? null,
      };
    }
    return credsCache[channel];
  }

  async function recordStepEvent(params: {
    enrollment_id: string;
    step_id: string;
    channel: string;
    status: "sent" | "skipped" | "failed";
    content: any;
    error_code?: string | null;
    error_message?: string | null;
    provider_message_id?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    await supabase.from("crm_journey_step_events").insert({
      enrollment_id: params.enrollment_id,
      step_id: params.step_id,
      channel: params.channel,
      status: params.status,
      content_snapshot: params.content ?? {},
      provider_message_id: params.provider_message_id ?? null,
      error_code: params.error_code ?? null,
      error_message: params.error_message ?? null,
      metadata: params.metadata ?? {},
    });
  }

  async function sendOne(
    channel: string,
    step: Step,
    user: UserLite,
  ): Promise<SendResult | { status: "failed"; error_code: string; error_message: string }> {
    const content = applyTokens(step.content ?? {}, user);
    const recipient: Recipient = {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      nickname: user.nickname ?? null,
    };

    if (channel === "sms") {
      const c = await getCreds("sms");
      if (!c?.apiKey) return { status: "failed", error_code: "sms_not_configured", error_message: "api_key ausente" };
      const r = await sendBatchSmsReal([recipient], content, c.apiKey);
      return r[0];
    }
    if (channel === "email") {
      const c = await getCreds("email");
      if (!c?.apiKey || !c?.sender) return { status: "failed", error_code: "email_not_configured", error_message: "api_key/from_email ausente" };
      const r = await sendBatchEmailReal([recipient], content, c.apiKey, c.sender);
      return r[0];
    }
    if (channel === "push") {
      const c = await getCreds("push");
      if (!c) return { status: "failed", error_code: "push_not_configured", error_message: "VAPID ausente" };
      const r = await sendBatchPushReal([recipient], content, supabase, c);
      return r[0];
    }
    if (channel === "popup") {
      // schedule_id passado como null: popup vindo de journey não tem registro em crm_schedules
      const r = await sendBatchPopupReal([recipient], content, null as unknown as string, supabase);
      return r[0];
    }
    if (channel === "telegram_group") {
      const c = await getCreds("telegram_group");
      if (!c?.botToken || !c?.chatId) return { status: "failed", error_code: "telegram_group_not_configured", error_message: "bot_token/chat_id ausente" };
      const link = (content.link_url ?? "").toString().trim();
      const baseBody = (content.body ?? "").toString();
      const txt = link && !baseBody.includes(link)
        ? (baseBody.trim() ? `${baseBody}\n\n${link}` : link)
        : baseBody;
      return await sendTelegramGroupReal(txt, c.botToken, c.chatId, content.image_url ?? null);
    }
    if (channel === "telegram_x1") {
      const c = await getCreds("telegram_x1");
      if (!c?.apiId || !c?.apiSecret || !c?.botId) return { status: "failed", error_code: "telegram_x1_not_configured", error_message: "api_id/api_secret/bot_id ausente" };
      const link = (content.link_url ?? "").toString().trim();
      const baseBody = (content.body ?? "").toString();
      const txt = link && !baseBody.includes(link)
        ? (baseBody.trim() ? `${baseBody}\n\n${link}` : link)
        : baseBody;
      return await sendBroadcastTelegramX1Real(txt, `journey-step-${step.id}`, c.botId, c.apiId, c.apiSecret, content.image_url ?? null);
    }
    return { status: "failed", error_code: "channel_unsupported", error_message: `canal ${channel} não suportado` };
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let completedEnrollments = 0;

  for (const enr of enrollments as Enrollment[]) {
    const steps = stepsByJourney.get(enr.journey_id) ?? [];
    if (steps.length === 0) continue;
    const user = usersById.get(enr.user_id);
    if (!user) continue;

    const anchor = enr.anchor_at ? new Date(enr.anchor_at) : new Date(enr.enrolled_at);
    const anchorMs = anchor.getTime();

    const { data: existing } = await supabase
      .from("crm_journey_step_events")
      .select("step_id, channel")
      .eq("enrollment_id", enr.id);
    const doneSet = new Set<string>(
      (existing ?? []).map((e: any) => `${e.step_id}::${e.channel}`)
    );

    let lastStepId: string | null = enr.current_step_id;
    let lastStepAt: string | null = null;

    for (const step of steps) {
      const dueAt = anchorMs + offsetMs(step.delay_value, step.delay_unit);
      if (dueAt > nowMs) break;

      const channels: string[] = Array.isArray((step.config as any)?.channels) && (step.config as any).channels.length > 0
        ? (step.config as any).channels
        : (step.channel ? [step.channel] : []);
      if (channels.length === 0) continue;

      const guard = (step.config as any)?.guard ?? null;
      const { data: guardOk } = await supabase.rpc("crm_step_guard_ok", {
        p_user_id: enr.user_id,
        p_guard: guard,
        p_anchor_at: anchor.toISOString(),
      });

      for (const ch of channels) {
        const key = `${step.id}::${ch}`;
        if (doneSet.has(key)) continue;

        if (!SUPPORTED_CHANNELS.has(ch)) {
          await recordStepEvent({
            enrollment_id: enr.id, step_id: step.id, channel: ch,
            status: "skipped", content: step.content,
            error_code: "channel_unsupported",
            metadata: { reason: "channel_unsupported" },
          });
          doneSet.add(key); skipped++; continue;
        }

        if (guardOk === false) {
          await recordStepEvent({
            enrollment_id: enr.id, step_id: step.id, channel: ch,
            status: "skipped", content: step.content,
            metadata: { reason: `guard:${guard ?? "none"}` },
          });
          doneSet.add(key); skipped++; continue;
        }

        if (ch !== "telegram_group" && ch !== "telegram_x1") {
          const { data: chOk } = await supabase.rpc("crm_channel_available", {
            p_user_id: enr.user_id, p_channel: ch,
          });
          if (chOk !== true) {
            await recordStepEvent({
              enrollment_id: enr.id, step_id: step.id, channel: ch,
              status: "skipped", content: step.content,
              metadata: { reason: `${ch}_unavailable` },
            });
            doneSet.add(key); skipped++; continue;
          }
        }

        if (!dispatchEnabled && !testUserIds.has(enr.user_id)) {
          await recordStepEvent({
            enrollment_id: enr.id, step_id: step.id, channel: ch,
            status: "skipped", content: step.content,
            metadata: { reason: "dispatch_disabled" },
          });
          doneSet.add(key); skipped++; continue;
        }

        try {
          const result = await sendOne(ch, step, user);
          const finalStatus: "sent" | "failed" = result.status === "failed" ? "failed" : "sent";
          await recordStepEvent({
            enrollment_id: enr.id, step_id: step.id, channel: ch,
            status: finalStatus,
            content: step.content,
            provider_message_id: (result as any).provider_message_id ?? null,
            error_code: (result as any).error_code ?? null,
            error_message: (result as any).error_message ?? null,
            metadata: (result as any).metadata ?? {},
          });
          doneSet.add(key);
          if (finalStatus === "sent") sent++; else failed++;
        } catch (e) {
          await recordStepEvent({
            enrollment_id: enr.id, step_id: step.id, channel: ch,
            status: "failed", content: step.content,
            error_code: "exception",
            error_message: e instanceof Error ? e.message : String(e),
          });
          doneSet.add(key); failed++;
        }
      }

      lastStepId = step.id;
      lastStepAt = new Date().toISOString();
      processed++;
    }

    const lastStep = steps[steps.length - 1];
    const lastDueMs = anchorMs + offsetMs(lastStep.delay_value, lastStep.delay_unit);
    const updates: Record<string, unknown> = {};
    if (lastStepId && lastStepId !== enr.current_step_id) {
      updates.current_step_id = lastStepId;
      updates.current_step_at = lastStepAt;
    }
    if (lastDueMs <= nowMs && lastStepId === lastStep.id) {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
      completedEnrollments++;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("crm_journey_enrollments").update(updates).eq("id", enr.id);
    }
  }

  return json({
    ok: true,
    dispatch_enabled: dispatchEnabled,
    test_user_ids: Array.from(testUserIds),
    enrollments: enrollments.length,
    steps_processed: processed,
    sent, skipped, failed,
    completed_enrollments: completedEnrollments,
    at: now.toISOString(),
  });
});
