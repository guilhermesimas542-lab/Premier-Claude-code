import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  NodeResizer,
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
import {
  ArrowLeft, Loader2, Plus, GitBranch, CalendarClock, Send, Pencil, Trash2, Layers,
  Users2, MailOpen, AlertTriangle, StickyNote, Sun, Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CHANNELS, CHANNEL_LIST, SCHEDULE_STATUS_META,
  type ChannelKey, type ScheduleStatus,
} from "@/admin/lib/crm/channels";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScheduleWizard } from "@/admin/components/crm/wizard/ScheduleWizard";

interface AudienceLite { id: string; name: string }
interface ScheduleRow {
  id: string;
  name: string;
  channel: ChannelKey;
  status: ScheduleStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  audience_id: string | null;
  reach_count: number;
  delivered_count: number;
  failed_count: number;
  open_count: number;
  click_count: number;
  content: Record<string, any>;
  audience?: AudienceLite | null;
}

const NODE_W = 260;
const NODE_H = 170;
const STICKY_KEY = "crm-schedule-stickies-v1";

interface StickyData {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  title: string;
}

function fmtDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// ============== Custom nodes ==============

function ScheduleCardNode({ data, selected }: any) {
  const ch = CHANNELS[data.channel as ChannelKey];
  const Icon = ch?.icon ?? Send;
  const status = SCHEDULE_STATUS_META[data.status as ScheduleStatus];
  const hasError = data.status === "failed" || (data.failed_count ?? 0) > 0;
  const openRate = data.delivered_count > 0
    ? Math.round((data.open_count / data.delivered_count) * 100)
    : null;
  return (
    <div
      className="rounded-xl border-2 bg-card text-card-foreground shadow-md p-3 flex flex-col gap-2"
      style={{
        width: NODE_W,
        height: NODE_H,
        borderColor: hasError ? "#EF4444" : selected ? (ch?.color ?? "#888") : (ch?.color ?? "#888") + "AA",
        boxShadow: selected ? `0 0 0 2px ${ch?.color ?? "#888"}55` : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: (ch?.color ?? "#888") + "22" }}
        >
          <Icon className="w-4 h-4" style={{ color: ch?.color ?? "#888" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-bold truncate" style={{ color: ch?.color }}>
            {ch?.shortLabel ?? data.channel}
          </div>
          <div className="text-sm font-semibold truncate">{data.name || "Sem nome"}</div>
        </div>
        {hasError && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
      </div>

      {/* Linha de status + horário */}
      <div className="flex items-center justify-between text-[11px]">
        <span
          className="px-1.5 py-0.5 rounded font-semibold"
          style={{ background: (status?.color ?? "#666") + "22", color: status?.color ?? "#666" }}
        >
          {status?.label ?? data.status}
        </span>
        {data.scheduled_at ? (
          <span className="flex items-center gap-1 text-foreground/80 font-medium">
            <CalendarClock className="w-3 h-3" />
            {fmtDateTime(data.scheduled_at)}
          </span>
        ) : data.sent_at ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <CalendarClock className="w-3 h-3" /> Enviado {fmtDateTime(data.sent_at)}
          </span>
        ) : (
          <span className="text-muted-foreground italic">sem data</span>
        )}
      </div>

      {/* Audiência */}
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Users2 className="w-3 h-3 shrink-0" />
        <span className="truncate">
          {data.audienceName ?? "Sem audiência"}
          {data.reach_count > 0 && ` · ${data.reach_count} alvo(s)`}
        </span>
      </div>

      {/* Métricas */}
      <div className="flex items-center gap-2 text-[10px] mt-auto">
        <span className="flex items-center gap-1 text-emerald-500 font-bold">
          <Send className="w-3 h-3" /> {data.delivered_count ?? 0}
        </span>
        {openRate != null && (
          <span className="flex items-center gap-1 text-blue-400 font-bold">
            <MailOpen className="w-3 h-3" /> {data.open_count} ({openRate}%)
          </span>
        )}
        {(data.failed_count ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-red-500 font-bold">
            <AlertTriangle className="w-3 h-3" /> {data.failed_count}
          </span>
        )}
      </div>
    </div>
  );
}

function StickyNoteNode({ data, selected }: any) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.title ?? "");
  return (
    <div
      className="rounded-lg border-2 p-2 h-full w-full overflow-hidden"
      style={{
        background: (data.color ?? "#FACC15") + "22",
        borderColor: data.color ?? "#FACC15",
        boxShadow: selected ? `0 0 0 2px ${data.color}55` : undefined,
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { setEditing(false); data.onChangeTitle?.(data.id, draft); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { setEditing(false); data.onChangeTitle?.(data.id, draft); }
            if (e.key === "Escape") { setEditing(false); setDraft(data.title ?? ""); }
          }}
          className="w-full bg-transparent text-sm font-bold outline-none"
          style={{ color: data.color }}
        />
      ) : (
        <button
          onDoubleClick={() => setEditing(true)}
          className="text-sm font-bold uppercase tracking-wider text-left w-full"
          style={{ color: data.color }}
          title="Duplo-clique pra renomear"
        >
          {data.title || "Sem título"}
        </button>
      )}
    </div>
  );
}

const NODE_TYPES = { schedule: ScheduleCardNode, sticky: StickyNoteNode };

// ============== Main ==============

const STICKY_COLORS = ["#FACC15", "#22D3EE", "#F472B6", "#A855F7", "#34D399", "#FB923C"];

const THEME_KEY = "crm-schedule-canvas-theme";

function Inner() {
  const navigate = useNavigate();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [stickies, setStickies] = useState<StickyData[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardEditingId, setWizardEditingId] = useState<string | undefined>(undefined);
  const openWizard = (id?: string) => {
    setWizardEditingId(id);
    setWizardOpen(true);
  };
  const closeWizardFn = (reload: boolean) => {
    setWizardOpen(false);
    setWizardEditingId(undefined);
    if (reload) load();
  };
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem(THEME_KEY) !== "light"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch {}
  }, [dark]);

  // Load stickies from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STICKY_KEY);
      if (raw) setStickies(JSON.parse(raw));
    } catch {}
  }, []);
  const persistStickies = useCallback((next: StickyData[]) => {
    setStickies(next);
    try { localStorage.setItem(STICKY_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("crm_schedules")
      .select(`
        id, name, channel, status, scheduled_at, sent_at, audience_id,
        reach_count, delivered_count, failed_count, open_count, click_count, content,
        audience:crm_audiences ( id, name )
      `)
      .order("created_at", { ascending: false });
    if (error) { toast.error(`Erro: ${error.message}`); setLoading(false); return; }
    setRows((data ?? []) as ScheduleRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Build schedule + sticky nodes — PRESERVE existing positions to avoid jump-back
  useEffect(() => {
    const PER_ROW = 4;
    const GAP_X = NODE_W + 40;
    const GAP_Y = NODE_H + 40;

    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));

      const scheduleNodes: Node[] = rows.map((s, i) => {
        const existing = prevById.get(s.id);
        const saved = (s.content as any)?.__canvas;
        const fallback = saved && typeof saved.x === "number"
          ? { x: saved.x, y: saved.y }
          : { x: 320 + (i % PER_ROW) * GAP_X, y: Math.floor(i / PER_ROW) * GAP_Y };
        const position = existing?.position ?? fallback;
        return {
          id: s.id,
          type: "schedule",
          position,
          zIndex: 2,
          data: {
            name: s.name,
            channel: s.channel,
            status: s.status,
            scheduled_at: s.scheduled_at,
            sent_at: s.sent_at,
            reach_count: s.reach_count,
            delivered_count: s.delivered_count,
            failed_count: s.failed_count,
            open_count: s.open_count,
            click_count: s.click_count,
            audienceName: s.audience?.name ?? null,
          },
        } as Node;
      });

      const stickyNodes: Node[] = stickies.map((st) => {
        const existing = prevById.get(st.id);
        return {
          id: st.id,
          type: "sticky",
          position: existing?.position ?? { x: st.x, y: st.y },
          style: existing?.style ?? { width: st.w, height: st.h },
          zIndex: 0,
          data: {
            id: st.id,
            title: st.title,
            color: st.color,
            onChangeTitle: (id: string, title: string) => {
              persistStickies(stickies.map((s) => s.id === id ? { ...s, title } : s));
            },
          },
        } as Node;
      });

      return [...stickyNodes, ...scheduleNodes];
    });

    // Build edges from content.__next_ids
    const allEdges: Edge[] = [];
    rows.forEach((s) => {
      const nexts: string[] = (s.content as any)?.__next_ids ?? [];
      nexts.forEach((targetId) => {
        if (!rows.find((r) => r.id === targetId)) return;
        const ch = CHANNELS[s.channel];
        allEdges.push({
          id: `${s.id}->${targetId}`,
          source: s.id,
          target: targetId,
          animated: false,
          style: { stroke: ch?.color ?? "#888", strokeWidth: 2 },
          label: "depois",
        });
      });
    });
    setEdges(allEdges);
  }, [rows, stickies, persistStickies]);

  // ============== Mutations ==============

  const persistContent = useCallback(async (id: string, patch: Record<string, any>) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const newContent = { ...(row.content ?? {}), ...patch };
    const { error } = await (supabase as any)
      .from("crm_schedules").update({ content: newContent }).eq("id", id);
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, content: newContent } : r));
  }, [rows]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    // Track sticky position/size changes
    changes.forEach((c: any) => {
      if (c.type === "remove") {
        if (c.id?.startsWith("sticky-")) {
          persistStickies(stickies.filter((s) => s.id !== c.id));
        }
      }
    });
  }, [stickies, persistStickies]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    changes.forEach((c: any) => {
      if (c.type === "remove") {
        const [src, tgt] = c.id.split("->");
        const row = rows.find((r) => r.id === src);
        if (!row) return;
        const nexts: string[] = (row.content as any)?.__next_ids ?? [];
        persistContent(src, { __next_ids: nexts.filter((x) => x !== tgt) });
      }
    });
  }, [rows, persistContent]);

  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    const row = rows.find((r) => r.id === c.source);
    if (!row) return;
    const nexts: string[] = (row.content as any)?.__next_ids ?? [];
    if (nexts.includes(c.target)) return;
    await persistContent(c.source, { __next_ids: [...nexts, c.target] });
    toast.success("Ordem definida");
  }, [rows, persistContent]);

  const onNodeDragStop = useCallback(async (_e: any, n: Node) => {
    if (n.type === "sticky") {
      persistStickies(stickies.map((s) => s.id === n.id
        ? { ...s, x: Math.round(n.position.x), y: Math.round(n.position.y) }
        : s));
      return;
    }
    if (n.type === "schedule") {
      await persistContent(n.id, { __canvas: { x: Math.round(n.position.x), y: Math.round(n.position.y) } });
    }
  }, [stickies, persistStickies, persistContent]);

  // ============== Create schedule from channel drag ==============

  const createScheduleAt = useCallback(async (channel: ChannelKey, x: number, y: number) => {
    const ch = CHANNELS[channel];
    const { data, error } = await (supabase as any)
      .from("crm_schedules")
      .insert({
        name: `Novo ${ch.shortLabel}`,
        channel,
        content: { __canvas: { x: Math.round(x), y: Math.round(y) } },
        status: "draft",
      })
      .select(`
        id, name, channel, status, scheduled_at, sent_at, audience_id,
        reach_count, delivered_count, failed_count, open_count, click_count, content,
        audience:crm_audiences ( id, name )
      `)
      .single();
    if (error) { toast.error(`Erro ao criar schedule: ${error.message}`); return; }
    toast.success(`Schedule ${ch.shortLabel} criado`);
    setRows((prev) => [data as ScheduleRow, ...prev]);
  }, []);

  const addStickyAt = useCallback((x: number, y: number) => {
    const id = `sticky-${Date.now()}`;
    const color = STICKY_COLORS[stickies.length % STICKY_COLORS.length];
    persistStickies([
      ...stickies,
      { id, x: Math.round(x), y: Math.round(y), w: 360, h: 220, color, title: "Nova nota" },
    ]);
  }, [stickies, persistStickies]);

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
    const PER_ROW = 4;
    const GAP_X = NODE_W + 40;
    const GAP_Y = NODE_H + 40;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const x = 320 + (i % PER_ROW) * GAP_X;
      const y = Math.floor(i / PER_ROW) * GAP_Y;
      await persistContent(r.id, { __canvas: { x, y } });
    }
    toast.success("Schedules organizados");
    setTimeout(() => fitView({ duration: 300, padding: 0.1 }), 50);
  }, [rows, persistContent, fitView]);

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
      {/* Top bar */}
      <div className="h-12 flex items-center gap-2 px-3 border-b border-border bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/crm")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <span className="text-sm font-bold uppercase tracking-wider">
          Whiteboard · Schedules
        </span>
        <div className="ml-3 flex rounded-md border border-border overflow-hidden">
          <Button size="sm" variant="ghost" className="rounded-none h-8" onClick={() => navigate("/admin/crm/whiteboard")}>
            <GitBranch className="w-4 h-4 mr-1" /> Jornadas
          </Button>
          <Button size="sm" className="rounded-none h-8">
            <Send className="w-4 h-4 mr-1" /> Schedules
          </Button>
        </div>
        <Button size="sm" className="ml-3" onClick={() => openWizard(undefined)}>
          <Plus className="w-4 h-4 mr-1" /> Novo via wizard
        </Button>
        <Button size="sm" variant="outline" onClick={organize}>
          <Layers className="w-4 h-4 mr-1" /> Organizar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDark((d) => !d)} title={dark ? "Tema claro" : "Tema escuro"}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {rows.length} schedule(s) · arraste canais à esquerda · conecte cards pra definir ordem
        </span>
      </div>

      <div className="flex-1 relative flex min-h-0">
        {/* Sidebar: channels + sticky */}
        <aside className="w-56 border-r border-border bg-background/95 overflow-y-auto shrink-0">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Adicionar canal
          </div>
          <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
            {CHANNEL_LIST.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.key}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-crm-channel", c.key);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="cursor-grab active:cursor-grabbing border border-border rounded-md px-2 py-2 flex flex-col items-center gap-1 text-[11px] hover:bg-muted/50 hover:border-primary/40 select-none"
                  style={{ borderColor: c.color + "55" }}
                  title={`Arraste pro canvas pra criar Schedule de ${c.label}`}
                >
                  <Icon className="w-4 h-4" style={{ color: c.color }} />
                  <span className="text-center leading-tight">{c.shortLabel}</span>
                </div>
              );
            })}
          </div>
          <div className="px-3 pt-1 pb-2 text-[10px] text-muted-foreground">
            → Arraste pra criar um schedule rascunho
          </div>

          <div className="border-t border-border my-1" />
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Organização
          </div>
          <div className="px-2 pb-3">
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-crm-sticky", "1");
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="cursor-grab active:cursor-grabbing border border-dashed border-yellow-500/50 rounded-md px-2 py-3 flex flex-col items-center gap-1 text-[11px] hover:bg-yellow-500/10 select-none"
            >
              <StickyNote className="w-4 h-4 text-yellow-500" />
              <span>Sticky note</span>
            </div>
          </div>

          <div className="border-t border-border my-1" />
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Legenda status
          </div>
          <div className="px-3 pb-3 space-y-1">
            {Object.entries(SCHEDULE_STATUS_META).map(([k, m]) => (
              <div key={k} className="flex items-center gap-2 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                <span className="text-foreground/80">{m.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <div
          className="flex-1 relative"
          style={{ background: dark ? "#0b1220" : "#ffffff" }}
          onDragOver={(e) => {
            if (
              e.dataTransfer.types.includes("application/x-crm-channel") ||
              e.dataTransfer.types.includes("application/x-crm-sticky")
            ) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={async (e) => {
            const channel = e.dataTransfer.getData("application/x-crm-channel") as ChannelKey;
            const sticky = e.dataTransfer.getData("application/x-crm-sticky");
            if (!channel && !sticky) return;
            e.preventDefault();
            const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            if (channel) await createScheduleAt(channel, pos.x - NODE_W / 2, pos.y - NODE_H / 2);
            else if (sticky) addStickyAt(pos.x - 180, pos.y - 110);
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            colorMode={dark ? "dark" : "light"}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_e, n) => { if (n.type === "schedule") setSelectedId(n.id); }}
            onNodeDoubleClick={(_e, n) => {
              if (n.type === "schedule") openWizard(n.id);
            }}
            nodesDraggable
            nodesConnectable
            elementsSelectable
            panOnScroll
            minZoom={0.2}
            maxZoom={2}
            fitView
          >
            <Background color={dark ? "#1f2937" : "#d1d5db"} gap={20} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>

          {selected && (
            <div className="absolute right-3 top-3 w-72 rounded-lg border border-border bg-card shadow-xl p-3 z-10 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                Schedule selecionado
              </div>
              <div className="text-sm font-semibold break-words">{selected.name}</div>
              <div className="text-xs text-muted-foreground">
                {CHANNELS[selected.channel]?.label} · {SCHEDULE_STATUS_META[selected.status]?.label}
              </div>
              <div className="text-xs">
                <div><b>Audiência:</b> {selected.audience?.name ?? "—"}</div>
                <div><b>Alvo:</b> {selected.reach_count}</div>
                <div><b>Entregues:</b> {selected.delivered_count} · <b>Abriram:</b> {selected.open_count} · <b>Cliques:</b> {selected.click_count}</div>
                {selected.failed_count > 0 && (
                  <div className="text-red-500"><b>Falhas:</b> {selected.failed_count}</div>
                )}
                {selected.scheduled_at && (
                  <div><b>Agendado pra:</b> {fmtDateTime(selected.scheduled_at)}</div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openWizard(selected.id)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(selected.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={wizardOpen} onOpenChange={(o) => { if (!o) closeWizardFn(true); }}>
        <DialogContent className="max-w-none w-screen h-screen p-0 gap-0 rounded-none border-0 sm:rounded-none overflow-y-auto">
          {wizardOpen && (
            <ScheduleWizard
              editingId={wizardEditingId}
              onDone={() => closeWizardFn(true)}
              onCancel={() => closeWizardFn(false)}
            />
          )}
        </DialogContent>
      </Dialog>
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
