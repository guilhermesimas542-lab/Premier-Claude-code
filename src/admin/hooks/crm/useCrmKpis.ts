import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE = 60_000;

/**
 * Helper: roda a query e devolve {value, error} sem quebrar a page.
 */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn("[crm-kpis] query failed:", e);
    return null;
  }
}

// ===== ABA 1 — Funil & Réguas =====

/** Conversão Free→Premium em D+1 e D+7 (parcial). */
export function useConversionFreeToPremium() {
  return useQuery({
    queryKey: ["crm-kpi", "conv-free-premium"],
    staleTime: STALE,
    queryFn: async () => safe(async () => {
      // Coorte: usuários criados nos últimos 30 dias
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: cohort, error: e1 } = await supabase
        .from("users")
        .select("id, email, created_at")
        .gte("created_at", since);
      if (e1) throw e1;
      const cohortSize = cohort?.length ?? 0;
      if (cohortSize === 0) return { d1: 0, d7: 0, cohort: 0 };

      const emails = (cohort ?? []).map((u) => u.email).filter(Boolean);
      const { data: orders } = await supabase
        .from("orders")
        .select("buyer_email, paid_at, raw_payload")
        .eq("status", "paid")
        .in("buyer_email", emails as string[])
        .gte("paid_at", since);

      const ordersByEmail = new Map<string, string[]>();
      (orders ?? []).forEach((o: any) => {
        if (!o.buyer_email || !o.paid_at) return;
        const list = ordersByEmail.get(o.buyer_email) ?? [];
        list.push(o.paid_at);
        ordersByEmail.set(o.buyer_email, list);
      });

      let d1 = 0;
      let d7 = 0;
      (cohort ?? []).forEach((u: any) => {
        const paid = ordersByEmail.get(u.email);
        if (!paid || !paid.length) return;
        const created = new Date(u.created_at).getTime();
        const firstPaid = Math.min(...paid.map((p) => new Date(p).getTime()));
        const days = (firstPaid - created) / (24 * 60 * 60 * 1000);
        if (days >= 0 && days <= 1) d1++;
        if (days >= 0 && days <= 7) d7++;
      });

      return {
        d1: cohortSize ? (d1 / cohortSize) * 100 : 0,
        d7: cohortSize ? (d7 / cohortSize) * 100 : 0,
        cohort: cohortSize,
      };
    }),
  });
}

// ===== ABA 2 — Engajamento =====

export function useDauMau() {
  return useQuery({
    queryKey: ["crm-kpi", "dau-mau"],
    staleTime: STALE,
    queryFn: async () => safe(async () => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [{ count: dau }, { count: mau }] = await Promise.all([
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", startOfDay.toISOString()),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", monthAgo.toISOString()),
      ]);
      return { dau: dau ?? 0, mau: mau ?? 0 };
    }),
  });
}

export function useChurnRiskCount() {
  return useQuery({
    queryKey: ["crm-kpi", "churn-risk"],
    staleTime: STALE,
    queryFn: async () => safe(async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      // pagos com last_seen_at <= 3 dias (ativos recentes)
      const { data: active } = await supabase
        .from("users")
        .select("id")
        .in("main_tier", ["premium", "diamante"])
        .gte("last_seen_at", threeDaysAgo);
      if (!active || active.length === 0) return 0;

      // dentre eles, os SEM eventos de uso da IA nos últimos 3 dias
      const ids = active.map((u: any) => u.id);
      const { data: usingIa } = await supabase
        .from("events")
        .select("user_id")
        .in("event_name", ["ia_tipster_analysis_opened", "ia_tipster_open_esportiva"])
        .in("user_id", ids)
        .gte("created_at", threeDaysAgo);

      const usedSet = new Set((usingIa ?? []).map((e: any) => e.user_id));
      return ids.filter((id) => !usedSet.has(id)).length;
    }),
  });
}

export function useOddsClicksByPlan() {
  return useQuery({
    queryKey: ["crm-kpi", "odds-clicks-by-plan"],
    staleTime: STALE,
    queryFn: async () => safe(async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("events")
        .select("user_id")
        .eq("event_name", "ia_tipster_open_esportiva")
        .gte("created_at", weekAgo)
        .limit(10000);

      const userIds = Array.from(new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean)));
      if (!userIds.length) return { free: 0, premium: 0, diamante: 0, total: 0 };

      const { data: users } = await supabase
        .from("users")
        .select("id, main_tier")
        .in("id", userIds);

      const tierById = new Map((users ?? []).map((u: any) => [u.id, u.main_tier]));
      const counts = { free: 0, premium: 0, diamante: 0, total: 0 };
      (data ?? []).forEach((e: any) => {
        const t = tierById.get(e.user_id);
        if (t === "free") counts.free++;
        else if (t === "premium") counts.premium++;
        else if (t === "diamante" || t === "ultra") counts.diamante++;
        counts.total++;
      });
      return counts;
    }),
  });
}

// ===== ABA 3 — Retenção / RFM =====

export function useRfmDistribution() {
  return useQuery({
    queryKey: ["crm-kpi", "rfm"],
    staleTime: STALE,
    queryFn: async () => safe(async () => {
      const { count: total } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true });

      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const ranges = [
        { key: "ativos", label: "Ativos (<3d)", days: 3 },
        { key: "alerta", label: "Em Alerta (4-7d)", days: 7 },
        { key: "inativos", label: "Inativos (8-15d)", days: 15 },
        { key: "churn", label: "Churn Crítico (>16d)", days: 9999 },
      ];

      const counts: Record<string, number> = { ativos: 0, alerta: 0, inativos: 0, churn: 0, nunca: 0 };

      // Faixa 1: <3d
      const { count: c1 } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("last_seen_at", new Date(now - 3 * day).toISOString());
      counts.ativos = c1 ?? 0;

      // Faixa 2: 4-7d
      const { count: c2 } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .lt("last_seen_at", new Date(now - 3 * day).toISOString())
        .gte("last_seen_at", new Date(now - 7 * day).toISOString());
      counts.alerta = c2 ?? 0;

      // Faixa 3: 8-15d
      const { count: c3 } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .lt("last_seen_at", new Date(now - 7 * day).toISOString())
        .gte("last_seen_at", new Date(now - 15 * day).toISOString());
      counts.inativos = c3 ?? 0;

      // Faixa 4: >16d
      const { count: c4 } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .lt("last_seen_at", new Date(now - 15 * day).toISOString());
      counts.churn = c4 ?? 0;

      // Nunca acessou (sem last_seen_at)
      const totalKnown = counts.ativos + counts.alerta + counts.inativos + counts.churn;
      counts.nunca = Math.max((total ?? 0) - totalKnown, 0);

      return { total: total ?? 0, counts, ranges };
    }),
  });
}

// ===== ABA 4 — Canais =====

export function useChannelDeliveryRate() {
  return useQuery({
    queryKey: ["crm-kpi", "channel-delivery"],
    staleTime: STALE,
    queryFn: async () => safe(async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("crm_schedule_events")
        .select("channel, status, error_code")
        .gte("created_at", since)
        .limit(10000);

      // error_codes considerados "número/email inválido" (não contam no denominador)
      const INVALID_CODES = new Set([
        "invalid_number",
        "invalid_phone",
        "invalid_email",
        "blocked_email",
        "comtele_invalid_recipient",
        "smsdev_invalid_recipient",
      ]);

      const acc: Record<string, { delivered: number; failed: number }> = {};
      (data ?? []).forEach((e: any) => {
        const ch = e.channel || "unknown";
        if (!acc[ch]) acc[ch] = { delivered: 0, failed: 0 };
        if (e.status === "delivered" || e.status === "sent") acc[ch].delivered++;
        else if (e.status === "failed") {
          if (!INVALID_CODES.has(e.error_code)) acc[ch].failed++;
        }
      });
      return Object.entries(acc).map(([channel, v]) => {
        const tot = v.delivered + v.failed;
        return {
          channel,
          rate: tot ? (v.delivered / tot) * 100 : 0,
          delivered: v.delivered,
          failed: v.failed,
        };
      });
    }),
  });
}
