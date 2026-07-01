import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Copy,
  Trash2,
  Pause,
  Play,
  Loader2,
  Pencil,
  Workflow,
  AlertTriangle,
  Layers,
  Users,
  Sparkles,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateLibrary } from "../../components/crm/journey/TemplateLibrary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJourneys, type Journey } from "../../hooks/crm/useJourneys";
import {
  TRIGGERS,
  TRIGGER_LIST,
  JOURNEY_STATUS_META,
  type JourneyStatus,
  type TriggerKey,
} from "../../lib/crm/triggers";
import { CHANNELS, CHANNEL_LIST, type ChannelKey } from "../../lib/crm/channels";
import { exportJourney } from "../../lib/crm/exportJourney";

const STATUS_KEYS: JourneyStatus[] = ["draft", "active", "paused", "archived"];

export default function AdminCrmJourneys() {
  const navigate = useNavigate();
  const {
    items,
    loading,
    schemaMissing,
    filter,
    setFilter,
    duplicate,
    remove,
    setStatus,
    refresh,
  } = useJourneys();
  const [actionId, setActionId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const handleDuplicate = async (j: Journey) => {
    setActionId(j.id);
    await duplicate(j.id);
    setActionId(null);
  };

  const handleDelete = async (j: Journey) => {
    if (!confirm(`Excluir a jornada "${j.name}"? Esta ação não pode ser desfeita.`)) return;
    setActionId(j.id);
    await remove(j.id);
    setActionId(null);
  };

  const handleStatusToggle = async (j: Journey) => {
    setActionId(j.id);
    const next: JourneyStatus = j.status === "active" ? "paused" : "active";
    await setStatus(j.id, next);
    setActionId(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Jornadas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fluxos automatizados disparados por eventos do lead (cadastro, upgrade, churn).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setTemplateOpen(true)}
            disabled={schemaMissing}
            title={schemaMissing ? "Aplique o schema antes de usar templates" : undefined}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button
            onClick={() => navigate("/admin/crm/journeys/new")}
            disabled={schemaMissing}
            title={schemaMissing ? "Aplique o schema antes de criar jornadas" : undefined}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Jornada
          </Button>
        </div>
      </div>

      {schemaMissing && <SchemaMissingBanner />}

      {/* Filtros */}
      {!schemaMissing && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
            Filtros:
          </span>
          <Select
            value={filter.trigger_type ?? "all"}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                trigger_type: v === "all" ? undefined : (v as TriggerKey),
              }))
            }
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os triggers</SelectItem>
              {TRIGGER_LIST.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filter.status ?? "all"}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                status: v === "all" ? undefined : (v as JourneyStatus),
              }))
            }
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {JOURNEY_STATUS_META[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filter.channel ?? "all"}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                channel: v === "all" ? undefined : (v as ChannelKey),
              }))
            }
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {CHANNEL_LIST.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filter.status || filter.trigger_type || filter.channel) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter({})}
              className="h-9 text-muted-foreground"
            >
              Limpar
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground">
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
            ) : (
              `${items.length} ${items.length === 1 ? "jornada" : "jornadas"}`
            )}
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : schemaMissing ? null : items.length === 0 ? (
        <EmptyState
          hasFilters={!!(filter.status || filter.trigger_type)}
          onCreate={() => navigate("/admin/crm/journeys/new")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((j) => (
            <JourneyCard
              key={j.id}
              journey={j}
              actionInFlight={actionId === j.id}
              onOpen={() => navigate(`/admin/crm/journeys/${j.id}`)}
              onEdit={() => navigate(`/admin/crm/journeys/${j.id}/edit`)}
              onWhiteboard={() => navigate(`/admin/crm/whiteboard?focus=${j.id}`)}
              onDuplicate={() => handleDuplicate(j)}
              onExport={() => exportJourney(j.id, j.name)}
              onDelete={() => handleDelete(j)}
              onStatusToggle={() => handleStatusToggle(j)}
            />
          ))}
        </div>
      )}

      {templateOpen && (
        <TemplateLibrary
          onClose={() => setTemplateOpen(false)}
          onCreated={() => {
            setTemplateOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function JourneyCard({
  journey,
  actionInFlight,
  onOpen,
  onEdit,
  onWhiteboard,
  onDuplicate,
  onExport,
  onDelete,
  onStatusToggle,
}: {
  journey: Journey;
  actionInFlight: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onWhiteboard: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onStatusToggle: () => void;
}) {
  const trigger = TRIGGERS[journey.trigger_type];
  const status = JOURNEY_STATUS_META[journey.status];
  const TIcon = trigger.icon;

  const activeLeads = journey.stats?.active ?? 0;
  const completionRate =
    typeof journey.stats?.completion_rate === "number"
      ? Math.round(journey.stats.completion_rate * 100)
      : null;
  const stepCount = journey.step_count ?? 0;

  const canToggle = journey.status === "active" || journey.status === "paused";

  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 hover:border-border/80 transition cursor-pointer"
      onClick={onOpen}
    >
      {/* Header: trigger + canal + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md"
            style={{
              background: `${trigger.color}20`,
              border: `1px solid ${trigger.color}50`,
            }}
          >
            <TIcon className="w-3.5 h-3.5" style={{ color: trigger.color }} />
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: trigger.color }}
            >
              {trigger.shortLabel}
            </span>
          </div>
          {(() => {
            const ch = journey.channel ? CHANNELS[journey.channel] : null;
            if (!ch) {
              return (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400"
                  title="Jornada legada — passos podem usar canais diferentes"
                >
                  Misto / legado
                </span>
              );
            }
            const ChIcon = ch.icon;
            return (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                style={{
                  background: `${ch.color}20`,
                  border: `1px solid ${ch.color}50`,
                  color: ch.color,
                }}
                title={`Canal fixo: ${ch.label}`}
              >
                <ChIcon className="w-3 h-3" />
                {ch.shortLabel}
              </span>
            );
          })()}
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shrink-0"
          style={{
            background: `${status.color}20`,
            border: `1px solid ${status.color}50`,
            color: status.color,
          }}
          title={status.description}
        >
          {status.label}
        </span>
      </div>

      {/* Nome + descrição */}
      <div>
        <h3 className="font-bold text-foreground text-base leading-snug">{journey.name}</h3>
        {journey.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {journey.description}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1.5 italic">
          {trigger.shortHint}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/50">
        <Metric icon={Layers} label="Steps" value={stepCount} />
        <Metric icon={Users} label="Ativos" value={activeLeads} />
        <Metric
          icon={Workflow}
          label="Conclusão"
          value={completionRate != null ? `${completionRate}%` : "—"}
        />
      </div>

      {/* Ações */}
      <div
        className="flex items-center justify-between gap-2 -mb-1 -mr-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onWhiteboard}
          className="h-8 gap-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
          title="Abrir Whiteboard"
        >
          <Workflow className="w-3.5 h-3.5" />
          Whiteboard
        </Button>
        <div className="flex justify-end gap-1">
          {canToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStatusToggle}
              disabled={actionInFlight}
              title={journey.status === "active" ? "Pausar" : "Ativar"}
            >
              {journey.status === "active" ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            disabled={actionInFlight}
            title="Duplicar"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            title="Exportar jornada (.json)"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={actionInFlight}
            className="text-destructive hover:text-destructive"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

function SchemaMissingBanner() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
      </div>
      <div className="flex-1">
        <h2 className="font-bold text-foreground text-base mb-1">
          Schema das jornadas pendente
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          As 4 tabelas de jornadas (<code className="text-xs">crm_journeys</code>,{" "}
          <code className="text-xs">crm_journey_steps</code>,{" "}
          <code className="text-xs">crm_journey_enrollments</code>,{" "}
          <code className="text-xs">crm_journey_step_events</code>) ainda não foram
          aplicadas em produção.
        </p>
        <p className="text-xs text-muted-foreground">
          SQL pronto em{" "}
          <code className="text-xs text-foreground">docs/sql/2.1_journeys_schema.sql</code>.
          Aplique via Supabase/Lovable para liberar esta tela.
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
        <Workflow className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1">
        {hasFilters ? "Nenhuma jornada com esses filtros" : "Nenhuma jornada ainda"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        {hasFilters
          ? "Tente limpar os filtros ou criar uma nova jornada."
          : "Crie sua primeira jornada: escolha o trigger (cadastro, upgrade, churn) e adicione steps."}
      </p>
      {!hasFilters && (
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Criar primeira jornada
        </Button>
      )}
    </div>
  );
}
