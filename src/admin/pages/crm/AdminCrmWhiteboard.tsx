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
import { ArrowLeft, Loader2, Play, Mail, Clock, GitBranch, Tag, Pencil, Trash2 } from "lucide-react";
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
} from "@/admin/components/crm/whiteboard/nodes";
import { NodeConfigDrawer } from "@/admin/components/crm/whiteboard/NodeConfigDrawer";
import type { NodeType, RFNode } from "@/admin/hooks/crm/useJourneyGraph";
import type { ChannelKey } from "@/admin/lib/crm/channels";

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
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition } = useReactFlow();

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
      (supabase as any).from("crm_journey_step_events").select("step_id, status, metadata, converted, conversion_value_cents"),
    ]);
    if (jRes.error) { toast.error(`Jornadas: ${jRes.error.message}`); setLoading(false); return; }
    if (sRes.error) { toast.error(`Nós: ${sRes.error.message}`); setLoading(false); return; }
    if (eRes.error) { toast.error(`Ligações: ${eRes.error.message}`); setLoading(false); return; }
    setJourneys(jRes.data ?? []);
    setSteps(sRes.data ?? []);
    setEdgeRows(eRes.data ?? []);

    // agrega métricas por step_id (mesmo cálculo do useJourneyNodeMetrics)
    const mmap: Record<string, any> = {};
    for (const e of (evRes.data ?? []) as any[]) {
      const m = mmap[e.step_id] ?? { sent: 0, opened: 0, clicked: 0, converted: 0, conversionValueCents: 0, openRate: 0 };
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
      mmap[e.step_id] = m;
    }
    for (const k of Object.keys(mmap)) {
      const m = mmap[k];
      m.openRate = m.sent > 0 ? m.opened / m.sent : 0;
    }
    setMetrics(mmap);
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
      const allOrigin = rows.every((r) => !r.position || (r.position.x === 0 && r.position.y === 0));
      rows.forEach((r, i) => {
        const pos = allOrigin
          ? { x: lane, y: i * 140 }
          : r.position ?? { x: lane, y: i * 140 };
        const visible = filterJourney === "all" || filterJourney === jid;
        built.push({
          id: r.id,
          type: r.node_type,
          position: pos,
          hidden: !visible,
          data: {
            channel: r.channel,
            content: r.content ?? {},
            config: r.config ?? {},
            delay_value: r.delay_value,
            delay_unit: r.delay_unit,
            label: labelFor(r.node_type, r.channel),
            journeyName: journeyName.get(jid) ?? "",
            journeyColor: journeyColor.get(jid) ?? "#888",
          } as any,
        });
      });
    });
    setNodes(built);

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
  }, [steps, edgeRows, journeys, filterJourney, journeyColor, journeyName, setNodes, setEdges]);

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

  const onNodeDragStop = useCallback(async (_e: any, node: Node) => {
    const { error } = await (supabase as any)
      .from("crm_journey_steps")
      .update({ position: node.position })
      .eq("id", node.id);
    if (error) { toast.error(`Erro ao salvar posição: ${error.message}`); return; }
    setSteps((prev) => prev.map((s) => (s.id === node.id ? { ...s, position: node.position } : s)));
  }, []);

  const handleAdd = useCallback(async (type: NodeType) => {
    if (!addToJourney) { toast.error("Escolha a jornada onde adicionar"); return; }
    const idx = journeys.findIndex((j) => j.id === addToJourney);
    const pos = { x: (idx >= 0 ? idx * 600 : 0) + 250 + Math.random() * 100, y: 150 + Math.random() * 200 };
    const { data, error } = await (supabase as any)
      .from("crm_journey_steps")
      .insert({
        journey_id: addToJourney,
        node_type: type,
        position: pos,
        channel: null,
        content: {},
        config: {},
        step_order: null,
      })
      .select()
      .single();
    if (error) { toast.error(`Erro ao adicionar: ${error.message}`); return; }
    setSteps((prev) => [...prev, data as StepRow]);
    toast.success("Nó adicionado");
  }, [addToJourney, journeys]);

  const handleUpdateNode = useCallback(async (id: string, fields: any) => {
    const { error } = await (supabase as any).from("crm_journey_steps").update(fields).eq("id", id);
    if (error) { toast.error(`Erro ao salvar: ${error.message}`); return; }
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  }, []);

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
          {PALETTE.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.type}
                onClick={() => handleAdd(p.type)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border hover:bg-accent transition text-left"
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
        </div>

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

      <NodeConfigDrawer
        node={selectedNode}
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
