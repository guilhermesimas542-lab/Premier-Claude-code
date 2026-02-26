import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Pencil, Upload, X, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
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
    setFormFile(null);
    setFormPreview(null);
    setModalOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setFormName(team.name);
    setFormFile(null);
    setFormPreview(team.logo_url);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormFile(file);
    setFormPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (file: File, teamName: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${teamName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("team_logos").upload(fileName, file);
    if (error) { toast.error("Erro no upload: " + error.message); return null; }
    const { data } = supabase.storage.from("team_logos").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!editingTeam && !formFile) { toast.error("Selecione um logo"); return; }
    setSaving(true);

    let logoUrl = editingTeam?.logo_url || "";

    if (formFile) {
      const url = await uploadLogo(formFile, formName);
      if (!url) { setSaving(false); return; }
      logoUrl = url;
    }

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
              <label className="text-xs text-gray-500">Nome do Time *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Flamengo"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Logo (PNG/JPG) *</label>
              <div className="mt-1 flex items-center gap-4">
                {formPreview && (
                  <img src={formPreview} alt="Preview" className="w-16 h-16 object-contain rounded bg-gray-800 p-1" />
                )}
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer text-sm text-gray-300 border border-gray-700">
                  <Upload className="w-4 h-4" />
                  {formFile ? formFile.name : "Selecionar arquivo"}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
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
