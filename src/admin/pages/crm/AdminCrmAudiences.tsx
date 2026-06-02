import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Users, Pencil, Trash2, Loader2, Upload, Filter as FilterIcon, ListChecks, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudiences, type Audience, type AudienceFilters } from "../../hooks/crm/useAudiences";
import { AudienceBuilder } from "../../components/crm/AudienceBuilder";
import { AudienceImportModal } from "../../components/crm/AudienceImportModal";

/**
 * Audiências CRM (Tela 07) — versão funcional.
 * Lista + construtor reutilizável (também usado em Schedules e Jornadas no futuro).
 */
export default function AdminCrmAudiences() {
  const { items, loading, create, update, remove, refresh } = useAudiences();
  const location = useLocation();
  const navigate = useNavigate();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<Audience | null>(null);
  const [editing, setEditing] = useState<Audience | null>(null);
  const [initialFilters, setInitialFilters] = useState<AudienceFilters | undefined>(undefined);

  // Abre o builder pré-preenchido quando vem da aba Comportamento
  useEffect(() => {
    const st = location.state as { prefillBehavior?: any } | null;
    if (st?.prefillBehavior) {
      setEditing(null);
      setInitialFilters({ behavior: st.prefillBehavior });
      setBuilderOpen(true);
      // limpa o state pra não reabrir ao navegar de volta
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const handleNew = () => {
    setEditing(null);
    setBuilderOpen(true);
  };

  const handleEdit = (audience: Audience) => {
    setEditing(audience);
    setBuilderOpen(true);
  };

  const handleSave = async (payload: any) => {
    if (editing) {
      const ok = await update(editing.id, payload);
      return ok ? editing : null;
    }
    return await create(payload);
  };

  const handleDelete = async (audience: Audience) => {
    if (!confirm(`Excluir a audiência "${audience.name}"? Esta ação não pode ser desfeita.`)) return;
    await remove(audience.id);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Audiências</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Filtros reutilizáveis que definem quem entra em cada Schedule ou Jornada.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar lista
          </Button>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Audiência
          </Button>
        </div>
      </div>

      {/* Lista / empty state */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState onCreate={handleNew} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <Th>Nome</Th>
                <Th>Tipo</Th>
                <Th>Definição</Th>
                <Th>Criada em</Th>
                <Th className="text-right pr-4">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20">
                  <Td>
                    <div className="font-semibold text-foreground">{a.name}</div>
                    {a.description && (
                      <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[260px] mt-0.5">
                        {a.description}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <KindBadge kind={a.kind} />
                  </Td>
                  <Td>
                    {a.kind === "static_list" ? (
                      <span className="text-xs text-muted-foreground">
                        <strong className="text-foreground">
                          {(a.members_count ?? 0).toLocaleString("pt-BR")}
                        </strong>{" "}
                        contatos importados
                      </span>
                    ) : (
                      <FiltersChips filters={a.filters} />
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </Td>
                  <Td className="text-right pr-4">
                    <div className="flex justify-end gap-1">
                      {a.kind === "static_list" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUpdateTarget(a)}
                          title="Atualizar lista (nome e contatos)"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(a)}
                        disabled={a.kind === "static_list"}
                        title={
                          a.kind === "static_list"
                            ? "Use “Atualizar lista” pra editar nome e contatos"
                            : "Editar filtros"
                        }
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(a)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AudienceBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSave={handleSave}
        editing={editing}
      />

      <AudienceImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onCreated={() => refresh()}
      />

      <AudienceImportModal
        open={!!updateTarget}
        mode="update"
        audience={
          updateTarget
            ? { id: updateTarget.id, name: updateTarget.name, description: updateTarget.description }
            : null
        }
        onClose={() => setUpdateTarget(null)}
        onUpdated={() => {
          setUpdateTarget(null);
          refresh();
        }}
      />
    </div>
  );
}

function KindBadge({ kind }: { kind: "dynamic" | "static_list" }) {
  if (kind === "static_list") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
        style={{
          background: "rgba(168,85,247,0.15)",
          border: "1px solid rgba(168,85,247,0.4)",
          color: "#A855F7",
        }}
      >
        <ListChecks className="w-3 h-3" />
        Lista
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
      style={{
        background: "rgba(96,165,250,0.15)",
        border: "1px solid rgba(96,165,250,0.4)",
        color: "#60A5FA",
      }}
    >
      <FilterIcon className="w-3 h-3" />
      Filtros
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
        <Users className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1">Nenhuma audiência ainda</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        Crie sua primeira audiência combinando filtros de plano, status e comportamento.
        Ela ficará disponível pra reuso em Schedules e Jornadas.
      </p>
      <Button onClick={onCreate}>
        <Plus className="w-4 h-4 mr-2" />
        Criar primeira audiência
      </Button>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className ?? ""}`}>{children}</td>;
}

/** Mostra os filtros de forma compacta como chips coloridos. */
function FiltersChips({ filters }: { filters: AudienceFilters }) {
  const chips: { label: string; color: string }[] = [];

  if (filters.plans && filters.plans.length > 0) {
    chips.push({ label: `Plano: ${filters.plans.join(", ")}`, color: "#60A5FA" });
  }
  if (filters.status && filters.status.length > 0) {
    const labels = filters.status.map((s) =>
      s === "active" ? "ativo" : s === "inactive" ? "inativo" : "churn"
    );
    chips.push({ label: `Status: ${labels.join(", ")}`, color: "#FACC15" });
  }
  if (filters.days_since_login) {
    const { gte, lte } = filters.days_since_login;
    const range =
      gte !== undefined && lte !== undefined
        ? `${gte}-${lte}d`
        : gte !== undefined
          ? `≥${gte}d`
          : lte !== undefined
            ? `≤${lte}d`
            : "";
    chips.push({ label: `Sem login ${range}`, color: "#A855F7" });
  }

  if (filters.behavior) {
    const b = filters.behavior;
    const parts: string[] = [];
    if (b.league_names && b.league_names.length > 0) {
      parts.push(`${b.league_names.length} ligas`);
    }
    if (b.markets && b.markets.length > 0) {
      parts.push(`${b.markets.length} mercados`);
    }
    if (b.source && b.source !== "any") {
      parts.push(b.source === "chat" ? "Chat" : "Ao vivo");
    }
    if (typeof b.min_analyses === "number" && b.min_analyses > 1) {
      parts.push(`≥${b.min_analyses} análises`);
    }
    const w = b.window_days ?? 30;
    parts.push(`${w}d`);
    chips.push({ label: `Comportamento: ${parts.join(" · ")}`, color: "#22D3EE" });
  }

  if (chips.length === 0) {
    return <span className="text-xs text-muted-foreground italic">Sem filtros (todos)</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span
          key={i}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{
            background: `${c.color}20`,
            border: `1px solid ${c.color}50`,
            color: c.color,
          }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}
