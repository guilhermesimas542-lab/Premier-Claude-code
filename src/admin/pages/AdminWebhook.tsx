import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw, Zap, CheckCircle2, XCircle, AlertTriangle,
  Plus, Pencil, Trash2, Play, ChevronDown, ChevronRight, ChevronUp,
  Download, CalendarIcon, X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Types ───────────────────────────────────────────────────────────────────
interface WebhookLog {
  id: string;
  received_at: string;
  provider: string;
  event_name: string | null;
  buyer_email: string | null;
  processed_ok: boolean;
  error_message: string | null;
  raw_payload: Record<string, unknown> | null;
  is_test: boolean;
  unique_key: string | null;
}

interface ProductCatalogItem {
  id: string;
  provider: string;
  provider_product_id: string;
  product_name: string;
  tier: string | null;
  entitlement_key: string | null;
  active: boolean;
  created_at: string;
  product_type: string;
  bundle_name: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminWebhook() {
  const [activeTab, setActiveTab] = useState("logs");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-yellow-400" />
        <h1 className="text-xl font-bold text-white">Webhook e Integraciones</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">Logs de Webhook</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo de Productos</TabsTrigger>
          <TabsTrigger value="raw">Logs Brutos</TabsTrigger>
        </TabsList>

        <TabsContent value="logs"><WebhookLogsTab /></TabsContent>
        <TabsContent value="catalog"><ProductsCatalogTab /></TabsContent>
        <TabsContent value="raw"><RawLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: Webhook Logs
// ═══════════════════════════════════════════════════════════════════════════════
function WebhookLogsTab() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ok" | "error">("all");
  const [eventFilter, setEventFilter] = useState<"approved" | "all">("approved");

  // New: email search with debounce
  const [emailSearch, setEmailSearch] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmailChange = (value: string) => {
    setEmailSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedEmail(value), 400);
  };

  // New: date filters
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // New: sort
  const [sortColumn, setSortColumn] = useState<"received_at" | "buyer_email">("received_at");
  const [sortAscending, setSortAscending] = useState(false);

  const handleSort = (col: "received_at" | "buyer_email") => {
    if (sortColumn === col) {
      setSortAscending(!sortAscending);
    } else {
      setSortColumn(col);
      setSortAscending(false);
    }
  };

  const APPROVED_EVENTS = [
    "Purchase_Order_Confirmed",
    "Subscription_Product_Access",
    "Product_Access_Started",
    "Pagamento_de_Renovacao_Efetuado",
  ];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("webhook_logs")
      .select("*")
      .order(sortColumn, { ascending: sortAscending, nullsFirst: false })
      .limit(50);

    if (filter === "ok") query = query.eq("processed_ok", true);
    if (filter === "error") query = query.eq("processed_ok", false);
    if (eventFilter === "approved") query = query.in("event_name", APPROVED_EVENTS);
    if (debouncedEmail.trim().length >= 2) query = query.ilike("buyer_email", `%${debouncedEmail.trim()}%`);
    if (startDate) query = query.gte("received_at", format(startDate, "yyyy-MM-dd") + "T00:00:00");
    if (endDate) query = query.lte("received_at", format(endDate, "yyyy-MM-dd") + "T23:59:59");

    const { data } = await query;
    setLogs((data as unknown as WebhookLog[]) ?? []);
    setLoading(false);
  }, [filter, eventFilter, debouncedEmail, startDate, endDate, sortColumn, sortAscending]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleReprocess = async (payload: Record<string, unknown>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/payment-webhook?provider=lastlink`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success("¡Webhook reprocesado con éxito!");
      } else {
        toast.error(`Falla: ${data.error ?? data.message ?? "Error desconocido"}`);
      }
      fetchLogs();
    } catch (err) {
      toast.error(`Error al reprocesar: ${String(err)}`);
    }
  };

  const todayLogs = logs.filter(
    (l) => new Date(l.received_at).toDateString() === new Date().toDateString()
  );
  const todayErrors = todayLogs.filter((l) => !l.processed_ok);

  const hasActiveFilters = emailSearch.length > 0 || startDate !== undefined || endDate !== undefined;

  const clearFilters = () => {
    setEmailSearch("");
    setDebouncedEmail("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const SortIcon = ({ col }: { col: "received_at" | "buyer_email" }) => {
    if (sortColumn !== col) return null;
    return sortAscending
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />;
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          icon={<Zap className="w-5 h-5 text-green-400" />}
          label="Endpoint"
          value="Activo"
          sub="verify_jwt = false"
        />
        <StatusCard
          icon={<CheckCircle2 className="w-5 h-5 text-blue-400" />}
          label="Webhooks Hoy"
          value={String(todayLogs.length)}
        />
        <StatusCard
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          label="Errores Hoy"
          value={String(todayErrors.length)}
        />
      </div>

      {/* Event filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={eventFilter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setEventFilter("approved")}
        >
          🛒 Compras Aprobadas
        </Button>
        <Button
          variant={eventFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setEventFilter("all")}
        >
          Todos los Eventos
        </Button>
        <span className="w-px bg-white/10 mx-1" />
        {(["all", "ok", "error"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todos" : f === "ok" ? "✅ OK" : "❌ Error"}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
        <Button size="sm" onClick={() => setSimModalOpen(true)}>
          <Play className="w-4 h-4 mr-1" /> Simular Compra
        </Button>
      </div>

      {/* Date + Email filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Fecha Inicio</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Fecha Fin</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Buscar por correo</label>
          <Input
            placeholder="Buscar por correo..."
            value={emailSearch}
            onChange={(e) => handleEmailChange(e.target.value)}
            className="w-[220px] h-9 bg-gray-800 border-white/10 text-sm"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead
                className="cursor-pointer hover:text-white select-none"
                onClick={() => handleSort("received_at")}
              >
                Fecha/Hora <SortIcon col="received_at" />
              </TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead
                className="cursor-pointer hover:text-white select-none"
                onClick={() => handleSort("buyer_email")}
              >
                Correo <SortIcon col="buyer_email" />
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>¿Prueba?</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                onReprocess={handleReprocess}
              />
            ))}
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  Ningún log encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SimulateModal open={simModalOpen} onClose={() => setSimModalOpen(false)} onDone={fetchLogs} />
    </div>
  );
}

function StatusCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-800 border border-white/10 rounded-lg p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
        {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

function LogRow({ log, expanded, onToggle, onReprocess }: { log: WebhookLog; expanded: boolean; onToggle: () => void; onReprocess: (payload: Record<string, unknown>) => void }) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-white/5" onClick={onToggle}>
        <TableCell>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </TableCell>
        <TableCell className="text-xs text-gray-300">
          {new Date(log.received_at).toLocaleString("es-CL")}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">{log.provider}</Badge>
        </TableCell>
        <TableCell className="text-xs text-gray-300">{log.event_name ?? "—"}</TableCell>
        <TableCell className="text-xs text-gray-300">{log.buyer_email ?? "—"}</TableCell>
        <TableCell>
          {log.processed_ok ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
        </TableCell>
        <TableCell>{log.is_test ? <Badge variant="secondary" className="text-[10px]">Prueba</Badge> : "—"}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {!log.processed_ok && log.raw_payload && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-yellow-400 hover:text-yellow-300"
              onClick={() => onReprocess(log.raw_payload!)}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Reprocesar
            </Button>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-gray-900 p-4">
            {log.error_message && (
              <p className="text-red-400 text-xs mb-2">
                <strong>Error:</strong> {log.error_message}
              </p>
            )}
            <p className="text-[10px] text-gray-500 mb-1">Payload:</p>
            <pre className="text-xs text-gray-300 bg-black/30 p-3 rounded overflow-x-auto max-h-60">
              {JSON.stringify(log.raw_payload, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function SimulateModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [productKey, setProductKey] = useState("basic");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email) return;
    setSending(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/payment-webhook?provider=simulation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            action: "purchase",
            email,
            product_key: productKey,
            _admin_simulation: true,
          }),
        }
      );
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      toast.success("¡Simulación enviada!");
      onDone();
    } catch (err) {
      setResult(String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Simular Compra</DialogTitle>
          <DialogDescription className="text-gray-400">
            Envía un POST simulado al webhook para probar el flujo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Correo del comprador"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-800 border-white/10"
          />
          <Select value={productKey} onValueChange={setProductKey}>
            <SelectTrigger className="bg-gray-800 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Plan Básico</SelectItem>
              <SelectItem value="pro">Plan Pro</SelectItem>
              <SelectItem value="ultra">Plan Ultra</SelectItem>
              <SelectItem value="alavancagem">Add-on: Apalancamiento</SelectItem>
              <SelectItem value="multiplas_bingo">Add-on: Múltiples / Bingo</SelectItem>
              <SelectItem value="live_telegram">Add-on: Live Telegram</SelectItem>
              <SelectItem value="acesso_vitalicio">Add-on: Acceso Vitalicio</SelectItem>
            </SelectContent>
          </Select>
          {result && (
            <pre className="text-xs bg-black/30 p-3 rounded max-h-40 overflow-auto text-gray-300">
              {result}
            </pre>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending || !email}>
            {sending ? "Enviando..." : "Enviar Simulación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: Products Catalog
// ═══════════════════════════════════════════════════════════════════════════════
function ProductsCatalogTab() {
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCatalogItem | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products_catalog")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts((data as unknown as ProductCatalogItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto del catálogo?")) return;
    const { error: deleteError } = await supabase.from("products_catalog").delete().eq("id", id);
    if (deleteError) {
      console.error("Erro ao excluir produto:", deleteError);
      toast.error(`Error al eliminar: ${deleteError.message}`);
      return;
    }
    toast.success("Producto eliminado");
    fetchProducts();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Mapea el ID del producto en la plataforma de ventas al plan interno de CL.
        </p>
        <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Producto
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>ID Externo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              // Group bundle items together for display
              const rendered = new Set<string>();
              return products.map((p) => {
                // If it's a bundle item, show only one grouped row per bundle_name
                if (p.product_type === "bundle" && p.bundle_name) {
                  if (rendered.has(p.bundle_name)) return null;
                  rendered.add(p.bundle_name);
                  const bundleItems = products.filter(
                    (bp) => bp.bundle_name === p.bundle_name && bp.provider_product_id === p.provider_product_id
                  );
                  const bundleTier = bundleItems.find((b) => b.tier)?.tier;
                  const bundleAddons = bundleItems.filter((b) => b.entitlement_key).map((b) => b.entitlement_key);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{p.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-300 font-mono">{p.provider_product_id}</TableCell>
                      <TableCell className="text-sm text-white">
                        {p.bundle_name}
                        <span className="text-[10px] text-gray-500 ml-1">({bundleItems.length} ítems)</span>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30">Bundle</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-300">
                        {bundleTier && <Badge variant="secondary" className="text-[10px] mr-1">{bundleTier}</Badge>}
                        {bundleAddons.map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px] mr-1">{a}</Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        {p.active ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(p); setModalOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={async () => {
                            if (!confirm("¿Eliminar todo el bundle?")) return;
                            const { error: bundleDeleteError } = await supabase.from("products_catalog").delete().eq("bundle_name", p.bundle_name).eq("provider_product_id", p.provider_product_id);
                            if (bundleDeleteError) {
                              console.error("Erro ao excluir bundle:", bundleDeleteError);
                              toast.error(`Error al eliminar: ${bundleDeleteError.message}`);
                              return;
                            }
                            toast.success("Bundle eliminado");
                            fetchProducts();
                          }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                // Regular plan/addon row
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.provider}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-300 font-mono">{p.provider_product_id}</TableCell>
                    <TableCell className="text-sm text-white">{p.product_name}</TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {p.tier ? "Plan" : "Add-on"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {p.tier ?? p.entitlement_key ?? "—"}
                    </TableCell>
                    <TableCell>
                      {p.active ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(p); setModalOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              });
            })()}
            {products.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Ningún producto registrado. Haz clic en "Nuevo Producto" para empezar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ProductModal
        open={modalOpen}
        editing={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onDone={fetchProducts}
      />
    </div>
  );
}

function ProductModal({
  open, editing, onClose, onDone,
}: {
  open: boolean;
  editing: ProductCatalogItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [provider, setProvider] = useState("lastlink");
  const [externalId, setExternalId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"tier" | "addon" | "bundle">("tier");
  const [tierValue, setTierValue] = useState("basic");
  const [addonValue, setAddonValue] = useState("alavancagem");
  const [bundleAddons, setBundleAddons] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggleBundleAddon = (key: string) => {
    setBundleAddons(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  useEffect(() => {
    if (editing) {
      setProvider(editing.provider);
      setExternalId(editing.provider_product_id);
      setActive(editing.active);
      if (editing.product_type === "bundle" && editing.bundle_name) {
        setType("bundle");
        setName(editing.bundle_name);
        setTierValue(editing.tier ?? "basic");
        // We'll load bundle addons from onDone's refetch; for now set from editing context
        setBundleAddons([]);
      } else if (editing.tier) {
        setType("tier");
        setName(editing.product_name);
        setTierValue(editing.tier);
      } else {
        setType("addon");
        setName(editing.product_name);
        setAddonValue(editing.entitlement_key ?? "alavancagem");
      }
    } else {
      setProvider("lastlink");
      setExternalId("");
      setName("");
      setType("tier");
      setTierValue("basic");
      setAddonValue("alavancagem");
      setBundleAddons([]);
      setActive(true);
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!externalId || !name) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (type === "bundle" && bundleAddons.length === 0) {
      toast.error("Selecciona al menos un add-on para el bundle");
      return;
    }
    if (type === "bundle" && !tierValue) {
      toast.error("Selecciona el plan incluido en el bundle");
      return;
    }
    setSaving(true);

    try {
      if (type === "bundle") {
        const bundleRows = [
          {
            provider,
            provider_product_id: externalId,
            product_name: `${name} (Plan)`,
            tier: tierValue,
            entitlement_key: null,
            product_type: "bundle",
            bundle_name: name,
            active,
          },
          ...bundleAddons.map(addonKey => ({
            provider,
            provider_product_id: externalId,
            product_name: `${name} (${addonKey})`,
            tier: null,
            entitlement_key: addonKey,
            product_type: "bundle",
            bundle_name: name,
            active,
          })),
        ];

        if (editing) {
          const { error: bundleDeleteError } = await supabase
            .from("products_catalog")
            .delete()
            .eq("bundle_name", editing.bundle_name ?? name)
            .eq("provider_product_id", externalId);
          if (bundleDeleteError) {
            console.error("Erro ao remover bundle anterior:", bundleDeleteError);
            toast.error(`Error al guardar: ${bundleDeleteError.message}`);
            setSaving(false);
            return;
          }
        }

        const { error: bundleInsertError } = await supabase.from("products_catalog").insert(bundleRows);
        if (bundleInsertError) {
          console.error("Erro ao inserir bundle:", bundleInsertError);
          toast.error(`Error al guardar: ${bundleInsertError.message}`);
          setSaving(false);
          return;
        }
      } else {
        const row = {
          provider,
          provider_product_id: externalId,
          product_name: name,
          tier: type === "tier" ? tierValue : null,
          entitlement_key: type === "addon" ? addonValue : null,
          product_type: type === "tier" ? "plan" : "addon",
          bundle_name: null,
          active,
        };

        if (editing) {
          const { error: updateError } = await supabase.from("products_catalog").update(row).eq("id", editing.id);
          if (updateError) {
            console.error("Erro ao atualizar produto:", updateError);
            toast.error(`Error al guardar: ${updateError.message}`);
            setSaving(false);
            return;
          }
        } else {
          const { error: insertError } = await supabase.from("products_catalog").insert(row);
          if (insertError) {
            console.error("Erro ao inserir produto:", insertError);
            toast.error(`Error al guardar: ${insertError.message}`);
            setSaving(false);
            return;
          }
        }
      }

      toast.success("¡Producto guardado con éxito!");
      setSaving(false);
      onClose();
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      console.error("Exceção ao salvar produto:", err);
      toast.error(`Error al guardar: ${message}`);
      setSaving(false);
    }
  };

  const addonOptions = [
    { key: "alavancagem", label: "Apalancamiento" },
    { key: "multiplas_bingo", label: "Múltiples / Bingo" },
    { key: "live_telegram", label: "Live Telegram" },
    { key: "acesso_vitalicio", label: "Acceso Vitalicio" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Mapea un producto externo a un plan de CL.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Proveedor</label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-gray-800 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastlink">Lastlink</SelectItem>
                <SelectItem value="payt">Payt</SelectItem>
                <SelectItem value="hotmart">Hotmart</SelectItem>
                <SelectItem value="outro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {provider === "lastlink"
                ? "ID del Producto (UUID de Lastlink)"
                : provider === "payt"
                ? "Code del producto en PayT"
                : "ID del producto en la plataforma"}
            </label>
            <Input
              placeholder={
                provider === "lastlink"
                  ? "Ej: 037d5e50-ab28-47dd-a916-b4f9916dcd8a"
                  : provider === "payt"
                  ? "Ej: R28BKV"
                  : "Ej: C343583F8"
              }
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
            {provider === "lastlink" && (
              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                <strong className="text-gray-400">Dónde encontrarlo:</strong> En Lastlink, ve a <strong className="text-gray-400">Productos</strong>, haz clic para editar el producto y copia el código de la URL:
                <br />
                <code className="text-yellow-400/80">.../products/<strong>[este-código]</strong>/edit</code>
              </p>
            )}
            {provider === "payt" && (
              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                <strong className="text-gray-400">Dónde encontrarlo:</strong> En PayT, ve a <strong className="text-gray-400">Ofertas y Productos</strong>, haz clic en el producto y copia el código (ej: <code className="text-yellow-400/80">R28BKV</code>).
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {type === "bundle" ? "Nombre del Bundle" : "Nombre legible"}
            </label>
            <Input
              placeholder={type === "bundle" ? "Ej: Pack Ultra Completo" : "Ej: Plan Básico Mensual"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Tipo</label>
            <Select value={type} onValueChange={(v) => setType(v as "tier" | "addon" | "bundle")}>
              <SelectTrigger className="bg-gray-800 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tier">Plan</SelectItem>
                <SelectItem value="addon">Add-on</SelectItem>
                <SelectItem value="bundle">Bundle (Plan + Add-ons)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tier selector — for "tier" and "bundle" */}
          {(type === "tier" || type === "bundle") && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Plan incluido</label>
              <Select value={tierValue} onValueChange={setTierValue}>
                <SelectTrigger className="bg-gray-800 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Single addon selector — for "addon" only */}
          {type === "addon" && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Add-on</label>
              <Select value={addonValue} onValueChange={setAddonValue}>
                <SelectTrigger className="bg-gray-800 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {addonOptions.map(({ key, label }) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Multi-addon checkboxes — for "bundle" only */}
          {type === "bundle" && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Add-ons incluidos en el Bundle</label>
              <p className="text-[10px] text-gray-500 mb-2">Selecciona todos los add-ons que este pack debe liberar.</p>
              <div className="flex flex-col gap-2 border border-white/10 rounded-md p-3 bg-gray-800/50">
                {addonOptions.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bundleAddons.includes(key)}
                      onChange={() => toggleBundleAddon(key)}
                      className="w-4 h-4 rounded border-white/20"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              {bundleAddons.length === 0 && (
                <p className="text-xs text-red-400 mt-1">Selecciona al menos un add-on para el bundle.</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <span className="text-sm text-gray-300">Activo</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: Raw Webhook Logs
// ═══════════════════════════════════════════════════════════════════════════════
interface RawLog {
  id: number;
  created_at: string;
  payload: Record<string, unknown> | null;
}

function RawLogsTab() {
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("raw_webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (startDate) {
      query = query.gte("created_at", format(startDate, "yyyy-MM-dd") + "T00:00:00");
    }
    if (endDate) {
      query = query.lte("created_at", format(endDate, "yyyy-MM-dd") + "T23:59:59");
    }

    const { data } = await query;
    setLogs((data as unknown as RawLog[]) ?? []);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleReprocess = async (logId: number, payload: Record<string, unknown>) => {
    setReprocessingId(logId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/payment-webhook?provider=lastlink`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(`¡Log #${logId} reprocesado con éxito!`);
      } else {
        toast.error(`Falla: ${data.error ?? data.message ?? "Error desconocido"}`);
      }
    } catch (err) {
      toast.error(`Error al reprocesar: ${String(err)}`);
    } finally {
      setReprocessingId(null);
    }
  };

  const exportCsv = () => {
    if (logs.length === 0) { toast.error("Ningún log para exportar"); return; }
    const rows = logs.map((log) => ({
      id: log.id,
      created_at: log.created_at,
      payload: JSON.stringify(log.payload),
    }));
    const header = "id,created_at,payload\n";
    const csv = header + rows.map((r) =>
      `${r.id},"${r.created_at}","${r.payload.replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raw_webhook_logs_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("¡CSV exportado!");
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-end justify-between">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Fecha Inicio</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : "Seleccionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Fecha Fin</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Seleccionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
              Limpiar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500">{logs.length} log(s) encontrado(s)</p>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>ID</TableHead>
              <TableHead>Fecha/Hora</TableHead>
              <TableHead>EventName</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const p = log.payload as Record<string, unknown> | null;
              const eventName = (p?.Event ?? p?.EventName ?? p?.action ?? "—") as string;
              const buyer = ((p?.Data as Record<string, unknown>)?.Buyer ?? {}) as Record<string, unknown>;
              const email = (buyer?.Email ?? buyer?.email ?? p?.email ?? "—") as string;

              return (
                <>
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-white/5"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <TableCell>
                      {expandedId === log.id
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 font-mono">{log.id}</TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {new Date(log.created_at).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">{eventName}</TableCell>
                    <TableCell className="text-xs text-gray-300">{email}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {log.payload && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-yellow-400 hover:text-yellow-300"
                          disabled={reprocessingId === log.id}
                          onClick={() => handleReprocess(log.id, log.payload!)}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${reprocessingId === log.id ? "animate-spin" : ""}`} />
                          {reprocessingId === log.id ? "Enviando..." : "Reprocesar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === log.id && (
                    <TableRow key={`${log.id}-detail`}>
                      <TableCell colSpan={6} className="bg-gray-900 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] text-gray-500">Payload completo:</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
                              const btn = document.getElementById(`copy-btn-${log.id}`);
                              if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000); }
                            }}
                            id={`copy-btn-${log.id}`}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                          >
                            📋 Copiar
                          </button>
                        </div>
                        <pre className="text-xs text-gray-300 bg-black/30 p-3 rounded overflow-x-auto max-h-80">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  Ningún log bruto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
