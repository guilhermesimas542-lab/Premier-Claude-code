import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChannelKey } from "../../lib/crm/channels";

/**
 * Agrega métricas do CRM pra dashboard (Pilar 3).
 *
 * Estratégia: 6 queries paralelas, agrega no client (volumes pequenos —
 * baseline é dezenas de schedules e milhares de events, não milhões).
 *
 * Tolera schema das jornadas faltante: schedules continuam visíveis.
 */

function isTableMissing(err: any): boolean {
  if (!err) return false;
  const code = err?.code;
  if (code === "42P01" || code === "PGRST205") return true;
  const msg = (err?.message ?? "").toLowerCase();
  return msg.includes("could not find the table") || msg.includes("schema cache");
}

export interface ScheduleStatusCounts {
  draft: number;
  scheduled: number;
  sending: number;
  sent: number;
  failed: number;
  paused: number;
  total: number;
}

export interface JourneyStatusCounts {
  draft: number;
  active: number;
  paused: number;
  archived: number;
  total: number;
}

export interface ChannelPerformance {
  channel: ChannelKey;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  open_rate: number;     // 0..1
  click_rate: number;    // 0..1
  failure_rate: number;  // 0..1
}

export interface RecentSchedule {
  id: string;
  name: string;
  channel: ChannelKey;
  sent_at: string | null;
  reach_count: number;
  delivered_count: number;
  open_count: number;
  click_count: number;
}

export interface CrmDashboardData {
  schedule_counts: ScheduleStatusCounts;
  journey_counts: JourneyStatusCounts;
  active_enrollments: number;
  audiences_count: number;
  last_schedule_sent: RecentSchedule | null;
  recent_schedules: RecentSchedule[];
  performance_7d: ChannelPerformance[];
  performance_30d: ChannelPerformance[];
  journeys_schema_missing: boolean;
}

const EMPTY_DATA: CrmDashboardData = {
  schedule_counts: { draft: 0, scheduled: 0, sending: 0, sent: 0, failed: 0, paused: 0, total: 0 },
  journey_counts: { draft: 0, active: 0, paused: 0, archived: 0, total: 0 },
  active_enrollments: 0,
  audiences_count: 0,
  last_schedule_sent: null,
  recent_schedules: [],
  performance_7d: [],
  performance_30d: [],
  journeys_schema_missing: false,
};

const CHANNELS_ALL: ChannelKey[] = [
  "email", "sms", "telegram_group", "telegram_x1", "whatsapp", "push", "popup",
];

function buildPerformance(
  events: Array<{ channel: string; status: string }>
): ChannelPerformance[] {
  const map = new Map<string, ChannelPerformance>();
  for (const ch of CHANNELS_ALL) {
    map.set(ch, {
      channel: ch,
      sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0,
      open_rate: 0, click_rate: 0, failure_rate: 0,
    });
  }

  for (const ev of events) {
    const row = map.get(ev.channel as ChannelKey);
    if (!row) continue;
    if (ev.status === "failed") {
      row.failed++;
    } else if (ev.status === "sent") {
      row.sent++;
    } else if (ev.status === "delivered") {
      row.sent++; row.delivered++;
    } else if (ev.status === "opened") {
      row.sent++; row.delivered++; row.opened++;
    } else if (ev.status === "clicked") {
      row.sent++; row.delivered++; row.opened++; row.clicked++;
    }
  }

  // Calcula taxas
  for (const row of map.values()) {
    const total = row.sent + row.failed;
    row.open_rate    = row.delivered > 0 ? row.opened  / row.delivered : 0;
    row.click_rate   = row.delivered > 0 ? row.clicked / row.delivered : 0;
    row.failure_rate = total > 0          ? row.failed  / total         : 0;
  }

  return Array.from(map.values()).filter((r) => r.sent > 0 || r.failed > 0);
}

export function useCrmDashboard() {
  const [data, setData] = useState<CrmDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const now = Date.now();
    const day = 86_400_000;
    const since7d  = new Date(now - 7 * day).toISOString();
    const since30d = new Date(now - 30 * day).toISOString();

    const [
      schedulesRes,
      lastSentRes,
      recentRes,
      events7dRes,
      events30dRes,
      audiencesRes,
      journeysRes,
      enrollmentsRes,
    ] = await Promise.all([
      // Counts por status de schedule (puxa só id + status, agrega no client)
      (supabase as any).from("crm_schedules").select("id, status"),

      // Último schedule sent
      (supabase as any)
        .from("crm_schedules")
        .select("id, name, channel, sent_at, reach_count, delivered_count, open_count, click_count")
        .eq("status", "sent")
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(1),

      // 5 schedules mais recentes (qualquer status com sent_at)
      (supabase as any)
        .from("crm_schedules")
        .select("id, name, channel, sent_at, reach_count, delivered_count, open_count, click_count, status")
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(5),

      // Events 7d
      (supabase as any)
        .from("crm_schedule_events")
        .select("channel, status")
        .gte("created_at", since7d)
        .limit(50000),

      // Events 30d
      (supabase as any)
        .from("crm_schedule_events")
        .select("channel, status")
        .gte("created_at", since30d)
        .limit(100000),

      // Audiências
      (supabase as any).from("crm_audiences").select("id"),

      // Jornadas (pode falhar se schema 2.1 não aplicado)
      (supabase as any).from("crm_journeys").select("id, status"),

      // Enrollments ativos
      (supabase as any).from("crm_journey_enrollments").select("id").eq("status", "active"),
    ]);

    // ============================================================
    // Schedules
    // ============================================================
    const scheduleCounts: ScheduleStatusCounts = {
      draft: 0, scheduled: 0, sending: 0, sent: 0, failed: 0, paused: 0, total: 0,
    };
    if (schedulesRes.error) {
      console.error("[useCrmDashboard] schedules:", schedulesRes.error);
    } else {
      for (const s of (schedulesRes.data ?? []) as Array<{ status: keyof ScheduleStatusCounts }>) {
        if (s.status in scheduleCounts) scheduleCounts[s.status]++;
        scheduleCounts.total++;
      }
    }

    const lastSent = (lastSentRes.data?.[0] ?? null) as RecentSchedule | null;
    const recent = ((recentRes.data ?? []) as RecentSchedule[]).slice(0, 5);

    // ============================================================
    // Performance 7d / 30d
    // ============================================================
    const events7d  = (events7dRes.data  ?? []) as Array<{ channel: string; status: string }>;
    const events30d = (events30dRes.data ?? []) as Array<{ channel: string; status: string }>;
    const performance_7d  = buildPerformance(events7d);
    const performance_30d = buildPerformance(events30d);

    // ============================================================
    // Audiências
    // ============================================================
    const audiencesCount = (audiencesRes.data ?? []).length;

    // ============================================================
    // Jornadas (tolera schema missing)
    // ============================================================
    const journeyCounts: JourneyStatusCounts = {
      draft: 0, active: 0, paused: 0, archived: 0, total: 0,
    };
    const journeysSchemaMissing =
      isTableMissing(journeysRes.error) || isTableMissing(enrollmentsRes.error);

    if (!journeysSchemaMissing && !journeysRes.error) {
      for (const j of (journeysRes.data ?? []) as Array<{ status: keyof JourneyStatusCounts }>) {
        if (j.status in journeyCounts) journeyCounts[j.status]++;
        journeyCounts.total++;
      }
    }

    const activeEnrollments =
      !journeysSchemaMissing && !enrollmentsRes.error
        ? (enrollmentsRes.data ?? []).length
        : 0;

    setData({
      schedule_counts: scheduleCounts,
      journey_counts: journeyCounts,
      active_enrollments: activeEnrollments,
      audiences_count: audiencesCount,
      last_schedule_sent: lastSent,
      recent_schedules: recent,
      performance_7d,
      performance_30d,
      journeys_schema_missing: journeysSchemaMissing,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
