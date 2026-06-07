import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Send, Copy, Trash2, Pause, Play, Loader2, Pencil, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDispatchSchedule } from "../../hooks/crm/useDispatchSchedule";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSchedules,
  type Schedule,
  type SchedulesFilter,
} from "../../hooks/crm/useSchedules";
import {
  CHANNELS,
  CHANNEL_LIST,
  SCHEDULE_STATUS_META,
  type ChannelKey,
  type ScheduleStatus,
} from "../../lib/crm/channels";

const STATUS_KEYS: ScheduleStatus[] = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
  "paused",
];

export default function AdminCrmSchedules() {
  const navigate = useNavigate();
  const { items, loading, filter, setFilter, duplicate, remove, pause, resume, refresh } =
    useSchedules();
  const { dispatch, dispatching } = useDispatchSchedule();
  const [actionId, setActionId] = useState<string | null>(null);

  const handleDispatch = async (s: Schedule) => {
    const isRealSms = s.channel === "sms";
    const isRealPush = s.channel === "push";
    const isRealPopup = s.channel === "popup";
    const isRealTgX1 = s.channel === "telegram_x1";
    const isRealTgGroup = s.channel === "telegram_group";
    const isRealEmail = s.channel === "email";
    const isReal = isRealSms || isRealPush || isRealPopup || isRealTgX1 || isRealTgGroup || isRealEmail;
    const channelInfo =
      isRealTgX1
        ? "Broadcast REAL via SendPulse pra toda a base do bot Telegram."
        : isRealTgGroup
          ? "Envio REAL de 1 mensagem pro grupo do Telegram via Bot API."
          : isRealSms
            ? "Disparo REAL via SMS Dev — vai consumir cr\u00e9ditos."
            : isRealPush
              ? "Disparo REAL de Web Push para todos os destinat\u00e1rios com subscription ativa."
              : isRealPopup
                ? "Enfileira um popup in-app por usu\u00e1rio (exibido no pr\u00f3ximo carregamento do app)."
                : isRealEmail
                  ? "Disparo REAL de email via Resend para todos os destinat\u00e1rios com email."
                  : "Disparo pra audi\u00eancia segmentada";
    const suffix = isReal ? "" : "\n\n(modo dry-run — sem envio real ainda)";
    if (!confirm(`Disparar "${s.name}" agora?\n\n${channelInfo}${suffix}`)) {
      return;
    }
    await dispatch(s.id, { dryRun: !isReal });
    await refresh();
  };

  const handleDuplicate = async (s: Schedule) => {
    setActionId(s.id);
    await duplicate(s.id);
    setActionId(null);
  };

  const handleDelete = async (s: Schedule) => {
    if (!confirm(`Excluir o schedule "${s.name}"? Esta ação não pode ser desfeita.`)) return;
    setActionId(s.id);
    await remove(s.id);
    setActionId(null);
  };

  const handlePauseToggle = async (s: Schedule) => {
    setActionId(s.id);
    if (s.status === "paused") await resume(s.id);
    else await pause(s.id);
    setActionId(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Disparos pontuais ou agendados por canal, com segmentação da audiência.
          </p>
        </div>
        <Button onClick={() => navigate("/admin/crm/schedules/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Schedule
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
          Filtros:
        </span>
        <Select
          value={filter.channel ?? "all"}
          onValueChange={(v) =>
            setFilter((f) => ({ ...f, channel: v === "all" ? undefined : (v as ChannelKey) }))
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

        <Select
          value={filter.status ?? "all"}
          onValueChange={(v) =>
            setFilter((f) => ({
              ...f,
              status: v === "all" ? undefined : (v as ScheduleStatus),
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
                {SCHEDULE_STATUS_META[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filter.channel || filter.status) && (
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
            `${items.length} ${items.length === 1 ? "schedule" : "schedules"}`
          )}
        </div>
      </div>

      {/* Tabela / empty */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          hasFilters={!!(filter.channel || filter.status)}
          onCreate={() => navigate("/admin/crm/schedules/new")}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <Th>Canal</Th>
                <Th>Nome / Assunto</Th>
                <Th>Audiência</Th>
                <Th>Envio</Th>
                <Th>Status</Th>
                <Th>Métricas</Th>
                <Th className="text-right pr-4">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <ScheduleRow
                  key={s.id}
                  schedule={s}
                  actionInFlight={actionId === s.id}
                  dispatchInFlight={dispatching === s.id}
                  onDuplicate={() => handleDuplicate(s)}
                  onDelete={() => handleDelete(s)}
                  onPauseToggle={() => handlePauseToggle(s)}
                  onDispatch={() => handleDispatch(s)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScheduleRow({
  schedule,
  actionInFlight,
  dispatchInFlight,
  onDuplicate,
  onDelete,
  onPauseToggle,
  onDispatch,
}: {
  schedule: Schedule;
  actionInFlight: boolean;
  dispatchInFlight: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onPauseToggle: () => void;
  onDispatch: () => void;
}) {
  const navigate = useNavigate();
  const ch = CHANNELS[schedule.channel];
  const status = SCHEDULE_STATUS_META[schedule.status];
  const Icon = ch.icon;

  const audienceLabel = schedule.audience?.name ?? "Filtros ad-hoc";

  const sendDateLabel = schedule.sent_at
    ? `Enviado em ${formatDate(schedule.sent_at)}`
    : schedule.scheduled_at
      ? `Agendado pra ${formatDate(schedule.scheduled_at)}`
      : "Sem agendamento";

  const canPause = schedule.status === "scheduled" || schedule.status === "sending";
  const canResume = schedule.status === "paused";
  const canEdit = schedule.status !== "sent" && schedule.status !== "sending";
  // "Disparar agora" disponível pra rascunho ou agendado (não pra sent / sending / failed)
  const canDispatch =
    schedule.status === "draft" || schedule.status === "scheduled" || schedule.status === "paused";

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20">
      <Td>
        <div
          className="inline-flex items-center gap-2 px-2 py-1 rounded-md"
          style={{ background: `${ch.color}20`, border: `1px solid ${ch.color}50` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: ch.color }} />
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: ch.color }}
          >
            {ch.shortLabel}
          </span>
        </div>
      </Td>
      <Td>
        <div className="font-semibold text-foreground">{schedule.name}</div>
        {schedule.content?.subject && (
          <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[280px]">
            {schedule.content.subject}
          </div>
        )}
      </Td>
      <Td>
        <span className="text-xs text-muted-foreground">{audienceLabel}</span>
      </Td>
      <Td>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{sendDateLabel}</span>
      </Td>
      <Td>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
          style={{
            background: `${status.color}20`,
            border: `1px solid ${status.color}50`,
            color: status.color,
          }}
          title={status.description}
        >
          {status.label}
        </span>
      </Td>
      <Td>
        <ScheduleMetrics schedule={schedule} />
      </Td>
      <Td className="text-right pr-4">
        <div className="flex justify-end gap-1">
          {canDispatch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDispatch}
              disabled={dispatchInFlight || actionInFlight}
              title="Disparar agora (dry-run)"
              className="text-primary hover:text-primary"
            >
              {dispatchInFlight ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
          {(canPause || canResume) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPauseToggle}
              disabled={actionInFlight}
              title={canResume ? "Retomar" : "Pausar"}
            >
              {canResume ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/crm/schedules/${schedule.id}/edit`)}
              title="Editar schedule"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
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
            onClick={onDelete}
            disabled={actionInFlight}
            className="text-destructive hover:text-destructive"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Td>
    </tr>
  );
}

function ScheduleMetrics({ schedule }: { schedule: Schedule }) {
  if (schedule.status === "draft" || schedule.status === "scheduled") {
    return <span className="text-xs text-muted-foreground italic">—</span>;
  }
  const openRate =
    schedule.delivered_count > 0
      ? Math.round((schedule.open_count / schedule.delivered_count) * 100)
      : 0;
  return (
    <div className="text-[11px] text-muted-foreground space-y-0.5">
      <div>
        <span className="text-foreground font-semibold">{schedule.delivered_count}</span> /{" "}
        {schedule.reach_count} entregues
      </div>
      {schedule.open_count > 0 && (
        <div>
          <span className="text-foreground font-semibold">{openRate}%</span> abertura
        </div>
      )}
      {schedule.failed_count > 0 && (
        <div className="text-destructive">{schedule.failed_count} falhas</div>
      )}
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
        <Send className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1">
        {hasFilters ? "Nenhum schedule com esses filtros" : "Nenhum schedule ainda"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        {hasFilters
          ? "Tente limpar os filtros ou criar um novo schedule."
          : "Crie seu primeiro disparo: escolha o canal, defina audiência e conteúdo."}
      </p>
      {!hasFilters && (
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Criar primeiro schedule
        </Button>
      )}
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
