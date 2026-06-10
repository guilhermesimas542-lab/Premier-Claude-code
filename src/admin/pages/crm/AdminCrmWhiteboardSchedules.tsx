import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type NodeChange,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, Loader2, Plus, GitBranch, CalendarClock, Send, Pencil, Trash2, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CHANNELS, SCHEDULE_STATUS_META, type ChannelKey, type ScheduleStatus } from "@/admin/lib/crm/channels";

interface ScheduleRow {
  id: string;
  name: string;
  channel: ChannelKey;
  status: ScheduleStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  content: Record<string, any>;
}

const NODE_W = 240;
const NODE_H = 120;

function ScheduleCardNode({ data }: any) {
  const ch = CHANNELS[data.channel as ChannelKey];
  const Icon = ch?.icon ?? Send;
  const status = SCHEDULE_STATUS_META[data.status as ScheduleStatus];
  return (
    <div
      className="rounded-xl border-2 bg-card text-card-foreground shadow-md p-3 flex flex-col gap-2"
      style={{ width: NODE_W, height: NODE_H, borderColor: ch?.color ?? "#888" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: (ch?.color ?? "#888") + "22" }}
        >
          <Icon className="w-4 h-4" style={{ color: ch?.color ?? "#888" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-bold truncate" style={{ color: ch?.color }}>
            {ch?.shortLabel ?? data.channel}
          </div>
          <div className="text-sm font-semibold truncate">{data.name || "Sem nome"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span
          className="px-1.5 py-0.5 rounded font-semibold"
          style={{ background: (status?.color ?? "#666") + "22", color: status?.color ?? "#666" }}
        >
          {status?.label ?? data.status}
        </span>
        {data.scheduled_at && (
          <span className="flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            {new Date(data.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}

const NODE_TYPES = { schedule: ScheduleCardNode };

function Inner() {
  const navigate = useNavigate();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("crm_schedules")
      .select("id, name, channel, status, scheduled_at, sent_at, content")
      .order("created_at", { ascending: false });
    if (error) { toast.error(`Erro: ${error.message}`); setLoading(false); return; }
    setRows((data ?? []) as ScheduleRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build nodes from rows; auto-position any without saved canvas position
  useEffect(() => {
    const PER_ROW = 5;
    const GAP_X = NODE_W + 40;
    const GAP_Y = NODE_H + 40;
    const next: Node[] = rows.map((s, i) => {
      const saved = (s.content as any)?.__canvas;
      const pos = saved && typeof saved.x === "number"
        ? { x: saved.x, y: saved.y }
        : { x: (i % PER_ROW) * GAP_X, y: Math.floor(i / PER_ROW) * GAP_Y };
      return {
        id: s.id,
        type: "schedule",
        position: pos,
        data: {
          name: s.name,
          channel: s.channel,
          status: s.status,
          scheduled_at: s.scheduled_at,
        },
      } as Node;
    });
    setNodes(next);
  }, [rows]);

  const persistPosition = useCallback(async (id: string, x: number, y: number) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const newContent = { ...(row.content ?? {}), __canvas: { x: Math.round(x), y: Math.round(y) } };
    const { error } = await (supabase as any)
      .from("crm_schedules").update({ content: newContent }).eq("id", id);
    if (error) { toast.error(`Erro ao salvar posição: ${error.message}`); return; }
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, content: newContent } : r));
  }, [rows]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    const sel = changes.find((c: any) => c.type === "select" && c.selected);
    if (sel) setSelectedId((sel as any).id);
  }, []);

  const onNodeDragStop = useCallback((_e: any, n: Node) => {
    persistPosition(n.id, n.position.x, n.position.y);
  }, [persistPosition]);

  const handleDelete = useCallback(async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!confirm(`Excluir o schedule "${row.name}"?`)) return;
    const { error } = await (supabase as any).from("crm_schedules").delete().eq("id", id);
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    toast.success("Schedule excluído");
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedId(null);
  }, [rows]);

  const organize = useCallback(async () => {
    const PER_ROW = 5;
    const GAP_X = NODE_W + 40;
    const GAP_Y = NODE_H + 40;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const x = (i % PER_ROW) * GAP_X;
      const y = Math.floor(i / PER_ROW) * GAP_Y;
      await persistPosition(r.id, x, y);
    }
    toast.success("Schedules organizados");
    fitView({ duration: 300, padding: 0.1 });
  }, [rows, persistPosition, fitView]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : null;

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-border bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/crm")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <span className="text-sm font-bold uppercase tracking-wider">
          Whiteboard · Schedules
        </span>

        {/* Toggle entre os 2 whiteboards */}
        <div className="ml-3 flex rounded-md border border-border overflow-hidden">
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none h-8"
            onClick={() => navigate("/admin/crm/whiteboard")}
          >
            <GitBranch className="w-4 h-4 mr-1" /> Jornadas
          </Button>
          <Button size="sm" className="rounded-none h-8">
            <Send className="w-4 h-4 mr-1" /> Schedules
          </Button>
        </div>

        <Button size="sm" className="ml-3" onClick={() => navigate("/admin/crm/schedules/new")}>
          <Plus className="w-4 h-4 mr-1" /> Novo schedule
        </Button>
        <Button size="sm" variant="outline" onClick={organize}>
          <Layers className="w-4 h-4 mr-1" /> Organizar
        </Button>

        <span className="ml-auto text-[11px] text-muted-foreground">
          {rows.length} schedule(s) · arraste pra organizar · clique pra editar
        </span>
      </div>

      <div className="flex-1 relative flex min-h-0">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_e, n) => setSelectedId(n.id)}
            onNodeDoubleClick={(_e, n) => navigate(`/admin/crm/schedules/${n.id}/edit`)}
            nodesDraggable
            elementsSelectable
            panOnScroll
            minZoom={0.2}
            maxZoom={2}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>

          {selected && (
            <div className="absolute right-3 top-3 w-64 rounded-lg border border-border bg-card shadow-xl p-3 z-10 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                Schedule selecionado
              </div>
              <div className="text-sm font-semibold break-words">{selected.name}</div>
              <div className="text-xs text-muted-foreground">
                {CHANNELS[selected.channel]?.label} · {SCHEDULE_STATUS_META[selected.status]?.label}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/admin/crm/schedules/${selected.id}/edit`)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(selected.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminCrmWhiteboardSchedules() {
  return (
    <ReactFlowProvider>
      <Inner />
    </ReactFlowProvider>
  );
}
