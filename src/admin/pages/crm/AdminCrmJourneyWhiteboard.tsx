import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  ArrowLeft, Loader2, Play, Mail, Clock, GitBranch, Tag, Target, Layers, Group, Ungroup, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJourneyConversions, ATTRIBUTION_WINDOW_DAYS } from "@/admin/hooks/crm/useJourneyConversions";
import { useJourneyNodeMetrics } from "@/admin/hooks/crm/useJourneyNodeMetrics";
import { formatBRL } from "@/admin/components/revenue/constants";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useJourneyGraph, type NodeType, type RFNode } from "@/admin/hooks/crm/useJourneyGraph";
import {
  TriggerNode,
  MessageNode,
  WaitNode,
  ConditionNode,
  TagNode,
  StageNode,
} from "@/admin/components/crm/whiteboard/nodes";
import { NodeConfigDrawer } from "@/admin/components/crm/whiteboard/NodeConfigDrawer";

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

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const journeyId = id ?? null;

  const {
    nodes: graphNodes,
    edges: graphEdges,
    loading,
    addNode,
    updateNode,
    updateNodePosition,
    removeNode,
    addEdge,
    removeEdge,
    updateEdgeBranch,
    setNodeParent,
  } = useJourneyGraph(journeyId);
  const { busy: convBusy, recalc } = useJourneyConversions();
  const { metrics, stageById, funnel, refresh: refreshMetrics } = useJourneyNodeMetrics(journeyId);
  const { getNodes } = useReactFlow();
  const [windowDays, setWindowDays] = useState<number>(ATTRIBUTION_WINDOW_DAYS);

  const handleRecalc = useCallback(async () => {
    if (!journeyId) return;
    await recalc(journeyId, windowDays);
    await refreshMetrics();
  }, [journeyId, recalc, refreshMetrics, windowDays]);

  const [nodes, setNodes, onNodesChangeRF] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeRF] = useEdgesState<Edge>([]);
  const [journeyName, setJourneyName] = useState<string>("");
  const [triggerType, setTriggerType] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Stage callbacks (renomear, cor, resize, desagrupar) — chamados pelo StageNode
  const handleStageTitle = useCallback((id: string, title: string) => {
    const n = graphNodes.find((x) => x.id === id);
    const cfg = { ...(n?.data.config ?? {}), title };
    updateNode(id, { config: cfg });
  }, [graphNodes, updateNode]);

  const handleStageColor = useCallback((id: string, color: string) => {
    const n = graphNodes.find((x) => x.id === id);
    const cfg = { ...(n?.data.config ?? {}), color };
    updateNode(id, { config: cfg });
  }, [graphNodes, updateNode]);

  const handleStageResize = useCallback((id: string, width: number, height: number) => {
    const n = graphNodes.find((x) => x.id === id);
    const cfg = { ...(n?.data.config ?? {}), width, height };
    updateNode(id, { config: cfg });
  }, [graphNodes, updateNode]);

  const handleUngroup = useCallback(async (stageId: string) => {
    const current = getNodes();
    const stage = current.find((n) => n.id === stageId);
    if (!stage) return;
    const stageAbs = getAbsolutePosition(stage, current);
    const children = current.filter((n) => n.parentId === stageId);
    for (const c of children) {
      const abs = { x: stageAbs.x + c.position.x, y: stageAbs.y + c.position.y };
      await setNodeParent(c.id, null, abs);
    }
    await removeNode(stageId);
    toast.success("Etapa desfeita");
  }, [getNodes, setNodeParent, removeNode]);

  // Construir nodes do RF a partir do hook + métricas + callbacks
  useEffect(() => {
    const withExtras = graphNodes.map((n) => {
      if (n.type === "stage") {
        return {
          ...n,
          data: {
            ...n.data,
            title: n.data.config?.title ?? n.data.title ?? "Etapa",
            color: n.data.config?.color ?? n.data.color ?? "#4D7A1F",
            onChangeTitle: handleStageTitle,
            onChangeColor: handleStageColor,
            onResize: handleStageResize,
            onUngroup: handleUngroup,
            metrics: metrics[n.id],
            stageMetrics: stageById[n.id],
          },
        };
      }
      return { ...n, data: { ...n.data, metrics: metrics[n.id] } };
    });
    setNodes(withExtras as unknown as Node[]);
  }, [graphNodes, metrics, stageById, setNodes, handleStageTitle, handleStageColor, handleStageResize, handleUngroup]);

  useEffect(() => {
    setEdges(graphEdges as unknown as Edge[]);
  }, [graphEdges, setEdges]);

  useEffect(() => {
    if (!journeyId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("crm_journeys")
        .select("name, trigger_type")
        .eq("id", journeyId)
        .single();
      if (data?.name) setJourneyName(data.name);
      if (data?.trigger_type) setTriggerType(data.trigger_type);
    })();
  }, [journeyId]);

  const selectedNode =
    (graphNodes.find((n) => n.id === selectedNodeId) as RFNode | undefined) ?? null;
  const messageNodes = graphNodes.filter((n) => n.type === "message") as RFNode[];

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      changes.forEach((c) => {
        if (c.type === "remove") removeEdge(c.id);
      });
    },
    [setEdges, removeEdge]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((n) => removeNode(n.id));
    },
    [removeNode]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      const branch = c.sourceHandle === "yes" ? "sim" : c.sourceHandle === "no" ? "não" : undefined;
      addEdge(c.source, c.target, branch);
    },
    [addEdge]
  );

  const handleAdd = useCallback(
    async (type: NodeType) => {
      const pos = { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 };
      const newId = await addNode(type, pos);
      if (newId) toast.success("Nó adicionado");
    },
    [addNode]
  );

  // ---- Captura/liberação dinâmica em stages
  const onNodeDragStop = useCallback(
    async (_e: any, node: Node) => {
      // se moveu um stage: só salva posição (não pode virar filho de outro stage)
      if (node.type === "stage") {
        await updateNodePosition(node.id, node.position);
        return;
      }

      const all = getNodes();
      const me = all.find((n) => n.id === node.id) ?? node;
      const abs = (node as any).positionAbsolute ?? getAbsolutePosition(me, all);
      const { w, h } = nodeSize(me);
      const centerX = abs.x + w / 2;
      const centerY = abs.y + h / 2;

      // procurar stage que contenha o centro
      const stages = all.filter((n) => n.type === "stage" && n.id !== node.id);
      let containing: Node | null = null;
      for (const s of stages) {
        const sAbs = getAbsolutePosition(s, all);
        const { w: sw, h: sh } = nodeSize(s);
        if (
          centerX >= sAbs.x && centerX <= sAbs.x + sw &&
          centerY >= sAbs.y && centerY <= sAbs.y + sh
        ) {
          containing = s;
          break;
        }
      }

      const currentParent = node.parentId ?? null;
      const newParent = containing?.id ?? null;

      if (newParent === currentParent) {
        // mesmo pai → salvar posição (relativa OU absoluta, conforme o caso)
        await updateNodePosition(node.id, node.position);
        return;
      }

      // mudou de pai → converter abs ↔ relativa
      let newPos = abs;
      if (newParent) {
        const parentAbs = getAbsolutePosition(containing!, all);
        newPos = { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y };
      }
      await setNodeParent(node.id, newParent, newPos);
      if (newParent) toast.success("Nó adicionado à etapa");
    },
    [getNodes, setNodeParent, updateNodePosition]
  );

  // ---- Agrupar seleção em etapa
  const handleGroupSelection = useCallback(async () => {
    const all = getNodes();
    const selected = all.filter((n) => n.selected && n.type !== "stage" && !n.parentId);
    if (selected.length === 0) {
      toast.error("Selecione nós soltos (fora de etapa) pra agrupar");
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of selected) {
      const abs = getAbsolutePosition(n, all);
      const { w, h } = nodeSize(n);
      minX = Math.min(minX, abs.x);
      minY = Math.min(minY, abs.y);
      maxX = Math.max(maxX, abs.x + w);
      maxY = Math.max(maxY, abs.y + h);
    }
    const stagePos = { x: minX - GROUP_PAD, y: minY - GROUP_PAD - 28 };
    const width = (maxX - minX) + GROUP_PAD * 2;
    const height = (maxY - minY) + GROUP_PAD * 2 + 28;
    const stageId = await addNode("stage", stagePos, {
      config: { title: "Etapa", color: "#4D7A1F", width, height },
    });
    if (!stageId) return;
    for (const n of selected) {
      const abs = getAbsolutePosition(n, all);
      const rel = { x: abs.x - stagePos.x, y: abs.y - stagePos.y };
      await setNodeParent(n.id, stageId, rel);
    }
    toast.success("Etapa criada");
  }, [getNodes, addNode, setNodeParent]);

  const nodeTypes = useMemo(() => NODE_TYPES, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-2.5 flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/admin/crm/journeys/${journeyId}/edit`)}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Voltar
        </Button>
        <div className="font-bold text-foreground truncate">
          {journeyName || "Whiteboard"}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGroupSelection} title="Agrupar nós selecionados em etapa">
            <Group className="w-3.5 h-3.5 mr-1.5" />
            Agrupar em etapa
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalc}
            disabled={!journeyId || convBusy}
          >
            {convBusy ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Target className="w-3.5 h-3.5 mr-1.5" />
            )}
            Recalcular conversões
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Palette */}
        <div className="w-48 border-r border-border bg-card p-3 space-y-2 shrink-0 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Adicionar nó
          </div>
          {PALETTE.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.type}
                onClick={() => handleAdd(p.type)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border hover:bg-accent transition text-left"
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: p.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-foreground">{p.label}</span>
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-border text-[10px] text-muted-foreground">
            Selecione um stage e use o menu acima de "Agrupar". Pra desfazer: clique direito → Desagrupar.
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
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
              onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
              onNodeContextMenu={(e, node) => {
                if (node.type === "stage") {
                  e.preventDefault();
                  if (confirm("Desagrupar essa etapa? Os nós voltam soltos.")) {
                    handleUngroup(node.id);
                  }
                }
              }}
              onEdgeDoubleClick={(_e, edge) => {
                const src = graphNodes.find((n) => n.id === edge.source);
                if (src?.type !== "condition") return;
                const current = ((edge as any).label as string | undefined) ?? "";
                const next = current === "sim" ? "não" : current === "não" ? null : "sim";
                updateEdgeBranch(edge.id, next);
              }}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={["Delete", "Backspace"]}
              multiSelectionKeyCode={["Shift", "Meta", "Control"]}
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          )}
        </div>
      </div>

      <NodeConfigDrawer
        node={selectedNode?.type === "stage" ? null : selectedNode}
        messageNodes={messageNodes}
        triggerType={triggerType}
        onClose={() => setSelectedNodeId(null)}
        onSave={updateNode}
      />
    </div>
  );
}

export default function AdminCrmJourneyWhiteboard() {
  return (
    <ReactFlowProvider>
      <Inner />
    </ReactFlowProvider>
  );
}
