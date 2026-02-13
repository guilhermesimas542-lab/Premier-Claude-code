import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "../types";

export default function AdminClientsManage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newTier, setNewTier] = useState("free");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("users").select("*").order("created_at", { ascending: false }).limit(200);
    if (search) q = q.ilike("email", `%${search}%`);
    const { data } = await q;
    setUsers((data as unknown as AdminUser[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newEmail) { toast.error("Email obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase.from("users").insert({ email: newEmail.toLowerCase().trim(), main_tier: newTier as any });
    if (error) toast.error(error.message); else { toast.success("Cliente criado"); setShowCreate(false); setNewEmail(""); load(); }
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
    if (error) toast.error(error.message); else { toast.success("Atualizado"); setEditUser(null); load(); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Clientes</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Novo</Button>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Buscar email" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 bg-gray-900 border-gray-800" />
        <Button size="sm" onClick={load}>Buscar</Button>
      </div>

      {loading ? <div className="text-gray-400">Carregando…</div> : (
        <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Plano</th>
                <th className="px-3 py-2">Vitalício</th>
                <th className="px-3 py-2">Último acesso</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 text-gray-300 text-xs">
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.main_tier}</td>
                  <td className="px-3 py-2">{u.is_vitalicio ? "✅" : "—"}</td>
                  <td className="px-3 py-2">{u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setEditUser(u)} className="text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-600">Nenhum cliente</td></tr>}
            </tbody>
          </table>
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
              <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="basic">Basic</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="ultra">Ultra</SelectItem></SelectContent>
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
                  <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="basic">Basic</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="ultra">Ultra</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editUser.is_vitalicio} onCheckedChange={(v) => setEditUser({ ...editUser, is_vitalicio: v })} />
                <label className="text-sm">Vitalício</label>
              </div>
              <Button onClick={handleUpdate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
