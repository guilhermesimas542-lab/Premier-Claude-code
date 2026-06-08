import { useCallback, useEffect, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NodeType } from "./useJourneyGraph";
import type { ChannelKey } from "@/admin/lib/crm/channels";

const FALLBACK_COLORS = [
  "#00FF7F", "#60A5FA", "#F59E0B", "#A855F7", "#EC4899",
  "#22D3EE", "#F472B6", "#FB923C", "#34D399", "#818CF8",
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
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [jRes, sRes, eRes] = await Promise.all([
      (supabase as any).from("crm_journeys")
        .select("id, name, color, canvas, status, trigger_type")
        .order("created_at", { ascending: true }),
      (supabase as any).from("crm_journey_steps").select("*"),
      (supabase as any).from("crm_journey_edges").select("*"),
    ]);
    if (jRes.error) { toast.error(`Jornadas: ${jRes.error.message}`); setLoading(false); return; }
    if (sRes.error) { toast.error(`Nós: ${sRes.error.message}`); setLoading(false); return; }
    if (eRes.error) { toast.error(`Ligações: ${eRes.error.message}`); setLoading(false); return; }

    const js: JourneyRow[] = jRes.data ?? [];
    const steps: StepRow[] = sRes.data ?? [];
    const edgeRows: EdgeRow[] = eRes.data ?? [];

    // Fallback layout pra jornadas sem canvas
    const journeyLayout = new Map<string, { x: number; y: number; w: number; h: number; color: string }>();
    js.forEach((j, i) => {
      const c = j.canvas ?? {};
      const hasPos = typeof c.x === "number" && typeof c.y === "number";
      journeyLayout.set(j.id, {
        x: hasPos ? (c.x as number) : i * (FALLBACK_W + FALLBACK_GAP),
        y: hasPos ? (c.y as number) : 0,
        w: typeof c.w === "number" ? c.w : FALLBACK_W,
        h: typeof c.h === "number" ? c.h : FALLBACK_H,
        color: j.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      });
    });

    // Sticky notes (1 por jornada)
    const stickyNodes: Node[] = js.map((j) => {
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

    // Steps → nodes (parentId = stage se houver, senão sticky da jornada)
    const stageNodes: Node[] = [];
    const leafNodes: Node[] = [];

    steps.forEach((r) => {
      const isStage = r.node_type === "stage";
      const lay = journeyLayout.get(r.journey_id);
      const cfg = r.config ?? {};
      // Se o nó não está num stage, vira filho do sticky da jornada.
      // Posição: se já é relativa (após 11.3) usa direto; senão converte
      // de absoluta pra relativa subtraindo a posição da jornada.
      const parentId = r.parent_step_id
        ? r.parent_step_id
        : `journey:${r.journey_id}`;
      const rawPos = r.position ?? { x: 24, y: 48 };
      const position = r.parent_step_id
        ? rawPos
        : lay
        ? { x: rawPos.x - lay.x, y: rawPos.y - lay.y }
        : rawPos;

      const node: any = {
        id: r.id,
        type: r.node_type,
        position,
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

    // React Flow exige pai antes do filho: sticky → stage → leaf
    const orderedNodes = [...stickyNodes, ...stageNodes, ...leafNodes];

    const builtEdges: Edge[] = edgeRows.map((e) => ({
      id: e.id,
      source: e.source_step_id,
      target: e.target_step_id,
      label: e.branch ?? "",
      style: { stroke: journeyLayout.get(e.journey_id)?.color ?? "#888" },
    }));

    setJourneys(js);
    setNodes(orderedNodes);
    setEdges(builtEdges);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { journeys, nodes, edges, loading, refresh: load, setNodes, setEdges };
}
