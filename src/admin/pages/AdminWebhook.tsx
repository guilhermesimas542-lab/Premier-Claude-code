import { useState, useEffect, useCallback } from "react";
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
  Plus, Pencil, Trash2, Play, ChevronDown, ChevronRight,
  Download, CalendarIcon,
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
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminWebhook() {
  const [activeTab, setActiveTab] = useState("logs");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-yellow-400" />
        <h1 className="text-xl font-bold text-white">Webhook & Integrações</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">Logs de Webhook</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo de Produtos</TabsTrigger>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simModalOpen, setSimModalOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("webhook_logs")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(50);

    if (filter === "ok") query = query.eq("processed_ok", true);
    if (filter === "error") query = query.eq("processed_ok", false);

    const { data } = await query;
    setLogs((data as unknown as WebhookLog[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const todayLogs = logs.filter(
    (l) => new Date(l.received_at).toDateString() === new Date().toDateString()
  );
  const todayErrors = todayLogs.filter((l) => !l.processed_ok);

  return (
    <div className="space-y-4 mt-4">
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          icon={<Zap className="w-5 h-5 text-green-400" />}
          label="Endpoint"
          value="Ativo"
          sub="verify_jwt = false"
        />
        <StatusCard
          icon={<CheckCircle2 className="w-5 h-5 text-blue-400" />}
          label="Webhooks Hoje"
          value={String(todayLogs.length)}
        />
        <StatusCard
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          label="Erros Hoje"
          value={String(todayErrors.length)}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {(["all", "ok", "error"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todos" : f === "ok" ? "✅ OK" : "❌ Erro"}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
        <Button size="sm" onClick={() => setSimModalOpen(true)}>
          <Play className="w-4 h-4 mr-1" /> Simular Compra
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Data/Hora</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Teste?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              />
            ))}
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Nenhum log encontrado
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

function LogRow({ log, expanded, onToggle }: { log: WebhookLog; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-white/5" onClick={onToggle}>
        <TableCell>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </TableCell>
        <TableCell className="text-xs text-gray-300">
          {new Date(log.received_at).toLocaleString("pt-BR")}
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
        <TableCell>{log.is_test ? <Badge variant="secondary" className="text-[10px]">Teste</Badge> : "—"}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-gray-900 p-4">
            {log.error_message && (
              <p className="text-red-400 text-xs mb-2">
                <strong>Erro:</strong> {log.error_message}
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
      toast.success("Simulação enviada!");
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
            Envia um POST simulado ao webhook para testar o fluxo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="E-mail do comprador"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-800 border-white/10"
          />
          <Select value={productKey} onValueChange={setProductKey}>
            <SelectTrigger className="bg-gray-800 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Plano Basic</SelectItem>
              <SelectItem value="pro">Plano Pro</SelectItem>
              <SelectItem value="ultra">Plano Ultra</SelectItem>
              <SelectItem value="alavancagem">Add-on: Alavancagem</SelectItem>
              <SelectItem value="desaltas">Add-on: Desaltas</SelectItem>
              <SelectItem value="live_telegram">Add-on: Live Telegram</SelectItem>
              <SelectItem value="acesso_vitalicio">Add-on: Acesso Vitalício</SelectItem>
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
            {sending ? "Enviando..." : "Enviar Simulação"}
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
    if (!confirm("Excluir este produto do catálogo?")) return;
    await supabase.from("products_catalog").delete().eq("id", id);
    toast.success("Produto excluído");
    fetchProducts();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Mapeie o ID do produto na plataforma de vendas para o plano interno do Premier.
        </p>
        <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Novo Produto
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>ID Externo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{p.provider}</Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-300 font-mono">{p.provider_product_id}</TableCell>
                <TableCell className="text-sm text-white">{p.product_name}</TableCell>
                <TableCell className="text-xs text-gray-400">
                  {p.tier ? "Tier" : "Add-on"}
                </TableCell>
                <TableCell className="text-xs text-gray-300">
                  {p.tier ?? p.entitlement_key ?? "—"}
                </TableCell>
                <TableCell>
                  {p.active ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-500" />
                  )}
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
            ))}
            {products.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
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
  const [type, setType] = useState<"tier" | "addon">("tier");
  const [tierValue, setTierValue] = useState("basic");
  const [addonValue, setAddonValue] = useState("alavancagem");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setProvider(editing.provider);
      setExternalId(editing.provider_product_id);
      setName(editing.product_name);
      setActive(editing.active);
      if (editing.tier) {
        setType("tier");
        setTierValue(editing.tier);
      } else {
        setType("addon");
        setAddonValue(editing.entitlement_key ?? "alavancagem");
      }
    } else {
      setProvider("lastlink");
      setExternalId("");
      setName("");
      setType("tier");
      setTierValue("basic");
      setAddonValue("alavancagem");
      setActive(true);
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!externalId || !name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);

    const row = {
      provider,
      provider_product_id: externalId,
      product_name: name,
      tier: type === "tier" ? tierValue : null,
      entitlement_key: type === "addon" ? addonValue : null,
      active,
    };

    if (editing) {
      await supabase.from("products_catalog").update(row).eq("id", editing.id);
      toast.success("Produto atualizado");
    } else {
      await supabase.from("products_catalog").insert(row);
      toast.success("Produto cadastrado");
    }

    setSaving(false);
    onClose();
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Mapeie um produto externo para um plano do Premier.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Provider</label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-gray-800 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastlink">Lastlink</SelectItem>
                <SelectItem value="payt">Payt</SelectItem>
                <SelectItem value="hotmart">Hotmart</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {provider === "lastlink" ? "ID do Produto (UUID da Lastlink)" : "ID do produto na plataforma"}
            </label>
            <Input
              placeholder={provider === "lastlink" ? "Ex: 037d5e50-ab28-47dd-a916-b4f9916dcd8a" : "Ex: C343583F8"}
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
            {provider === "lastlink" && (
              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                <strong className="text-gray-400">Onde encontrar:</strong> Na Lastlink, vá em <strong className="text-gray-400">Produtos</strong>, clique para editar o produto e copie o código da URL:
                <br />
                <code className="text-yellow-400/80">.../products/<strong>[este-código]</strong>/edit</code>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Nome legível</label>
            <Input
              placeholder="Ex: Plano Básico Mensal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Tipo</label>
            <Select value={type} onValueChange={(v) => setType(v as "tier" | "addon")}>
              <SelectTrigger className="bg-gray-800 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tier">Tier (Plano)</SelectItem>
                <SelectItem value="addon">Add-on</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "tier" ? (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Plano</label>
              <Select value={tierValue} onValueChange={setTierValue}>
                <SelectTrigger className="bg-gray-800 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Add-on</label>
              <Select value={addonValue} onValueChange={setAddonValue}>
                <SelectTrigger className="bg-gray-800 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alavancagem">Alavancagem</SelectItem>
                  <SelectItem value="desaltas">Desaltas</SelectItem>
                  <SelectItem value="live_telegram">Live Telegram</SelectItem>
                  <SelectItem value="acesso_vitalicio">Acesso Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <span className="text-sm text-gray-300">Ativo</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
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

  const exportCsv = () => {
    if (logs.length === 0) { toast.error("Nenhum log para exportar"); return; }
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
    toast.success("CSV exportado!");
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-end justify-between">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Data Início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Data Fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
              Limpar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
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
              <TableHead>Data/Hora</TableHead>
              <TableHead>EventName</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const p = log.payload as Record<string, unknown> | null;
              const eventName = (p?.EventName ?? p?.action ?? "—") as string;
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
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">{eventName}</TableCell>
                    <TableCell className="text-xs text-gray-300">{email}</TableCell>
                  </TableRow>
                  {expandedId === log.id && (
                    <TableRow key={`${log.id}-detail`}>
                      <TableCell colSpan={5} className="bg-gray-900 p-4">
                        <p className="text-[10px] text-gray-500 mb-1">Payload completo:</p>
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
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  Nenhum log bruto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
