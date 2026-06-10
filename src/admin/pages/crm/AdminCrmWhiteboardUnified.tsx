import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { ArrowLeft, Loader2, Plus, LayoutGrid, Layers, Play, Mail, Clock, GitBranch, Tag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnifiedWhiteboard } from "@/admin/hooks/crm/useUnifiedWhiteboard";
import {
  TriggerNode, MessageNode, WaitNode, ConditionNode, TagNode, StageNode,
} from "@/admin/components/crm/whiteboard/nodes";
import { StickNoteNode } from "@/admin/components/crm/whiteboard/nodes/StickNoteNode";
import { JourneyConfigSheet } from "@/admin/components/crm/whiteboard/JourneyConfigSheet";
import { NodeConfigDrawer } from "@/admin/components/crm/whiteboard/NodeConfigDrawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NODE_TYPES = {
  stickNote: StickNoteNode,
  trigger: TriggerNode,
  message: MessageNode,
  wait: WaitNode,
  condition: ConditionNode,
  tag: TagNode,
  stage: StageNode,
};

type NodeKind = "stage" | "trigger" | "message" | "wait" | "condition" | "tag";
const ADD_PALETTE: { type: NodeKind; label: string; icon: React.ElementType }[] = [
  { type: "stage", label: "Etapa", icon: Layers },
  { type: "trigger", label: "Gatilho", icon: Play },
  { type: "message", label: "Mensagem", icon: Mail },
  { type: "wait", label: "Esperar", icon: Clock },
  { type: "condition", label: "Condição", icon: GitBranch },
  { type: "tag", label: "Marcar usuário", icon: Tag },
];

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
    createJourney, updateJourney, deleteJourney, assignNodeToJourney, createEdge, removeEdge,
    organizeJourneys, insertStep, updateStep, deleteStep,
  } = useUnifiedWhiteboard();
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [searchParams, setSearchParams] = useSearchParams();
  const [focusedJourneyId, setFocusedJourneyId] = useState<string | null>(null);
  const [configJourneyId, setConfigJourneyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedStickyJourneyId, setSelectedStickyJourneyId] = useState<string | null>(null);

  // Aplica ?focus=<journeyId> uma vez quando os dados carregam
  useEffect(() => {
    if (loading) return;
    const f = searchParams.get("focus");
    if (f && journeys.some((j) => j.id === f)) {
      setFocusedJourneyId(f);
      setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete("focus"); return n; }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // step.id -> journey_id (rápido pra validar conexões)
  const stepJourney = useMemo(() => {
    const m = new Map<string, string>();
    steps.forEach((s) => m.set(s.id, s.journey_id));
    return m;
  }, [steps]);

  // Layout real de cada jornada, mesmo quando o sticky note está oculto.
  const journeyLayouts = useMemo(() => {
    return journeys.map((j, i) => {
      const c = j.canvas ?? {};
      return {
        id: j.id,
        x: typeof c.x === "number" ? c.x : i * 1200,
        y: typeof c.y === "number" ? c.y : 0,
        w: typeof c.w === "number" ? c.w : 1000,
        h: typeof c.h === "number" ? c.h : 700,
        showSticky: (c as any).showSticky !== false,
      };
    });
  }, [journeys]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      const sel = next.find((n) => n.type === "stickNote" && n.selected);
      setSelectedStickyJourneyId(sel ? ((sel.data as any)?.journeyId ?? null) : null);
      return next;
    });
    // Persistir exclusões (tecla Delete/Backspace) — ignora stickNote/stage para evitar acidente
    changes.forEach((c) => {
      if (c.type !== "remove") return;
      const n = nodes.find((x) => x.id === c.id);
      if (!n) return;
      if (n.type === "stickNote" || n.type === "stage" || n.type === "trigger") return;
      deleteStep(c.id);
    });
  }, [setNodes, nodes, deleteStep]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    changes.forEach((c) => { if (c.type === "remove") removeEdge(c.id); });
  }, [setEdges, removeEdge]);

  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target) return;
    const sj = stepJourney.get(c.source);
    if (!sj) return;
    const branch = c.sourceHandle === "yes" ? "sim" : c.sourceHandle === "no" ? "não" : null;
    // Liberdade total: permite ligar nós de jornadas diferentes.
    // A edge é persistida com journey_id da jornada do nó de origem.
    await createEdge(sj, c.source, c.target, branch);
  }, [stepJourney, createEdge]);

  // Drop detection: stage primeiro; fora de tudo fica livre no canvas
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

    // 2) Dentro de alguma região visual de jornada?
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

    // 3) Fora de tudo — mantém livre no canvas, sem exigir sticky note/jornada visual.
    const currentJourneyId = stepJourney.get(dragged.id);
    if (!currentJourneyId) return;
    const layout = journeyLayouts.find((l) => l.id === currentJourneyId);
    await assignNodeToJourney(dragged.id, {
      journeyId: currentJourneyId,
      parentStepId: null,
      position: {
        x: Math.round(abs.x - (layout?.x ?? 0)),
        y: Math.round(abs.y - (layout?.y ?? 0)),
      },
    });
  }, [nodes, stepJourney, assignNodeToJourney, updateJourney, journeyLayouts]);

  // Injetar handlers nos sticky notes via data + aplicar isolamento por foco
  const enhancedNodes = useMemo(() => nodes.map((n) => {
    const journeyOfNode = n.type === "stickNote"
      ? (n.data as any)?.journeyId
      : stepJourney.get(n.id);
    const hidden = focusedJourneyId != null && journeyOfNode !== focusedJourneyId;
    if (n.type === "stage") {
      const currentCfg = (n.data as any)?.config ?? {};
      return {
        ...n,
        hidden,
        data: {
          ...n.data,
          onChangeTitle: (id: string, title: string) =>
            updateStep(id, { config: { ...currentCfg, title } } as any),
          onChangeColor: (id: string, color: string) =>
            updateStep(id, { config: { ...currentCfg, color } } as any),
          onResize: (id: string, w: number, h: number) =>
            updateStep(id, { config: { ...currentCfg, width: w, height: h } } as any),
        },
      };
    }
    if (n.type !== "stickNote") return { ...n, hidden };
    return {
      ...n,
      hidden,
      data: {
        ...n.data,
        onChangeTitle: (jid: string, name: string) => updateJourney(jid, { name }),
        onChangeColor: (jid: string, color: string) => updateJourney(jid, { color }),
        onResize: (jid: string, w: number, h: number) => updateJourney(jid, { canvas: { w, h } }),
        onFocus: (jid: string) => setFocusedJourneyId(jid),
        onOpenConfig: (jid: string) => setConfigJourneyId(jid),
        onDelete: (jid: string, name: string) => setDeleteTarget({ id: jid, name }),
      },
    };
  }), [nodes, updateJourney, updateStep, focusedJourneyId, stepJourney]);

  // Edges: esconder as que tocam um nó escondido
  const visibleEdges = useMemo(() => {
    if (focusedJourneyId == null) return edges;
    const visibleIds = new Set(enhancedNodes.filter((n) => !n.hidden).map((n) => n.id));
    return edges.map((e) => ({
      ...e,
      hidden: !(visibleIds.has(e.source) && visibleIds.has(e.target)),
    }));
  }, [edges, enhancedNodes, focusedJourneyId]);

  // fitView quando o foco muda
  useEffect(() => {
    const t = setTimeout(() => {
      if (focusedJourneyId == null) {
        fitView({ duration: 400, padding: 0.1 });
      } else {
        const ids = enhancedNodes.filter((n) => !n.hidden).map((n) => ({ id: n.id }));
        if (ids.length) fitView({ nodes: ids, duration: 400, padding: 0.2 });
      }
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedJourneyId]);

  const handleNew = useCallback(async () => {
    // posiciona no centro atual da viewport
    const center = screenToFlowPosition({ x: window.innerWidth / 2 - 500, y: window.innerHeight / 2 - 350 });
    await createJourney({ x: Math.round(center.x), y: Math.round(center.y) });
  }, [createJourney, screenToFlowPosition]);

  const findContainingJourney = useCallback((px: number, py: number) => {
    return journeyLayouts.find((l) => l.showSticky && px >= l.x && px <= l.x + l.w && py >= l.y && py <= l.y + l.h) ?? null;
  }, [journeyLayouts]);

  const handleAddNode = useCallback(async (type: NodeKind) => {
    let targetJourneyId: string | null = focusedJourneyId ?? selectedStickyJourneyId ?? null;
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    if (!targetJourneyId) {
      const hit = findContainingJourney(center.x, center.y);
      if (hit) {
        targetJourneyId = hit.id;
      } else {
        targetJourneyId = await createJourney({
          x: Math.round(center.x - 500),
          y: Math.round(center.y - 350),
          showSticky: false,
        });
        if (!targetJourneyId) return;
        setSelectedStickyJourneyId(targetJourneyId);
      }
    }

    const layout = journeyLayouts.find((l) => l.id === targetJourneyId);
    const baseX = layout?.x ?? center.x - 500;
    const baseY = layout?.y ?? center.y - 350;
    const layoutW = layout?.w ?? 1000;
    const layoutH = layout?.h ?? 700;
    const inside = layout
      ? center.x >= layout.x && center.x <= layout.x + layout.w
        && center.y >= layout.y && center.y <= layout.y + layout.h
      : true;
    const absX = inside ? center.x : baseX + layoutW / 2;
    const absY = inside ? center.y : baseY + layoutH / 2;
    const position = {
      x: Math.max(24, Math.round(absX - baseX - 110)),
      y: Math.max(48, Math.round(absY - baseY - 40)),
    };

    await insertStep({ type, journeyId: targetJourneyId, parentStepId: null, position });
  }, [focusedJourneyId, selectedStickyJourneyId, screenToFlowPosition, findContainingJourney, journeyLayouts, insertStep, createJourney]);


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
          Whiteboard · Jornadas
        </span>

        {/* Toggle entre os 2 whiteboards */}
        <div className="ml-3 flex rounded-md border border-border overflow-hidden">
          <Button size="sm" className="rounded-none h-8">
            <GitBranch className="w-4 h-4 mr-1" /> Jornadas
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none h-8"
            onClick={() => navigate("/admin/crm/whiteboard/schedules")}
          >
            <Send className="w-4 h-4 mr-1" /> Schedules
          </Button>
        </div>

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
      <div className="flex-1 relative flex min-h-0">
        {/* Palette + Legenda */}
        <aside className="w-56 border-r border-border bg-background/95 overflow-y-auto shrink-0">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Adicionar nó
          </div>
          <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
            {ADD_PALETTE.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-crm-node", p.type);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => handleAddNode(p.type)}
                  className="cursor-grab active:cursor-grabbing border border-border rounded-md px-2 py-2 flex flex-col items-center gap-1 text-[11px] hover:bg-muted/50 hover:border-primary/40 select-none"
                  title={`Arraste pro canvas ou clique pra adicionar ${p.label}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-center leading-tight">{p.label}</span>
                </div>
              );
            })}
          </div>
          <div className="px-3 pt-1 pb-1 text-[10px] text-muted-foreground">
            {focusedJourneyId
              ? "→ na jornada focada"
              : selectedStickyJourneyId
                ? "→ na jornada selecionada"
                : "→ livre no canvas"}
          </div>
          <div className="border-t border-border my-1" />
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Legenda (jornadas)
          </div>
          <button
            onClick={() => setFocusedJourneyId(null)}
            className={`w-full text-left px-3 py-2 text-sm border-l-2 hover:bg-muted/40 ${
              focusedJourneyId == null ? "border-primary bg-muted/30 font-semibold" : "border-transparent"
            }`}
          >
            Ver todas
          </button>
          <div className="border-t border-border my-1" />
          {journeys.map((j, i) => {
            const color = j.color ?? "#888";
            const active = focusedJourneyId === j.id;
            return (
              <button
                key={j.id}
                onClick={() => setFocusedJourneyId(j.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-l-2 hover:bg-muted/40 ${
                  active ? "border-primary bg-muted/30 font-semibold" : "border-transparent"
                }`}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="truncate">{j.name || "Sem nome"}</span>
              </button>
            );
          })}
        </aside>

        <div
          className="flex-1 relative"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/x-crm-node")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={async (e) => {
            const type = e.dataTransfer.getData("application/x-crm-node") as NodeKind;
            if (!type) return;
            e.preventDefault();
            const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            const hit = findContainingJourney(pos.x, pos.y);
            let targetJourneyId = hit?.id ?? focusedJourneyId ?? selectedStickyJourneyId ?? null;
            if (!targetJourneyId) {
              targetJourneyId = await createJourney({
                x: Math.round(pos.x - 500),
                y: Math.round(pos.y - 350),
                showSticky: false,
              });
              if (!targetJourneyId) return;
              setSelectedStickyJourneyId(targetJourneyId);
            }
            const layout = journeyLayouts.find((l) => l.id === targetJourneyId);
            const baseX = layout?.x ?? pos.x - 500;
            const baseY = layout?.y ?? pos.y - 350;
            const position = {
              x: Math.max(24, Math.round(pos.x - baseX - 110)),
              y: Math.max(48, Math.round(pos.y - baseY - 40)),
            };
            await insertStep({ type, journeyId: targetJourneyId, parentStepId: null, position });
          }}
        >
          <ReactFlow
            nodes={enhancedNodes}
            edges={visibleEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_e, n) => {
              if (n.type === "stickNote" || n.type === "stage") return;
              setEditingNodeId(n.id);
            }}
            onNodeDoubleClick={(_e, n) => {
              if (n.type === "stickNote") {
                const jid = (n.data as any)?.journeyId;
                if (jid) setFocusedJourneyId(jid);
              }
            }}
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

      <JourneyConfigSheet
        journey={journeys.find((j) => j.id === configJourneyId) ?? null}
        open={configJourneyId != null}
        onOpenChange={(v) => { if (!v) setConfigJourneyId(null); }}
        onSave={async (jid, fields) => { await updateJourney(jid, fields); }}
      />

      <NodeConfigDrawer
        node={editingNodeId ? (enhancedNodes.find((n) => n.id === editingNodeId) as any ?? null) : null}
        messageNodes={enhancedNodes.filter((n) => n.type === "message") as any}
        triggerType={(() => {
          const n = enhancedNodes.find((x) => x.id === editingNodeId);
          if (!n) return null;
          const jid = stepJourney.get(n.id);
          return journeys.find((j) => j.id === jid)?.trigger_type ?? null;
        })()}
        onClose={() => setEditingNodeId(null)}
        onSave={async (id, fields) => { await updateStep(id, fields as any); }}
        onDelete={async (id) => { await deleteStep(id); }}
      />


      <AlertDialog open={deleteTarget != null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a jornada "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga a jornada e TODOS os nós, conexões e inscrições dela. Não dá pra desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                const id = deleteTarget.id;
                setDeleteTarget(null);
                if (focusedJourneyId === id) setFocusedJourneyId(null);
                await deleteJourney(id);
              }}
            >
              Excluir jornada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
