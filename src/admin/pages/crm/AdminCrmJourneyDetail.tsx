import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  Pencil,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  MoonStar,
  Send,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJourneyDetail } from "../../hooks/crm/useJourneyDetail";
import { useJourneys } from "../../hooks/crm/useJourneys";
import { MockTriggerPanel } from "../../components/crm/journey/MockTriggerPanel";
import { CHANNELS } from "../../lib/crm/channels";
import {
  TRIGGERS,
  JOURNEY_STATUS_META,
  type JourneyStatus,
} from "../../lib/crm/triggers";

const DELAY_UNIT_LABELS: Record<string, string> = {
  minute: "min",
  hour: "h",
  day: "d",
  week: "sem",
};

export default function AdminCrmJourneyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, schemaMissing, refresh } = useJourneyDetail(id ?? null);
  const { setStatus } = useJourneys();

  const { journey, steps, funnel, recent_enrollments, enrollment_counts } = data;

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (schemaMissing) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <BackBtn />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-4 mt-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-foreground">Schema das jornadas pendente</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Aplique <code className="text-xs">docs/sql/2.1_journeys_schema.sql</code> em
              produção para visualizar dados desta jornada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <BackBtn />
        <p className="text-sm text-muted-foreground mt-4">Jornada não encontrada.</p>
      </div>
    );
  }

  const trigger = TRIGGERS[journey.trigger_type];
  const statusMeta = JOURNEY_STATUS_META[journey.status];
  const TIcon = trigger.icon;

  const completionRate =
    enrollment_counts.total > 0
      ? Math.round((enrollment_counts.completed / enrollment_counts.total) * 100)
      : 0;

  const handleStatusToggle = async () => {
    if (steps.length === 0 && journey.status !== "active") {
      alert("Adicione passos antes de ativar a jornada.");
      return;
    }
    const next: JourneyStatus = journey.status === "active" ? "paused" : "active";
    const ok = await setStatus(journey.id, next);
    if (ok) await refresh();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <BackBtn />

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md"
                style={{ background: `${trigger.color}20`, border: `1px solid ${trigger.color}50` }}
              >
                <TIcon className="w-3.5 h-3.5" style={{ color: trigger.color }} />
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: trigger.color }}
                >
                  {trigger.shortLabel}
                </span>
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                style={{
                  background: `${statusMeta.color}20`,
                  border: `1px solid ${statusMeta.color}50`,
                  color: statusMeta.color,
                }}
              >
                {statusMeta.label}
              </span>
              {journey.audience?.name && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {journey.audience.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{journey.name}</h1>
            {journey.description && (
              <p className="text-sm text-muted-foreground mt-1">{journey.description}</p>
            )}
            <p className="text-[11px] text-muted-foreground italic mt-1.5">
              {trigger.description}
              {journey.trigger_type === "churn_inactive" &&
                journey.trigger_config?.days_inactive &&
                ` (${journey.trigger_config.days_inactive} dias)`}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {journey.status !== "archived" && (
              <Button size="sm" variant="outline" onClick={handleStatusToggle}>
                {journey.status === "active" ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1.5" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Ativar
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/admin/crm/journeys/${journey.id}/edit`)}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={refresh}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Recarregar
            </Button>
          </div>
        </div>
      </div>

      {/* Painel mock — Sub-fase 2.5 */}
      <MockTriggerPanel journey={journey} steps={steps} onChanged={refresh} />

      {/* Métricas agregadas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          icon={Users}
          label="Ativos"
          value={enrollment_counts.active}
          color="#22C55E"
        />
        <Kpi
          icon={CheckCircle2}
          label="Concluídos"
          value={enrollment_counts.completed}
          color="#60A5FA"
        />
        <Kpi
          icon={MoonStar}
          label="Churned"
          value={enrollment_counts.churned}
          color="#F472B6"
        />
        <Kpi
          icon={XCircle}
          label="Cancelados"
          value={enrollment_counts.cancelled}
          color="#94A3B8"
        />
      </div>

      {/* Funil por step */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Funil por passo</h2>
          <span className="text-xs text-muted-foreground">
            Taxa de conclusão da jornada: <strong>{completionRate}%</strong>
          </span>
        </div>
        {steps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Esta jornada ainda não tem passos.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Th>#</Th>
                  <Th>Canal</Th>
                  <Th>Delay</Th>
                  <Th className="text-right">Enviados</Th>
                  <Th className="text-right">Entregues</Th>
                  <Th className="text-right">Abertos</Th>
                  <Th className="text-right">Cliques</Th>
                  <Th className="text-right">Falhas</Th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((row) => {
                  const step = steps.find((s) => s.id === row.step_id)!;
                  const ch = CHANNELS[step.channel];
                  const Icon = ch.icon;
                  const openRate = row.delivered > 0 ? Math.round((row.opened / row.delivered) * 100) : 0;
                  const clickRate = row.delivered > 0 ? Math.round((row.clicked / row.delivered) * 100) : 0;
                  return (
                    <tr key={row.step_id} className="border-b border-border/50">
                      <Td>{row.step_order}</Td>
                      <Td>
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                          style={{
                            background: `${ch.color}15`,
                            border: `1px solid ${ch.color}40`,
                          }}
                        >
                          <Icon className="w-3 h-3" style={{ color: ch.color }} />
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: ch.color }}
                          >
                            {ch.shortLabel}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">
                          {step.delay_value}
                          {DELAY_UNIT_LABELS[step.delay_unit] ?? step.delay_unit}
                        </span>
                      </Td>
                      <Td className="text-right font-semibold">{row.sent}</Td>
                      <Td className="text-right">{row.delivered}</Td>
                      <Td className="text-right">
                        {row.opened}
                        {row.delivered > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({openRate}%)
                          </span>
                        )}
                      </Td>
                      <Td className="text-right">
                        {row.clicked}
                        {row.delivered > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({clickRate}%)
                          </span>
                        )}
                      </Td>
                      <Td className="text-right">
                        {row.failed > 0 ? (
                          <span className="text-destructive">{row.failed}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Enrollments recentes */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Inscrições recentes</h2>
        {recent_enrollments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum lead foi inscrito nesta jornada ainda.
            </p>
            {journey.status === "draft" && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Ative a jornada para receber novos leads.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Th>Lead</Th>
                  <Th>Status</Th>
                  <Th>Passo atual</Th>
                  <Th>Inscrito em</Th>
                </tr>
              </thead>
              <tbody>
                {recent_enrollments.map((e) => {
                  const stepIdx =
                    e.current_step_id
                      ? steps.findIndex((s) => s.id === e.current_step_id) + 1
                      : null;
                  return (
                    <tr key={e.id} className="border-b border-border/50">
                      <Td>
                        <span className="text-foreground">
                          {e.user_nickname || e.user_email || e.user_id.slice(0, 8)}
                        </span>
                      </Td>
                      <Td>
                        <EnrollmentStatusPill status={e.status} />
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">
                          {stepIdx ? `Passo ${stepIdx}` : "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(e.enrolled_at)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function BackBtn() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("/admin/crm/journeys")}
      className="text-muted-foreground"
    >
      <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
      Voltar para jornadas
    </Button>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function EnrollmentStatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; color: string }> = {
    active:    { label: "Ativo",      color: "#22C55E" },
    completed: { label: "Concluído",  color: "#60A5FA" },
    cancelled: { label: "Cancelado",  color: "#94A3B8" },
    churned:   { label: "Churn",      color: "#F472B6" },
  };
  const m = meta[status] ?? { label: status, color: "#64748B" };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
      style={{
        background: `${m.color}20`,
        border: `1px solid ${m.color}50`,
        color: m.color,
      }}
    >
      {m.label}
    </span>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-4 py-2.5 font-bold ${className ?? ""}`}>{children}</th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 align-middle ${className ?? ""}`}>{children}</td>;
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
