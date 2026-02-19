import { useEffect, useState } from "react";
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
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "../types";

interface UserWithUpsells extends AdminUser {
  upsells: string[];
}

const UPSELL_LABELS: Record<string, string> = {
  alavancagem: "Alavancagem",
  desaltas: "Odds Altas",
  acesso_vitalicio: "Vitalício",
};

export default function AdminClientsManage() {
  const [users, setUsers] = useState<UserWithUpsells[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Date filters
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [lastSeenFrom, setLastSeenFrom] = useState("");
  const [lastSeenTo, setLastSeenTo] = useState("");

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserWithUpsells | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newTier, setNewTier] = useState("free");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);

    // Build users query
    let q = supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200);

    if (search) q = q.ilike("email", `%${search}%`);
    if (createdFrom) q = q.gte("created_at", createdFrom);
    if (createdTo) q = q.lte("created_at", createdTo + "T23:59:59");
    if (lastSeenFrom) q = q.gte("last_seen_at", lastSeenFrom);
    if (lastSeenTo) q = q.lte("last_seen_at", lastSeenTo + "T23:59:59");

    const { data, count } = await q;
    const rawUsers = (data as unknown as AdminUser[]) ?? [];
    setTotalCount(count ?? 0);

    if (rawUsers.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Fetch active entitlements for displayed users
    const userIds = rawUsers.map((u) => u.id);
    const { data: entData } = await supabase
      .from("entitlements")
      .select("user_id, product_key")
      .in("user_id", userIds)
      .eq("status", "active");

    // Build upsell map
    const upsellMap: Record<string, string[]> = {};
    (entData ?? []).forEach((e) => {
      const label = UPSELL_LABELS[e.product_key];
      if (!label) return;
      if (!upsellMap[e.user_id]) upsellMap[e.user_id] = [];
      if (!upsellMap[e.user_id].includes(label)) {
        upsellMap[e.user_id].push(label);
      }
    });

    setUsers(
      rawUsers.map((u) => ({
        ...u,
        upsells: upsellMap[u.id] ?? [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newEmail) { toast.error("Email obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .insert({ email: newEmail.toLowerCase().trim(), main_tier: newTier as any });
    if (error) toast.error(error.message);
    else { toast.success("Cliente criado"); setShowCreate(false); setNewEmail(""); load(); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase.from("users").update({
      main_tier: editUser.main_tier as any,
      is_vitalicio: editUser.is_vitalicio,
      vitalicio_since: editUser.is_vitalicio ? editUser.vitalicio_since || new Date().toISOString() : null,
    }).eq("id", editUser.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); setEditUser(null); load(); }
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
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Clientes</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-white/10 rounded-xl p-4 space-y-3">
        {/* Email search */}
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Buscar email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-gray-800 border-gray-700"
          />
          <Button size="sm" onClick={load}>Buscar</Button>
          <Button size="sm" variant="outline" onClick={() => {
            setSearch(""); setCreatedFrom(""); setCreatedTo("");
            setLastSeenFrom(""); setLastSeenTo("");
          }} className="border-gray-700 text-gray-400">
            Limpar filtros
          </Button>
        </div>

        {/* Date filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">Primeiro Acesso</p>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="bg-gray-800 border-gray-700 text-xs h-8"
              />
              <span className="text-gray-600 text-xs">até</span>
              <Input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="bg-gray-800 border-gray-700 text-xs h-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">Último Acesso</p>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={lastSeenFrom}
                onChange={(e) => setLastSeenFrom(e.target.value)}
                className="bg-gray-800 border-gray-700 text-xs h-8"
              />
              <span className="text-gray-600 text-xs">até</span>
              <Input
                type="date"
                value={lastSeenTo}
                onChange={(e) => setLastSeenTo(e.target.value)}
                className="bg-gray-800 border-gray-700 text-xs h-8"
              />
            </div>
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
          <table className="w-full text-sm min-w-[850px]">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Telefone</th>
                <th className="px-3 py-2">Plano</th>
                <th className="px-3 py-2">Upsell</th>
                <th className="px-3 py-2">Primeiro Acesso</th>
                <th className="px-3 py-2">Último Acesso</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 text-gray-300 text-xs hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 text-gray-500">{u.phone ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="capitalize">{u.main_tier}</span>
                  </td>
                  <td className="px-3 py-2">
                    {u.upsells.length > 0 ? (
                      <span className="text-amber-400">{u.upsells.join(", ")}</span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">{fmt(u.created_at)}</td>
                  <td className="px-3 py-2">{fmt(u.last_seen_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditUser(u)} className="text-blue-400 hover:text-blue-300 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteUser(u)} className="text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-600">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Select value={newTier} onValueChange={setNewTier}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="ultra">Ultra</SelectItem>
              </SelectContent>
            </Select>
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
            <div className="space-y-3">
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
              <div className="flex items-center gap-3">
                <Switch
                  checked={editUser.is_vitalicio}
                  onCheckedChange={(v) => setEditUser({ ...editUser, is_vitalicio: v })}
                />
                <label className="text-sm">Vitalício</label>
              </div>
              <Button onClick={handleUpdate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
