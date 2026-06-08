import { useCallback, useEffect, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NodeType } from "./useJourneyGraph";
import type { ChannelKey } from "@/admin/lib/crm/channels";

export const JOURNEY_PALETTE = [
  "#00FF7F", "#60A5FA", "#F59E0B", "#A855F7", "#EC4899",
  "#22D3EE", "#F472B6", "#FB923C",
];

const FALLBACK_W = 1000;
const FALLBACK_H = 700;
const FALLBACK_GAP = 200;

export interface JourneyRow {
  id: string;
  name: string;
  color: string | null;
  canvas: { x?: number; y?: number; w?: number; h?: number } | null;
  status: string | null;
  trigger_type: string | null;
  trigger_config: Record<string, any> | null;
  audience_id: string | null;
  audience_filters: Record<string, any> | null;
}


interface StepRow {
  id: string;
  journey_id: string;
  node_type: NodeType;
  position: { x: number; y: number } | null;
  channel: ChannelKey | null;
  content: Record<string, any>;
  config: Record<string, any>;
  delay_value: number | null;
  delay_unit: any;
  parent_step_id: string | null;
}

interface EdgeRow {
  id: string;
  journey_id: string;
  source_step_id: string;
  target_step_id: string;
  branch: string | null;
  condition: Record<string, any> | null;
}

function labelFor(node_type: NodeType, channel: ChannelKey | null) {
  switch (node_type) {
    case "trigger": return "Gatilho";
    case "message": return channel ? `Mensagem · ${channel}` : "Mensagem";
    case "wait": return "Esperar";
    case "condition": return "Condição";
    case "tag": return "Marcar usuário";
    case "stage": return "Etapa";
    default: return node_type;
  }
}

export function useUnifiedWhiteboard() {
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [edgeRows, setEdgeRows] = useState<EdgeRow[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [jRes, sRes, eRes] = await Promise.all([
      (supabase as any).from("crm_journeys")
        .select("id, name, color, canvas, status, trigger_type, trigger_config, audience_id, audience_filters")
        .order("created_at", { ascending: true }),
      (supabase as any).from("crm_journey_steps").select("*"),
      (supabase as any).from("crm_journey_edges").select("*"),
    ]);
    if (jRes.error) { toast.error(`Jornadas: ${jRes.error.message}`); setLoading(false); return; }
    if (sRes.error) { toast.error(`Nós: ${sRes.error.message}`); setLoading(false); return; }
    if (eRes.error) { toast.error(`Ligações: ${eRes.error.message}`); setLoading(false); return; }
    setJourneys(jRes.data ?? []);
    setSteps(sRes.data ?? []);
    setEdgeRows(eRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Recalcula nodes/edges sempre que dados-base mudam
  useEffect(() => {
    const journeyLayout = new Map<string, { x: number; y: number; w: number; h: number; color: string }>();
    journeys.forEach((j, i) => {
      const c = j.canvas ?? {};
      const hasPos = typeof c.x === "number" && typeof c.y === "number";
      journeyLayout.set(j.id, {
        x: hasPos ? (c.x as number) : i * (FALLBACK_W + FALLBACK_GAP),
        y: hasPos ? (c.y as number) : 0,
        w: typeof c.w === "number" ? c.w : FALLBACK_W,
        h: typeof c.h === "number" ? c.h : FALLBACK_H,
        color: j.color ?? JOURNEY_PALETTE[i % JOURNEY_PALETTE.length],
      });
    });

    const stickyNodes: Node[] = journeys.map((j) => {
      const lay = journeyLayout.get(j.id)!;
      return {
        id: `journey:${j.id}`,
        type: "stickNote",
        position: { x: lay.x, y: lay.y },
        style: { width: lay.w, height: lay.h },
        data: { journeyId: j.id, title: j.name, color: lay.color },
        draggable: true,
        selectable: true,
        zIndex: 0,
      } as Node;
    });

    const stageNodes: Node[] = [];
    const leafNodes: Node[] = [];
    steps.forEach((r) => {
      const isStage = r.node_type === "stage";
      const cfg = r.config ?? {};
      const parentId = r.parent_step_id ? r.parent_step_id : `journey:${r.journey_id}`;
      const node: any = {
        id: r.id,
        type: r.node_type,
        position: r.position ?? { x: 24, y: 48 },
        parentId,
        extent: "parent",
        zIndex: isStage ? 1 : 2,
        data: {
          channel: r.channel,
          content: r.content ?? {},
          config: cfg,
          delay_value: r.delay_value,
          delay_unit: r.delay_unit,
          label: labelFor(r.node_type, r.channel),
          title: cfg.title,
          color: cfg.color,
        },
      };
      if (isStage) {
        node.style = { width: cfg.width ?? 360, height: cfg.height ?? 220 };
        stageNodes.push(node);
      } else {
        leafNodes.push(node);
      }
    });

    setNodes([...stickyNodes, ...stageNodes, ...leafNodes]);
    const stepJourneyMap = new Map<string, string>();
    steps.forEach((s) => stepJourneyMap.set(s.id, s.journey_id));
    setEdges(edgeRows.map((e) => {
      const sJ = stepJourneyMap.get(e.source_step_id);
      const tJ = stepJourneyMap.get(e.target_step_id);
      const cross = sJ && tJ && sJ !== tJ;
      return {
        id: e.id,
        source: e.source_step_id,
        target: e.target_step_id,
        label: e.branch ?? "",
        animated: !!cross,
        style: {
          stroke: journeyLayout.get(e.journey_id)?.color ?? "#888",
          strokeWidth: cross ? 2 : 1,
          strokeDasharray: cross ? "6 4" : undefined,
        },
      };
    }));
  }, [journeys, steps, edgeRows]);

  // --- Mutations ----------------------------------------------------------

  const createJourney = useCallback(async (canvasXY?: { x: number; y: number }) => {
    const idx = journeys.length;
    const color = JOURNEY_PALETTE[idx % JOURNEY_PALETTE.length];
    // espaço livre simples: à direita da última
    const x = canvasXY?.x ?? idx * (FALLBACK_W + FALLBACK_GAP);
    const y = canvasXY?.y ?? 0;
    const { data, error } = await (supabase as any)
      .from("crm_journeys")
      .insert({
        name: "Nova jornada",
        color,
        canvas: { x, y, w: FALLBACK_W, h: FALLBACK_H },
        trigger_type: "manual",
        status: "draft",
      })
      .select()
      .single();
    if (error) { toast.error(`Erro ao criar jornada: ${error.message}`); return null; }
    setJourneys((prev) => [...prev, data as JourneyRow]);
    toast.success("Jornada criada");
    return data.id as string;
  }, [journeys.length]);

  const updateJourney = useCallback(async (
    journeyId: string,
    fields: {
      name?: string;
      color?: string;
      canvas?: { x?: number; y?: number; w?: number; h?: number };
      trigger_type?: string;
      trigger_config?: Record<string, any>;
      audience_id?: string | null;
      audience_filters?: Record<string, any> | null;
      status?: string;
    }
  ) => {
    // Merge canvas em vez de sobrescrever
    let payload: any = { ...fields };
    if (fields.canvas) {
      const existing = journeys.find((j) => j.id === journeyId)?.canvas ?? {};
      payload.canvas = { ...existing, ...fields.canvas };
    }
    const { error } = await (supabase as any)
      .from("crm_journeys").update(payload).eq("id", journeyId);
    if (error) { toast.error(`Erro ao salvar jornada: ${error.message}`); return; }
    setJourneys((prev) => prev.map((j) =>
      j.id === journeyId
        ? { ...j, ...fields, canvas: payload.canvas ?? j.canvas }
        : j
    ));
  }, [journeys]);

  // Religa edges quando o nó muda de jornada: edge.journey_id segue a jornada do nó de ORIGEM.
  // Cross-journey é permitido (não apaga mais).
  const reconcileEdgesForNode = useCallback(async (stepId: string, newJourneyId: string) => {
    const stepById = new Map(steps.map((s) => [s.id, s]));
    const affected = edgeRows.filter((e) => e.source_step_id === stepId || e.target_step_id === stepId);
    const rebrand: Array<{ id: string; journey_id: string }> = [];
    affected.forEach((e) => {
      const sourceJourney = e.source_step_id === stepId
        ? newJourneyId
        : stepById.get(e.source_step_id)?.journey_id;
      if (sourceJourney && e.journey_id !== sourceJourney) {
        rebrand.push({ id: e.id, journey_id: sourceJourney });
      }
    });
    for (const r of rebrand) {
      const { error } = await (supabase as any).from("crm_journey_edges")
        .update({ journey_id: r.journey_id }).eq("id", r.id);
      if (error) toast.error(`Erro religando ligações: ${error.message}`);
    }
    if (rebrand.length) {
      const map = new Map(rebrand.map((r) => [r.id, r.journey_id]));
      setEdgeRows((prev) => prev.map((e) => map.has(e.id) ? { ...e, journey_id: map.get(e.id)! } : e));
    }
  }, [steps, edgeRows]);

  const assignNodeToJourney = useCallback(async (
    stepId: string,
    opts: { journeyId: string; parentStepId: string | null; position: { x: number; y: number } }
  ) => {
    const current = steps.find((s) => s.id === stepId);
    const journeyChanged = current && current.journey_id !== opts.journeyId;
    const { error } = await (supabase as any)
      .from("crm_journey_steps")
      .update({
        journey_id: opts.journeyId,
        parent_step_id: opts.parentStepId,
        position: opts.position,
      })
      .eq("id", stepId);
    if (error) { toast.error(`Erro ao reatribuir nó: ${error.message}`); return; }
    setSteps((prev) => prev.map((s) =>
      s.id === stepId
        ? { ...s, journey_id: opts.journeyId, parent_step_id: opts.parentStepId, position: opts.position }
        : s
    ));
    if (journeyChanged) await reconcileEdgesForNode(stepId, opts.journeyId);
  }, [steps, reconcileEdgesForNode]);

  const createEdge = useCallback(async (
    journeyId: string, sourceId: string, targetId: string, branch: string | null
  ) => {
    const { data, error } = await (supabase as any).from("crm_journey_edges").insert({
      journey_id: journeyId,
      source_step_id: sourceId,
      target_step_id: targetId,
      branch,
    }).select().single();
    if (error) { toast.error(`Erro ao ligar: ${error.message}`); return; }
    setEdgeRows((prev) => [...prev, data as EdgeRow]);
  }, []);

  const removeEdge = useCallback(async (edgeId: string) => {
    const { error } = await (supabase as any).from("crm_journey_edges").delete().eq("id", edgeId);
    if (error) { toast.error(`Erro ao remover ligação: ${error.message}`); return; }
    setEdgeRows((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  // Organiza jornadas existentes que ainda não têm canvas.x persistido.
  // Idempotente: pula quem já está posicionado.
  const organizeJourneys = useCallback(async () => {
    const PADDING = 80;
    const TITLE = 48;
    const GAP = 120;
    const MAX_ROW_WIDTH = 4000;
    const NODE_W = 220;
    const NODE_H = 90;

    const pending = journeys.filter((j) => {
      const c = j.canvas ?? {};
      return typeof c.x !== "number";
    });
    if (pending.length === 0) {
      toast.info("Todas as jornadas já estão organizadas");
      return;
    }

    const sizeFor = (j: JourneyRow) => {
      const js = steps.filter((s) => s.journey_id === j.id);
      if (js.length === 0) return { w: 600, h: 420 };
      let maxR = 0, maxB = 0, hasNeg = false;
      js.forEach((s) => {
        const pos = s.position ?? { x: 0, y: 0 };
        if (pos.x < 0 || pos.y < 0) hasNeg = true;
        const isStage = s.node_type === "stage";
        const w = isStage ? ((s.config as any)?.width ?? 360) : NODE_W;
        const h = isStage ? ((s.config as any)?.height ?? 220) : NODE_H;
        maxR = Math.max(maxR, pos.x + w);
        maxB = Math.max(maxB, pos.y + h);
      });
      if (hasNeg) console.warn(`Jornada ${j.id} tem nós com posição negativa`);
      return { w: maxR + PADDING, h: maxB + PADDING + TITLE };
    };

    let cx = 0, cy = 0, rowH = 0;
    const updates: Array<{ id: string; canvas: { x:number;y:number;w:number;h:number }; color: string }> = [];
    pending.forEach((j, i) => {
      const { w, h } = sizeFor(j);
      if (cx > 0 && cx + w > MAX_ROW_WIDTH) {
        cx = 0; cy += rowH + GAP; rowH = 0;
      }
      const color = j.color ?? JOURNEY_PALETTE[i % JOURNEY_PALETTE.length];
      updates.push({ id: j.id, canvas: { x: cx, y: cy, w, h }, color });
      cx += w + GAP;
      rowH = Math.max(rowH, h);
    });

    let ok = 0;
    for (const u of updates) {
      await updateJourney(u.id, { canvas: u.canvas, color: u.color });
      ok++;
    }
    toast.success(`${ok} jornada(s) organizada(s)`);
  }, [journeys, steps, updateJourney]);

  return {
    journeys, steps, edgeRows, nodes, edges, loading, refresh: load,
    setNodes, setEdges,
    createJourney, updateJourney, assignNodeToJourney, createEdge, removeEdge,
    organizeJourneys,
  };
}
