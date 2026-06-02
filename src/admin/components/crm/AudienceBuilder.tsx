import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Loader2, X, Sparkles } from "lucide-react";
import type {
  Audience,
  AudienceFilters,
  AudienceBehaviorFilter,
  NewAudiencePayload,
} from "../../hooks/crm/useAudiences";
import { usePreviewAudience } from "../../hooks/crm/usePreviewAudience";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (payload: NewAudiencePayload) => Promise<Audience | null>;
  /** Audiência sendo editada. Se null, modo criação. */
  editing?: Audience | null;
  /** Filtros iniciais (modo criação). Útil pra abrir o builder pré-preenchido. */
  initialFilters?: AudienceFilters;
}

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
  { value: "diamante", label: "Diamante" },
  { value: "ultra", label: "Ultra" },
];

const STATUS_OPTIONS: Array<{ value: "active" | "inactive" | "churn_risk"; label: string; hint: string }> = [
  { value: "active", label: "Ativo", hint: "Login nos últimos 7 dias" },
  { value: "inactive", label: "Inativo", hint: "Sem login há 7-30 dias" },
  { value: "churn_risk", label: "Churn risk", hint: "Sem login há 30+ dias ou nunca" },
];

export function AudienceBuilder({ open, onClose, onSave, editing }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filters, setFilters] = useState<AudienceFilters>({});
  const [saving, setSaving] = useState(false);

  // Reset/populate quando abre
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setFilters(editing.filters ?? {});
    } else {
      setName("");
      setDescription("");
      setFilters({});
    }
  }, [open, editing]);

  // Preview em tempo real
  const { count, loading: previewLoading } = usePreviewAudience(filters, open);

  const togglePlan = (plan: string) => {
    setFilters((prev) => {
      const current = prev.plans ?? [];
      const next = current.includes(plan) ? current.filter((p) => p !== plan) : [...current, plan];
      return { ...prev, plans: next.length > 0 ? next : undefined };
    });
  };

  const toggleStatus = (status: "active" | "inactive" | "churn_risk") => {
    setFilters((prev) => {
      const current = prev.status ?? [];
      const next = current.includes(status) ? current.filter((s) => s !== status) : [...current, status];
      return { ...prev, status: next.length > 0 ? next : undefined };
    });
  };

  /**
   * Aplica um patch parcial no behavior. Quando o resultado fica vazio,
   * remove a chave behavior do filters pra simplificar comparações.
   */
  const patchBehavior = (patch: Partial<AudienceBehaviorFilter> | null) => {
    setFilters((prev) => {
      if (patch === null) {
        const { behavior, ...rest } = prev;
        return rest;
      }
      const current = prev.behavior ?? {};
      const next: AudienceBehaviorFilter = { ...current, ...patch };
      // Limpa chaves explicitamente undefined / arrays vazios
      const cleaned: AudienceBehaviorFilter = {};
      if (next.window_days != null) cleaned.window_days = next.window_days;
      if (next.league_names && next.league_names.length > 0)
        cleaned.league_names = next.league_names;
      if (next.markets && next.markets.length > 0) cleaned.markets = next.markets;
      if (next.source && next.source !== "any") cleaned.source = next.source;
      if (typeof next.min_analyses === "number" && next.min_analyses > 1)
        cleaned.min_analyses = next.min_analyses;
      if (next.last_analysis_age_days) {
        const { gte, lte } = next.last_analysis_age_days;
        const valid = gte != null || lte != null;
        if (valid) cleaned.last_analysis_age_days = { gte, lte };
      }
      if (Object.keys(cleaned).length === 0) {
        const { behavior, ...rest } = prev;
        return rest;
      }
      return { ...prev, behavior: cleaned };
    });
  };

  const updateDaysRange = (field: "gte" | "lte", value: string) => {
    const num = value === "" ? undefined : parseInt(value, 10);
    if (num !== undefined && (isNaN(num) || num < 0)) return;
    setFilters((prev) => {
      const current = prev.days_since_login ?? {};
      const next = { ...current, [field]: num };
      const isEmpty = next.gte === undefined && next.lte === undefined;
      return { ...prev, days_since_login: isEmpty ? undefined : next };
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const result = await onSave({
      name: name.trim(),
      description: description.trim() || null,
      filters,
    });
    setSaving(false);
    if (result) onClose();
  };

  const isEmpty = Object.keys(filters).filter((k) => (filters as any)[k] !== undefined).length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar audiência" : "Nova audiência"}</DialogTitle>
          <DialogDescription>
            Defina os filtros que selecionam quem entra nos disparos e jornadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Identificação */}
          <div className="space-y-2">
            <Label htmlFor="audience-name">Nome *</Label>
            <Input
              id="audience-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Premium ativos · Churn 30d+"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audience-desc">Descrição (opcional)</Label>
            <Textarea
              id="audience-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pra que serve essa audiência? Quando usar?"
              rows={2}
            />
          </div>

          {/* Plano */}
          <FilterGroup title="Plano" hint="Selecione um ou mais planos">
            <div className="flex flex-wrap gap-2">
              {PLAN_OPTIONS.map((opt) => {
                const active = (filters.plans ?? []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => togglePlan(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-foreground/70 border-border hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* Status */}
          <FilterGroup title="Status comportamental" hint="Baseado em último login">
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const active = (filters.status ?? []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleStatus(opt.value)}
                    className={`w-full flex items-start justify-between text-left p-3 rounded-lg border transition-colors ${
                      active
                        ? "bg-primary/10 border-primary"
                        : "bg-transparent border-border hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                      <div className="text-[11px] text-muted-foreground">{opt.hint}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border-2 mt-0.5 ${
                        active ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* Dias sem login */}
          <FilterGroup title="Dias sem login" hint="Range customizado (de X a Y dias)">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={filters.days_since_login?.gte ?? ""}
                onChange={(e) => updateDaysRange("gte", e.target.value)}
                placeholder="Mín"
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">a</span>
              <Input
                type="number"
                min="0"
                value={filters.days_since_login?.lte ?? ""}
                onChange={(e) => updateDaysRange("lte", e.target.value)}
                placeholder="Máx"
                className="w-24"
              />
              <span className="text-xs text-muted-foreground ml-2">dias</span>
            </div>
          </FilterGroup>

          {/* Comportamento na IA Tipster */}
          <BehaviorSection
            value={filters.behavior}
            onChange={patchBehavior}
          />
        </div>

        {/* Preview */}
        <div
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 sticky bottom-0"
          style={{ marginTop: "1rem" }}
        >
          <Users className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            {isEmpty ? (
              <p className="text-sm text-muted-foreground">
                Sem filtros — vai contar todos os leads
              </p>
            ) : null}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {previewLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                ) : (
                  count?.toLocaleString("pt-BR") ?? "—"
                )}
              </span>
              <span className="text-xs text-muted-foreground">leads neste filtro</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editing ? "Salvar alterações" : "Criar audiência"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-bold uppercase tracking-wide text-foreground">{title}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

// ============================================================
// Seção comportamento — filtros baseados em events
// ============================================================

const SOURCE_OPTIONS: Array<{ value: "any" | "chat" | "live"; label: string }> = [
  { value: "any", label: "Qualquer" },
  { value: "chat", label: "Chat" },
  { value: "live", label: "Ao vivo" },
];

const WINDOW_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

function BehaviorSection({
  value,
  onChange,
}: {
  value: AudienceBehaviorFilter | undefined;
  onChange: (patch: Partial<AudienceBehaviorFilter> | null) => void;
}) {
  const v = value ?? {};
  const windowDays = v.window_days ?? 30;
  const source = v.source ?? "any";
  const minAnalyses = v.min_analyses ?? 1;

  const [leagueDraft, setLeagueDraft] = useState("");
  const [marketDraft, setMarketDraft] = useState("");

  const addToList = (
    field: "league_names" | "markets",
    val: string,
    setDraft: (s: string) => void
  ) => {
    const v2 = val.trim();
    if (!v2) return;
    const current = (value?.[field] ?? []) as string[];
    if (current.some((x) => x.toLowerCase() === v2.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange({ [field]: [...current, v2] } as any);
    setDraft("");
  };

  const removeFromList = (field: "league_names" | "markets", val: string) => {
    const current = (value?.[field] ?? []) as string[];
    onChange({ [field]: current.filter((x) => x !== val) } as any);
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <div className="text-sm font-bold uppercase tracking-wide text-foreground">
              Comportamento na IA Tipster
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Filtra leads que geraram análise — por campeonato, mercado, frequência ou recência.
          </div>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive font-bold"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Janela de tempo */}
      <div>
        <Label className="text-xs mb-1.5 block">Janela de tempo</Label>
        <div className="flex gap-1">
          {WINDOW_OPTIONS.map((o) => {
            const active = windowDays === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange({ window_days: o.value })}
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Origem */}
      <div>
        <Label className="text-xs mb-1.5 block">Onde gerou a análise</Label>
        <div className="flex gap-1">
          {SOURCE_OPTIONS.map((o) => {
            const active = source === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange({ source: o.value })}
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Campeonatos */}
      <div>
        <Label className="text-xs mb-1.5 block">
          Campeonatos analisados (qualquer um conta)
        </Label>
        <div className="flex gap-2">
          <Input
            value={leagueDraft}
            onChange={(e) => setLeagueDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addToList("league_names", leagueDraft, setLeagueDraft);
              }
            }}
            placeholder="Ex: Brasileirão, Premier League..."
            className="text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addToList("league_names", leagueDraft, setLeagueDraft)}
            disabled={!leagueDraft.trim()}
          >
            Adicionar
          </Button>
        </div>
        {(v.league_names ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(v.league_names ?? []).map((l) => (
              <Chip key={l} label={l} onRemove={() => removeFromList("league_names", l)} />
            ))}
          </div>
        )}
      </div>

      {/* Mercados */}
      <div>
        <Label className="text-xs mb-1.5 block">
          Mercados consumidos (match parcial)
        </Label>
        <div className="flex gap-2">
          <Input
            value={marketDraft}
            onChange={(e) => setMarketDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addToList("markets", marketDraft, setMarketDraft);
              }
            }}
            placeholder="Ex: Over 2.5, BTTS Não, Handicap..."
            className="text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addToList("markets", marketDraft, setMarketDraft)}
            disabled={!marketDraft.trim()}
          >
            Adicionar
          </Button>
        </div>
        {(v.markets ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(v.markets ?? []).map((m) => (
              <Chip key={m} label={m} onRemove={() => removeFromList("markets", m)} />
            ))}
          </div>
        )}
      </div>

      {/* Frequência mínima */}
      <div>
        <Label className="text-xs mb-1.5 block">
          Mínimo de análises na janela
        </Label>
        <Input
          type="number"
          min={1}
          value={minAnalyses}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange({ min_analyses: isNaN(n) || n < 1 ? 1 : n });
          }}
          className="w-24 text-sm"
        />
      </div>

      {/* Recência da última análise */}
      <div>
        <Label className="text-xs mb-1.5 block">
          Dias desde a última análise (re-engajamento)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Mín"
            value={v.last_analysis_age_days?.gte ?? ""}
            onChange={(e) => {
              const n = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
              onChange({
                last_analysis_age_days: {
                  ...(v.last_analysis_age_days ?? {}),
                  gte: n,
                },
              });
            }}
            className="w-24 text-sm"
          />
          <span className="text-muted-foreground text-sm">a</span>
          <Input
            type="number"
            min={0}
            placeholder="Máx"
            value={v.last_analysis_age_days?.lte ?? ""}
            onChange={(e) => {
              const n = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
              onChange({
                last_analysis_age_days: {
                  ...(v.last_analysis_age_days ?? {}),
                  lte: n,
                },
              });
            }}
            className="w-24 text-sm"
          />
          <span className="text-xs text-muted-foreground">dias</span>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/15 border border-primary/30 text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Remover ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
