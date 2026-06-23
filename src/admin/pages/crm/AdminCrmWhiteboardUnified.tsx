import { useCallback, useMemo, useState, useEffect, useRef } from "react";
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
import { ArrowLeft, Loader2, Plus, LayoutGrid, Layers, Play, Mail, Clock, GitBranch, Tag, Send, Scissors, Copy, Trash2, Hand, BoxSelect, MousePointer2, ChevronRight, ChevronLeft, GripVertical, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useUnifiedWhiteboard } from "@/admin/hooks/crm/useUnifiedWhiteboard";
import {
  TriggerNode, MessageNode, WaitNode, ConditionNode, TagNode, StageNode,
} from "@/admin/components/crm/whiteboard/nodes";
import { StickNoteNode } from "@/admin/components/crm/whiteboard/nodes/StickNoteNode";
import { DeletableEdge } from "@/admin/components/crm/whiteboard/edges/DeletableEdge";
import { JourneyConfigSheet } from "@/admin/components/crm/whiteboard/JourneyConfigSheet";
import { NodeConfigDrawer } from "@/admin/components/crm/whiteboard/NodeConfigDrawer";
import { useWhiteboardShortcuts } from "@/admin/hooks/crm/useWhiteboardShortcuts";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Interseção segmento × segmento (algoritmo CCW clássico)
function segmentsIntersect(
  a: { x: number; y: number }, b: { x: number; y: number },
  c: { x: number; y: number }, d: { x: number; y: number },
): boolean {
  const ccw = (p: any, q: any, r: any) =>
    (r.y - p.y) * (q.x - p.x) > (q.y - p.y) * (r.x - p.x);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

function pointToSegmentDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const NODE_TYPES = {
  stickNote: StickNoteNode,
  trigger: TriggerNode,
  message: MessageNode,
  wait: WaitNode,
  condition: ConditionNode,
  tag: TagNode,
  stage: StageNode,
};

const EDGE_TYPES = {
  deletable: DeletableEdge,
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

// ============== Lista LEGENDA com drag-and-drop pra reordenar ==============
function JourneyLegendList(props: {
  journeys: { id: string; name: string; color: string | null }[];
  focusedJourneyId: string | null;
  onFocus: (id: string | null) => void;
  onReorder: (orderedIds: string[]) => Promise<void> | void;
  onDuplicate: (id: string) => Promise<void> | void;
  onDelete: (id: string, name: string) => void;
}) {
  const { journeys, focusedJourneyId, onFocus, onReorder, onDuplicate, onDelete } = props;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids = journeys.map((j) => j.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) { setDragId(null); setOverId(null); return; }
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null); setOverId(null);
    await onReorder(ids);
  };

  return (
    <>
      {journeys.map((j) => {
        const color = j.color ?? "#888";
        const active = focusedJourneyId === j.id;
        const isOver = overId === j.id && dragId && dragId !== j.id;
        return (
          <div
            key={j.id}
            draggable
            onDragStart={(e) => { setDragId(j.id); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overId !== j.id) setOverId(j.id); }}
            onDragLeave={() => { if (overId === j.id) setOverId(null); }}
            onDrop={(e) => { e.preventDefault(); void handleDrop(j.id); }}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            className={`w-full flex items-center gap-1 border-l-2 hover:bg-muted/40 ${
              active ? "border-primary bg-muted/30 font-semibold" : "border-transparent"
            } ${isOver ? "outline outline-1 outline-primary" : ""} ${dragId === j.id ? "opacity-50" : ""}`}
          >
            <span className="pl-2 text-muted-foreground cursor-grab active:cursor-grabbing" title="Arraste para reordenar">
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <button
              type="button"
              onClick={() => onFocus(j.id)}
              className="flex-1 text-left pr-3 py-2 text-sm flex items-center gap-2 min-w-0"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
              <span className="truncate">{j.name || "Sem nome"}</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="mr-1 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Menu da jornada"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void onDuplicate(j.id)}>
                  <Copy className="w-4 h-4 mr-2" /> Duplicar jornada
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(j.id, j.name || "Sem nome")}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir jornada
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </>
  );
}



function Inner() {
  const navigate = useNavigate();
  const {
    journeys, steps, edgeRows, nodes, edges, loading, setNodes, setEdges, refresh,
    createJourney, updateJourney, deleteJourney, assignNodeToJourney, createEdge, removeEdge,
    organizeJourneys, reorderJourneys, insertStep, updateStep, deleteStep,
    updateStepPosition, restoreStep, restoreEdge,
  } = useUnifiedWhiteboard();


  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [searchParams, setSearchParams] = useSearchParams();
  const [focusedJourneyId, setFocusedJourneyId] = useState<string | null>(null);
  const [configJourneyId, setConfigJourneyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedStickyJourneyId, setSelectedStickyJourneyId] = useState<string | null>(null);

  // === Ferramenta ativa da toolbar ===
  type ToolKind = "select" | "pan" | "cut";
  const [activeTool, setActiveTool] = useState<ToolKind>("select");
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const isPanMode = activeTool === "pan";
  const cutMode = activeTool === "cut";

  const [cutLine, setCutLine] = useState<{
    sx: number; sy: number; ex: number; ey: number; // tela (relativo ao container)
    fsx: number; fsy: number; fex: number; fey: number; // flow
  } | null>(null);
  const [cutDragging, setCutDragging] = useState(false);


  // === Menu de contexto na jornada (sticky) ===
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; journeyId: string } | null>(null);

  // === ALT + arrastar = DUPLICAR (estilo Figma) ===
  const altHeldRef = useRef(false);
  const dupRef = useRef<{ origId: string; origPos: { x: number; y: number }; type: string; journeyId: string | null } | null>(null);
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.key === "Alt") altHeldRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key === "Alt") altHeldRef.current = false; };
    const blur = () => { altHeldRef.current = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);


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

  // ====== Undo (pilha de ações) — hoisted antes dos handlers ======
  const historyRef = useRef<any[]>([]);
  const HISTORY_MAX = 50;
  const pushUndo = useCallback((entry: any) => {
    historyRef.current.push(entry);
    if (historyRef.current.length > HISTORY_MAX) historyRef.current.shift();
  }, []);
  const replaceLastUndo = useCallback((entry: any) => {
    if (historyRef.current.length) historyRef.current.pop();
    historyRef.current.push(entry);
    if (historyRef.current.length > HISTORY_MAX) historyRef.current.shift();
  }, []);


  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      const sel = next.find((n) => n.type === "stickNote" && n.selected);
      setSelectedStickyJourneyId(sel ? ((sel.data as any)?.journeyId ?? null) : null);
      return next;
    });
    // Persistir exclusões (tecla Delete/Backspace) — ignora só stickNote/trigger para evitar acidente
    changes.forEach((c) => {
      if (c.type !== "remove") return;
      const n = nodes.find((x) => x.id === c.id);
      if (!n) return;
      if (n.type === "stickNote" || n.type === "trigger") return;
      // push undo: captura step + edges relacionadas
      const step = steps.find((s) => s.id === c.id);
      const relEdges = edgeRows.filter((e) => e.source_step_id === c.id || e.target_step_id === c.id);
      if (step) pushUndo({ kind: "deleteNode", step, edges: relEdges });
      deleteStep(c.id);
    });
  }, [setNodes, nodes, deleteStep, steps, edgeRows, pushUndo]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // HARDENING: bloqueia QUALQUER remoção de edge via React Flow
    // (Delete/Backspace, seleção, internals). Edges só podem ser apagadas
    // pelo clique explícito em cutSingleEdge.
    const safe = changes.filter((c) => c.type !== "remove");
    setEdges((eds) => applyEdgeChanges(safe, eds));
  }, [setEdges]);

  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target) return;
    const sj = stepJourney.get(c.source);
    if (!sj) return;
    const branch = c.sourceHandle === "yes" ? "sim" : c.sourceHandle === "no" ? "não" : null;
    await createEdge(sj, c.source, c.target, branch);
    // Sem undo de addEdge — undo nunca pode chamar removeEdge.
  }, [stepJourney, createEdge]);


  // Drop detection: stage primeiro; fora de tudo fica livre no canvas
  const onNodeDragStop = useCallback(async (_e: any, dragged: Node) => {
    const all = nodes;

    // === ALT+drag = DUPLICAR ===
    if (dupRef.current && dupRef.current.origId === dragged.id) {
      const dup = dupRef.current;
      dupRef.current = null;
      const finalPos = { x: Math.round(dragged.position.x), y: Math.round(dragged.position.y) };
      // Restaura o original visualmente na origem (não persistimos nada no banco para ele)
      setNodes((nds) => nds.map((n) => n.id === dup.origId ? { ...n, position: { ...dup.origPos } } : n));

      if (dragged.type === "stickNote") {
        if (!dup.journeyId) return;
        const { data, error } = await (supabase as any).rpc("crm_clone_journey", { p_journey_id: dup.journeyId });
        if (error) { toast.error(`Erro ao duplicar jornada: ${error.message}`); return; }
        const newId = data as string;
        if (newId) {
          await updateJourney(newId, { canvas: { x: finalPos.x, y: finalPos.y } });
        }
        await refresh();
        toast.success("Jornada duplicada");
        return;
      }

      // Step node — copiar campos e inserir novo na mesma jornada/parent
      const orig = steps.find((s) => s.id === dup.origId);
      if (!orig) return;
      const newId = await insertStep({
        type: orig.node_type as any,
        journeyId: orig.journey_id,
        parentStepId: orig.parent_step_id ?? null,
        position: finalPos,
        config: orig.config || {},
        allowStageCreation: orig.node_type === "stage" ? true : undefined,
      });
      if (newId) {
        await updateStep(newId, {
          channel: orig.channel,
          content: orig.content,
          config: orig.config,
          delay_value: orig.delay_value,
          delay_unit: orig.delay_unit,
        });
        pushUndo({ kind: "addNode", id: newId });
      }
      return;
    }

    // Stick note → persistir canvas.x/y
    if (dragged.type === "stickNote") {

      const journeyId = (dragged.data as any)?.journeyId as string;
      if (!journeyId) return;
      await updateJourney(journeyId, { canvas: { x: dragged.position.x, y: dragged.position.y } });
      return;
    }

    // Captura prev journey/parent ANTES da reatribuição — pra eventual reassign-undo
    const prevStep = steps.find((s) => s.id === dragged.id);
    const prevJourneyId = prevStep?.journey_id ?? null;
    const prevParentStepId = prevStep?.parent_step_id ?? null;
    // pega prevPosition do último 'move' empilhado no dragStart
    const top = historyRef.current[historyRef.current.length - 1];
    const prevPosition = (top && top.kind === "move" && top.id === dragged.id)
      ? top.prevPosition
      : (prevStep?.position ?? dragged.position);

    const maybeUpgradeUndo = (newJourneyId: string, newParentStepId: string | null) => {
      const reassigned = prevJourneyId && (prevJourneyId !== newJourneyId || prevParentStepId !== newParentStepId);
      if (reassigned) {
        replaceLastUndo({
          kind: "reassign",
          id: dragged.id,
          prevJourneyId,
          prevParentStepId,
          prevPosition,
        });
      }
    };

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
      maybeUpgradeUndo(stageJourneyId, stage.id);
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
      maybeUpgradeUndo(journeyId, null);
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
    maybeUpgradeUndo(currentJourneyId, null);
  }, [nodes, stepJourney, assignNodeToJourney, updateJourney, journeyLayouts, steps, replaceLastUndo, setNodes, refresh, insertStep, updateStep, pushUndo]);


  // ============== Histórico / Undo — PILHA DE AÇÕES (Ctrl+Z) ==============
  // Cada ação do usuário empilha UM UndoEntry com o estado ANTERIOR só do que
  // mudou. Ctrl+Z pega o último e aplica o inverso, patcheando APENAS o item
  // afetado. NUNCA faz refetch geral.
  type StepSnap = {
    id: string;
    journey_id: string;
    node_type: any;
    position: { x: number; y: number } | null;
    channel: any;
    content: any;
    config: any;
    delay_value: any;
    delay_unit: any;
    parent_step_id: string | null;
  };
  type EdgeSnap = {
    id: string;
    journey_id: string;
    source_step_id: string;
    target_step_id: string;
    branch: string | null;
    condition: any;
  };
  type UndoEntry =
    | { kind: "move"; id: string; prevPosition: { x: number; y: number } }
    | { kind: "addNode"; id: string }
    | { kind: "deleteNode"; step: StepSnap; edges: EdgeSnap[] }
    | { kind: "addEdge"; id: string }
    | { kind: "deleteEdge"; edge: EdgeSnap }
    | { kind: "editContent"; id: string; prevContent: any; prevChannel: any; prevConfig: any; prevDelayValue: any; prevDelayUnit: any }
    | { kind: "reassign"; id: string; prevJourneyId: string; prevParentStepId: string | null; prevPosition: { x: number; y: number } };
  // historyRef/pushUndo/replaceLastUndo já foram declarados acima (hoist).

  // Atalho Ctrl+Z (undo). O hook não controla mais pan.
  useWhiteboardShortcuts<null>({ onUndo: async () => {} });


  const undo = useCallback(async () => {
    const entry = historyRef.current.pop();
    if (!entry) return;
    switch (entry.kind) {
      case "move": {
        setNodes((nds) => nds.map((n) => n.id === entry.id ? { ...n, position: { ...entry.prevPosition } } : n));
        await updateStepPosition(entry.id, entry.prevPosition);
        break;
      }
      case "addNode": {
        setNodes((nds) => nds.filter((n) => n.id !== entry.id));
        setEdges((eds) => eds.filter((e) => e.source !== entry.id && e.target !== entry.id));
        await deleteStep(entry.id);
        break;
      }
      case "deleteNode": {
        await restoreStep(entry.step as any);
        for (const er of entry.edges) await restoreEdge(er as any);
        break;
      }
      case "addEdge": {
        // HARDENING: undo nunca remove edges. Mantemos o case por compat
        // com entradas antigas, mas é no-op.
        break;
      }
      case "deleteEdge": {
        await restoreEdge(entry.edge as any);
        break;
      }
      case "editContent": {
        setNodes((nds) => nds.map((n) => n.id === entry.id ? ({
          ...n,
          data: {
            ...n.data,
            content: entry.prevContent,
            channel: entry.prevChannel,
            config: entry.prevConfig,
            delay_value: entry.prevDelayValue,
            delay_unit: entry.prevDelayUnit,
          },
        }) : n));
        await updateStep(entry.id, {
          content: entry.prevContent,
          channel: entry.prevChannel,
          config: entry.prevConfig,
          delay_value: entry.prevDelayValue,
          delay_unit: entry.prevDelayUnit,
        });
        break;
      }
      case "reassign": {
        setNodes((nds) => nds.map((n) => n.id === entry.id ? { ...n, position: { ...entry.prevPosition } } : n));
        await assignNodeToJourney(entry.id, {
          journeyId: entry.prevJourneyId,
          parentStepId: entry.prevParentStepId,
          position: entry.prevPosition,
        });
        break;
      }
    }
    toast.success("Desfeito");
  }, [setNodes, setEdges, updateStepPosition, deleteStep, restoreStep, restoreEdge, removeEdge, updateStep, assignNodeToJourney]);

  // Ctrl+Z global pro whiteboard. preventDefault no canvas.
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const t = el.tagName;
      return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        void undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const onNodeDragStart = useCallback((e: any, node: Node) => {
    const alt = (e?.altKey ?? false) || altHeldRef.current;
    if (alt) {
      const jid = node.type === "stickNote"
        ? ((node.data as any)?.journeyId ?? null)
        : (stepJourney.get(node.id) ?? null);
      dupRef.current = {
        origId: node.id,
        origPos: { x: node.position.x, y: node.position.y },
        type: node.type || "",
        journeyId: jid,
      };
      return; // não empilha "move" — vamos restaurar o original
    }
    if (node.type === "stickNote") return;
    pushUndo({ kind: "move", id: node.id, prevPosition: { x: node.position.x, y: node.position.y } });
  }, [pushUndo, stepJourney]);


  // Wrappers que registram undo ANTES de executar a ação =====================

  const addNodeWithUndo = useCallback(async (opts: Parameters<typeof insertStep>[0]) => {
    const id = await insertStep(opts);
    if (id) pushUndo({ kind: "addNode", id });
    return id;
  }, [insertStep, pushUndo]);

  const deleteStepWithUndo = useCallback(async (stepId: string) => {
    const step = steps.find((s) => s.id === stepId);
    const relEdges = edgeRows.filter((e) => e.source_step_id === stepId || e.target_step_id === stepId);
    if (step) pushUndo({ kind: "deleteNode", step: step as any, edges: relEdges as any });
    await deleteStep(stepId);
  }, [steps, edgeRows, deleteStep, pushUndo]);

  const removeEdgeWithUndo = useCallback(async (edgeId: string) => {
    const er = edgeRows.find((e) => e.id === edgeId);
    if (er) pushUndo({ kind: "deleteEdge", edge: er as any });
    await removeEdge(edgeId);
  }, [edgeRows, removeEdge, pushUndo]);

  const updateStepWithUndo = useCallback(async (stepId: string, fields: any) => {
    const prev = steps.find((s) => s.id === stepId);
    if (prev) {
      pushUndo({
        kind: "editContent",
        id: stepId,
        prevContent: prev.content,
        prevChannel: prev.channel,
        prevConfig: prev.config,
        prevDelayValue: prev.delay_value,
        prevDelayUnit: prev.delay_unit,
      });
    }
    await updateStep(stepId, fields);
  }, [steps, updateStep, pushUndo]);




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
    const jid = (n.data as any)?.journeyId;
    const journeyRow = journeys.find((j) => j.id === jid);
    const canvas = (journeyRow?.canvas ?? {}) as any;
    const locked = canvas?.locked === true;
    return {
      ...n,
      hidden,
      draggable: !locked,
      data: {
        ...n.data,
        locked,
        onChangeTitle: (jid: string, name: string) => updateJourney(jid, { name }),
        onChangeColor: (jid: string, color: string) => updateJourney(jid, { color }),
        onResize: (jid: string, w: number, h: number) => updateJourney(jid, { canvas: { w, h } }),
        onFocus: (jid: string) => setFocusedJourneyId(jid),
        onOpenConfig: (jid: string) => setConfigJourneyId(jid),
        onDelete: (jid: string, name: string) => setDeleteTarget({ id: jid, name }),
        onToggleLock: (jid: string, val: boolean) => {
          const jr = journeys.find((j) => j.id === jid);
          const cv = (jr?.canvas ?? {}) as any;
          updateJourney(jid, { canvas: { ...cv, locked: val } });
        },
      },
    };
  }), [nodes, updateJourney, updateStep, focusedJourneyId, stepJourney, journeys]);


  const cutSingleEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    void removeEdgeWithUndo(edgeId);
    toast.success("Conexão removida", {
      action: { label: "Desfazer", onClick: () => undo() },
    });
  }, [setEdges, removeEdgeWithUndo, undo]);

  // Edges: esconder as que tocam um nó escondido; todas viram "deletable" pra
  // ganhar botão "x" no hover e suportar Delete/Backspace.
  const visibleEdges = useMemo(() => {
    const visibleIds = focusedJourneyId == null
      ? null
      : new Set(enhancedNodes.filter((n) => !n.hidden).map((n) => n.id));
    return edges.map((e) => ({
      ...e,
      type: "deletable" as const,
      deletable: true,
      focusable: true,
      data: { ...(e.data ?? {}), cutMode, onCutEdge: cutSingleEdge },
      hidden: visibleIds ? !(visibleIds.has(e.source) && visibleIds.has(e.target)) : false,
    }));
  }, [edges, enhancedNodes, focusedJourneyId, cutMode, cutSingleEdge]);

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

  // Centro absoluto de um nó (usado pra calcular extremos da edge)
  const nodeCenter = useCallback((id: string): { x: number; y: number } | null => {
    const n = enhancedNodes.find((x) => x.id === id);
    if (!n) return null;
    const abs = absolutePosition(n, enhancedNodes);
    const { w, h } = nodeSize(n);
    return { x: abs.x + w / 2, y: abs.y + h / 2 };
  }, [enhancedNodes]);

  const findEdgeNearPoint = useCallback((p: { x: number; y: number }) => {
    let best: { id: string; distance: number } | null = null;
    visibleEdges.forEach((edge) => {
      if (edge.hidden) return;
      const source = nodeCenter(edge.source);
      const target = nodeCenter(edge.target);
      if (!source || !target) return;
      const distance = pointToSegmentDistance(p, source, target);
      if (distance <= 36 && (!best || distance < best.distance)) best = { id: edge.id, distance };
    });
    return best?.id ?? null;
  }, [nodeCenter, visibleEdges]);

  const cutEdgesCrossingLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ids = visibleEdges
      .filter((edge) => {
        if (edge.hidden) return false;
        const source = nodeCenter(edge.source);
        const target = nodeCenter(edge.target);
        return !!source && !!target && segmentsIntersect(from, to, source, target);
      })
      .map((edge) => edge.id);
    if (ids.length === 0) return false;
    ids.forEach((id) => cutSingleEdge(id));
    return true;
  }, [cutSingleEdge, nodeCenter, visibleEdges]);


  // Atalhos: H=mão (pan), C=seleção, Ctrl+A=selecionar tudo, Esc=cancelar.
  // HARDENING: tesoura NÃO tem atalho de teclado — só via botão da toolbar.
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const t = el.tagName;
      return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && (e.key === "a" || e.key === "A") && !e.shiftKey) {
        e.preventDefault();
        setNodes((nds) => nds.map((n) => {
          if (n.type === "stickNote" && (n.data as any)?.locked === true) return n;
          return { ...n, selected: true };
        }));
      } else if (!meta && !e.altKey && !e.shiftKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        setActiveTool((t) => (t === "pan" ? "select" : "pan"));
      } else if (!meta && !e.altKey && !e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setActiveTool("select");
        setCutLine(null);
        setCutDragging(false);
      } else if (e.key === "Escape") {
        if (cutMode) { setActiveTool("select"); setCutLine(null); setCutDragging(false); }
        if (ctxMenu) setCtxMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cutMode, ctxMenu, setNodes]);



  // Fecha menu de contexto ao clicar em qualquer lugar
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [ctxMenu]);



  const handleNew = useCallback(async () => {
    // posiciona no centro atual da viewport
    const center = screenToFlowPosition({ x: window.innerWidth / 2 - 500, y: window.innerHeight / 2 - 350 });
    await createJourney({ x: Math.round(center.x), y: Math.round(center.y) });
  }, [createJourney, screenToFlowPosition]);

  const handleDuplicateJourney = useCallback(async (journeyId: string) => {
    const { data, error } = await (supabase as any).rpc("crm_clone_journey", { p_journey_id: journeyId });
    if (error) { toast.error(`Erro ao duplicar jornada: ${error.message}`); return; }
    toast.success("Jornada duplicada");
    await refresh();
    if (data) setFocusedJourneyId(data as string);
  }, [refresh]);

  const findContainingJourney = useCallback((px: number, py: number) => {
    return journeyLayouts.find((l) => l.showSticky && px >= l.x && px <= l.x + l.w && py >= l.y && py <= l.y + l.h) ?? null;
  }, [journeyLayouts]);

  const handleAddNode = useCallback(async (type: NodeKind, opts?: { allowStageCreation?: boolean }) => {
    if (type === "stage" && opts?.allowStageCreation !== true) return;

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

    await addNodeWithUndo({
      type,
      journeyId: targetJourneyId,
      parentStepId: null,
      position,
      allowStageCreation: opts?.allowStageCreation === true,
    });
  }, [focusedJourneyId, selectedStickyJourneyId, screenToFlowPosition, findContainingJourney, journeyLayouts, addNodeWithUndo, createJourney]);



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
              const isStage = p.type === "stage";
              return (
                <div
                  key={p.type}
                  draggable={!isStage}
                  onDragStart={(e) => {
                    if (isStage) { e.preventDefault(); return; }
                    e.dataTransfer.setData("application/x-crm-node", p.type);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => handleAddNode(p.type, isStage ? { allowStageCreation: true } : undefined)}
                  className={`${isStage ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} border border-border rounded-md px-2 py-2 flex flex-col items-center gap-1 text-[11px] hover:bg-muted/50 hover:border-primary/40 select-none`}
                  title={isStage ? "Clique pra adicionar Etapa" : `Arraste pro canvas ou clique pra adicionar ${p.label}`}
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
          <JourneyLegendList
            journeys={journeys}
            focusedJourneyId={focusedJourneyId}
            onFocus={setFocusedJourneyId}
            onReorder={reorderJourneys}
            onDuplicate={handleDuplicateJourney}
            onDelete={(id, name) => setDeleteTarget({ id, name })}
          />

        </aside>

        <div
          className="flex-1 relative"
          style={{ cursor: cutMode ? "crosshair" : (isPanMode ? "grab" : undefined) }}
          onPointerDown={(e) => {
            if (!cutMode || e.button !== 0) return;
            const target = e.target as HTMLElement;
            if (target.closest("button,[role='button'],input,textarea,select")) return;
            const bounds = e.currentTarget.getBoundingClientRect();
            const sx = e.clientX - bounds.left;
            const sy = e.clientY - bounds.top;
            const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            setCutDragging(true);
            setCutLine({ sx, sy, ex: sx, ey: sy, fsx: flow.x, fsy: flow.y, fex: flow.x, fey: flow.y });
          }}
          onPointerMove={(e) => {
            if (!cutMode || !cutDragging || !cutLine) return;
            const bounds = e.currentTarget.getBoundingClientRect();
            const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            setCutLine({ ...cutLine, ex: e.clientX - bounds.left, ey: e.clientY - bounds.top, fex: flow.x, fey: flow.y });
          }}
          onPointerUp={(e) => {
            if (!cutMode || !cutLine) return;
            const end = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            const start = { x: cutLine.fsx, y: cutLine.fsy };
            const moved = Math.hypot(end.x - start.x, end.y - start.y);
            const cut = moved > 8
              ? cutEdgesCrossingLine(start, end)
              : (() => {
                  const edgeId = findEdgeNearPoint(end);
                  if (!edgeId) return false;
                  cutSingleEdge(edgeId);
                  return true;
                })();
            if (!cut) toast.info("Nenhuma conexão encontrada para cortar");
            setCutLine(null);
            setCutDragging(false);
          }}
          onPointerCancel={() => {
            if (!cutMode) return;
            setCutLine(null);
            setCutDragging(false);
          }}
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
            if (type === "stage") return;
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
            await addNodeWithUndo({ type, journeyId: targetJourneyId, parentStepId: null, position });
          }}
        >
          <ReactFlow
            nodes={enhancedNodes}
            edges={visibleEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            defaultEdgeOptions={{ type: "deletable", deletable: true }}
            deleteKeyCode={["Backspace", "Delete"]}
            edgesFocusable
            elevateEdgesOnSelect
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={(_e, edge) => {
              // HARDENING: edge só é removida via clique explícito no MODO CORTE.
              // cutSingleEdge já pede confirm.
              if (!cutMode) return;
              cutSingleEdge(edge.id);
            }}
            onPaneClick={(e) => {
              if (!cutMode) return;
              const edgeId = findEdgeNearPoint(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
              if (edgeId) cutSingleEdge(edgeId);
            }}
            onNodeContextMenu={(e) => { e.preventDefault(); }}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_e, n) => {
              if (isPanMode || cutMode) return;
              if (n.type === "stickNote" || n.type === "stage") return;
              setEditingNodeId(n.id);
            }}
            onNodeDoubleClick={(_e, n) => {
              if (isPanMode || cutMode) return;
              if (n.type === "stickNote") {
                const jid = (n.data as any)?.journeyId;
                if (jid) setFocusedJourneyId(jid);
              }
            }}
            nodesDraggable={activeTool === "select"}
            nodesConnectable={activeTool === "select"}
            elementsSelectable={activeTool === "select"}
            panOnDrag={activeTool === "pan" ? [0, 1, 2] : [1, 2]}
            panOnScroll={!cutMode}
            selectNodesOnDrag={activeTool === "select"}
            multiSelectionKeyCode={["Shift", "Meta", "Control"]}
            minZoom={0.1}
            maxZoom={2}
            fitView

          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>

          {/* Overlay do modo navalha */}
          {cutMode && (
            <>
              <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                Modo corte — clique numa conexão pra remover (Esc pra sair)
              </div>
              {cutLine && (
                <svg className="pointer-events-none absolute inset-0 z-40" width="100%" height="100%">
                  <line
                    x1={cutLine.sx} y1={cutLine.sy} x2={cutLine.ex} y2={cutLine.ey}
                    stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4"
                  />
                </svg>
              )}
            </>
          )}

          {/* Menu de contexto da jornada removido — duplicar/excluir desabilitados */}

          {/* === Toolbar lateral direita === */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-50 flex items-start">
            {toolbarCollapsed ? (
              <button
                onClick={() => setToolbarCollapsed(false)}
                className="rounded-l-md border border-border bg-background/90 backdrop-blur shadow-lg px-1.5 py-3 hover:bg-muted"
                title="Expandir toolbar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="rounded-md border border-border bg-background/90 backdrop-blur shadow-lg p-1 flex flex-col gap-1">
                <button
                  onClick={() => setToolbarCollapsed(true)}
                  className="p-2 rounded hover:bg-muted flex items-center justify-center"
                  title="Recolher toolbar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="h-px bg-border my-0.5" />
                <button
                  onClick={() => setActiveTool("select")}
                  className={`p-2 rounded flex items-center justify-center ${activeTool === "select" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  title="Selecionar (padrão)"
                >
                  <MousePointer2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTool((t) => (t === "cut" ? "select" : "cut"))}
                  className={`p-2 rounded flex items-center justify-center ${activeTool === "cut" ? "bg-red-600 text-white" : "hover:bg-muted"}`}
                  title="Tesoura — cortar conexões (clique nesta tesoura, depois na conexão)"
                >
                  <Scissors className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTool((t) => (t === "pan" ? "select" : "pan"))}
                  className={`p-2 rounded flex items-center justify-center ${activeTool === "pan" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  title="Mão — arrastar o canvas"
                >
                  <Hand className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setNodes((nds) => nds.map((n) => {
                      if (n.type === "stickNote" && (n.data as any)?.locked === true) return n;
                      return { ...n, selected: true };
                    }));
                  }}
                  className="p-2 rounded hover:bg-muted flex items-center justify-center"
                  title="Selecionar tudo (Ctrl+A)"
                >
                  <BoxSelect className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
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
        triggerConfig={(() => {
          const n = enhancedNodes.find((x) => x.id === editingNodeId);
          if (!n) return null;
          const jid = stepJourney.get(n.id);
          return (journeys.find((j) => j.id === jid)?.trigger_config as any) ?? null;
        })()}
        onClose={() => setEditingNodeId(null)}
        onSave={async (id, fields) => { await updateStepWithUndo(id, fields as any); }}
        onDelete={async (id) => { await deleteStepWithUndo(id); }}

        onTriggerSave={async (fields) => {
          const n = enhancedNodes.find((x) => x.id === editingNodeId);
          const jid = n ? stepJourney.get(n.id) : null;
          if (jid) await updateJourney(jid, fields);
        }}
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
