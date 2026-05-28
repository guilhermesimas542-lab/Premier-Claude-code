// ============================================================
// crm-process-schedule — processa um Schedule (Sub-fase 1.6a)
//
// MODO ATUAL: dry-run por padrão.
//   - Resolve a audiência
//   - Cria events em crm_schedule_events (status='sent', metadata.dry_run=true)
//   - Atualiza schedule (status='sent', sent_at, counts)
//   - NÃO chama Resend / SMS / WhatsApp ainda — só loga
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  schedule_id: string;
  dry_run?: boolean;
}

interface AudienceFilters {
  plans?: string[];
  days_since_login?: { gte?: number; lte?: number };
  status?: Array<"active" | "inactive" | "churn_risk">;
  origin?: "payt" | "db_app" | "both";
  opt_ins?: string[];
  broadcast?: boolean;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const scheduleId = body.schedule_id;
  const dryRun = body.dry_run ?? true;

  if (!scheduleId) return json({ error: "missing_schedule_id" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: schedule, error: schedErr } = await supabase
    .from("crm_schedules")
    .select("*, audience:crm_audiences(id, name, filters)")
    .eq("id", scheduleId)
    .single();

  if (schedErr || !schedule) {
    return json({ error: "schedule_not_found", details: schedErr?.message }, 404);
  }

  if (schedule.status === "sent") return json({ error: "already_sent" }, 400);
  if (schedule.status === "sending") return json({ error: "already_sending" }, 409);

  await supabase
    .from("crm_schedules")
    .update({ status: "sending" })
    .eq("id", scheduleId);

  const filters: AudienceFilters =
    schedule.audience?.filters ?? schedule.audience_filters ?? {};
  const isBroadcast = filters.broadcast === true || schedule.channel === "telegram_x1";

  let recipients: Array<{
    id: string;
    email: string | null;
    phone: string | null;
    nickname: string | null;
  }> = [];

  if (!isBroadcast) {
    let q: any = supabase.from("users").select("id, email, phone, nickname");

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

    const { data: users, error: usersErr } = await q.limit(50000);
    if (usersErr) {
      await supabase
        .from("crm_schedules")
        .update({ status: "failed" })
        .eq("id", scheduleId);
      return json(
        { error: "audience_resolution_failed", details: usersErr.message },
        500
      );
    }
    recipients = users ?? [];
  }

  const reachCount = recipients.length;
  let deliveredCount = 0;
  let failedCount = 0;

  if (isBroadcast) {
    console.log(
      `[CRM][DRY-RUN] Broadcast schedule "${schedule.name}" via ${schedule.channel}.`
    );
  } else if (reachCount > 0) {
    const events = recipients.map((r) => ({
      schedule_id: scheduleId,
      recipient_user_id: r.id,
      recipient_identifier:
        schedule.channel === "email" ? r.email : (r.phone ?? r.email),
      channel: schedule.channel,
      status: dryRun ? "sent" : "pending",
      metadata: dryRun
        ? { dry_run: true, mode: "1.6a", channel: schedule.channel }
        : {},
    }));

    const CHUNK = 1000;
    for (let i = 0; i < events.length; i += CHUNK) {
      const slice = events.slice(i, i + CHUNK);
      const { error: insErr } = await supabase
        .from("crm_schedule_events")
        .insert(slice);
      if (insErr) {
        console.error(`[CRM] Erro inserindo events ${i}-${i + slice.length}:`, insErr);
        failedCount += slice.length;
      } else {
        deliveredCount += slice.length;
      }
    }

    const sample = recipients
      .slice(0, 3)
      .map((r) => r.email || r.id)
      .join(", ");
    console.log(
      `[CRM][DRY-RUN] "${schedule.name}" via ${schedule.channel}: ${reachCount} destinatários. Sample: ${sample}${reachCount > 3 ? "…" : ""}`
    );
  }

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
    })
    .eq("id", scheduleId);

  return json({
    success: true,
    dry_run: dryRun,
    schedule_id: scheduleId,
    channel: schedule.channel,
    broadcast: isBroadcast,
    reach: reachCount,
    delivered: deliveredCount,
    failed: failedCount,
    final_status: finalStatus,
  });
});
