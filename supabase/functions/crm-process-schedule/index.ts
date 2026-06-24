// ============================================================
// crm-process-schedule — processa um Schedule (Sub-fase 1.6b)
//
// MODO ATUAL: mock-first (default dry_run=true).
//   - Resolve a audiência
//   - Para cada chunk de destinatários chama mockProviders.sendBatch
//     (simula latência + 95% delivered + open/click realistas)
//   - Push e Popup forçam failed (channel_blocked)
//   - Telegram x1 = broadcast (1 event sintético)
//   - Atualiza schedule com métricas reais (reach/delivered/failed/open/click)
//
// QUANDO INTEGRAR PROVIDERS (Pilar 4): substituir mockProviders.ts por
// realProviders.ts mantendo a mesma interface SendResult.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sendBatch,
  sendBroadcast,
  getChannelCapabilities,
  type ChannelKey,
  type Recipient,
  type SendResult,
} from "./mockProviders.ts";
import { sendBatchSmsReal, sendBatchPushReal, sendBatchPopupReal, sendBroadcastTelegramX1Real, sendTelegramGroupReal, sendBatchEmailReal, type EmailSenderConfig } from "./realProviders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  schedule_id: string;
  /** Se omitido, default é true (mock providers). false reservado pra Pilar 4. */
  dry_run?: boolean;
}

interface BehaviorFilter {
  window_days?: number;
  league_names?: string[];
  markets?: string[];
  source?: "chat" | "live" | "any";
  min_analyses?: number;
  last_analysis_age_days?: { gte?: number; lte?: number };
}

interface AudienceFilters {
  plans?: string[];
  days_since_login?: { gte?: number; lte?: number };
  status?: Array<"active" | "inactive" | "churn_risk">;
  origin?: "payt" | "db_app" | "both";
  opt_ins?: string[];
  user_ids?: string[];
  /** Telefones já normalizados no formato SMS Dev (55DDDNNNNNNNNN). Override pra SMS. */
  phones?: string[];
  /** Marca semântica de broadcast (Telegram x1). */
  broadcast?: boolean;
  behavior?: BehaviorFilter;
}

const DAY_MS = 86_400_000;
const EVENT_ANALYSIS_OPENED = "ia_tipster_analysis_opened";

function hasBehaviorFilter(b: BehaviorFilter | undefined | null): boolean {
  if (!b) return false;
  return !!(
    (b.league_names && b.league_names.length > 0) ||
    (b.markets && b.markets.length > 0) ||
    (b.source && b.source !== "any") ||
    (typeof b.min_analyses === "number" && b.min_analyses > 1) ||
    b.last_analysis_age_days?.gte != null ||
    b.last_analysis_age_days?.lte != null
  );
}

async function resolveBehaviorUserIds(
  supabase: any,
  filter: BehaviorFilter
): Promise<Set<string>> {
  const windowDays = filter.window_days ?? 30;
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();
  const { data: events, error } = await supabase
    .from("events")
    .select("user_id, properties, created_at")
    .eq("event_name", EVENT_ANALYSIS_OPENED)
    .gte("created_at", since)
    .not("user_id", "is", null)
    .limit(100000);
  if (error) {
    console.error("[CRM][behavior] erro:", error);
    return new Set();
  }
  const wantedLeagues = new Set(
    (filter.league_names ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  const wantedMarkets = (filter.markets ?? [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const eventMatches = (props: Record<string, any>): boolean => {
    if (filter.source && filter.source !== "any") {
      if ((props.source ?? null) !== filter.source) return false;
    }
    if (wantedLeagues.size > 0) {
      const lg = String(props.league_name ?? "").trim().toLowerCase();
      if (!wantedLeagues.has(lg)) return false;
    }
    if (wantedMarkets.length > 0) {
      const markets = [props.main_market, props.alt_a_market, props.alt_b_market]
        .filter((m) => typeof m === "string")
        .map((m) => (m as string).toLowerCase());
      if (!markets.some((m) => wantedMarkets.some((wm) => m.includes(wm)))) return false;
    }
    return true;
  };
  const byUser = new Map<string, { count: number; last_at: number }>();
  for (const r of (events ?? []) as any[]) {
    if (!eventMatches(r.properties ?? {})) continue;
    const t = new Date(r.created_at).getTime();
    const cur = byUser.get(r.user_id);
    if (cur) {
      cur.count++;
      if (t > cur.last_at) cur.last_at = t;
    } else {
      byUser.set(r.user_id, { count: 1, last_at: t });
    }
  }
  const minAnalyses = filter.min_analyses ?? 1;
  const now = Date.now();
  const ageGte = filter.last_analysis_age_days?.gte;
  const ageLte = filter.last_analysis_age_days?.lte;
  const eligible = new Set<string>();
  for (const [uid, agg] of byUser.entries()) {
    if (agg.count < minAnalyses) continue;
    const ageDays = (now - agg.last_at) / DAY_MS;
    if (ageGte != null && ageDays < ageGte) continue;
    if (ageLte != null && ageDays > ageLte) continue;
    eligible.add(uid);
  }
  return eligible;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CHUNK = 1000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // AuthN/AuthZ: service-role (pg_cron) OR admin Supabase session
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

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const scheduleId = body.schedule_id;
  const dryRun = body.dry_run ?? true; // default = mock providers em 1.6b

  if (!scheduleId) return json({ error: "missing_schedule_id" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // ============================================================
  // 1. Lê o schedule
  // ============================================================
  const { data: schedule, error: schedErr } = await supabase
    .from("crm_schedules")
    .select("*, audience:crm_audiences(id, name, kind, filters)")
    .eq("id", scheduleId)
    .single();

  if (schedErr || !schedule) {
    return json({ error: "schedule_not_found", details: schedErr?.message }, 404);
  }

  if (schedule.status === "sent") return json({ error: "already_sent" }, 400);
  if (schedule.status === "sending") return json({ error: "already_sending" }, 409);

  const channel = schedule.channel as ChannelKey;

  // ============================================================
  // 2. Marca como "sending"
  // ============================================================
  await supabase
    .from("crm_schedules")
    .update({ status: "sending" })
    .eq("id", scheduleId);

  // ============================================================
  // 3. Resolve audiência → lista de destinatários
  // ============================================================
  const filters: AudienceFilters =
    schedule.audience?.filters ?? schedule.audience_filters ?? {};
  const isBroadcast = filters.broadcast === true || channel === "telegram_x1";

  /**
   * Listas estáticas (kind='static_list'): vêm de crm_audience_members.
   * Quando a audiência salva é desse tipo, ignoramos os filtros dinâmicos e
   * lemos diretamente da tabela de membros, juntando com `users` quando
   * houver `user_id` pra enriquecer com dados disponíveis.
   */
  const isStaticList = schedule.audience?.kind === "static_list";

  let recipients: Recipient[] = [];

  // Paginação em blocos de 1000 pra contornar o db-max-rows do PostgREST.
  // makeQuery() PRECISA remontar a query do zero a cada chamada — .range()
  // não pode ser aplicado duas vezes na mesma instância encadeada.
  async function fetchAllPaginated<T = any>(
    makeQuery: () => any
  ): Promise<T[]> {
    const PAGE = 1000;
    let from = 0;
    const all: T[] = [];
    while (true) {
      const { data, error } = await makeQuery().range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      all.push(...(data as T[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }

  if (!isBroadcast && isStaticList && schedule.audience?.id) {
    let members: any[] = [];
    try {
      members = await fetchAllPaginated(() =>
        supabase
          .from("crm_audience_members")
          .select(
            `email, phone, user_id,
             user:users ( id, email, phone, nickname )`
          )
          .eq("audience_id", schedule.audience.id)
      );
    } catch (memErr: any) {
      await supabase
        .from("crm_schedules")
        .update({ status: "failed" })
        .eq("id", scheduleId);
      return json(
        { error: "audience_resolution_failed", details: memErr?.message },
        500
      );
    }

    recipients = members.map((m) => ({
      id: m.user?.id ?? `audience_member:${m.email ?? m.phone}`,
      email: m.user?.email ?? m.email ?? null,
      phone: m.user?.phone ?? m.phone ?? null,
      nickname: m.user?.nickname ?? null,
    }));
  } else if (!isBroadcast) {
    let behaviorIds: string[] | null = null;
    if (hasBehaviorFilter(filters.behavior)) {
      const eligible = await resolveBehaviorUserIds(supabase, filters.behavior!);
      behaviorIds = Array.from(eligible);
    }

    if (behaviorIds !== null && behaviorIds.length === 0) {
      recipients = [];
    } else {
      const buildUsersQuery = () => {
        let q: any = supabase.from("users").select("id, email, phone, nickname");

        if (behaviorIds !== null) {
          q = q.in("id", behaviorIds);
        }

        if (filters.user_ids && filters.user_ids.length > 0) {
          q = q.in("id", filters.user_ids);
        }

        if (filters.plans && filters.plans.length > 0) {
          q = q.in("main_tier", filters.plans);
        }

        if (filters.days_since_login) {
          const now = Date.now();
          if (typeof filters.days_since_login.gte === "number") {
            const cutoff = new Date(now - filters.days_since_login.gte * 86400000);
            q = q.lte("last_seen_at", cutoff.toISOString());
          }
          if (typeof filters.days_since_login.lte === "number") {
            const cutoff = new Date(now - filters.days_since_login.lte * 86400000);
            q = q.gte("last_seen_at", cutoff.toISOString());
          }
        }

        if (filters.status && filters.status.length > 0) {
          const now = Date.now();
          const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
          const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
          const orConditions: string[] = [];
          if (filters.status.includes("active")) {
            orConditions.push(`last_seen_at.gte.${sevenDaysAgo}`);
          }
          if (filters.status.includes("inactive")) {
            orConditions.push(
              `and(last_seen_at.lt.${sevenDaysAgo},last_seen_at.gte.${thirtyDaysAgo})`
            );
          }
          if (filters.status.includes("churn_risk")) {
            orConditions.push(`last_seen_at.lt.${thirtyDaysAgo}`);
            orConditions.push(`last_seen_at.is.null`);
          }
          if (orConditions.length > 0) q = q.or(orConditions.join(","));
        }

        return q;
      };

      try {
        recipients = await fetchAllPaginated(buildUsersQuery);
      } catch (usersErr: any) {
        await supabase
          .from("crm_schedules")
          .update({ status: "failed" })
          .eq("id", scheduleId);
        return json(
          { error: "audience_resolution_failed", details: usersErr?.message },
          500
        );
      }
    }
  }

  // Override estrito: se informaram telefones avulsos (SMS), SUBSTITUI a lista
  // de recipients pra disparar SOMENTE pra esses números. Não soma com a audiência.
  if (!isBroadcast && filters.phones && filters.phones.length > 0) {
    const seen = new Set<string>();
    const overrideRecipients: typeof recipients = [];
    for (const p of filters.phones) {
      const norm = p.replace(/\D/g, "");
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      overrideRecipients.push({
        id: `phone:${norm}`,
        email: null,
        phone: norm,
        nickname: null,
      });
    }
    recipients = overrideRecipients;
  }


  const reachCount = recipients.length;
  let deliveredCount = 0;
  let failedCount = 0;
  let openCount = 0;
  let clickCount = 0;

  // Hoisted para serem visíveis no return final (são setados no branch else-if abaixo)
  let useRealSms = false;
  let useRealPush = false;
  let useRealPopup = false;
  let useRealEmail = false;

  // ============================================================
  // 4. MOCK PROVIDERS — envia em chunks e persiste events
  //    Em Pilar 4: trocar mockProviders por realProviders.
  // ============================================================
  if (isBroadcast) {
    let broadcastResult: SendResult;

    if (channel === "telegram_x1" && !dryRun) {
      // Lê credenciais do Vault (api_id, api_secret) + bot_id de crm_channel_settings.
      const [{ data: apiIdData }, { data: apiSecretData }, { data: settingsRow }] = await Promise.all([
        supabase.rpc("crm_get_channel_secret", { p_channel: "telegram_x1", p_key: "api_id" }),
        supabase.rpc("crm_get_channel_secret", { p_channel: "telegram_x1", p_key: "api_secret" }),
        supabase
          .from("crm_channel_settings")
          .select("config")
          .eq("channel", "telegram_x1")
          .maybeSingle(),
      ]);

      const apiId = typeof apiIdData === "string" ? apiIdData : null;
      const apiSecret = typeof apiSecretData === "string" ? apiSecretData : null;
      const botId = (settingsRow as any)?.config?.channel_id ?? null;

      if (!apiId || !apiSecret || !botId) {
        broadcastResult = {
          recipient_user_id: null,
          recipient_identifier: "broadcast",
          status: "failed",
          error_code: "telegram_x1_not_configured",
          error_message: "Configure api_id/api_secret no Vault e bot_id em channel_id.",
          metadata: { provider: "sendpulse", broadcast: true, real: true },
        };
      } else {
        const content = (schedule.content ?? {}) as { body?: string | null; image_url?: string | null; link_url?: string | null };
        const link = (content.link_url ?? "").toString().trim();
        const baseBody = (content.body ?? "").toString();
        const bodyWithLink = link && !baseBody.includes(link)
          ? (baseBody.trim() ? `${baseBody}\n\n${link}` : link)
          : baseBody;
        broadcastResult = await sendBroadcastTelegramX1Real(
          bodyWithLink,
          schedule.name,
          botId,
          apiId,
          apiSecret,
          content.image_url ?? null,
        );
      }
    } else {
      broadcastResult = await sendBroadcast(channel);
    }

    const event = {
      schedule_id: scheduleId,
      recipient_user_id: broadcastResult.recipient_user_id,
      recipient_identifier: broadcastResult.recipient_identifier,
      channel,
      status: broadcastResult.status,
      provider_message_id: broadcastResult.provider_message_id ?? null,
      error_code: broadcastResult.error_code ?? null,
      error_message: broadcastResult.error_message ?? null,
      metadata: { ...broadcastResult.metadata, dry_run: dryRun },
    };

    const { error: insErr } = await supabase
      .from("crm_schedule_events")
      .insert([event]);

    if (insErr) {
      console.error("[CRM][MOCK] Erro inserindo event de broadcast:", insErr);
      failedCount = 1;
    } else if (broadcastResult.status === "failed") {
      failedCount = 1;
    } else {
      deliveredCount = 1;
    }

    console.log(
      `[CRM][MOCK] Broadcast "${schedule.name}" via ${channel} \u2192 ${broadcastResult.status}`
    );
  } else if (channel === "telegram_group" && !dryRun) {
    // ============================================================
    // Telegram grupo real: 1 mensagem pro grupo, não entra no loop por destinatário.
    // ============================================================
    const [{ data: botTokenData }, { data: tgSettingsRow }] = await Promise.all([
      supabase.rpc("crm_get_channel_secret", { p_channel: "telegram_group", p_key: "bot_token" }),
      supabase
        .from("crm_channel_settings")
        .select("config")
        .eq("channel", "telegram_group")
        .maybeSingle(),
    ]);

    const botToken = typeof botTokenData === "string" ? botTokenData : null;
    const chatId = (tgSettingsRow as any)?.config?.chat_id ?? null;

    if (!botToken || !chatId) {
      const event = {
        schedule_id: scheduleId,
        recipient_user_id: null,
        recipient_identifier: "telegram_group",
        channel,
        status: "failed",
        provider_message_id: null,
        error_code: "telegram_group_not_configured",
        error_message: "Configure bot_token no Vault e chat_id em Configura\u00e7\u00f5es do canal.",
        metadata: { provider: "telegram", group: true, real: true, dry_run: dryRun },
      };
      await supabase.from("crm_schedule_events").insert([event]);
      failedCount = 1;
    } else {
      const content = (schedule.content ?? {}) as { body?: string | null; image_url?: string | null; link_url?: string | null };
      const link = (content.link_url ?? "").toString().trim();
      const baseBody = (content.body ?? "").toString();
      const bodyWithLink = link && !baseBody.includes(link)
        ? (baseBody.trim() ? `${baseBody}\n\n${link}` : link)
        : baseBody;
      const tgResult = await sendTelegramGroupReal(bodyWithLink, botToken, chatId, content.image_url ?? null);
      const event = {
        schedule_id: scheduleId,
        recipient_user_id: tgResult.recipient_user_id,
        recipient_identifier: tgResult.recipient_identifier,
        channel,
        status: tgResult.status,
        provider_message_id: tgResult.provider_message_id ?? null,
        error_code: tgResult.error_code ?? null,
        error_message: tgResult.error_message ?? null,
        metadata: { ...tgResult.metadata, dry_run: dryRun },
      };
      const { error: insErr } = await supabase.from("crm_schedule_events").insert([event]);
      if (insErr) {
        console.error("[CRM][telegram_group] Erro inserindo event:", insErr);
        failedCount = 1;
      } else if (tgResult.status === "failed") {
        failedCount = 1;
      } else {
        deliveredCount = 1;
      }
      console.log(
        `[CRM][telegram_group] "${schedule.name}" \u2192 ${tgResult.status}`
      );
    }
  } else if (reachCount > 0) {
    const caps = getChannelCapabilities(channel);

    // SMS real (SMS Dev): só quando dry_run=false e chave configurada.
    // Resto dos canais (e qualquer dry_run=true) continua no mock.
    let smsRealKey: string | null = null;
    let smsRoute: string = "16"; // default Comtele: 16 Marketing
    if (channel === "sms" && !dryRun) {
      const [{ data: keyData, error: keyErr }, { data: cfgRow }] = await Promise.all([
        supabase.rpc("crm_get_channel_secret", { p_channel: "sms", p_key: "api_key" }),
        supabase.from("crm_channel_settings").select("config").eq("channel", "sms").maybeSingle(),
      ]);
      if (keyErr) {
        console.error("[CRM][SMS] erro lendo chave do Vault:", keyErr);
      } else if (typeof keyData === "string" && keyData.length > 0) {
        smsRealKey = keyData;
      } else {
        console.warn("[CRM][SMS] chave api_key não configurada — caindo no mock.");
      }
      const cfgRoute = (cfgRow as any)?.config?.route;
      if (typeof cfgRoute === "string" && cfgRoute.length > 0) smsRoute = cfgRoute;
    }
    useRealSms = channel === "sms" && !dryRun && smsRealKey !== null;

    // Push real (Web Push VAPID): só quando dry_run=false e chaves VAPID configuradas.
    let pushVapid: { publicKey: string; privateKey: string; subject: string } | null = null;
    if (channel === "push" && !dryRun) {
      const pub = Deno.env.get("VAPID_PUBLIC_KEY");
      const priv = Deno.env.get("VAPID_PRIVATE_KEY");
      const subj = Deno.env.get("VAPID_SUBJECT");
      if (pub && priv && subj) {
        pushVapid = { publicKey: pub, privateKey: priv, subject: subj };
      } else {
        console.warn("[CRM][push] chaves VAPID não configuradas — caindo no mock.");
      }
    }
    useRealPush = channel === "push" && !dryRun && pushVapid !== null;

    // Popup interno: quando dry_run=false, enfileira em crm_popup_deliveries
    // por usuário. App exibe via FunnelPopup no carregamento.
    useRealPopup = channel === "popup" && !dryRun;

    // Email real (Resend): só quando dry_run=false e API key + from_email configurados.
    let emailRealKey: string | null = null;
    let emailSender: EmailSenderConfig | null = null;
    if (channel === "email" && !dryRun) {
      const [{ data: keyData, error: keyErr }, { data: emailSettingsRow }] = await Promise.all([
        supabase.rpc("crm_get_channel_secret", { p_channel: "email", p_key: "api_key" }),
        supabase
          .from("crm_channel_settings")
          .select("config")
          .eq("channel", "email")
          .maybeSingle(),
      ]);
      if (keyErr) {
        console.error("[CRM][email] erro lendo chave do Vault:", keyErr);
      } else if (typeof keyData === "string" && keyData.length > 0) {
        emailRealKey = keyData;
      } else {
        console.warn("[CRM][email] api_key (Resend) não configurada — caindo no mock.");
      }
      const cfg = (emailSettingsRow as any)?.config ?? {};
      const fromEmail = typeof cfg.from_email === "string" ? cfg.from_email.trim() : "";
      if (fromEmail) {
        emailSender = {
          fromEmail,
          fromName: typeof cfg.from_name === "string" ? cfg.from_name : null,
          replyTo: typeof cfg.reply_to === "string" ? cfg.reply_to : null,
        };
      } else {
        console.warn("[CRM][email] from_email não configurado em crm_channel_settings — caindo no mock.");
      }
    }
    useRealEmail = channel === "email" && !dryRun && emailRealKey !== null && emailSender !== null;

    for (let i = 0; i < recipients.length; i += CHUNK) {
      const slice = recipients.slice(i, i + CHUNK);
      const results: SendResult[] = useRealSms
        ? await sendBatchSmsReal(slice, schedule.content ?? null, smsRealKey!, smsRoute)
        : useRealPush
          ? await sendBatchPushReal(slice, schedule.content ?? null, supabase, pushVapid!)
          : useRealPopup
            ? await sendBatchPopupReal(slice, schedule.content ?? null, scheduleId, supabase)
            : useRealEmail
              ? await sendBatchEmailReal(slice, schedule.content ?? null, emailRealKey!, emailSender!)
              : await sendBatch(channel, slice);

      const events = results.map((r) => ({
        schedule_id: scheduleId,
        recipient_user_id: r.recipient_user_id,
        recipient_identifier: r.recipient_identifier,
        channel,
        status: r.status,
        provider_message_id: r.provider_message_id ?? null,
        error_code: r.error_code ?? null,
        error_message: r.error_message ?? null,
        metadata: { ...r.metadata, dry_run: dryRun },
      }));

      const { error: insErr } = await supabase
        .from("crm_schedule_events")
        .insert(events);

      if (insErr) {
        console.error(
          `[CRM][MOCK] Erro inserindo events ${i}-${i + slice.length}:`,
          insErr
        );
        // Insert falhou: lote inteiro conta como failed (não chegou ao banco)
        failedCount += slice.length;
        continue;
      }

      // Insert ok: contabiliza estados dos events
      for (const r of results) {
        if (r.status === "failed") failedCount++;
        else {
          deliveredCount++;
          if (r.status === "opened" || r.status === "clicked") openCount++;
          if (r.status === "clicked") clickCount++;
        }
      }
    }

    console.log(
      `[CRM][MOCK] "${schedule.name}" via ${channel} ` +
      `(${caps.providerLabel}, blocked=${caps.blocked}): ` +
      `reach=${reachCount} delivered=${deliveredCount} failed=${failedCount} ` +
      `open=${openCount} click=${clickCount}`
    );
  }

  // ============================================================
  // 5. Atualiza schedule final
  // ============================================================
  const finalStatus =
    reachCount === 0 && !isBroadcast
      ? "sent"
      : failedCount > 0 && deliveredCount === 0
        ? "failed"
        : "sent";

  await supabase
    .from("crm_schedules")
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      reach_count: reachCount,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      open_count: openCount,
      click_count: clickCount,
    })
    .eq("id", scheduleId);

  return json({
    success: true,
    dry_run: dryRun,
    mock: !(useRealSms || useRealPush || useRealPopup || useRealEmail),
    real_provider: useRealSms ? "smsdev" : useRealPush ? "web_push" : useRealPopup ? "popup_internal" : useRealEmail ? "resend" : null,
    schedule_id: scheduleId,
    channel,
    broadcast: isBroadcast,
    reach: reachCount,
    delivered: deliveredCount,
    failed: failedCount,
    opened: openCount,
    clicked: clickCount,
    final_status: finalStatus,
  });
});
