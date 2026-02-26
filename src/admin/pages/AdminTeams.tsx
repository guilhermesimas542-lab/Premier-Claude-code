import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LogoInput } from "../components/LogoInput";

interface Team {
  id: string;
  name: string;
  logo_url: string;
  created_at: string;
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formName, setFormName] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTeams = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("teams")
      .select("*")
      .order("name");
    if (error) toast.error(error.message);
    else setTeams((data as Team[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, []);

  const openCreate = () => {
    setEditingTeam(null);
    setFormName("");
    setFormLogoUrl(null);
    setModalOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setFormName(team.name);
    setFormLogoUrl(team.logo_url);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!editingTeam && !formLogoUrl) { toast.error("Envie um logo"); return; }
    setSaving(true);

    const logoUrl = formLogoUrl || editingTeam?.logo_url || "";

    if (editingTeam) {
      const { error } = await (supabase as any)
        .from("teams")
        .update({ name: formName.trim(), logo_url: logoUrl })
        .eq("id", editingTeam.id);
      if (error) toast.error(error.message);
      else toast.success("Time atualizado!");
    } else {
      const { error } = await (supabase as any)
        .from("teams")
        .insert({ name: formName.trim(), logo_url: logoUrl });
      if (error) toast.error(error.message);
      else toast.success("Time adicionado!");
    }

    setSaving(false);
    setModalOpen(false);
    fetchTeams();
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Excluir "${team.name}"?`)) return;
    const { error } = await (supabase as any).from("teams").delete().eq("id", team.id);
    if (error) toast.error(error.message);
    else { toast.success("Time excluído"); fetchTeams(); }
  };

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gerenciar Times</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Novo Time
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Buscar time..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-gray-900 border-gray-800"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Logo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                    Nenhum time cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <img src={team.logo_url} alt={team.name} className="w-10 h-10 object-contain rounded" />
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(team)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(team)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-gray-500">{teams.length} times cadastrados</p>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Editar Time" : "Novo Time"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Nome do Time *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Flamengo"
                className="bg-muted/30 border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Logo (PNG/JPG/WebP) *</label>
              <div className="mt-1">
                <LogoInput
                  onUploadComplete={(url) => setFormLogoUrl(url)}
                  currentPreview={formLogoUrl}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingTeam ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
