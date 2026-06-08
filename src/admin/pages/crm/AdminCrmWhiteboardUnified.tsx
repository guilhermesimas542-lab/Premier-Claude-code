import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Loader2, Plus, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUnifiedWhiteboard } from "@/admin/hooks/crm/useUnifiedWhiteboard";
import {
  TriggerNode, MessageNode, WaitNode, ConditionNode, TagNode, StageNode,
} from "@/admin/components/crm/whiteboard/nodes";
import { StickNoteNode } from "@/admin/components/crm/whiteboard/nodes/StickNoteNode";

const NODE_TYPES = {
  stickNote: StickNoteNode,
  trigger: TriggerNode,
  message: MessageNode,
  wait: WaitNode,
  condition: ConditionNode,
  tag: TagNode,
  stage: StageNode,
};

function absolutePosition(node: Node, all: Node[]): { x: number; y: number } {
  if (!node.parentId) return node.position;
  const parent = all.find((n) => n.id === node.parentId);
  if (!parent) return node.position;
  const pAbs = absolutePosition(parent, all);
  return { x: pAbs.x + node.position.x, y: pAbs.y + node.position.y };
}
function nodeSize(n: Node) {
  const w = (n.width ?? (n as any).measured?.width ?? (n.style as any)?.width ?? 200) as number;
  const h = (n.height ?? (n as any).measured?.height ?? (n.style as any)?.height ?? 80) as number;
  return { w, h };
}

function Inner() {
  const navigate = useNavigate();
  const {
    journeys, steps, nodes, edges, loading, setNodes, setEdges,
    createJourney, updateJourney, assignNodeToJourney, createEdge, removeEdge,
    organizeJourneys,
  } = useUnifiedWhiteboard();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [focusedJourneyId, setFocusedJourneyId] = useState<string | null>(null);

  // step.id -> journey_id (rápido pra validar conexões)
  const stepJourney = useMemo(() => {
    const m = new Map<string, string>();
    steps.forEach((s) => m.set(s.id, s.journey_id));
    return m;
  }, [steps]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    changes.forEach((c) => { if (c.type === "remove") removeEdge(c.id); });
  }, [setEdges, removeEdge]);

  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target) return;
    const sj = stepJourney.get(c.source);
    const tj = stepJourney.get(c.target);
    if (!sj || !tj) return;
    if (sj !== tj) { toast.error("Não dá pra ligar nós de jornadas diferentes"); return; }
    const branch = c.sourceHandle === "yes" ? "sim" : c.sourceHandle === "no" ? "não" : null;
    await createEdge(sj, c.source, c.target, branch);
  }, [stepJourney, createEdge]);

  // Drop detection: stage primeiro, depois stickNote da jornada
  const onNodeDragStop = useCallback(async (_e: any, dragged: Node) => {
    const all = nodes;

    // Stick note → persistir canvas.x/y
    if (dragged.type === "stickNote") {
      const journeyId = (dragged.data as any)?.journeyId as string;
      if (!journeyId) return;
      await updateJourney(journeyId, { canvas: { x: dragged.position.x, y: dragged.position.y } });
      return;
    }

    // Step node — calcula centro absoluto
    const abs = absolutePosition(dragged, all);
    const { w, h } = nodeSize(dragged);
    const cx = abs.x + w / 2;
    const cy = abs.y + h / 2;

    const isInside = (n: Node) => {
      const a = absolutePosition(n, all);
      const s = nodeSize(n);
      return cx >= a.x && cx <= a.x + s.w && cy >= a.y && cy <= a.y + s.h;
    };

    // 1) Dentro de algum stage? (que não seja o próprio nó, claro)
    const stage = all.find((n) => n.type === "stage" && n.id !== dragged.id && isInside(n));
    if (stage) {
      const stageAbs = absolutePosition(stage, all);
      const stageJourneyId = stepJourney.get(stage.id);
      if (!stageJourneyId) return;
      await assignNodeToJourney(dragged.id, {
        journeyId: stageJourneyId,
        parentStepId: stage.id,
        position: { x: abs.x - stageAbs.x, y: abs.y - stageAbs.y },
      });
      return;
    }

    // 2) Dentro de alguma região de jornada?
    const sticky = all.find((n) => n.type === "stickNote" && isInside(n));
    if (sticky) {
      const journeyId = (sticky.data as any)?.journeyId as string;
      const stickyPos = sticky.position;
      await assignNodeToJourney(dragged.id, {
        journeyId,
        parentStepId: null,
        position: { x: abs.x - stickyPos.x, y: abs.y - stickyPos.y },
      });
      return;
    }

    // 3) Fora de tudo — reverter (force refresh local)
    toast.error("Solte o nó dentro de uma jornada");
    setNodes((prev) => prev.map((n) => n.id === dragged.id ? { ...n } : n));
    // recarrega do banco pra restaurar posição original
    // (alternativa simples: refresh)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {})();
  }, [nodes, stepJourney, assignNodeToJourney, updateJourney, setNodes]);

  // Injetar handlers nos sticky notes via data
  const enhancedNodes = useMemo(() => nodes.map((n) => {
    if (n.type !== "stickNote") return n;
    return {
      ...n,
      data: {
        ...n.data,
        onChangeTitle: (jid: string, name: string) => updateJourney(jid, { name }),
        onChangeColor: (jid: string, color: string) => updateJourney(jid, { color }),
        onResize: (jid: string, w: number, h: number) => updateJourney(jid, { canvas: { w, h } }),
      },
    };
  }), [nodes, updateJourney]);

  const handleNew = useCallback(async () => {
    // posiciona no centro atual da viewport
    const center = screenToFlowPosition({ x: window.innerWidth / 2 - 500, y: window.innerHeight / 2 - 350 });
    await createJourney({ x: Math.round(center.x), y: Math.round(center.y) });
  }, [createJourney, screenToFlowPosition]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-border bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/crm")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <span className="text-sm font-bold uppercase tracking-wider">
          Whiteboard unificado · Jornadas
        </span>
        <Button size="sm" className="ml-3" onClick={handleNew}>
          <Plus className="w-4 h-4 mr-1" /> Nova jornada
        </Button>
        <Button size="sm" variant="outline" onClick={organizeJourneys}>
          <LayoutGrid className="w-4 h-4 mr-1" /> Organizar jornadas
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {journeys.length} jornada(s) · arraste nós entre regiões pra reatribuir
        </span>
      </div>
      <div className="flex-1 relative">
        <ReactFlow
          nodes={enhancedNodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          panOnScroll
          minZoom={0.1}
          maxZoom={2}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function AdminCrmWhiteboardUnified() {
  return (
    <ReactFlowProvider>
      <Inner />
    </ReactFlowProvider>
  );
}
