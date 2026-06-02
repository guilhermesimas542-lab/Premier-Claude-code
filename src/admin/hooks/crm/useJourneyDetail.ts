import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Journey } from "./useJourneys";
import type { JourneyStep } from "./useJourneySteps";

function isTableMissing(err: any): boolean {
  if (!err) return false;
  const code = err?.code;
  if (code === "42P01" || code === "PGRST205") return true;
  const msg = (err?.message ?? "").toLowerCase();
  return msg.includes("could not find the table") || msg.includes("schema cache");
}

export interface StepFunnelRow {
  step_id: string;
  step_order: number;
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
}

export interface EnrollmentRow {
  id: string;
  user_id: string;
  status: "active" | "completed" | "cancelled" | "churned";
  current_step_id: string | null;
  enrolled_at: string;
  completed_at: string | null;
  user_email?: string | null;
  user_nickname?: string | null;
}

export interface JourneyDetailData {
  journey: Journey | null;
  steps: JourneyStep[];
  funnel: StepFunnelRow[];
  recent_enrollments: EnrollmentRow[];
  enrollment_counts: {
    active: number;
    completed: number;
    cancelled: number;
    churned: number;
    total: number;
  };
}

/**
 * Hook que junta jornada + steps + agregados de enrollments/step_events em 1 lugar.
 * Usado pela tela de detalhe (2.4).
 *
 * Estratégia: 4 queries paralelas e agregamos no client (volumes pequenos).
 *   - 1. journey + audience
 *   - 2. steps
 *   - 3. enrollments (count agrupado por status + lista recente)
 *   - 4. step_events agrupado por step_id + status
 */
export function useJourneyDetail(journeyId: string | null) {
  const [data, setData] = useState<JourneyDetailData>({
    journey: null,
    steps: [],
    funnel: [],
    recent_enrollments: [],
    enrollment_counts: { active: 0, completed: 0, cancelled: 0, churned: 0, total: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!journeyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSchemaMissing(false);
    setError(null);

    // 1 e 2 em paralelo
    const [journeyRes, stepsRes] = await Promise.all([
      (supabase as any)
        .from("crm_journeys")
        .select(
          `id, name, description, trigger_type, trigger_config,
           audience_id, audience_filters, status, stats,
           created_by, created_at, updated_at,
           audience:crm_audiences ( id, name, kind, filters )`
        )
        .eq("id", journeyId)
        .single(),
      (supabase as any)
        .from("crm_journey_steps")
        .select("*")
        .eq("journey_id", journeyId)
        .order("step_order", { ascending: true }),
    ]);

    // Detecta schema missing em qualquer um
    if (isTableMissing(journeyRes.error) || isTableMissing(stepsRes.error)) {
      setSchemaMissing(true);
      setLoading(false);
      return;
    }

    if (journeyRes.error) {
      setError(journeyRes.error.message);
      toast.error(`Erro ao carregar jornada: ${journeyRes.error.message}`);
      setLoading(false);
      return;
    }

    const journey = journeyRes.data as Journey;
    const steps = (stepsRes.data ?? []) as JourneyStep[];
    const stepIds = steps.map((s) => s.id);

    // 3 e 4 em paralelo (só se houver steps + enrollment infra)
    const [enrollmentsRes, eventsRes] = await Promise.all([
      (supabase as any)
        .from("crm_journey_enrollments")
        .select(
          `id, user_id, status, current_step_id, enrolled_at, completed_at,
           user:users ( email, nickname )`
        )
        .eq("journey_id", journeyId)
        .order("enrolled_at", { ascending: false })
        .limit(50),
      stepIds.length > 0
        ? (supabase as any)
            .from("crm_journey_step_events")
            .select("step_id, status")
            .in("step_id", stepIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (enrollmentsRes.error) {
      console.error("[useJourneyDetail] enrollments:", enrollmentsRes.error);
    }
    if (eventsRes.error) {
      console.error("[useJourneyDetail] events:", eventsRes.error);
    }

    // Agrega enrollments
    const enrollmentsRaw = (enrollmentsRes.data ?? []) as any[];
    const enrollment_counts = enrollmentsRaw.reduce(
      (acc, e) => {
        acc.total++;
        if (e.status === "active") acc.active++;
        else if (e.status === "completed") acc.completed++;
        else if (e.status === "cancelled") acc.cancelled++;
        else if (e.status === "churned") acc.churned++;
        return acc;
      },
      { active: 0, completed: 0, cancelled: 0, churned: 0, total: 0 }
    );

    const recent_enrollments: EnrollmentRow[] = enrollmentsRaw.slice(0, 20).map((e: any) => ({
      id: e.id,
      user_id: e.user_id,
      status: e.status,
      current_step_id: e.current_step_id,
      enrolled_at: e.enrolled_at,
      completed_at: e.completed_at,
      user_email: e.user?.email ?? null,
      user_nickname: e.user?.nickname ?? null,
    }));

    // Agrega funil por step
    const eventsRaw = (eventsRes.data ?? []) as Array<{ step_id: string; status: string }>;
    const funnel: StepFunnelRow[] = steps.map((s) => {
      const row: StepFunnelRow = {
        step_id: s.id,
        step_order: s.step_order,
        channel: s.channel,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
      };
      for (const ev of eventsRaw) {
        if (ev.step_id !== s.id) continue;
        if (ev.status === "failed") row.failed++;
        else if (ev.status === "sent") row.sent++;
        else if (ev.status === "delivered") {
          row.sent++;
          row.delivered++;
        } else if (ev.status === "opened") {
          row.sent++;
          row.delivered++;
          row.opened++;
        } else if (ev.status === "clicked") {
          row.sent++;
          row.delivered++;
          row.opened++;
          row.clicked++;
        }
      }
      return row;
    });

    setData({
      journey,
      steps,
      funnel,
      recent_enrollments,
      enrollment_counts,
    });
    setLoading(false);
  }, [journeyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, schemaMissing, error, refresh: load };
}
