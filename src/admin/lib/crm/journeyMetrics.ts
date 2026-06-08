// Métricas de jornada: profundidade (BFS), por nó, por etapa (stage) e funil de etapas.
// Pure utilities — sem chamadas a Supabase. As páginas já carregam steps/edges/events.

export interface NodeMetrics {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  conversionValueCents: number;
  openRate: number;
  leadsReached: number; // enrollments distintos com qualquer evento neste nó
}

export interface StageMetrics {
  stageId: string;
  childIds: string[];
  leadsEntered: number;
  convertedCount: number;
  conversionValueCents: number;
  conversionRate: number; // 0..1
  stageOrder: number;     // menor depth entre os filhos (∞ se não houver)
}

export interface StageFunnelRow extends StageMetrics {
  title: string;
  color: string;
  journeyId?: string | null;
  retentionVsPrev: number; // 0..1 (1ª etapa = 1)
  dropFromPrev: number;    // 0..1 (1ª etapa = 0)
}

export interface MinimalStep {
  id: string;
  journey_id: string;
  node_type: string;
  parent_step_id: string | null;
  config?: Record<string, any> | null;
}
export interface MinimalEdge {
  source_step_id: string;
  target_step_id: string;
}
export interface MinimalEvent {
  step_id: string;
  enrollment_id: string | null;
  status: string | null;
  metadata: any;
  converted: boolean | null;
  conversion_value_cents: number | null;
}

/** BFS a partir de nós sem entrada (ou tipo "trigger"). depth do trigger = 0. */
export function computeNodeDepths(steps: MinimalStep[], edges: MinimalEdge[]): Map<string, number> {
  const depth = new Map<string, number>();
  // adjacencia + indegrees (ignorando stages — stages não fazem parte do fluxo)
  const flowSteps = steps.filter((s) => s.node_type !== "stage");
  const ids = new Set(flowSteps.map((s) => s.id));
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  flowSteps.forEach((s) => { adj.set(s.id, []); indeg.set(s.id, 0); });
  edges.forEach((e) => {
    if (!ids.has(e.source_step_id) || !ids.has(e.target_step_id)) return;
    adj.get(e.source_step_id)!.push(e.target_step_id);
    indeg.set(e.target_step_id, (indeg.get(e.target_step_id) ?? 0) + 1);
  });
  // seeds: trigger nodes ou indegree 0
  const queue: string[] = [];
  flowSteps.forEach((s) => {
    if (s.node_type === "trigger" || (indeg.get(s.id) ?? 0) === 0) {
      depth.set(s.id, 0);
      queue.push(s.id);
    }
  });
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth.get(cur) ?? 0;
    for (const nx of adj.get(cur) ?? []) {
      const nd = d + 1;
      if (!depth.has(nx) || nd < (depth.get(nx) ?? Infinity)) {
        depth.set(nx, nd);
        queue.push(nx);
      }
    }
  }
  return depth;
}

export function computeNodeMetrics(
  stepIds: string[],
  events: MinimalEvent[]
): { metrics: Record<string, NodeMetrics>; leadsByStep: Map<string, Set<string>> } {
  const map: Record<string, NodeMetrics> = {};
  const leadsByStep = new Map<string, Set<string>>();
  for (const id of stepIds) {
    map[id] = { sent: 0, opened: 0, clicked: 0, converted: 0, conversionValueCents: 0, openRate: 0, leadsReached: 0 };
    leadsByStep.set(id, new Set());
  }
  for (const e of events) {
    const m = map[e.step_id];
    if (!m) continue;
    if (e.enrollment_id) leadsByStep.get(e.step_id)!.add(e.enrollment_id);
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
    m.leadsReached = leadsByStep.get(id)?.size ?? 0;
  }
  return { metrics: map, leadsByStep };
}

export function computeStageMetrics(
  steps: MinimalStep[],
  events: MinimalEvent[],
  leadsByStep: Map<string, Set<string>>,
  depths: Map<string, number>
): StageMetrics[] {
  const stages = steps.filter((s) => s.node_type === "stage");
  const out: StageMetrics[] = [];
  for (const st of stages) {
    const childIds = steps.filter((c) => c.parent_step_id === st.id).map((c) => c.id);
    const childSet = new Set(childIds);
    // leadsEntered: união dos enrollments que tocaram qualquer filho
    const enteredSet = new Set<string>();
    for (const cid of childIds) {
      const s = leadsByStep.get(cid);
      if (s) s.forEach((eid) => enteredSet.add(eid));
    }
    // conversões: enrollments distintos com algum evento converted=true em filho + soma de valor
    const convSet = new Set<string>();
    let value = 0;
    for (const ev of events) {
      if (!childSet.has(ev.step_id)) continue;
      if (ev.converted) {
        if (ev.enrollment_id) convSet.add(ev.enrollment_id);
        value += Number(ev.conversion_value_cents ?? 0);
      }
    }
    // stageOrder = menor depth dos filhos
    let order = Infinity;
    for (const cid of childIds) {
      const d = depths.get(cid);
      if (typeof d === "number" && d < order) order = d;
    }
    const leadsEntered = enteredSet.size;
    out.push({
      stageId: st.id,
      childIds,
      leadsEntered,
      convertedCount: convSet.size,
      conversionValueCents: value,
      conversionRate: leadsEntered > 0 ? convSet.size / leadsEntered : 0,
      stageOrder: order,
    });
  }
  return out;
}

/** Funil ordenado por stageOrder com drop-off vs etapa anterior. */
export function computeStageFunnel(
  stages: StageMetrics[],
  meta: Map<string, { title: string; color: string; journeyId?: string | null }>
): StageFunnelRow[] {
  const sorted = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
  const rows: StageFunnelRow[] = [];
  let prevEntered = 0;
  sorted.forEach((s, i) => {
    const m = meta.get(s.stageId) ?? { title: "Etapa", color: "#4D7A1F" };
    const retention = i === 0 ? 1 : prevEntered > 0 ? s.leadsEntered / prevEntered : 0;
    rows.push({
      ...s,
      title: m.title,
      color: m.color,
      journeyId: m.journeyId ?? null,
      retentionVsPrev: retention,
      dropFromPrev: i === 0 ? 0 : 1 - retention,
    });
    prevEntered = s.leadsEntered;
  });
  return rows;
}
