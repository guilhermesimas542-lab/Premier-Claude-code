import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Uma linha do log de disparos (um envio, de um passo, para um lead, num canal). */
export interface StepEventRow {
  id: string;
  channel: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  provider_message_id: string | null;
  created_at: string;
  step_order: number | null;
  step_channel: string | null;
  user_email: string | null;
  user_nickname: string | null;
}

export interface StepEventCounts {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  skipped: number;
}

const EMPTY_COUNTS: StepEventCounts = {
  total: 0,
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Log de disparos de uma jornada: lê crm_journey_step_events das inscrições
 * daquela jornada, com email do lead e ordem do passo. Agrega contadores por status.
 */
export function useJourneyStepEvents(journeyId: string | null) {
  const [events, setEvents] = useState<StepEventRow[]>([]);
  const [counts, setCounts] = useState<StepEventCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!journeyId) {
      setEvents([]);
      setCounts(EMPTY_COUNTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1) inscrições da jornada (id -> lead)
      const { data: enrolls, error: e1 } = await (supabase as any)
        .from("crm_journey_enrollments")
        .select("id, user:users ( email, nickname )")
        .eq("journey_id", journeyId);
      if (e1) throw e1;

      const byEnroll = new Map<string, { email: string | null; nickname: string | null }>();
      for (const en of enrolls ?? []) {
        byEnroll.set(en.id, {
          email: en.user?.email ?? null,
          nickname: en.user?.nickname ?? null,
        });
      }
      const ids = Array.from(byEnroll.keys());
      if (ids.length === 0) {
        setEvents([]);
        setCounts(EMPTY_COUNTS);
        setLoading(false);
        return;
      }

      // 2) eventos de disparo dessas inscrições (mais recentes primeiro)
      const { data: rows, error: e2 } = await (supabase as any)
        .from("crm_journey_step_events")
        .select(
          "id, enrollment_id, channel, status, error_code, error_message, provider_message_id, created_at, step:crm_journey_steps ( step_order, channel )"
        )
        .in("enrollment_id", ids)
        .order("created_at", { ascending: false })
        .limit(300);
      if (e2) throw e2;

      const mapped: StepEventRow[] = (rows ?? []).map((r: any) => {
        const u = byEnroll.get(r.enrollment_id);
        return {
          id: r.id,
          channel: r.channel,
          status: r.status,
          error_code: r.error_code ?? null,
          error_message: r.error_message ?? null,
          provider_message_id: r.provider_message_id ?? null,
          created_at: r.created_at,
          step_order: r.step?.step_order ?? null,
          step_channel: r.step?.channel ?? null,
          user_email: u?.email ?? null,
          user_nickname: u?.nickname ?? null,
        };
      });

      const agg: StepEventCounts = { ...EMPTY_COUNTS, total: mapped.length };
      for (const ev of mapped) {
        if (Object.prototype.hasOwnProperty.call(agg, ev.status)) {
          (agg as any)[ev.status] += 1;
        }
      }

      setEvents(mapped);
      setCounts(agg);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar disparos");
      setEvents([]);
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, counts, loading, error, refresh: load };
}
