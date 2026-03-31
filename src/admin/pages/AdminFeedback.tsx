import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, Image, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Feedback {
  id: string;
  user_id: string;
  email: string;
  category: string;
  message: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
}

type SortField = "email" | "category" | "created_at" | "status";
type SortDir = "asc" | "desc";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  bug: { bg: "rgba(239,68,68,0.15)", text: "#EF4444", label: "Bug" },
  sugestao: { bg: "rgba(59,130,246,0.15)", text: "#3B82F6", label: "Sugestão" },
  duvida: { bg: "rgba(234,179,8,0.15)", text: "#EAB308", label: "Dúvida" },
  outro: { bg: "rgba(148,163,184,0.15)", text: "#94A3B8", label: "Outro" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  novo: { bg: "rgba(0,255,127,0.15)", text: "#00FF7F", label: "Novo" },
  lido: { bg: "rgba(59,130,246,0.15)", text: "#3B82F6", label: "Lido" },
  resolvido: { bg: "rgba(148,163,184,0.15)", text: "#94A3B8", label: "Resolvido" },
};

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    let query = (supabase.from("user_feedback" as any).select("*") as any);

    if (filterCategory !== "all") query = query.eq("category", filterCategory);
    if (filterStatus !== "all") query = query.eq("status", filterStatus);

    query = query.order(sortField, { ascending: sortDir === "asc" });

    const { data, error } = await query;
    if (error) { console.error(error); toast.error("Erro ao carregar feedbacks"); }
    setFeedbacks((data as Feedback[]) || []);
    setLoading(false);
  }, [filterCategory, filterStatus, sortField, sortDir]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const totalCount = feedbacks.length;
  const newCount = feedbacks.filter((f) => f.status === "novo").length;

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await (supabase.from("user_feedback" as any).update({ status: newStatus } as any).eq("id", id) as any);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f)));
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from("user_feedback" as any).delete().eq("id", id) as any);
    if (error) { toast.error("Erro ao excluir"); return; }
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    setDeleteConfirm(null);
    toast.success("Feedback excluído");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1 inline text-blue-400" />
      : <ChevronDown className="w-3 h-3 ml-1 inline text-blue-400" />;
  };

  const FilterPills = ({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="px-3 py-1 rounded-full text-xs font-medium transition-all"
          style={{
            background: value === o.key ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
            border: value === o.key ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.1)",
            color: value === o.key ? "#60A5FA" : "#94A3B8",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <MessageSquare className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Feedback dos Clientes</h1>
        </div>
        <p className="text-sm text-gray-400">Feedbacks enviados pelos usuários do app</p>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-800/50 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-400">Total de Feedbacks</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-white">{totalCount}</p></CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-400">Novos (não lidos)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold" style={{ color: "#00FF7F" }}>{newCount}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <span className="text-xs text-gray-500 mr-2">Categoria:</span>
          <FilterPills
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { key: "all", label: "Todos" },
              { key: "bug", label: "Bug" },
              { key: "sugestao", label: "Sugestão" },
              { key: "duvida", label: "Dúvida" },
              { key: "outro", label: "Outro" },
            ]}
          />
        </div>
        <div>
          <span className="text-xs text-gray-500 mr-2">Status:</span>
          <FilterPills
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { key: "all", label: "Todos" },
              { key: "novo", label: "Novo" },
              { key: "lido", label: "Lido" },
              { key: "resolvido", label: "Resolvido" },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleSort("email")}>
                Email <SortIcon field="email" />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleSort("category")}>
                Categoria <SortIcon field="category" />
              </th>
              <th className="px-4 py-3">Mensagem</th>
              <th className="px-4 py-3">Screenshot</th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleSort("created_at")}>
                Data <SortIcon field="created_at" />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => toggleSort("status")}>
                Status <SortIcon field="status" />
              </th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
            ) : feedbacks.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum feedback encontrado</td></tr>
            ) : (
              feedbacks.map((fb) => {
                const cat = CATEGORY_COLORS[fb.category] || CATEGORY_COLORS.outro;
                const st = STATUS_COLORS[fb.status] || STATUS_COLORS.novo;
                const isExpanded = expandedId === fb.id;
                const truncated = fb.message.length > 100 ? fb.message.slice(0, 100) + "…" : fb.message;

                return (
                  <tr key={fb.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-white text-xs">{fb.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cat.bg, color: cat.text }}>
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-[250px]">
                      <span
                        className={fb.message.length > 100 ? "cursor-pointer hover:text-white" : ""}
                        onClick={() => fb.message.length > 100 && setExpandedId(isExpanded ? null : fb.id)}
                      >
                        {isExpanded ? fb.message : truncated}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {fb.screenshot_url ? (
                        <button onClick={() => setImageModal(fb.screenshot_url)} className="text-blue-400 hover:text-blue-300">
                          <Image className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {format(new Date(fb.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={fb.status}
                        onChange={(e) => handleStatusChange(fb.id, e.target.value)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold border-0 outline-none cursor-pointer"
                        style={{ background: st.bg, color: st.text }}
                      >
                        <option value="novo">Novo</option>
                        <option value="lido">Lido</option>
                        <option value="resolvido">Resolvido</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {deleteConfirm === fb.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2" onClick={() => handleDelete(fb.id)}>
                            Sim
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-gray-400" onClick={() => setDeleteConfirm(null)}>
                            Não
                          </Button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(fb.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Image Modal */}
      {imageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setImageModal(null)}>
          <img src={imageModal} alt="Screenshot" className="max-w-full max-h-[80vh] rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
