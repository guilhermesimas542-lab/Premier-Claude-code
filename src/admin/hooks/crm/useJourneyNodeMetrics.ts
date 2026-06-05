import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NodeMetrics {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  conversionValueCents: number;
  openRate: number;
}

export type NodeMetricsMap = Record<string, NodeMetrics>;

export function useJourneyNodeMetrics(journeyId: string | null) {
  const [metrics, setMetrics] = useState<NodeMetricsMap>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!journeyId) {
      setMetrics({});
      return;
    }
    setLoading(true);

    const stepsRes = await (supabase as any)
      .from("crm_journey_steps")
      .select("id")
      .eq("journey_id", journeyId);

    const stepIds: string[] = (stepsRes.data ?? []).map((s: any) => s.id);
    if (stepIds.length === 0) {
      setMetrics({});
      setLoading(false);
      return;
    }

    const evRes = await (supabase as any)
      .from("crm_journey_step_events")
      .select("step_id, status, metadata, converted, conversion_value_cents")
      .in("step_id", stepIds);

    const map: NodeMetricsMap = {};
    for (const id of stepIds) {
      map[id] = {
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        conversionValueCents: 0,
        openRate: 0,
      };
    }

    for (const e of (evRes.data ?? []) as any[]) {
      const m = map[e.step_id];
      if (!m) continue;
      m.sent += 1;
      const meta = e.metadata ?? {};
      const opened = e.status === "opened" || e.status === "clicked" || !!meta.opened_at;
      const clicked = e.status === "clicked" || !!meta.clicked_at;
      if (opened) m.opened += 1;
      if (clicked) m.clicked += 1;
      if (e.converted) {
        m.converted += 1;
        m.conversionValueCents += Number(e.conversion_value_cents ?? 0);
      }
    }

    for (const id of Object.keys(map)) {
      const m = map[id];
      m.openRate = m.sent > 0 ? m.opened / m.sent : 0;
    }

    setMetrics(map);
    setLoading(false);
  }, [journeyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { metrics, loading, refresh: load };
}
