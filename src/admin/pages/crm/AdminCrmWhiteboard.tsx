import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Loader2, Play, Mail, Clock, GitBranch, Tag, Pencil, Trash2, Target } from "lucide-react";
import { attributeConversions } from "@/admin/hooks/crm/useJourneyConversions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TriggerNode,
  MessageNode,
  WaitNode,
  ConditionNode,
  TagNode,
  StageNode,
} from "@/admin/components/crm/whiteboard/nodes";
import { NodeConfigDrawer } from "@/admin/components/crm/whiteboard/NodeConfigDrawer";
import type { NodeType, RFNode } from "@/admin/hooks/crm/useJourneyGraph";
import type { ChannelKey } from "@/admin/lib/crm/channels";
import { Layers, Group, Ungroup, TrendingDown } from "lucide-react";
import {
  computeNodeDepths,
  computeNodeMetrics,
  computeStageMetrics,
  computeStageFunnel,
  type StageFunnelRow,
  type StageMetrics,
  type MinimalStep,
  type MinimalEdge,
  type MinimalEvent,
} from "@/admin/lib/crm/journeyMetrics";
import { formatBRL } from "@/admin/components/revenue/constants";
import { ATTRIBUTION_WINDOW_DAYS } from "@/admin/hooks/crm/useJourneyConversions";
import { Input } from "@/components/ui/input";

const NODE_TYPES = {
  trigger: TriggerNode,
  message: MessageNode,
  wait: WaitNode,
  condition: ConditionNode,
  tag: TagNode,
  stage: StageNode,
};

const PALETTE: { type: NodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: "stage", label: "Etapa", icon: Layers, color: "#4D7A1F" },
  { type: "trigger", label: "Gatilho", icon: Play, color: "#10B981" },
  { type: "message", label: "Mensagem", icon: Mail, color: "#60A5FA" },
  { type: "wait", label: "Esperar", icon: Clock, color: "#F59E0B" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "#A855F7" },
  { type: "tag", label: "Marcar usuário", icon: Tag, color: "#EC4899" },
];

const GROUP_PAD = 32;

function getAbsolutePosition(node: Node, all: Node[]): { x: number; y: number } {
  if (!node.parentId) return node.position;
  const parent = all.find((n) => n.id === node.parentId);
  if (!parent) return node.position;
  const pAbs = getAbsolutePosition(parent, all);
  return { x: pAbs.x + node.position.x, y: pAbs.y + node.position.y };
}
function nodeSize(n: Node): { w: number; h: number } {
  const w = (n.width ?? (n as any).measured?.width ?? (n.style as any)?.width ?? 200) as number;
  const h = (n.height ?? (n as any).measured?.height ?? (n.style as any)?.height ?? 80) as number;
  return { w, h };
}

interface JourneyRow {
  id: string;
  name: string;
  trigger_type: string | null;
  status: string | null;
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

const JOURNEY_COLORS = [
  "#00FF7F", "#60A5FA", "#F59E0B", "#A855F7", "#EC4899",
  "#22D3EE", "#F472B6", "#FB923C", "#34D399", "#818CF8",
];

function labelFor(node_type: NodeType, channel: ChannelKey | null) {
  switch (node_type) {
    case "trigger": return "Gatilho";
    case "message": return channel ? `Mensagem · ${channel}` : "Mensagem";
    case "wait": return "Esperar";
    case "condition": return "Condição";
    case "tag": return "Marcar usuário";
    default: return node_type;
  }
}

function Inner() {
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [edgeRows, setEdgeRows] = useState<EdgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJourney, setFilterJourney] = useState<string>("all");
  const [addToJourney, setAddToJourney] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [stageMetricsById, setStageMetricsById] = useState<Record<string, StageMetrics>>({});
  const [funnelByJourney, setFunnelByJourney] = useState<Record<string, StageFunnelRow[]>>({});
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // refs pra evitar TDZ — preenchidos depois que os handlers de stage existem
  const stageTitleRef = useRef<(id: string, title: string) => void>(() => {});
  const stageColorRef = useRef<(id: string, color: string) => void>(() => {});
  const stageResizeRef = useRef<(id: string, w: number, h: number) => void>(() => {});
  const stageUngroupRef = useRef<(id: string) => void>(() => {});
  const { screenToFlowPosition, getNodes } = useReactFlow();

  const [nodes, setNodes, onNodesChangeRF] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeRF] = useEdgesState<Edge>([]);

  const journeyColor = useMemo(() => {
    const map = new Map<string, string>();
    journeys.forEach((j, i) => map.set(j.id, JOURNEY_COLORS[i % JOURNEY_COLORS.length]));
    return map;
  }, [journeys]);

  const journeyName = useMemo(() => {
    const map = new Map<string, string>();
    journeys.forEach((j) => map.set(j.id, j.name));
    return map;
  }, [journeys]);

  const load = useCallback(async () => {
    setLoading(true);
    const [jRes, sRes, eRes, evRes] = await Promise.all([
      (supabase as any).from("crm_journeys").select("id, name, trigger_type, status").order("created_at", { ascending: true }),
      (supabase as any).from("crm_journey_steps").select("*"),
      (supabase as any).from("crm_journey_edges").select("*"),
      (supabase as any).from("crm_journey_step_events").select("step_id, enrollment_id, status, metadata, converted, conversion_value_cents"),
    ]);
    if (jRes.error) { toast.error(`Jornadas: ${jRes.error.message}`); setLoading(false); return; }
    if (sRes.error) { toast.error(`Nós: ${sRes.error.message}`); setLoading(false); return; }
    if (eRes.error) { toast.error(`Ligações: ${eRes.error.message}`); setLoading(false); return; }
    const journeysData = jRes.data ?? [];
    const stepsData = sRes.data ?? [];
    const edgesData = eRes.data ?? [];
    const eventsData = (evRes.data ?? []) as MinimalEvent[];
    setJourneys(journeysData);
    setSteps(stepsData);
    setEdgeRows(edgesData);

    // Compute por jornada usando o util compartilhado
    const allNodeMetrics: Record<string, any> = {};
    const stageMap: Record<string, StageMetrics> = {};
    const funnelMap: Record<string, StageFunnelRow[]> = {};

    for (const j of journeysData as Array<{ id: string }>) {
      const jSteps = stepsData.filter((s: any) => s.journey_id === j.id) as MinimalStep[];
      if (jSteps.length === 0) continue;
      const jStepIds = jSteps.map((s) => s.id);
      const jEdges = edgesData.filter((e: any) => e.journey_id === j.id) as MinimalEdge[];
      const jEvents = eventsData.filter((e) => jStepIds.includes(e.step_id));
      const depths = computeNodeDepths(jSteps, jEdges);
      const { metrics: nm, leadsByStep } = computeNodeMetrics(jStepIds, jEvents);
      Object.assign(allNodeMetrics, nm);
      const sm = computeStageMetrics(jSteps, jEvents, leadsByStep, depths);
      sm.forEach((s) => { stageMap[s.stageId] = s; });
      const meta = new Map(
        jSteps
          .filter((s) => s.node_type === "stage")
          .map((s) => [s.id, {
            title: (s.config as any)?.title ?? "Etapa",
            color: (s.config as any)?.color ?? "#4D7A1F",
            journeyId: j.id,
          }])
      );
      funnelMap[j.id] = computeStageFunnel(sm, meta);
    }

    setMetrics(allNodeMetrics);
    setStageMetricsById(stageMap);
    setFunnelByJourney(funnelMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // default "add to" first journey
  useEffect(() => {
    if (!addToJourney && journeys.length > 0) setAddToJourney(journeys[0].id);
  }, [journeys, addToJourney]);

  // build canvas nodes/edges, offsetting each journey horizontally if everything is at origin
  useEffect(() => {
    const journeyIndex = new Map<string, number>();
    journeys.forEach((j, i) => journeyIndex.set(j.id, i));

    // group origin-only journeys -> spread vertically inside their lane
    const byJourney = new Map<string, StepRow[]>();
    steps.forEach((s) => {
      const arr = byJourney.get(s.journey_id) ?? [];
      arr.push(s);
      byJourney.set(s.journey_id, arr);
    });

    const built: Node[] = [];
    byJourney.forEach((rows, jid) => {
      const lane = (journeyIndex.get(jid) ?? 0) * 600;
      const nonStage = rows.filter((r) => r.node_type !== "stage");
      const allOrigin = nonStage.length > 0 && nonStage.every((r) => !r.position || (r.position.x === 0 && r.position.y === 0));
      rows.forEach((r, i) => {
        const isStage = r.node_type === "stage";
        const cfg = r.config ?? {};
        const pos = !isStage && allOrigin
          ? { x: lane, y: i * 140 }
          : r.position ?? { x: lane, y: i * 140 };
        const visible = filterJourney === "all" || filterJourney === jid;
        const node: any = {
          id: r.id,
          type: r.node_type,
          position: pos,
          hidden: !visible,
          zIndex: isStage ? 0 : 1,
          data: {
            channel: r.channel,
            content: r.content ?? {},
            config: cfg,
            delay_value: r.delay_value,
            delay_unit: r.delay_unit,
            label: labelFor(r.node_type, r.channel),
            journeyName: journeyName.get(jid) ?? "",
            journeyColor: journeyColor.get(jid) ?? "#888",
            metrics: metrics[r.id],
            stageMetrics: isStage ? stageMetricsById[r.id] : undefined,
            title: cfg.title,
            color: cfg.color,
            onChangeTitle: (id: string, t: string) => stageTitleRef.current(id, t),
            onChangeColor: (id: string, c: string) => stageColorRef.current(id, c),
            onResize: (id: string, w: number, h: number) => stageResizeRef.current(id, w, h),
            onUngroup: (id: string) => stageUngroupRef.current(id),
          },
        };
        if (r.parent_step_id) node.parentId = r.parent_step_id;
        if (isStage) node.style = { width: cfg.width ?? 360, height: cfg.height ?? 220 };
        built.push(node);
      });
    });
    // Stages antes dos filhos (React Flow exige)
    const stagesFirst = [...built.filter((n) => n.type === "stage"), ...built.filter((n) => n.type !== "stage")];
    setNodes(stagesFirst);

    const builtEdges: Edge[] = edgeRows.map((e) => {
      const visible = filterJourney === "all" || filterJourney === e.journey_id;
      return {
        id: e.id,
        source: e.source_step_id,
        target: e.target_step_id,
        label: e.branch ?? "",
        hidden: !visible,
        style: { stroke: journeyColor.get(e.journey_id) ?? "#888" },
      };
    });
    setEdges(builtEdges);
  }, [steps, edgeRows, journeys, filterJourney, journeyColor, journeyName, metrics, stageMetricsById, setNodes, setEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    changes.forEach(async (c) => {
      if (c.type === "remove") {
        const { error } = await (supabase as any).from("crm_journey_edges").delete().eq("id", c.id);
        if (error) toast.error(`Erro ao remover ligação: ${error.message}`);
        else setEdgeRows((prev) => prev.filter((e) => e.id !== c.id));
      }
    });
  }, [setEdges]);

  const onNodesDelete = useCallback(async (deleted: Node[]) => {
    for (const n of deleted) {
      const { error } = await (supabase as any).from("crm_journey_steps").delete().eq("id", n.id);
      if (error) { toast.error(`Erro ao remover: ${error.message}`); continue; }
      setSteps((prev) => prev.filter((s) => s.id !== n.id));
      setEdgeRows((prev) => prev.filter((e) => e.source_step_id !== n.id && e.target_step_id !== n.id));
    }
  }, []);

  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target) return;
    const src = steps.find((s) => s.id === c.source);
    const tgt = steps.find((s) => s.id === c.target);
    if (!src || !tgt) return;
    if (src.journey_id !== tgt.journey_id) {
      toast.error("Não dá pra ligar nós de jornadas diferentes");
      return;
    }
    const branch = c.sourceHandle === "yes" ? "sim" : c.sourceHandle === "no" ? "não" : null;
    const { data, error } = await (supabase as any)
      .from("crm_journey_edges")
      .insert({
        journey_id: src.journey_id,
        source_step_id: c.source,
        target_step_id: c.target,
        branch,
      })
      .select()
      .single();
    if (error) { toast.error(`Erro ao ligar: ${error.message}`); return; }
    setEdgeRows((prev) => [...prev, data as EdgeRow]);
  }, [steps]);


  const insertStep = useCallback(
    async (
      type: NodeType,
      position: { x: number; y: number },
      journeyId: string,
      opts?: { config?: Record<string, any>; parent_step_id?: string | null }
    ): Promise<string | null> => {
      const isStage = type === "stage";
      const defaultConfig = isStage
        ? { title: "Etapa", color: "#4D7A1F", width: 360, height: 220 }
        : {};
      const config = { ...defaultConfig, ...(opts?.config ?? {}) };
      const { data, error } = await (supabase as any)
        .from("crm_journey_steps")
        .insert({
          journey_id: journeyId,
          node_type: type,
          position,
          channel: null,
          content: {},
          config,
          step_order: null,
          parent_step_id: opts?.parent_step_id ?? null,
        })
        .select()
        .single();
      if (error) { toast.error(`Erro ao adicionar: ${error.message}`); return null; }
      setSteps((prev) => [...prev, data as StepRow]);
      toast.success("Nó adicionado");
      return (data as StepRow).id;
    },
    []
  );

  const setStepParent = useCallback(
    async (id: string, parentId: string | null, position: { x: number; y: number }) => {
      const { error } = await (supabase as any)
        .from("crm_journey_steps")
        .update({ parent_step_id: parentId, position })
        .eq("id", id);
      if (error) { toast.error(`Erro ao agrupar: ${error.message}`); return; }
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, parent_step_id: parentId, position } : s))
      );
    },
    []
  );

  const handleAdd = useCallback(async (type: NodeType) => {
    if (!addToJourney) { toast.error("Escolha a jornada onde adicionar"); return; }
    const idx = journeys.findIndex((j) => j.id === addToJourney);
    const pos = { x: (idx >= 0 ? idx * 600 : 0) + 250 + Math.random() * 100, y: 150 + Math.random() * 200 };
    await insertStep(type, pos, addToJourney);
  }, [addToJourney, journeys, insertStep]);

  const handleDeleteNode = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("crm_journey_steps").delete().eq("id", id);
    if (error) { toast.error(`Erro ao remover: ${error.message}`); return; }
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setEdgeRows((prev) => prev.filter((e) => e.source_step_id !== id && e.target_step_id !== id));
    setCtxMenu(null);
    toast.success("Nó removido");
  }, []);

  // ---- Drag & drop da paleta pro canvas
  const onPaletteDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData("application/crm-node-type", type);
    e.dataTransfer.effectAllowed = "move";
  };
  const onCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);
  const onCanvasDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/crm-node-type") as NodeType;
      if (!type) return;
      if (!addToJourney) { toast.error("Escolha a jornada em 'Adicionar em' antes de arrastar"); return; }
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      await insertStep(type, pos, addToJourney);
    },
    [addToJourney, insertStep, screenToFlowPosition]
  );

  // ---- Context menu (botão direito)
  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    setCtxMenu({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
      nodeId: node.id,
    });
  }, []);
  const onPaneClick = useCallback(() => setCtxMenu(null), []);

  const [recalcBusy, setRecalcBusy] = useState(false);
  const [windowDays, setWindowDays] = useState<number>(ATTRIBUTION_WINDOW_DAYS);
  const handleRecalcAll = useCallback(async () => {
    if (journeys.length === 0) return;
    setRecalcBusy(true);
    let totalMatched = 0;
    for (const j of journeys) {
      const r = await attributeConversions(j.id, windowDays);
      if (r) totalMatched += r.matched;
    }
    setRecalcBusy(false);
    toast.success(`Conversões recalculadas (janela ${windowDays}d): ${totalMatched} atribuídas`);
    await load();
  }, [journeys, load, windowDays]);

  const handleUpdateNode = useCallback(async (id: string, fields: any) => {
    const { error } = await (supabase as any).from("crm_journey_steps").update(fields).eq("id", id);
    if (error) { toast.error(`Erro ao salvar: ${error.message}`); return; }
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  }, []);

  // ---- Stage / drag-stop handlers (precisam de insertStep, setStepParent, handleUpdateNode, handleDeleteNode)
  const onNodeDragStop = useCallback(async (_e: any, node: Node) => {
    if (node.type === "stage") {
      const { error } = await (supabase as any)
        .from("crm_journey_steps")
        .update({ position: node.position })
        .eq("id", node.id);
      if (error) { toast.error(`Erro ao salvar posição: ${error.message}`); return; }
      setSteps((prev) => prev.map((s) => (s.id === node.id ? { ...s, position: node.position } : s)));
      return;
    }
    const all = getNodes();
    const me = all.find((n) => n.id === node.id) ?? node;
    const abs = (node as any).positionAbsolute ?? getAbsolutePosition(me, all);
    const { w, h } = nodeSize(me);
    const centerX = abs.x + w / 2;
    const centerY = abs.y + h / 2;
    const myJourney = steps.find((s) => s.id === node.id)?.journey_id;
    const stages = all.filter((n) => n.type === "stage" && n.id !== node.id);
    let containing: Node | null = null;
    for (const s of stages) {
      const sj = steps.find((x) => x.id === s.id)?.journey_id;
      if (sj && myJourney && sj !== myJourney) continue;
      const sAbs = getAbsolutePosition(s, all);
      const { w: sw, h: sh } = nodeSize(s);
      if (centerX >= sAbs.x && centerX <= sAbs.x + sw && centerY >= sAbs.y && centerY <= sAbs.y + sh) {
        containing = s; break;
      }
    }
    const currentParent = node.parentId ?? null;
    const newParent = containing?.id ?? null;
    if (newParent === currentParent) {
      const { error } = await (supabase as any)
        .from("crm_journey_steps")
        .update({ position: node.position })
        .eq("id", node.id);
      if (error) { toast.error(`Erro ao salvar posição: ${error.message}`); return; }
      setSteps((prev) => prev.map((s) => (s.id === node.id ? { ...s, position: node.position } : s)));
      return;
    }
    let newPos = abs;
    if (newParent) {
      const parentAbs = getAbsolutePosition(containing!, all);
      newPos = { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y };
    }
    await setStepParent(node.id, newParent, newPos);
    if (newParent) toast.success("Nó adicionado à etapa");
  }, [getNodes, steps, setStepParent]);

  const handleStageTitle = useCallback((id: string, title: string) => {
    const s = steps.find((x) => x.id === id);
    handleUpdateNode(id, { config: { ...(s?.config ?? {}), title } });
  }, [steps, handleUpdateNode]);
  const handleStageColor = useCallback((id: string, color: string) => {
    const s = steps.find((x) => x.id === id);
    handleUpdateNode(id, { config: { ...(s?.config ?? {}), color } });
  }, [steps, handleUpdateNode]);
  const handleStageResize = useCallback((id: string, width: number, height: number) => {
    const s = steps.find((x) => x.id === id);
    handleUpdateNode(id, { config: { ...(s?.config ?? {}), width, height } });
  }, [steps, handleUpdateNode]);
  const handleUngroup = useCallback(async (stageId: string) => {
    const all = getNodes();
    const stage = all.find((n) => n.id === stageId);
    if (!stage) return;
    const stageAbs = getAbsolutePosition(stage, all);
    const children = all.filter((n) => n.parentId === stageId);
    for (const c of children) {
      await setStepParent(c.id, null, { x: stageAbs.x + c.position.x, y: stageAbs.y + c.position.y });
    }
    await handleDeleteNode(stageId);
    toast.success("Etapa desfeita");
  }, [getNodes, setStepParent, handleDeleteNode]);

  const handleGroupSelection = useCallback(async () => {
    if (!addToJourney) { toast.error("Escolha 'Adicionar em' antes de agrupar"); return; }
    const all = getNodes();
    const selected = all.filter((n) => {
      if (!n.selected || n.type === "stage" || n.parentId) return false;
      const s = steps.find((x) => x.id === n.id);
      return s?.journey_id === addToJourney;
    });
    if (selected.length === 0) {
      toast.error("Selecione nós soltos da jornada escolhida");
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of selected) {
      const abs = getAbsolutePosition(n, all);
      const { w, h } = nodeSize(n);
      minX = Math.min(minX, abs.x); minY = Math.min(minY, abs.y);
      maxX = Math.max(maxX, abs.x + w); maxY = Math.max(maxY, abs.y + h);
    }
    const stagePos = { x: minX - GROUP_PAD, y: minY - GROUP_PAD - 28 };
    const width = (maxX - minX) + GROUP_PAD * 2;
    const height = (maxY - minY) + GROUP_PAD * 2 + 28;
    const stageId = await insertStep("stage", stagePos, addToJourney, {
      config: { title: "Etapa", color: "#4D7A1F", width, height },
    });
    if (!stageId) return;
    for (const n of selected) {
      const abs = getAbsolutePosition(n, all);
      await setStepParent(n.id, stageId, { x: abs.x - stagePos.x, y: abs.y - stagePos.y });
    }
    toast.success("Etapa criada");
  }, [addToJourney, getNodes, steps, insertStep, setStepParent]);

  // sincroniza os refs usados pelos stages na construção dos nodes
  useEffect(() => { stageTitleRef.current = handleStageTitle; }, [handleStageTitle]);
  useEffect(() => { stageColorRef.current = handleStageColor; }, [handleStageColor]);
  useEffect(() => { stageResizeRef.current = handleStageResize; }, [handleStageResize]);
  useEffect(() => { stageUngroupRef.current = handleUngroup; }, [handleUngroup]);

  const selectedStep = steps.find((s) => s.id === selectedNodeId);
  const selectedNode: RFNode | null = selectedStep
    ? {
        id: selectedStep.id,
        type: selectedStep.node_type,
        position: selectedStep.position ?? { x: 0, y: 0 },
        data: {
          channel: selectedStep.channel,
          content: selectedStep.content ?? {},
          config: selectedStep.config ?? {},
          delay_value: selectedStep.delay_value,
          delay_unit: selectedStep.delay_unit,
          label: labelFor(selectedStep.node_type, selectedStep.channel),
        },
      }
    : null;
  const selectedJourneyId = selectedStep?.journey_id ?? null;
  const messageNodesForSelected: RFNode[] = selectedJourneyId
    ? steps
        .filter((s) => s.journey_id === selectedJourneyId && s.node_type === "message")
        .map((s) => ({
          id: s.id,
          type: s.node_type,
          position: s.position ?? { x: 0, y: 0 },
          data: {
            channel: s.channel,
            content: s.content ?? {},
            config: s.config ?? {},
            delay_value: s.delay_value,
            delay_unit: s.delay_unit,
            label: labelFor(s.node_type, s.channel),
          },
        }))
    : [];
  const selectedJourneyTrigger = selectedJourneyId
    ? journeys.find((j) => j.id === selectedJourneyId)?.trigger_type ?? null
    : null;

  const nodeTypes = useMemo(() => NODE_TYPES, []);

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b border-border bg-card px-4 py-2.5 flex items-center gap-3 shrink-0 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/crm/journeys")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Jornadas
        </Button>
        <div className="font-bold text-foreground">Whiteboard do CRM</div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleGroupSelection} title="Agrupar nós selecionados em etapa">
            <Group className="w-3.5 h-3.5 mr-1.5" />
            Agrupar em etapa
          </Button>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={90}
              value={windowDays}
              onChange={(e) => setWindowDays(Math.max(1, Math.min(90, Number(e.target.value) || ATTRIBUTION_WINDOW_DAYS)))}
              className="h-8 w-16"
              title="Janela de atribuição (dias)"
            />
            <span className="text-[10px] text-muted-foreground">dias</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalcAll}
              disabled={recalcBusy || journeys.length === 0}
              title="Roda a atribuição de conversões em todas as jornadas (janela em dias)"
            >
              {recalcBusy ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Target className="w-3.5 h-3.5 mr-1.5" />
              )}
              Recalcular conversões
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Ver:</span>
            <Select value={filterJourney} onValueChange={setFilterJourney}>
              <SelectTrigger className="h-8 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as jornadas</SelectItem>
                {journeys.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Adicionar em:</span>
            <Select value={addToJourney} onValueChange={setAddToJourney}>
              <SelectTrigger className="h-8 w-[200px]"><SelectValue placeholder="Escolher jornada" /></SelectTrigger>
              <SelectContent>
                {journeys.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addToJourney && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/crm/journeys/${addToJourney}/edit`)}
                title="Editar jornada"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-48 border-r border-border bg-card p-3 space-y-2 shrink-0 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Adicionar nó
          </div>
          <div className="text-[10px] text-muted-foreground mb-2">
            Clique pra adicionar ou arraste pro canvas.
          </div>
          {PALETTE.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.type}
                draggable
                onDragStart={(e) => onPaletteDragStart(e, p.type)}
                onClick={() => handleAdd(p.type)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border hover:bg-accent transition text-left cursor-grab active:cursor-grabbing"
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0" style={{ backgroundColor: p.color }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-foreground">{p.label}</span>
              </button>
            );
          })}

          <div className="pt-4 mt-2 border-t border-border">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Legenda (jornadas)
            </div>
            <div className="space-y-1">
              {journeys.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setFilterJourney(filterJourney === j.id ? "all" : j.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs hover:bg-accent transition ${
                    filterJourney === j.id ? "bg-accent" : ""
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: journeyColor.get(j.id) }} />
                  <span className="truncate text-foreground">{j.name}</span>
                </button>
              ))}
              {journeys.length === 0 && (
                <div className="text-xs text-muted-foreground">Nenhuma jornada criada.</div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-border">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Funil de etapas
            </div>
            {(() => {
              const visibleJourneys = filterJourney === "all" ? journeys : journeys.filter((j) => j.id === filterJourney);
              const blocks = visibleJourneys
                .map((j) => ({ j, rows: funnelByJourney[j.id] ?? [] }))
                .filter((b) => b.rows.length > 0);
              if (blocks.length === 0) {
                return <div className="text-[11px] text-muted-foreground">Nenhuma etapa criada.</div>;
              }
              return (
                <div className="space-y-3">
                  {blocks.map(({ j, rows }) => (
                    <div key={j.id} className="space-y-1">
                      {filterJourney === "all" && (
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground/80 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: journeyColor.get(j.id) }} />
                          <span className="truncate">{j.name}</span>
                        </div>
                      )}
                      {rows.map((r, i) => {
                        const bigDrop = r.dropFromPrev >= 0.5 && i > 0;
                        return (
                          <div
                            key={r.stageId}
                            className="rounded-md border border-border bg-background/40 p-1.5 text-[11px] leading-tight"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.color }} />
                              <span className="truncate font-medium text-foreground">{r.title}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-2 text-muted-foreground mt-0.5">
                              <span>👥 {r.leadsEntered}</span>
                              <span>💰 {r.convertedCount}{r.conversionValueCents > 0 ? ` · ${formatBRL(r.conversionValueCents / 100)}` : ""}</span>
                              <span>📈 {(r.conversionRate * 100).toFixed(1)}%</span>
                            </div>
                            {i > 0 && (
                              <div className={`flex items-center gap-1 mt-0.5 ${bigDrop ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                                <TrendingDown className="w-3 h-3" />
                                <span>Queda: {(r.dropFromPrev * 100).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        <div
          className="flex-1 relative"
          ref={wrapperRef}
          onDragOver={onCanvasDragOver}
          onDrop={onCanvasDrop}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodesDelete={onNodesDelete}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={(_e, node) => { setSelectedNodeId(node.id); setCtxMenu(null); }}
              onNodeContextMenu={onNodeContextMenu}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={["Delete", "Backspace"]}
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          )}

          {ctxMenu && (() => {
            const isStage = steps.find((s) => s.id === ctxMenu.nodeId)?.node_type === "stage";
            return (
              <div
                className="absolute z-50 min-w-[160px] rounded-md border border-border bg-popover shadow-lg py-1"
                style={{ left: ctxMenu.x, top: ctxMenu.y }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <button
                  onClick={() => handleDeleteNode(ctxMenu.nodeId)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-accent text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir nó
                </button>
                {isStage && (
                  <button
                    onClick={() => { handleUngroup(ctxMenu.nodeId); setCtxMenu(null); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent text-left"
                  >
                    <Ungroup className="w-3.5 h-3.5" />
                    Desagrupar
                  </button>
                )}
                {!isStage && (
                  <button
                    onClick={() => { setSelectedNodeId(ctxMenu.nodeId); setCtxMenu(null); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent text-left"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>


      <NodeConfigDrawer
        node={selectedNode?.type === "stage" ? null : selectedNode}
        messageNodes={messageNodesForSelected}
        triggerType={selectedJourneyTrigger}
        onClose={() => setSelectedNodeId(null)}
        onSave={handleUpdateNode}
      />
    </div>
  );
}

export default function AdminCrmWhiteboard() {
  return (
    <ReactFlowProvider>
      <Inner />
    </ReactFlowProvider>
  );
}
