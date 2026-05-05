import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Loader2, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Copy, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "../types";
import { ClientProfileModal } from "../components/ClientProfileModal";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

interface BettingHouseOption { id: string; name: string; }

interface UserWithUpsells extends AdminUser {
  upsells: string[];
  betting_house_id: string | null;
}

// Colors per house (cycling through a palette)
const HOUSE_BADGE_COLORS = [
  "bg-green-500/20 text-green-400 border-green-400/30",
  "bg-blue-500/20 text-blue-400 border-blue-400/30",
  "bg-purple-500/20 text-purple-400 border-purple-400/30",
  "bg-orange-500/20 text-orange-400 border-orange-400/30",
  "bg-pink-500/20 text-pink-400 border-pink-400/30",
];


type SortKey = "email" | "phone" | "main_tier" | "upsells" | "created_at" | "first_access_at" | "last_seen_at";
type SortDir = "asc" | "desc";

const UPSELL_KEYS = ["alavancagem", "multiplas_bingo", "acesso_vitalicio", "live_telegram"];

const PAGE_SIZE = 200;

const UPSELL_LABELS: Record<string, string> = {
  alavancagem: "Alavancagem",
  multiplas_bingo: "Múltiplas / Bingo",
  acesso_vitalicio: "Vitalício",
  live_telegram: "Live",
};

const UPSELL_BADGES = [
  { key: "alavancagem", letter: "A", activeColor: "bg-blue-500 text-white", title: "Alavancagem" },
  { key: "multiplas_bingo", letter: "M", activeColor: "bg-yellow-500 text-white", title: "Múltiplas / Bingo" },
  { key: "acesso_vitalicio", letter: "V", activeColor: "bg-purple-500 text-white", title: "Vitalício" },
  { key: "live_telegram", letter: "L", activeColor: "bg-green-500 text-white", title: "Live" },
];
const ADDON_TOGGLES = [
  { key: "alavancagem", label: "Alavancagem" },
  { key: "multiplas_bingo", label: "Múltiplas / Bingo" },
  { key: "live_telegram", label: "Live Telegram" },
  { key: "acesso_vitalicio", label: "Vitalício" },
] as const;

const TIER_PILLS = [
  { value: "free", label: "Free" },
  { value: "basic", label: "Básico" },
  { value: "pro", label: "Pro" },
  { value: "ultra", label: "Ultra" },
] as const;

const ADDON_PILLS = [
  { value: "alavancagem", label: "Alavancagem" },
  { value: "multiplas_bingo", label: "Múltiplas / Bingo" },
  { value: "live_telegram", label: "Live Telegram" },
  { value: "acesso_vitalicio", label: "Acesso Vitalício" },
] as const;

export default function AdminClientsManage() {
  const { selectedHouseId, houses: adminHouses } = useBettingHouseAdmin();
  const [users, setUsers] = useState<UserWithUpsells[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [search, setSearch] = useState("");

  const [liberacaoFrom, setLiberacaoFrom] = useState("");
  const [liberacaoTo, setLiberacaoTo] = useState("");
  const [firstAccessFrom, setFirstAccessFrom] = useState("");
  const [firstAccessTo, setFirstAccessTo] = useState("");
  const [lastSeenFrom, setLastSeenFrom] = useState("");
  const [lastSeenTo, setLastSeenTo] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("last_seen_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editHouseId, setEditHouseId] = useState<string>("");
  const [editAddons, setEditAddons] = useState<Record<string, boolean>>({});
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserWithUpsells | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newTier, setNewTier] = useState("free");
  const [newOrigin, setNewOrigin] = useState("gift");
  const [newHouseId, setNewHouseId] = useState<string>("");
  const [houses, setHouses] = useState<BettingHouseOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Tier & addon pill filters
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [filterNotAccessed, setFilterNotAccessed] = useState(false);
  const [liberacaoPopup, setLiberacaoPopup] = useState<{
    email: string;
    createdAt: string;
    tier: string;
  } | null>(null);

  // Build a map of house id → badge color
  const houseColorMap: Record<string, string> = {};
  adminHouses.forEach((h, i) => {
    houseColorMap[h.id] = HOUSE_BADGE_COLORS[i % HOUSE_BADGE_COLORS.length];
  });

  const handleSort = (col: SortKey) => {
    if (col === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir("asc"); }
  };

  const openEdit = async (u: AdminUser & { betting_house_id?: string | null }) => {
    setEditUser(u);
    setEditHouseId(u.betting_house_id ?? "");
    setLoadingAddons(true);
    const { data } = await supabase
      .from("entitlements")
      .select("product_key")
      .eq("user_id", u.id)
      .eq("status", "active");
    const activeKeys = (data ?? []).map((e) => e.product_key as string);
    const addonState: Record<string, boolean> = {};
    ADDON_TOGGLES.forEach(({ key }) => { addonState[key] = activeKeys.includes(key); });
    setEditAddons(addonState);
    setLoadingAddons(false);
  };

  const load = useCallback(async (overrides?: {
    search?: string;
    liberacaoFrom?: string;
    liberacaoTo?: string;
    firstAccessFrom?: string;
    firstAccessTo?: string;
    lastSeenFrom?: string;
    lastSeenTo?: string;
    selectedTier?: string | null;
    selectedAddons?: string[];
    filterNotAccessed?: boolean;
  }) => {
    setLoading(true);

    const s = overrides?.search ?? search;
    const tier = overrides?.selectedTier !== undefined ? overrides.selectedTier : selectedTier;
    const addons = overrides?.selectedAddons !== undefined ? overrides.selectedAddons : selectedAddons;

    let q = supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
    if (s) q = q.or(`email.ilike.%${s}%,phone.ilike.%${s}%`);
    if (tier) q = q.eq("main_tier", tier as any);

    // Filtro Liberação (created_at)
    const libFrom = overrides?.liberacaoFrom ?? liberacaoFrom;
    const libTo = overrides?.liberacaoTo ?? liberacaoTo;
    if (libFrom) q = q.gte("created_at", libFrom);
    if (libTo) q = q.lte("created_at", libTo + "T23:59:59");

    // Filtro 1º Acesso (first_access_at)
    const faFrom = overrides?.firstAccessFrom ?? firstAccessFrom;
    const faTo = overrides?.firstAccessTo ?? firstAccessTo;
    if (faFrom) q = q.gte("first_access_at", faFrom);
    if (faTo) q = q.lte("first_access_at", faTo + "T23:59:59");

    // Filtro Último Acesso (last_seen_at)
    const lf = overrides?.lastSeenFrom ?? lastSeenFrom;
    const lt = overrides?.lastSeenTo ?? lastSeenTo;
    if (lf) q = q.gte("last_seen_at", lf);
    if (lt) q = q.lte("last_seen_at", lt + "T23:59:59");
    if (selectedHouseId) q = q.or(`betting_house_id.eq.${selectedHouseId},betting_house_id.is.null`);

    const notAccessed = overrides?.filterNotAccessed !== undefined ? overrides.filterNotAccessed : filterNotAccessed;
    if (notAccessed) {
      q = q.is("first_access_at", null).neq("main_tier", "free" as any);
    }

    const { data, count } = await q;
    const rawUsers = (data as unknown as AdminUser[]) ?? [];
    setTotalCount(count ?? 0);

    if (rawUsers.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const userIds = rawUsers.map((u) => u.id);
    const { data: entData } = await supabase
      .from("entitlements")
      .select("user_id, product_key")
      .in("user_id", userIds)
      .eq("status", "active");

    const upsellMap: Record<string, string[]> = {};
    const entKeyMap: Record<string, string[]> = {}; // user_id → product_key[]
    (entData ?? []).forEach((e) => {
      const label = UPSELL_LABELS[e.product_key];
      if (!label) return;
      if (!upsellMap[e.user_id]) upsellMap[e.user_id] = [];
      if (!upsellMap[e.user_id].includes(label)) {
        upsellMap[e.user_id].push(label);
      }
      if (!entKeyMap[e.user_id]) entKeyMap[e.user_id] = [];
      if (!entKeyMap[e.user_id].includes(e.product_key)) {
        entKeyMap[e.user_id].push(e.product_key);
      }
    });

    let filtered = rawUsers;
    // Filter by addons: user must have ALL selected addons
    if (addons.length > 0) {
      filtered = filtered.filter((u: any) => {
        const keys = entKeyMap[u.id] ?? [];
        return addons.every((a) => keys.includes(a));
      });
    }

    setUsers(
      filtered.map((u: any) => ({
        ...u,
        upsells: upsellMap[u.id] ?? [],
        betting_house_id: u.betting_house_id ?? null,
      }))
    );
    setLoading(false);
  }, [search, liberacaoFrom, liberacaoTo, firstAccessFrom, firstAccessTo, lastSeenFrom, lastSeenTo, selectedHouseId, selectedTier, selectedAddons, filterNotAccessed, currentPage]);

  useEffect(() => {
    load();
    supabase.from("betting_houses").select("id, name").eq("is_active", true).order("created_at").then(({ data }) => {
      setHouses((data as BettingHouseOption[]) ?? []);
    });
  }, [selectedHouseId]);

  // Reactive filter on tier/addon changes
  useEffect(() => {
    load();
  }, [selectedTier, selectedAddons, filterNotAccessed, currentPage]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [search, selectedTier, selectedAddons, liberacaoFrom, liberacaoTo, firstAccessFrom, firstAccessTo, lastSeenFrom, lastSeenTo, selectedHouseId, filterNotAccessed]);

  // Helper: fetch ALL filtered users (paginating internally beyond Supabase 1000-row cap)
  // TODO: filtro de add-ons não aplicado aqui (requer join com entitlements).
  const fetchAllFiltered = async (columns: string = "email,phone"): Promise<any[]> => {
    const BATCH = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      let q = supabase
        .from("users")
        .select(columns)
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .range(from, from + BATCH - 1);

      const s = search.trim();
      if (s) q = q.or(`email.ilike.%${s}%,phone.ilike.%${s}%`);
      if (selectedTier) q = q.eq("main_tier", selectedTier as any);
      if (liberacaoFrom) q = q.gte("created_at", liberacaoFrom);
      if (liberacaoTo) q = q.lte("created_at", liberacaoTo + "T23:59:59");
      if (firstAccessFrom) q = q.gte("first_access_at", firstAccessFrom);
      if (firstAccessTo) q = q.lte("first_access_at", firstAccessTo + "T23:59:59");
      if (lastSeenFrom) q = q.gte("last_seen_at", lastSeenFrom);
      if (lastSeenTo) q = q.lte("last_seen_at", lastSeenTo + "T23:59:59");
      if (selectedHouseId) q = q.or(`betting_house_id.eq.${selectedHouseId},betting_house_id.is.null`);
      if (filterNotAccessed) q = q.is("first_access_at", null).neq("main_tier", "free" as any);

      const { data } = await q;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        if (data.length < BATCH) hasMore = false;
        else from += BATCH;
      }
    }
    return allData;
  };

  const handleTierFilter = (tier: string) => {
    setSelectedTier((prev) => (prev === tier ? null : tier));
  };

  const handleAddonFilter = (addon: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    );
  };

  const handleClearFilters = () => {
    setSearch("");
    setLiberacaoFrom("");
    setLiberacaoTo("");
    setFirstAccessFrom("");
    setFirstAccessTo("");
    setLastSeenFrom("");
    setLastSeenTo("");
    setSelectedTier(null);
    setSelectedAddons([]);
    setFilterNotAccessed(false);
    load({ search: "", liberacaoFrom: "", liberacaoTo: "", firstAccessFrom: "", firstAccessTo: "", lastSeenFrom: "", lastSeenTo: "", selectedTier: null, selectedAddons: [], filterNotAccessed: false });
  };

  const sortedUsers = sortUsers(users, sortKey, sortDir);

  // Bulk selection helpers
  const allVisibleSelected = sortedUsers.length > 0 && sortedUsers.every((u) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedUsers.map((u) => u.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);

    try {
      // Delete related records first (tables without CASCADE)
      await supabase.from("entitlements").delete().in("user_id", ids);
      await supabase.from("events").delete().in("user_id", ids);
      await supabase.from("orders").delete().in("user_id", ids);
      await supabase.from("sessions").delete().in("user_id", ids);
      await supabase.from("xp_events").delete().in("user_id", ids);
      await supabase.from("user_gamification").delete().in("user_id", ids);
      await supabase.from("user_popup_views").delete().in("user_id", ids);
      await supabase.from("push_subscriptions").delete().in("user_id", ids);
      await supabase.from("banner_analytics").delete().in("user_id", ids);

      // Delete users
      const { error } = await supabase.from("users").delete().in("id", ids);
      if (error) throw error;

      toast.success(`${ids.length} cliente${ids.length !== 1 ? "s" : ""} excluído${ids.length !== 1 ? "s" : ""} com sucesso`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      load();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + (err?.message ?? "erro desconhecido"));
    }
    setBulkDeleting(false);
  };

  const handleCreate = async () => {
    if (!newEmail) { toast.error("Email obrigatório"); return; }
    setSaving(true);
    let houseId = newHouseId;
    if (!houseId && houses.length > 0) houseId = houses[0].id;
    const { error } = await supabase
      .from("users")
      .insert({ email: newEmail.toLowerCase().trim(), main_tier: newTier as any, betting_house_id: houseId || null, origin: newOrigin } as any);
    if (error) toast.error(error.message);
    else { toast.success("Cliente criado"); setShowCreate(false); setNewEmail(""); setNewHouseId(""); setNewOrigin("gift"); load(); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setSaving(true);

    const { error } = await supabase.from("users").update({
      main_tier: editUser.main_tier as any,
      betting_house_id: editHouseId || null,
    }).eq("id", editUser.id);

    if (error) { toast.error(error.message); setSaving(false); return; }

    // Sync add-ons via entitlements
    for (const { key } of ADDON_TOGGLES) {
      const wantsActive = editAddons[key] ?? false;
      const { data: existing } = await supabase
        .from("entitlements")
        .select("id, status")
        .eq("user_id", editUser.id)
        .eq("product_key", key as any)
        .limit(1);

      if (wantsActive) {
        if (!existing || existing.length === 0) {
          await supabase.from("entitlements").insert({
            user_id: editUser.id,
            product_key: key as any,
            source: "admin",
            status: "active",
          });
        } else if (existing[0].status !== "active") {
          await supabase.from("entitlements").update({ status: "active" }).eq("id", existing[0].id);
        }
      } else {
        if (existing && existing.length > 0 && existing[0].status === "active") {
          await supabase.from("entitlements").update({ status: "revoked" }).eq("id", existing[0].id);
        }
      }
    }

    toast.success("Atualizado");
    setEditUser(null);
    load();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    const { error } = await supabase.from("users").delete().eq("id", deleteUser.id);
    if (error) toast.error(error.message);
    else { toast.success("Cliente excluído"); setDeleteUser(null); load(); }
    setDeleting(false);
  };

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleString("pt-BR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }) : "—";

  const handleCopyFilteredEmails = async () => {
    toast.info("Buscando todos os emails filtrados...");
    try {
      const allUsers = await fetchAllFiltered("email");
      const emails = allUsers.map((u: any) => u.email).filter(Boolean);
      if (emails.length === 0) {
        toast.error("Nenhum email nos resultados filtrados.");
        return;
      }
      await navigator.clipboard.writeText(emails.join(", "));
      toast.success(`${emails.length} emails copiados (todos os filtrados)!`);
    } catch {
      toast.error("Erro ao copiar emails.");
    }
  };

  const handleCopyFilteredPhones = async () => {
    toast.info("Buscando todos os telefones filtrados...");
    try {
      const allUsers = await fetchAllFiltered("phone");
      const phones = allUsers.map((u: any) => u.phone).filter(Boolean);
      if (phones.length === 0) {
        toast.error("Nenhum telefone nos resultados filtrados.");
        return;
      }
      await navigator.clipboard.writeText(phones.join(", "));
      toast.success(`${phones.length} telefones copiados (todos os filtrados)!`);
    } catch {
      toast.error("Erro ao copiar telefones.");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Email", "Telefone", "Plano", "Casa", "Liberação", "1º Acesso", "Último Acesso", "Acessou"];
    const rows = users.map((u: any) => [
      u.email ?? "",
      u.phone ?? "",
      u.main_tier ?? "",
      "Esportiva Bet",
      u.created_at ? new Date(u.created_at).toLocaleString("pt-BR") : "",
      u.first_access_at ? new Date(u.first_access_at).toLocaleString("pt-BR") : "Não acessou",
      u.last_seen_at ? new Date(u.last_seen_at).toLocaleString("pt-BR") : "—",
      u.first_access_at ? "Sim" : "Não",
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_premier_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    toast.info("Exportando todos os clientes filtrados...");
    try {
      const allUsers = await fetchAllFiltered("*");
      if (!allUsers || allUsers.length === 0) {
        toast.error("Nenhum cliente encontrado.");
        return;
      }
      const headers = ["Email", "Telefone", "Plano", "Casa", "Liberação", "1º Acesso", "Último Acesso", "Acessou"];
      const rows = allUsers.map((u: any) => [
        u.email ?? "",
        u.phone ?? "",
        u.main_tier ?? "",
        "Esportiva Bet",
        u.created_at ? new Date(u.created_at).toLocaleString("pt-BR") : "",
        u.first_access_at ? new Date(u.first_access_at).toLocaleString("pt-BR") : "Não acessou",
        u.last_seen_at ? new Date(u.last_seen_at).toLocaleString("pt-BR") : "—",
        u.first_access_at ? "Sim" : "Não",
      ]);
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes_premier_todos_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${allUsers.length} clientes exportados!`);
    } catch {
      toast.error("Erro ao exportar.");
    }
  };

  const thClass = "px-3 py-2 cursor-pointer select-none hover:text-gray-300 transition-colors";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Clientes</h2>
          <button
            onClick={() => load()}
            className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-red-300 font-medium">
            ✓ {selectedIds.size} cliente{selectedIds.size !== 1 ? "s" : ""} selecionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" onClick={() => setShowBulkDelete(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir selecionados
            </Button>
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-400" onClick={() => setSelectedIds(new Set())}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancelar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-900 border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Buscar email ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-gray-800 border-gray-700"
          />
          <Button size="sm" onClick={() => load()}>Buscar</Button>
          <Button size="sm" variant="outline" onClick={handleClearFilters} className="border-gray-700 text-gray-400">
            Limpar filtros
          </Button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm font-medium transition-colors"
          >
            Exportar filtrados
          </button>
          <button
            onClick={handleExportAll}
            className="px-4 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-sm font-medium transition-colors"
          >
            Exportar todos
          </button>
          <button
            onClick={handleCopyFilteredEmails}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm font-medium transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copiar emails filtrados
          </button>
          <button
            onClick={handleCopyFilteredPhones}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-sm font-medium transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copiar telefones filtrados
          </button>
        </div>

        {/* Pill filters */}
        <div className="flex gap-4 flex-wrap items-center pt-1">
          <div className="flex gap-1.5 items-center">
            {TIER_PILLS.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTierFilter(t.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  selectedTier === t.value
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-gray-700" />
          <div className="flex gap-1.5 items-center">
            {ADDON_PILLS.map((a) => (
              <button
                key={a.value}
                onClick={() => handleAddonFilter(a.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  selectedAddons.includes(a.value)
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-gray-700" />
          <button
            onClick={() => setFilterNotAccessed(!filterNotAccessed)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filterNotAccessed
                ? 'bg-red-600/30 text-red-400 ring-1 ring-red-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Não acessou
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Liberação</span>
            <Input type="date" value={liberacaoFrom} onChange={(e) => setLiberacaoFrom(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" value={liberacaoTo} onChange={(e) => setLiberacaoTo(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">1º Acesso</span>
            <Input type="date" value={firstAccessFrom} onChange={(e) => setFirstAccessFrom(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" value={firstAccessTo} onChange={(e) => setFirstAccessTo(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Último Acesso</span>
            <Input type="date" value={lastSeenFrom} onChange={(e) => setLastSeenFrom(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" value={lastSeenTo} onChange={(e) => setLastSeenTo(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8" />
          </div>
        </div>
      </div>

      {/* Counter */}
      {!loading && (
        <p className="text-xs text-gray-500">
          Exibindo <span className="text-gray-300 font-medium">{users.length}</span> de{" "}
          <span className="text-gray-300 font-medium">{totalCount}</span> clientes
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-gray-400 py-8 text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
                <th className="px-3 py-2 w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    className="border-gray-600"
                  />
                </th>
                <th className={thClass} onClick={() => handleSort("email")}>
                  <span className="flex items-center">Email <SortIcon col="email" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className="px-3 py-2 text-xs">Casa</th>
                <th className={thClass} onClick={() => handleSort("phone")}>
                  <span className="flex items-center">Telefone <SortIcon col="phone" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass} onClick={() => handleSort("main_tier")}>
                  <span className="flex items-center">Plano <SortIcon col="main_tier" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass} onClick={() => handleSort("upsells")}>
                  <span className="flex items-center">Upsell <SortIcon col="upsells" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={`${thClass} text-center`} onClick={() => handleSort("created_at")}>
                  <span className="flex items-center justify-center">Liberação <SortIcon col="created_at" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass} onClick={() => handleSort("first_access_at")}>
                  <span className="flex items-center">1º Acesso <SortIcon col="first_access_at" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass} onClick={() => handleSort("last_seen_at")}>
                  <span className="flex items-center">Último Acesso <SortIcon col="last_seen_at" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.id} className={`border-b border-white/5 text-gray-300 text-xs hover:bg-white/5 transition-colors ${selectedIds.has(u.id) ? "bg-white/5" : ""}`}>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selectedIds.has(u.id)}
                      onCheckedChange={() => toggleSelectOne(u.id)}
                      className="border-gray-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setProfileUserId(u.id)}
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors text-left truncate max-w-[200px]"
                      >
                        {u.email}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(u.email);
                          toast.success("Email copiado!");
                        }}
                        className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
                        title="Copiar email"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {u.betting_house_id ? (
                      (() => {
                        const house = adminHouses.find((h) => h.id === u.betting_house_id);
                        const colorClass = houseColorMap[u.betting_house_id] ?? "bg-gray-700/40 text-gray-400 border-gray-600/30";
                        return house ? (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium whitespace-nowrap ${colorClass}`}>
                            {house.name}
                          </span>
                        ) : <span className="text-gray-600">—</span>;
                      })()
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {u.phone ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-400">{u.phone}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(u.phone!);
                            toast.success("Número copiado!");
                          }}
                          title="Copiar número"
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`capitalize font-medium ${TIER_COLORS[u.main_tier] ?? "text-gray-300"}`}>
                      {u.main_tier}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <UpsellBadges upsells={u.upsells} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => setLiberacaoPopup({
                        email: u.email,
                        createdAt: u.created_at,
                        tier: u.main_tier,
                      })}
                      className="cursor-pointer hover:scale-110 transition-transform"
                    >
                      {u.main_tier !== 'free' ? (
                        <span className="text-green-400 text-lg">✅</span>
                      ) : (
                        <span className="text-red-400 text-lg">❌</span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    {(u as any).first_access_at ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-green-400 text-xs">✅</span>
                        <span>{fmt((u as any).first_access_at)}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600/30 text-red-400">
                        Não acessou
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{fmt(u.last_seen_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)} className="text-blue-400 hover:text-blue-300 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteUser(u)} className="text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-600">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between py-4 px-2">
          <span className="text-sm text-muted-foreground">
            Página {currentPage + 1} de {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
            {" · "}Exibindo {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} de {totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={(currentPage + 1) * PAGE_SIZE >= totalCount}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-gray-800 border-gray-700" />
            <Select value={newTier} onValueChange={setNewTier}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="ultra">Ultra</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <label className="text-xs text-gray-500">Origem do Usuário</label>
              <Select value={newOrigin} onValueChange={setNewOrigin}>
                <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gift">Brinde / Parceria</SelectItem>
                  <SelectItem value="test">Usuário de Teste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
          <DialogHeader><DialogTitle>Editar: {editUser?.email}</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Plano</label>
                <Select value={editUser.main_tier} onValueChange={(v) => setEditUser({ ...editUser, main_tier: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="ultra">Ultra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {houses.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500">Casa de Apostas</label>
                  <Select value={editHouseId} onValueChange={setEditHouseId}>
                    <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Selecionar casa" /></SelectTrigger>
                    <SelectContent>
                      {houses.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}


              <div className="border-t border-white/10 pt-3 space-y-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Add-ons</p>
                {loadingAddons ? (
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" /> Carregando add-ons…
                  </div>
                ) : (
                  ADDON_TOGGLES.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <Switch
                        checked={editAddons[key] ?? false}
                        onCheckedChange={(v) => setEditAddons((prev) => ({ ...prev, [key]: v }))}
                      />
                      <label className="text-sm">{label}</label>
                    </div>
                  ))
                )}
              </div>

              <Button onClick={handleUpdate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir <span className="text-white font-medium">{deleteUser?.email}</span>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Excluir clientes selecionados?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Você está prestes a excluir <span className="text-white font-medium">{selectedIds.size}</span> cliente{selectedIds.size !== 1 ? "s" : ""} permanentemente.
              <br />Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Excluir ${selectedIds.size} cliente${selectedIds.size !== 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Client Profile Modal */}
      <ClientProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />

      {liberacaoPopup && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={() => setLiberacaoPopup(null)}
        >
          <div 
            className="bg-[#0a1628] border border-border rounded-xl p-6 max-w-sm w-full mx-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-foreground font-bold text-lg">
              Detalhes da Liberação
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="text-foreground">{liberacaoPopup.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano:</span>
                <span className="text-foreground capitalize">{liberacaoPopup.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liberado em:</span>
                <span className="text-foreground">{fmt(liberacaoPopup.createdAt)}</span>
              </div>
            </div>
            <button
              onClick={() => setLiberacaoPopup(null)}
              className="w-full mt-4 py-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 text-sm font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
