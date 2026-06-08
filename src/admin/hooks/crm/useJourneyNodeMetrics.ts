import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeNodeDepths,
  computeNodeMetrics,
  computeStageMetrics,
  computeStageFunnel,
  type NodeMetrics,
  type StageMetrics,
  type StageFunnelRow,
  type MinimalStep,
  type MinimalEdge,
  type MinimalEvent,
} from "@/admin/lib/crm/journeyMetrics";

export type NodeMetricsMap = Record<string, NodeMetrics>;

export function useJourneyNodeMetrics(journeyId: string | null) {
  const [metrics, setMetrics] = useState<NodeMetricsMap>({});
  const [stageMetrics, setStageMetrics] = useState<StageMetrics[]>([]);
  const [funnel, setFunnel] = useState<StageFunnelRow[]>([]);
  const [depths, setDepths] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!journeyId) {
      setMetrics({}); setStageMetrics([]); setFunnel([]); setDepths({});
      return;
    }
    setLoading(true);

    const stepsRes = await (supabase as any)
      .from("crm_journey_steps")
      .select("id, journey_id, node_type, parent_step_id, config")
      .eq("journey_id", journeyId);
    const steps = (stepsRes.data ?? []) as MinimalStep[];
    if (steps.length === 0) {
      setMetrics({}); setStageMetrics([]); setFunnel([]); setDepths({});
      setLoading(false);
      return;
    }
    const stepIds = steps.map((s) => s.id);
    const [edgesRes, evRes] = await Promise.all([
      (supabase as any).from("crm_journey_edges").select("source_step_id, target_step_id").eq("journey_id", journeyId),
      (supabase as any)
        .from("crm_journey_step_events")
        .select("step_id, enrollment_id, status, metadata, converted, conversion_value_cents")
        .in("step_id", stepIds),
    ]);
    const edges = (edgesRes.data ?? []) as MinimalEdge[];
    const events = (evRes.data ?? []) as MinimalEvent[];

    const dmap = computeNodeDepths(steps, edges);
    const { metrics: nm, leadsByStep } = computeNodeMetrics(stepIds, events);
    const sm = computeStageMetrics(steps, events, leadsByStep, dmap);
    const meta = new Map(
      steps
        .filter((s) => s.node_type === "stage")
        .map((s) => [s.id, {
          title: (s.config as any)?.title ?? "Etapa",
          color: (s.config as any)?.color ?? "#4D7A1F",
          journeyId: s.journey_id,
        }])
    );
    const fn = computeStageFunnel(sm, meta);

    setMetrics(nm);
    setStageMetrics(sm);
    setFunnel(fn);
    setDepths(Object.fromEntries(dmap));
    setLoading(false);
  }, [journeyId]);

  useEffect(() => { load(); }, [load]);

  const stageById = useMemo(() => {
    const m: Record<string, StageMetrics> = {};
    stageMetrics.forEach((s) => { m[s.stageId] = s; });
    return m;
  }, [stageMetrics]);

  return { metrics, stageMetrics, stageById, funnel, depths, loading, refresh: load };
}
