import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, ChevronRight, Upload, X, Pause, Play, RotateCcw, Copy, GripVertical, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAdminMode } from "@/admin/context/AdminModeContext";
import { useBettingHouseAdmin } from "@/admin/context/BettingHouseContext";
import { format } from "date-fns";

type BannerStatus = "active" | "inactive" | "deleted";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "free", label: "Só Free" },
  { value: "basic", label: "Só Básico" },
  { value: "pro", label: "Só Pro" },
  { value: "ultra", label: "Só Ultra" },
  { value: "no_alavancagem", label: "Sem Alavancagem" },
  { value: "no_desaltas", label: "Sem Odds Altas" },
  { value: "no_live_telegram", label: "Sem Live Telegram" },
  { value: "no_acesso_vitalicio", label: "Sem Acesso Vitalício" },
] as const;

const VIEW_AS_OPTIONS = [
  { value: "admin", label: "Admin (Todos)", group: "admin" },
  { value: "free", label: "Cliente Free", group: "tier" },
  { value: "basic", label: "Cliente Básico", group: "tier" },
  { value: "pro", label: "Cliente Pro", group: "tier" },
  { value: "ultra", label: "Cliente Ultra", group: "tier" },
  { value: "no_alavancagem", label: "Sem Alavancagem", group: "addon" },
  { value: "no_desaltas", label: "Sem Odds Altas", group: "addon" },
  { value: "no_live_telegram", label: "Sem Live Telegram", group: "addon" },
  { value: "no_acesso_vitalicio", label: "Sem Acesso Vitalício", group: "addon" },
] as const;

const LIMIT_CHECK_AUDIENCES = [
  { key: "free", label: "Cliente Free" },
  { key: "basic", label: "Cliente Básico" },
  { key: "pro", label: "Cliente Pro" },
  { key: "ultra", label: "Cliente Ultra" },
  { key: "no_alavancagem", label: "Sem Alavancagem" },
  { key: "no_desaltas", label: "Sem Odds Altas" },
  { key: "no_live_telegram", label: "Sem Live Telegram" },
  { key: "no_acesso_vitalicio", label: "Sem Acesso Vitalício" },
] as const;

const audienceLabel = (v: string) => AUDIENCE_OPTIONS.find((o) => o.value === v)?.label ?? v;

interface Banner {
  id: string;
  context: string;
  image_url: string;
  tag: string;
  title: string;
  subtitle: string;
  button_text: string | null;
  button_link: string | null;
  status: BannerStatus;
  display_order: number;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  target_audience: string;
}

interface BannerAnalytics {
  banner_id: string;
  impressions: number;
  clicks: number;
}

const emptyForm = {
  context: "futebol",
  image_url: "",
  tag: "",
  title: "",
  subtitle: "",
  button_text: "Acesse aqui",
  button_link: "",
  status: "active" as BannerStatus,
  display_order: 0,
  starts_at: "",
  ends_at: "",
  target_audience: "all",
};

export default function AdminBanners() {
  const { mode } = useAdminMode();
  const { selectedHouseId } = useBettingHouseAdmin();
  const ctx = mode === "cassino" ? "cassino" : "futebol";

  const [allItems, setAllItems] = useState<Banner[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, BannerAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Banner>>({ ...emptyForm, context: ctx });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<BannerStatus>("active");
  const [viewAs, setViewAs] = useState("admin");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const [editAnalytics, setEditAnalytics] = useState<{ impressions: number; clicks: number; dailyClicks: { date: string; count: number }[] } | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("content_banners")
      .select("*")
      .eq("context", ctx)
      .order("display_order", { ascending: true }) as any;

    if (selectedHouseId) {
      q = q.eq("betting_house_id", selectedHouseId);
    }

    const { data } = await q;
    const banners = (data as unknown as Banner[]) ?? [];
    setAllItems(banners);

    if (banners.length > 0) {
      const ids = banners.map((b) => b.id);
      const { data: events } = await supabase
        .from("banner_analytics")
        .select("banner_id, event_type")
        .in("banner_id", ids);

      const map: Record<string, BannerAnalytics> = {};
      ids.forEach((id) => { map[id] = { banner_id: id, impressions: 0, clicks: 0 }; });
      (events ?? []).forEach((e: any) => {
        if (!map[e.banner_id]) map[e.banner_id] = { banner_id: e.banner_id, impressions: 0, clicks: 0 };
        if (e.event_type === "impression") map[e.banner_id].impressions++;
        else if (e.event_type === "click") map[e.banner_id].clicks++;
      });
      setAnalytics(map);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx, selectedHouseId]);

  const items = allItems.filter((b) => {
    if (b.status !== tab) return false;
    if (viewAs === "admin") return true;
    const t = b.target_audience || "all";
    return t === "all" || t === viewAs;
  });

  // Limit semaphore calculation
  const activeBanners = allItems.filter((b) => b.status === "active");
  const limitData = LIMIT_CHECK_AUDIENCES.map(({ key, label }) => {
    const count = activeBanners.filter((b) => {
      const t = b.target_audience || "all";
      return t === "all" || t === key;
    }).length;
    return { label, count, over: count > 5 };
  });
  const hasOverLimit = limitData.some((d) => d.over);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const toLocalDatetime = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    if (!form.button_link) {
      toast.error("Preencha o link do botão");
      return;
    }
    setSaving(true);
    const nextOrder = allItems.length > 0 ? Math.max(...allItems.map((i) => i.display_order)) + 1 : 1;
    const payload: Record<string, unknown> = {
      context: form.context || ctx,
      image_url: form.image_url || "",
      tag: "",
      title: "",
      subtitle: "",
      button_text: form.button_text || "Acesse aqui",
      button_link: form.button_link || null,
      status: form.status ?? "active",
      display_order: (form as Banner).id ? form.display_order ?? 0 : nextOrder,
      starts_at: scheduleEnabled && form.starts_at ? form.starts_at : new Date().toISOString(),
      ends_at: scheduleEnabled && form.ends_at ? form.ends_at : null,
      target_audience: form.target_audience || "all",
      betting_house_id: selectedHouseId || null,
    };
    if ((form as Banner).id) {
      const { error } = await supabase.from("content_banners").update(payload).eq("id", (form as Banner).id);
      if (error) toast.error(error.message); else toast.success("Banner atualizado");
    } else {
      const { error } = await supabase.from("content_banners").insert(payload as any);
      if (error) toast.error(error.message); else toast.success("Banner criado");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const changeStatus = async (id: string, newStatus: BannerStatus) => {
    await supabase.from("content_banners").update({ status: newStatus }).eq("id", id);
    load();
  };

  const duplicateBanner = async (b: Banner) => {
    const nextOrder = allItems.length > 0 ? Math.max(...allItems.map((i) => i.display_order)) + 1 : 1;
    const payload = {
      context: b.context,
      image_url: b.image_url,
      tag: "",
      title: "",
      subtitle: "",
      button_text: b.button_text,
      button_link: b.button_link,
      status: "inactive" as const,
      display_order: nextOrder,
      starts_at: new Date().toISOString(),
      ends_at: null,
      target_audience: b.target_audience,
    };
    const { error } = await supabase.from("content_banners").insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Banner duplicado! Está na aba Inativos.");
    load();
  };

  const permanentDelete = async (b: Banner) => {
    if (b.image_url) {
      try {
        const url = new URL(b.image_url);
        const parts = url.pathname.split("/banners/");
        if (parts[1]) await supabase.storage.from("banners").remove([parts[1]]);
      } catch { /* ignore */ }
    }
    const { error } = await supabase.from("content_banners").delete().eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success("Excluído permanentemente"); load(); }
  };

  const openNew = () => {
    setForm({ ...emptyForm, context: ctx, display_order: 0, starts_at: "", ends_at: "" });
    setScheduleEnabled(false);
    setEditAnalytics(null);
    setOpen(true);
  };

  const openEdit = async (b: Banner) => {
    setForm({ ...b, starts_at: toLocalDatetime(b.starts_at), ends_at: toLocalDatetime(b.ends_at) });
    const createdMs = new Date(b.created_at).getTime();
    const startsMs = new Date(b.starts_at).getTime();
    const hasCustomSchedule = Math.abs(startsMs - createdMs) > 60000 || !!b.ends_at;
    setScheduleEnabled(hasCustomSchedule);

    const { data: events } = await supabase
      .from("banner_analytics")
      .select("event_type, created_at")
      .eq("banner_id", b.id);
    const impressions = (events ?? []).filter((e: any) => e.event_type === "impression").length;
    const clicks = (events ?? []).filter((e: any) => e.event_type === "click").length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const clickEvents = (events ?? []).filter((e: any) => e.event_type === "click" && e.created_at >= sevenDaysAgo);
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      dailyMap[format(d, "dd/MM")] = 0;
    }
    clickEvents.forEach((e: any) => {
      const key = format(new Date(e.created_at), "dd/MM");
      if (dailyMap[key] !== undefined) dailyMap[key]++;
    });
    const dailyClicks = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));
    setEditAnalytics({ impressions, clicks, dailyClicks });
    setOpen(true);
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const activeList = allItems.filter((b) => b.status === "active");
    const reordered = [...activeList];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    dragItem.current = null;
    dragOverItem.current = null;

    const updatedAll = allItems.map((b) => {
      if (b.status !== "active") return b;
      const newIdx = reordered.findIndex((r) => r.id === b.id);
      return { ...b, display_order: newIdx + 1 };
    });
    setAllItems(updatedAll);

    const updates = reordered.map((b, i) =>
      supabase.from("content_banners").update({ display_order: i + 1 }).eq("id", b.id)
    );
    await Promise.all(updates);
    toast.success("Ordem atualizada");
  };

  const renderScheduleInfo = (b: Banner) => {
    const now = new Date();
    const start = new Date(b.starts_at);
    const createdMs = new Date(b.created_at).getTime();
    const startsMs = start.getTime();
    const isImmediate = Math.abs(startsMs - createdMs) < 60000 && !b.ends_at;
    const isFuture = start > now;
    return (
      <div className="text-xs space-y-0.5">
        {isImmediate ? (
          <span className="text-gray-400">Publicado em {format(start, "dd/MM/yyyy")}</span>
        ) : isFuture ? (
          <span className="text-amber-400">Inicia em {format(start, "dd/MM/yyyy HH:mm")}</span>
        ) : (
          <span className="text-green-400">Ativo desde {format(start, "dd/MM/yyyy HH:mm")}</span>
        )}
        {b.ends_at && <div className="text-gray-500">Até {format(new Date(b.ends_at), "dd/MM/yyyy HH:mm")}</div>}
      </div>
    );
  };

  const getCtr = (bannerId: string) => {
    const a = analytics[bannerId];
    if (!a || a.impressions === 0) return "—";
    return ((a.clicks / a.impressions) * 100).toFixed(1) + "%";
  };

  const renderTable = (list: Banner[], tabStatus: BannerStatus) => {
    const isActiveTab = tabStatus === "active";
    const activeListForDrag = isActiveTab ? allItems.filter((b) => b.status === "active") : [];

    return (
      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-500">
              {isActiveTab && viewAs === "admin" && <th className="px-1 py-2 w-8"></th>}
              <th className="px-3 py-2">Preview</th>
              <th className="px-3 py-2">Botão</th>
              <th className="px-3 py-2">Público</th>
              {isActiveTab && <th className="px-3 py-2">Programado</th>}
              <th className="px-3 py-2 text-center">Impressões</th>
              <th className="px-3 py-2 text-center">Cliques</th>
              <th className="px-3 py-2 text-center">CTR</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => {
              const dragIndex = isActiveTab ? activeListForDrag.findIndex((x) => x.id === b.id) : -1;
              return (
                <tr
                  key={b.id}
                  className="border-b border-white/5 text-gray-300"
                  draggable={isActiveTab && viewAs === "admin"}
                  onDragStart={() => handleDragStart(dragIndex)}
                  onDragEnter={() => handleDragEnter(dragIndex)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {isActiveTab && viewAs === "admin" && (
                    <td className="px-1 py-2 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-gray-600" />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    {b.image_url ? (
                      <img src={b.image_url} alt="" className="w-20 h-11 object-cover rounded-md border border-white/10" />
                    ) : (
                      <div className="w-20 h-11 rounded-md bg-gradient-to-br from-green-900 to-green-950 border border-white/10 flex items-center justify-center">
                        <span className="text-[10px] text-gray-500">Sem imagem</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[160px]">
                    <div className="flex flex-col gap-0.5">
                      {b.button_text && <span className="text-xs text-white truncate">{b.button_text}</span>}
                      {b.button_link && <span className="text-[10px] text-gray-500 truncate">{b.button_link}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2"><span className="text-xs text-gray-400">{audienceLabel(b.target_audience)}</span></td>
                  {isActiveTab && <td className="px-3 py-2">{renderScheduleInfo(b)}</td>}
                  <td className="px-3 py-2 text-center">{analytics[b.id]?.impressions ?? 0}</td>
                  <td className="px-3 py-2 text-center">{analytics[b.id]?.clicks ?? 0}</td>
                  <td className="px-3 py-2 text-center font-medium">{getCtr(b.id)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {tabStatus !== "deleted" && (
                        <button onClick={() => openEdit(b)} className="text-blue-400 hover:text-blue-300" title="Editar"><Pencil className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => duplicateBanner(b)} className="text-cyan-400 hover:text-cyan-300" title="Duplicar"><Copy className="w-4 h-4" /></button>
                      {tabStatus === "active" && (
                        <button onClick={() => setConfirmAction({ title: "Desativar banner?", description: "Ele não aparecerá mais no carrossel.", onConfirm: () => { changeStatus(b.id, "inactive"); setConfirmAction(null); } })} className="text-yellow-400 hover:text-yellow-300" title="Desativar"><Pause className="w-4 h-4" /></button>
                      )}
                      {tabStatus === "inactive" && (
                        <button onClick={() => setConfirmAction({ title: "Ativar banner?", description: "Ele passará a aparecer no carrossel.", onConfirm: () => { changeStatus(b.id, "active"); setConfirmAction(null); } })} className="text-green-400 hover:text-green-300" title="Ativar"><Play className="w-4 h-4" /></button>
                      )}
                      {tabStatus !== "deleted" && (
                        <button onClick={() => setConfirmAction({ title: "Excluir banner?", description: "Ele será movido para a lixeira.", onConfirm: () => { changeStatus(b.id, "deleted"); setConfirmAction(null); } })} className="text-red-400 hover:text-red-300" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      )}
                      {tabStatus === "deleted" && (
                        <>
                          <button onClick={() => setConfirmAction({ title: "Restaurar banner?", description: "Ele voltará para a aba Inativos.", onConfirm: () => { changeStatus(b.id, "inactive"); setConfirmAction(null); } })} className="text-blue-400 hover:text-blue-300" title="Restaurar"><RotateCcw className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmAction({ title: "Excluir permanentemente?", description: "Esta ação é irreversível.", onConfirm: () => { permanentDelete(b); setConfirmAction(null); } })} className="text-red-500 hover:text-red-400" title="Excluir permanentemente"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-600">Nenhum banner</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Banners — {ctx === "futebol" ? "Futebol" : "Cassino"}</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLimitModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              hasOverLimit
                ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                : "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
            }`}
            title="Status de banners por tipo de cliente"
          >
            {hasOverLimit ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {hasOverLimit ? "Atenção" : "OK"}
          </button>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button>
        </div>
      </div>

      {/* View-as filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Visualizar como:</span>
        <Select value={viewAs} onValueChange={setViewAs}>
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEW_AS_OPTIONS.map((o, i) => (
              <div key={o.value}>
                {i > 0 && VIEW_AS_OPTIONS[i - 1].group !== o.group && (
                  <div className="my-1 border-t border-white/10" />
                )}
                <SelectItem value={o.value}>{o.label}</SelectItem>
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as BannerStatus)} className="w-full">
        <TabsList className="bg-gray-800/60 border border-white/10">
          <TabsTrigger value="active" className="data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400">Ativos ({allItems.filter(b => b.status === "active").length})</TabsTrigger>
          <TabsTrigger value="inactive" className="data-[state=active]:bg-yellow-600/20 data-[state=active]:text-yellow-400">Inativos ({allItems.filter(b => b.status === "inactive").length})</TabsTrigger>
          <TabsTrigger value="deleted" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-400">Excluídos ({allItems.filter(b => b.status === "deleted").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">{renderTable(items, "active")}</TabsContent>
        <TabsContent value="inactive">{renderTable(items, "inactive")}</TabsContent>
        <TabsContent value="deleted">{renderTable(items, "deleted")}</TabsContent>
      </Tabs>

      {/* Limit Modal */}
      <Dialog open={limitModalOpen} onOpenChange={setLimitModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle>Banners por Tipo de Cliente</DialogTitle></DialogHeader>
          <p className="text-xs text-gray-500 mb-3">Máximo recomendado: 5 banners ativos por tipo de cliente.</p>
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="px-3 py-2 text-left">Tipo de Cliente</th>
                  <th className="px-3 py-2 text-center">Banners</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {limitData.map((d) => (
                  <tr key={d.label} className={`border-b border-white/5 ${d.over ? "bg-red-500/5" : ""}`}>
                    <td className="px-3 py-2 text-gray-300">{d.label}</td>
                    <td className="px-3 py-2 text-center font-medium text-white">{d.count}</td>
                    <td className="px-3 py-2 text-center">
                      {d.over ? (
                        <span className="text-red-400 text-xs">⚠️ Acima do limite</span>
                      ) : (
                        <span className="text-green-400 text-xs">✅ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction?.onConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{(form as Banner).id ? "Editar" : "Novo"} Banner</DialogTitle></DialogHeader>

          {(form as Banner).id && editAnalytics && (
            <div className="bg-gray-800/50 rounded-lg border border-white/10 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-300">📊 Performance</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{editAnalytics.impressions}</div>
                  <div className="text-xs text-gray-500">Impressões</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{editAnalytics.clicks}</div>
                  <div className="text-xs text-gray-500">Cliques</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {editAnalytics.impressions > 0 ? ((editAnalytics.clicks / editAnalytics.impressions) * 100).toFixed(1) + "%" : "—"}
                  </div>
                  <div className="text-xs text-gray-500">CTR</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Cliques — últimos 7 dias</div>
                <div className="flex items-end gap-1 h-12">
                  {editAnalytics.dailyClicks.map((d) => {
                    const max = Math.max(...editAnalytics.dailyClicks.map((x) => x.count), 1);
                    const h = Math.max((d.count / max) * 100, 4);
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-sm bg-green-500/60" style={{ height: `${h}%` }} title={`${d.date}: ${d.count}`} />
                        <span className="text-[9px] text-gray-600">{d.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-400 text-xs">Contexto</Label>
                <Select value={form.context || ctx} onValueChange={(v) => setForm({ ...form, context: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="futebol">Futebol</SelectItem>
                    <SelectItem value="cassino">Cassino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Público-Alvo</Label>
                <Select value={form.target_audience || "all"} onValueChange={(v) => setForm({ ...form, target_audience: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Imagem de Fundo</Label>
                <div className="flex items-center gap-1.5 mb-1.5 mt-0.5 px-2.5 py-1.5 rounded-lg text-[11px]" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", color: "#ca8a04" }}>
                  <span>📐</span>
                  <span><strong>Mobile:</strong> 1080 × 200px &nbsp;•&nbsp; <strong>Desktop:</strong> 1920 × 400px</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Input placeholder="URL da imagem" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="bg-gray-800 border-gray-700 flex-1" />
                  <label className="cursor-pointer shrink-0">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-green-700 hover:bg-green-600 text-sm text-white transition-colors">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    </span>
                  </label>
                </div>
                {form.image_url && (
                  <div className="mt-2 relative">
                    <img src={form.image_url} alt="" className="w-full aspect-video object-cover rounded-md border border-white/10" />
                    <button onClick={() => setForm({ ...form, image_url: "" })} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Texto do Botão (máx 25)</Label>
                <Input placeholder="Acesse aqui" maxLength={25} value={form.button_text ?? ""} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className="bg-gray-800 border-gray-700" />
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Link do Botão <span className="text-red-400">*</span></Label>
                <Input placeholder="https://... ou /rota" value={form.button_link ?? ""} onChange={(e) => setForm({ ...form, button_link: e.target.value })} className="bg-gray-800 border-gray-700" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                  <Label className="text-gray-300 text-sm cursor-pointer" onClick={() => setScheduleEnabled(!scheduleEnabled)}>Programar publicação</Label>
                </div>
                {!scheduleEnabled && (form as Banner).id && form.starts_at && (
                  <p className="text-xs text-gray-500">Publicado em {format(new Date((form as Banner).created_at || form.starts_at!), "dd/MM/yyyy HH:mm")}</p>
                )}
                {scheduleEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-400 text-xs">Início (Brasília)</Label>
                      <Input type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="bg-gray-800 border-gray-700" />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Fim (opcional)</Label>
                      <Input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="bg-gray-800 border-gray-700" />
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Banner"}
              </Button>
            </div>

            {/* Right: Live preview */}
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Preview</Label>
              <div
                className="relative overflow-hidden rounded-xl border aspect-video"
                style={{ borderColor: "rgba(0,255,0,0.2)", boxShadow: "0 0 20px rgba(0,255,0,0.06)" }}
              >
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #001400, #002800)" }} />
                )}
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {form.button_text && (
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: "#003300", border: "1px solid rgba(0,255,0,0.6)", color: "#00FF00", boxShadow: "0 0 12px rgba(0,255,0,0.2)" }}
                    >
                      {form.button_text}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 text-center">A imagem será exibida com apenas o botão centralizado</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
