import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Pencil, Search, RefreshCw } from "lucide-react";
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
  const [teamUsage, setTeamUsage] = useState<Record<string, number>>({});
  const [sortKey, setSortKey] = useState<"name" | "usage">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  const fetchTeamUsage = async () => {
    const { data } = await (supabase as any)
      .from("content_entries")
      .select("team1_name, team2_name");

    if (!data) return;

    const counts: Record<string, number> = {};
    for (const entry of data) {
      if (entry.team1_name) {
        counts[entry.team1_name] = (counts[entry.team1_name] || 0) + 1;
      }
      if (entry.team2_name) {
        counts[entry.team2_name] = (counts[entry.team2_name] || 0) + 1;
      }
    }
    setTeamUsage(counts);
  };

  useEffect(() => { fetchTeams(); fetchTeamUsage(); }, []);

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
    fetchTeamUsage();
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Excluir "${team.name}"?`)) return;
    const { error } = await (supabase as any).from("teams").delete().eq("id", team.id);
    if (error) toast.error(error.message);
    else { toast.success("Time excluído"); fetchTeams(); fetchTeamUsage(); }
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "usage" ? "desc" : "asc");
    }
  };

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const sortedTeams = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") {
        const cmp = (a.name ?? "").localeCompare(b.name ?? "");
        return sortDir === "asc" ? cmp : -cmp;
      } else {
        const aCount = teamUsage[a.name] || 0;
        const bCount = teamUsage[b.name] || 0;
        return sortDir === "asc" ? aCount - bCount : bCount - aCount;
      }
    });
  }, [filtered, teamUsage, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Gerenciar Times</h2>
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-white">
            {teams.length}
          </span>
          <button
            onClick={() => { fetchTeams(); fetchTeamUsage(); }}
            className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Novo Time
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar time..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/30 border-border"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Logo</TableHead>
                <TableHead
                  onClick={() => toggleSort("name")}
                  className="cursor-pointer hover:text-white transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    Nome
                    {sortKey === "name" && (
                      <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => toggleSort("usage")}
                  className="w-20 cursor-pointer hover:text-white transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    Uso
                    {sortKey === "usage" && (
                      <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum time cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                sortedTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <img src={team.logo_url} alt={team.name} className="w-10 h-10 object-contain rounded" />
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        (teamUsage[team.name] || 0) > 0
                          ? "bg-green-600/20 text-green-400"
                          : "bg-muted/30 text-muted-foreground"
                      }`}>
                        {teamUsage[team.name] || 0}
                      </span>
                    </TableCell>
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

      <p className="text-xs text-muted-foreground">{teams.length} times cadastrados</p>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-background border-border max-w-md">
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
              <label className="text-xs text-muted-foreground">Logo (PNG/JPG/WebP) * <span className="text-muted-foreground">(200 x 200 px)</span></label>
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
