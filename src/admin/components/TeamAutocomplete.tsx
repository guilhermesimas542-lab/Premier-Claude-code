import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogoInput } from "./LogoInput";

interface Team {
  id: string;
  name: string;
  logo_url: string;
}

interface TeamAutocompleteProps {
  label: string;
  value: string;
  logoUrl: string;
  onChange: (name: string, logoUrl: string) => void;
}

export function TeamAutocomplete({ label, value, logoUrl, onChange }: TeamAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Team[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (supabase as any).from("teams").select("*").order("name").then(({ data }: any) => {
      setAllTeams((data as Team[]) || []);
    });
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val, ""); // clear logo when typing manually
    if (val.trim().length > 0) {
      const filtered = allTeams.filter((t) =>
        t.name.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (team: Team) => {
    setQuery(team.name);
    onChange(team.name, team.logo_url);
    setShowSuggestions(false);
  };

  const handleAddTeam = async () => {
    if (!newName.trim() || !newLogoUrl) { toast.error("Preencha nome e logo"); return; }
    setSaving(true);

    const { data: inserted, error: insErr } = await (supabase as any)
      .from("teams")
      .insert({ name: newName.trim(), logo_url: newLogoUrl })
      .select()
      .single();

    if (insErr) { toast.error(insErr.message); setSaving(false); return; }

    const team = inserted as Team;
    setAllTeams((prev) => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(team.name, team.logo_url);
    setQuery(team.name);
    toast.success("Time adicionado!");
    setAddModalOpen(false);
    setNewName("");
    setNewLogoUrl(null);
    setSaving(false);
  };

  const noResults = query.trim().length > 1 && suggestions.length === 0 && showSuggestions;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-xs text-gray-500">{label} *</label>
      <div className="flex items-center gap-2">
        {logoUrl && (
          <img src={logoUrl} alt="" className="w-8 h-8 object-contain rounded bg-gray-800 p-0.5 shrink-0" />
        )}
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (query.trim().length > 0) setShowSuggestions(true); }}
          placeholder="Digite o nome do time..."
          className="bg-gray-900 border-gray-800"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map((team) => (
            <button
              key={team.id}
              onClick={() => handleSelect(team)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-left transition-colors"
            >
              <img src={team.logo_url} alt="" className="w-7 h-7 object-contain rounded" />
              <span className="text-sm text-white">{team.name}</span>
            </button>
          ))}
        </div>
      )}

      {noResults && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3">
          <p className="text-xs text-gray-500 mb-2">Nenhum time encontrado</p>
          <button
            onClick={() => { setNewName(query); setAddModalOpen(true); setShowSuggestions(false); }}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            <Plus className="w-4 h-4" /> Adicionar "{query}"
          </button>
        </div>
      )}

      {/* Add Team Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-muted/30 border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Logo (PNG/JPG/WebP)</label>
              <div className="mt-1">
                <LogoInput onUploadComplete={(url) => setNewLogoUrl(url)} currentPreview={newLogoUrl} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddTeam} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
