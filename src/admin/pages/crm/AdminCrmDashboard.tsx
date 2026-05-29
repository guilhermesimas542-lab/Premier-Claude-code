import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Workflow,
  Users,
  Megaphone,
  Loader2,
  RefreshCw,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmDashboard, type ChannelPerformance, type RecentSchedule } from "../../hooks/crm/useCrmDashboard";
import { CHANNELS, type ChannelKey } from "../../lib/crm/channels";
import { SCHEDULE_STATUS_META } from "../../lib/crm/channels";

type Window = "7d" | "30d";

export default function AdminCrmDashboard() {
  const navigate = useNavigate();
  const { data, loading, refresh } = useCrmDashboard();
  const [window, setWindow] = useState<Window>("7d");

  const perf = window === "7d" ? data.performance_7d : data.performance_30d;
  const totalSent = perf.reduce((acc, r) => acc + r.sent, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do orquestrador multicanal — schedules, jornadas e performance por canal.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Recarregar
        </Button>
      </div>

      <ModeMockBanner />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={Send}
          label="Schedules ativos"
          value={data.schedule_counts.scheduled + data.schedule_counts.sending}
          hint={`${data.schedule_counts.total} total`}
          color="#60A5FA"
          onClick={() => navigate("/admin/crm/schedules")}
        />
        <Kpi
          icon={Workflow}
          label="Jornadas ativas"
          value={data.journey_counts.active}
          hint={
            data.journeys_schema_missing
              ? "schema pendente"
              : `${data.journey_counts.total} total`
          }
          color="#22C55E"
          onClick={() => navigate("/admin/crm/journeys")}
        />
        <Kpi
          icon={Sparkles}
          label="Leads em jornadas"
          value={data.active_enrollments}
          hint="inscritos ativos"
          color="#F472B6"
          onClick={() => navigate("/admin/crm/journeys")}
        />
        <Kpi
          icon={Users}
          label="Audiências salvas"
          value={data.audiences_count}
          hint="filtros reutilizáveis"
          color="#A855F7"
          onClick={() => navigate("/admin/crm/audiences")}
        />
      </div>

      {/* Último envio */}
      {data.last_schedule_sent && (
        <LastSentCard schedule={data.last_schedule_sent} />
      )}

      {/* Performance por canal */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Performance por canal</h2>
          <div className="flex gap-1">
            <WindowTab active={window === "7d"} onClick={() => setWindow("7d")}>
              7 dias
            </WindowTab>
            <WindowTab active={window === "30d"} onClick={() => setWindow("30d")}>
              30 dias
            </WindowTab>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : perf.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum disparo nos últimos {window === "7d" ? "7" : "30"} dias.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/admin/crm/schedules/new")}
            >
              Criar schedule
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {perf.map((row) => (
              <ChannelPerfRow key={row.channel} row={row} totalSent={totalSent} />
            ))}
          </div>
        )}
      </section>

      {/* Últimos disparos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Últimos disparos</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/crm/schedules")}
            className="text-muted-foreground"
          >
            Ver todos
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : data.recent_schedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum disparo registrado ainda.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {data.recent_schedules.map((s) => (
              <RecentScheduleRow
                key={s.id}
                schedule={s}
                onClick={() => navigate("/admin/crm/schedules")}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function ModeMockBanner() {
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2.5">
      <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
      <p className="text-xs text-foreground">
        <strong>Modo mock-first ativo.</strong> Todos os disparos simulam latência, taxa de
        entrega 95%, abertura 40% e cliques 8% — nenhum email/SMS/WhatsApp real é enviado.
        Integrações reais entram no Pilar 4.
      </p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  color,
  onClick,
}: {
  icon: typeof Send;
  label: string;
  value: number;
  hint?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-border bg-card p-4 hover:border-border/80 hover:bg-muted/20 transition"
    >
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </button>
  );
}

function LastSentCard({ schedule }: { schedule: RecentSchedule }) {
  const ch = CHANNELS[schedule.channel];
  const Icon = ch.icon;
  const openRate =
    schedule.delivered_count > 0
      ? Math.round((schedule.open_count / schedule.delivered_count) * 100)
      : 0;
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Último envio
          </p>
          <p className="font-bold text-foreground truncate">{schedule.name}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Icon className="w-3 h-3" style={{ color: ch.color }} />
              {ch.shortLabel}
            </span>
            <span>·</span>
            <span>{schedule.delivered_count} entregues / {schedule.reach_count}</span>
            {openRate > 0 && (
              <>
                <span>·</span>
                <span>{openRate}% abertura</span>
              </>
            )}
            <span>·</span>
            <span>{formatRel(schedule.sent_at!)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WindowTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/30 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ChannelPerfRow({
  row,
  totalSent,
}: {
  row: ChannelPerformance;
  totalSent: number;
}) {
  const ch = CHANNELS[row.channel];
  const Icon = ch.icon;
  const sharePct = totalSent > 0 ? (row.sent / totalSent) * 100 : 0;

  return (
    <div className="border-b border-border/50 last:border-b-0 p-4 flex items-center gap-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${ch.color}20`, border: `1px solid ${ch.color}50` }}
      >
        <Icon className="w-4 h-4" style={{ color: ch.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-semibold text-foreground text-sm">{ch.label}</span>
          <span className="text-[11px] text-muted-foreground">
            <strong className="text-foreground">{row.sent}</strong> enviados
          </span>
        </div>

        {/* Barra horizontal: share do canal */}
        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${sharePct}%`, background: ch.color }}
          />
        </div>

        {/* Métricas */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span>
            {row.delivered} entregues
            <span className="ml-1 text-foreground/60">
              ({row.sent > 0 ? Math.round((row.delivered / row.sent) * 100) : 0}%)
            </span>
          </span>
          {row.opened > 0 && (
            <span>
              {row.opened} aberturas
              <span className="ml-1 text-foreground/60">
                ({Math.round(row.open_rate * 100)}%)
              </span>
            </span>
          )}
          {row.clicked > 0 && (
            <span>
              {row.clicked} cliques
              <span className="ml-1 text-foreground/60">
                ({Math.round(row.click_rate * 100)}%)
              </span>
            </span>
          )}
          {row.failed > 0 && (
            <span className="text-destructive">
              {row.failed} falhas
              <span className="ml-1 opacity-70">
                ({Math.round(row.failure_rate * 100)}%)
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentScheduleRow({
  schedule,
  onClick,
}: {
  schedule: RecentSchedule & { status?: string };
  onClick: () => void;
}) {
  const ch = CHANNELS[schedule.channel];
  const Icon = ch.icon;
  const statusKey = (schedule.status ?? "sent") as keyof typeof SCHEDULE_STATUS_META;
  const status = SCHEDULE_STATUS_META[statusKey] ?? SCHEDULE_STATUS_META.sent;

  return (
    <button
      onClick={onClick}
      className="w-full text-left border-b border-border/50 last:border-b-0 p-4 hover:bg-muted/20 transition flex items-center gap-3"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${ch.color}20`, border: `1px solid ${ch.color}50` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: ch.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground text-sm truncate">
            {schedule.name}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: `${status.color}20`,
              border: `1px solid ${status.color}50`,
              color: status.color,
            }}
          >
            {status.label}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {schedule.delivered_count} de {schedule.reach_count} entregues
          {schedule.open_count > 0 && (
            <> · {schedule.open_count} aberturas</>
          )}
          {schedule.sent_at && <> · {formatRel(schedule.sent_at)}</>}
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}

function formatRel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "agora há pouco";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}
