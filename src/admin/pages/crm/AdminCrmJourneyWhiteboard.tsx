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
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Loader2, Play, Mail, Clock, GitBranch, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useJourneyGraph, type NodeType } from "@/admin/hooks/crm/useJourneyGraph";
import {
  TriggerNode,
  MessageNode,
  WaitNode,
  ConditionNode,
  TagNode,
} from "@/admin/components/crm/whiteboard/nodes";

const NODE_TYPES = {
  trigger: TriggerNode,
  message: MessageNode,
  wait: WaitNode,
  condition: ConditionNode,
  tag: TagNode,
};

const PALETTE: { type: NodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: "trigger", label: "Gatilho", icon: Play, color: "#10B981" },
  { type: "message", label: "Mensagem", icon: Mail, color: "#60A5FA" },
  { type: "wait", label: "Esperar", icon: Clock, color: "#F59E0B" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "#A855F7" },
  { type: "tag", label: "Marcar usuário", icon: Tag, color: "#EC4899" },
];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const journeyId = id ?? null;

  const {
    nodes: graphNodes,
    edges: graphEdges,
    loading,
    addNode,
    updateNodePosition,
    removeNode,
    addEdge,
    removeEdge,
  } = useJourneyGraph(journeyId);

  const [nodes, setNodes, onNodesChangeRF] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeRF] = useEdgesState<Edge>([]);
  const [journeyName, setJourneyName] = useState<string>("");

  useEffect(() => {
    setNodes(graphNodes as unknown as Node[]);
  }, [graphNodes, setNodes]);

  useEffect(() => {
    setEdges(graphEdges as unknown as Edge[]);
  }, [graphEdges, setEdges]);

  useEffect(() => {
    if (!journeyId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("crm_journeys")
        .select("name")
        .eq("id", journeyId)
        .single();
      if (data?.name) setJourneyName(data.name);
    })();
  }, [journeyId]);

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
        <div className="ml-auto text-xs text-muted-foreground">
          Whiteboard · arraste pra mover · Delete pra remover
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
              onNodeDragStop={(_e, node) =>
                updateNodePosition(node.id, node.position)
              }
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={["Delete", "Backspace"]}
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          )}
        </div>
      </div>
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
