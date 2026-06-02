import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
  Users,
  Calendar,
  Send,
  FileText,
  Radio,
  Save,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CHANNELS,
  CHANNEL_LIST,
  type ChannelKey,
} from "../../../lib/crm/channels";
import { useSchedules, type NewSchedulePayload } from "../../../hooks/crm/useSchedules";
import { useAudiences, type AudienceFilters } from "../../../hooks/crm/useAudiences";
import { usePreviewAudience } from "../../../hooks/crm/usePreviewAudience";
import { ChannelPreview } from "./ChannelPreview";

// ============================================================
// Tipos do state do wizard
// ============================================================

interface WizardState {
  name: string;
  channel: ChannelKey | null;
  audience_id: string | null;
  audience_filters: AudienceFilters | null;
  content: Record<string, any>;
  schedule_mode: "now" | "scheduled";
  scheduled_at: string | null; // ISO local "2026-05-28T18:30"
}

const INITIAL_STATE: WizardState = {
  name: "",
  channel: null,
  audience_id: null,
  audience_filters: null,
  content: {},
  schedule_mode: "now",
  scheduled_at: null,
};

const STEPS = [
  { key: "channel", title: "Canal", icon: Radio },
  { key: "audience", title: "Audiência", icon: Users },
  { key: "content", title: "Conteúdo", icon: FileText },
  { key: "schedule", title: "Agendamento", icon: Calendar },
  { key: "review", title: "Revisão", icon: Check },
] as const;

type StepKey = typeof STEPS[number]["key"];

// ============================================================
// Wizard principal
// ============================================================

interface ScheduleWizardProps {
  /** ID do schedule a editar. Se omitido, o wizard cria um novo. */
  editingId?: string;
}

export function ScheduleWizard({ editingId }: ScheduleWizardProps = {}) {
  const navigate = useNavigate();
  const { create, update: updateSchedule } = useSchedules();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState<boolean>(!!editingId);

  const isEditing = !!editingId;

  // ============================================================
  // Modo edit: carrega schedule e pré-popula o state
  // ============================================================
  useEffect(() => {
    if (!editingId) return;
    let mounted = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("crm_schedules")
        .select("*")
        .eq("id", editingId)
        .single();
      if (!mounted) return;
      if (error || !data) {
        toast.error(`Erro ao carregar schedule: ${error?.message ?? "desconhecido"}`);
        navigate("/admin/crm/schedules");
        return;
      }
      if (data.status !== "draft") {
        toast.error("Só é possível editar schedules em rascunho.");
        navigate("/admin/crm/schedules");
        return;
      }
      const scheduledLocal =
        data.scheduled_at
          ? toLocalDateTimeInput(data.scheduled_at)
          : null;
      setState({
        name: data.name ?? "",
        channel: data.channel,
        audience_id: data.audience_id,
        audience_filters: data.audience_filters,
        content: data.content ?? {},
        schedule_mode: scheduledLocal ? "scheduled" : "now",
        scheduled_at: scheduledLocal,
      });
      setLoadingEdit(false);
    })();
    return () => {
      mounted = false;
    };
  }, [editingId, navigate]);

  const currentStep = STEPS[stepIdx].key;
  const isLast = stepIdx === STEPS.length - 1;
  const channelConfig = state.channel ? CHANNELS[state.channel] : null;

  const update = (patch: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  // ============================================================
  // Validação por etapa pra liberar "Próximo"
  // ============================================================
  const canAdvance = (() => {
    if (currentStep === "channel") return state.channel !== null;
    if (currentStep === "audience") {
      // Telegram x1 não precisa de audiência (broadcast)
      if (state.channel === "telegram_x1") return true;
      return state.audience_id !== null || hasFilters(state.audience_filters);
    }
    if (currentStep === "content") return validateContent(state);
    if (currentStep === "schedule") {
      if (state.schedule_mode === "now") return true;
      return !!state.scheduled_at && new Date(state.scheduled_at).getTime() > Date.now();
    }
    return true; // review sempre liberado
  })();

  // ============================================================
  // Submit final — cria o schedule no banco
  // ============================================================
  const submit = async (intent: "draft" | "schedule" | "send_now") => {
    setSaving(true);

    const scheduledAt =
      intent === "send_now"
        ? new Date().toISOString()
        : state.schedule_mode === "scheduled" && state.scheduled_at
          ? new Date(state.scheduled_at).toISOString()
          : null;

    // Normaliza audience pra satisfazer constraint:
    //   crm_schedules_audience_check: audience_id IS NOT NULL OR audience_filters IS NOT NULL
    //   - telegram_x1     → audience_filters = { broadcast: true } (semantic)
    //   - audiência salva → audience_filters pode continuar null (audience_id satisfaz)
    //   - filtros ad-hoc  → usa o objeto preenchido
    //   - draft sem nada  → audience_filters = {} (objeto vazio é NOT NULL, constraint passa)
    const isTelegramX1 = state.channel === "telegram_x1";
    let normalizedFilters: AudienceFilters | { broadcast: true } | Record<string, never> | null =
      state.audience_filters;
    if (isTelegramX1) {
      normalizedFilters = { broadcast: true };
    } else if (!state.audience_id && !hasFilters(state.audience_filters)) {
      normalizedFilters = {};
    }

    const payload: NewSchedulePayload = {
      name: state.name.trim() || autoName(state),
      channel: state.channel!,
      audience_id: state.audience_id,
      audience_filters: normalizedFilters as AudienceFilters | null,
      content: state.content,
      scheduled_at: scheduledAt,
      status: intent === "draft" ? "draft" : "scheduled",
    };

    let success = false;
    if (isEditing && editingId) {
      success = await updateSchedule(editingId, payload);
      if (success) toast.success("Schedule atualizado");
    } else {
      const result = await create(payload);
      success = !!result;
      if (success && intent === "send_now") {
        toast.info(
          "Schedule criado como agendado pra agora. Use o botão 'Disparar agora' na lista pra rodar o mock."
        );
      }
    }
    setSaving(false);

    if (success) {
      navigate("/admin/crm/schedules");
    }
  };

  /** Converte ISO UTC pro formato datetime-local ("YYYY-MM-DDTHH:mm") em horário local. */
  function toLocalDateTimeInput(iso: string): string {
    try {
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  }

  // ============================================================
  // Render
  // ============================================================
  if (loadingEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header sticky com progress */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/crm/schedules")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              {isEditing ? "Editar Schedule (rascunho)" : "Novo Schedule"}
            </h1>
          </div>

          {/* Nome (sempre visível) */}
          <div className="flex items-center gap-2">
            <Label htmlFor="schedule-name" className="text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Nome:
            </Label>
            <Input
              id="schedule-name"
              value={state.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder={autoName(state) || "Ex: Black Friday — base premium"}
              className="h-9"
            />
          </div>

          {/* Progress */}
          <StepIndicator currentIdx={stepIdx} onJump={(i) => i < stepIdx && setStepIdx(i)} />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {currentStep === "channel" && (
          <StepChannel state={state} update={update} />
        )}
        {currentStep === "audience" && (
          <StepAudience state={state} update={update} />
        )}
        {currentStep === "content" && channelConfig && (
          <StepContent state={state} update={update} channel={state.channel!} />
        )}
        {currentStep === "schedule" && (
          <StepSchedule state={state} update={update} />
        )}
        {currentStep === "review" && (
          <StepReview state={state} />
        )}
      </div>

      {/* Footer sticky com nav */}
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
            disabled={stepIdx === 0 || saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="text-xs text-muted-foreground">
            Passo {stepIdx + 1} de {STEPS.length}
          </div>

          {!isLast ? (
            <Button onClick={() => setStepIdx((s) => s + 1)} disabled={!canAdvance || saving}>
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => submit("draft")} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar rascunho
              </Button>
              {state.schedule_mode === "scheduled" ? (
                <Button onClick={() => submit("schedule")} disabled={saving || !state.scheduled_at}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                  Agendar disparo
                </Button>
              ) : (
                <Button onClick={() => submit("send_now")} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Enviar agora
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step Indicator (barra de progresso)
// ============================================================
function StepIndicator({
  currentIdx,
  onJump,
}: {
  currentIdx: number;
  onJump: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        return (
          <button
            key={step.key}
            onClick={() => onJump(idx)}
            disabled={idx > currentIdx}
            className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
              idx <= currentIdx ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
            }`}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: isActive
                  ? "var(--primary)"
                  : isDone
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(255,255,255,0.05)",
                color: isActive ? "var(--primary-foreground)" : isDone ? "#22C55E" : "#94A3B8",
                border: `1px solid ${isActive ? "var(--primary)" : isDone ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            </div>
            <span
              className={`text-xs font-semibold uppercase tracking-wider hidden sm:inline ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Step 1: Canal
// ============================================================
function StepChannel({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Escolha o canal</h2>
        <p className="text-sm text-muted-foreground">
          Qual canal vai disparar a mensagem? Cada um tem um provedor diferente.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CHANNEL_LIST.map((c) => {
          const Icon = c.icon;
          const active = state.channel === c.key;
          const blocked = c.integrationStatus === "blocked";
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => !blocked && update({ channel: c.key, content: {} })}
              disabled={blocked}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                active
                  ? "border-primary bg-primary/5"
                  : blocked
                    ? "border-border bg-muted/20 cursor-not-allowed opacity-50"
                    : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${c.color}20`, border: `1px solid ${c.color}40` }}
                >
                  <Icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground">{c.label}</div>
                  <div className="text-[10px] text-muted-foreground">{c.provider}</div>
                </div>
              </div>
              {blocked && (
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Integração pendente
                </div>
              )}
              {!blocked && !c.supportsFilter && (
                <div className="text-[10px] text-yellow-500/80 mt-1">
                  Sem filtro por cliente
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Step 2: Audiência
// ============================================================
function StepAudience({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  const { items: audiences, loading } = useAudiences();
  const { count } = usePreviewAudience(state.audience_filters ?? {}, !state.audience_id);
  const isTelegramX1 = state.channel === "telegram_x1";

  const selectedAudience = audiences.find((a) => a.id === state.audience_id);

  if (isTelegramX1) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Audiência</h2>
          <p className="text-sm text-muted-foreground">
            Telegram x1 não suporta segmentação — vai pra toda a base SendPulse.
          </p>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm text-foreground">
            <strong>Disparo em broadcast.</strong> Este canal não permite filtrar por cliente.
            A mensagem será enviada pra toda a base SendPulse.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Audiência</h2>
        <p className="text-sm text-muted-foreground">
          Use uma audiência salva ou aplique filtros ad-hoc.
        </p>
      </div>

      {/* Modo 1: audiência salva */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Audiência salva
        </Label>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : audiences.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">
            Nenhuma audiência salva. Crie em <code>/admin/crm/audiences</code> ou use filtros abaixo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {audiences.map((a) => {
              const active = state.audience_id === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => update({ audience_id: a.id, audience_filters: null })}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">{a.name}</div>
                  {a.description && (
                    <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {a.description}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          ou
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Modo 2: filtros ad-hoc */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Filtros ad-hoc (este disparo só)
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Defina filtros pra este disparo sem salvar como audiência reutilizável.
        </p>
        <AdHocFilters
          filters={state.audience_filters ?? {}}
          onChange={(filters) => update({ audience_filters: filters, audience_id: null })}
        />
      </div>

      {/* Preview de count */}
      {(selectedAudience || hasFilters(state.audience_filters)) && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
          <Users className="w-4 h-4 text-primary" />
          <div className="text-sm">
            {selectedAudience ? (
              <>
                Audiência selecionada: <strong>{selectedAudience.name}</strong>
              </>
            ) : (
              <>
                <strong>{count?.toLocaleString("pt-BR") ?? "—"}</strong> leads no filtro ad-hoc
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// AdHocFilters — versão simplificada do AudienceBuilder
function AdHocFilters({
  filters,
  onChange,
}: {
  filters: AudienceFilters;
  onChange: (filters: AudienceFilters) => void;
}) {
  const PLANS = ["free", "premium", "diamante", "ultra"];
  const STATUS = ["active", "inactive", "churn_risk"] as const;

  const togglePlan = (plan: string) => {
    const current = filters.plans ?? [];
    const next = current.includes(plan) ? current.filter((p) => p !== plan) : [...current, plan];
    onChange({ ...filters, plans: next.length > 0 ? next : undefined });
  };

  const toggleStatus = (s: typeof STATUS[number]) => {
    const current = filters.status ?? [];
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    onChange({ ...filters, status: next.length > 0 ? (next as any) : undefined });
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5">Plano</div>
        <div className="flex flex-wrap gap-1.5">
          {PLANS.map((p) => {
            const active = (filters.plans ?? []).includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlan(p)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5">Status</div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS.map((s) => {
            const active = (filters.status ?? []).includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {s === "churn_risk" ? "Churn risk" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step 3: Conteúdo (adaptativo ao canal)
// ============================================================
function StepContent({
  state,
  update,
  channel,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  channel: ChannelKey;
}) {
  const c = CHANNELS[channel];
  const content = state.content;
  const setField = (field: string, value: string) => {
    update({ content: { ...content, [field]: value } });
  };

  const isPending = c.integrationStatus === "blocked";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Conteúdo</h2>
        <p className="text-sm text-muted-foreground">
          Mensagem que será enviada por <strong>{c.label}</strong>. O preview à direita atualiza ao vivo.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-4">

      {c.warning && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">{c.warning}</p>
        </div>
      )}

      {isPending && (
        <div className="rounded-lg border border-muted bg-muted/20 p-3 text-xs text-muted-foreground">
          Integração pendente. Você pode redigir e salvar como rascunho, mas o disparo só funcionará após a configuração.
        </div>
      )}

      {/* Email: subject + body + (html futuro) */}
      {channel === "email" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Assunto</Label>
            <Input
              id="email-subject"
              value={content.subject ?? ""}
              onChange={(e) => setField("subject", e.target.value)}
              placeholder="Ex: Sua nova entrada está pronta 🚀"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-body">Corpo da mensagem</Label>
            <Textarea
              id="email-body"
              value={content.body ?? ""}
              onChange={(e) => setField("body", e.target.value)}
              placeholder="Olá {nome}, ..."
              rows={8}
            />
            <p className="text-[10px] text-muted-foreground">
              Variáveis disponíveis: <code>{"{nome}"}</code>, <code>{"{plano}"}</code>,{" "}
              <code>{"{dias_sem_login}"}</code>, <code>{"{data_cadastro}"}</code>
            </p>
            <Button variant="ghost" size="sm" disabled className="opacity-50">
              Abrir builder HTML (Nano Banana) — em breve
            </Button>
          </div>
        </>
      )}

      {/* SMS / Telegram / WhatsApp / Tel x1: só body */}
      {(channel === "sms" ||
        channel === "telegram_group" ||
        channel === "telegram_x1" ||
        channel === "whatsapp") && (
        <div className="space-y-1.5">
          <Label htmlFor="msg-body">Mensagem</Label>
          <Textarea
            id="msg-body"
            value={content.body ?? ""}
            onChange={(e) => setField("body", e.target.value)}
            placeholder={
              channel === "sms"
                ? "Premier: sua nova entrada está pronta. Acesse: {link}"
                : channel === "whatsapp"
                  ? "Oi {nome}! Sua nova análise tá disponível 👇"
                  : channel === "telegram_x1"
                    ? "[Mensagem para broadcast geral]"
                    : "Mensagem do grupo"
            }
            rows={6}
          />
          <p className="text-[10px] text-muted-foreground">
            {channel === "sms" && "Máximo recomendado: 160 caracteres."}
            {(channel === "whatsapp" || channel === "telegram_group" || channel === "telegram_x1") &&
              "Variáveis: {nome}, {plano}, etc."}
          </p>
        </div>
      )}

      {/* Push / Popup: title + body */}
      {(channel === "push" || channel === "popup") && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="push-title">Título</Label>
            <Input
              id="push-title"
              value={content.title ?? ""}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Ex: Nova feature disponível!"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="push-body">{channel === "push" ? "Mensagem" : "Descrição"}</Label>
            <Textarea
              id="push-body"
              value={content.body ?? ""}
              onChange={(e) => setField("body", e.target.value)}
              placeholder={
                channel === "push"
                  ? "Toque pra ver — até 60 caracteres"
                  : "Texto do popup..."
              }
              rows={4}
              disabled={isPending}
            />
          </div>
          {channel === "popup" && (
            <div className="space-y-1.5">
              <Label htmlFor="popup-cta">Texto do botão (CTA)</Label>
              <Input
                id="popup-cta"
                value={content.cta ?? ""}
                onChange={(e) => setField("cta", e.target.value)}
                placeholder="Ex: Quero ver agora"
                disabled={isPending}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Step 4: Agendamento
// ============================================================
function StepSchedule({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Agendamento</h2>
        <p className="text-sm text-muted-foreground">
          Quando o disparo deve acontecer?
        </p>
      </div>

      <div className="space-y-2">
        <ModeOption
          active={state.schedule_mode === "now"}
          icon={<Send className="w-5 h-5" />}
          title="Enviar agora"
          description="Vai pra fila de processamento imediatamente após criar."
          onClick={() => update({ schedule_mode: "now", scheduled_at: null })}
        />
        <ModeOption
          active={state.schedule_mode === "scheduled"}
          icon={<Clock className="w-5 h-5" />}
          title="Agendar pra data futura"
          description="Escolha uma data e hora específicas."
          onClick={() => update({ schedule_mode: "scheduled" })}
        />
      </div>

      {state.schedule_mode === "scheduled" && (
        <div className="space-y-1.5">
          <Label htmlFor="scheduled-at">Data e hora</Label>
          <Input
            id="scheduled-at"
            type="datetime-local"
            value={state.scheduled_at ?? ""}
            onChange={(e) => update({ scheduled_at: e.target.value })}
            min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
          />
          {state.scheduled_at && new Date(state.scheduled_at).getTime() <= Date.now() && (
            <p className="text-[11px] text-destructive">
              A data agendada precisa estar no futuro.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ModeOption({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border-2 p-4 flex items-start gap-3 text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="text-primary mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="font-bold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <div
        className={`w-4 h-4 rounded-full border-2 mt-1 ${
          active ? "bg-primary border-primary" : "border-muted-foreground/40"
        }`}
      />
    </button>
  );
}

// ============================================================
// Step 5: Revisão
// ============================================================
function StepReview({ state }: { state: WizardState }) {
  const channelConfig = state.channel ? CHANNELS[state.channel] : null;
  const ChannelIcon = channelConfig?.icon;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Revisão</h2>
        <p className="text-sm text-muted-foreground">
          Confira os detalhes antes de finalizar.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {channelConfig && ChannelIcon && (
          <ReviewRow
            label="Canal"
            value={
              <span
                className="inline-flex items-center gap-2 px-2 py-1 rounded-md"
                style={{
                  background: `${channelConfig.color}20`,
                  border: `1px solid ${channelConfig.color}50`,
                }}
              >
                <ChannelIcon className="w-3.5 h-3.5" style={{ color: channelConfig.color }} />
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: channelConfig.color }}
                >
                  {channelConfig.label}
                </span>
              </span>
            }
          />
        )}

        <ReviewRow
          label="Audiência"
          value={
            state.channel === "telegram_x1"
              ? "Broadcast geral (toda a base SendPulse)"
              : state.audience_id
                ? "Audiência salva selecionada"
                : hasFilters(state.audience_filters)
                  ? "Filtros ad-hoc aplicados"
                  : "—"
          }
        />

        <ReviewRow
          label="Agendamento"
          value={
            state.schedule_mode === "now"
              ? "Enviar imediatamente"
              : state.scheduled_at
                ? `Agendado pra ${new Date(state.scheduled_at).toLocaleString("pt-BR")}`
                : "—"
          }
        />

        <ReviewRow
          label="Conteúdo"
          value={
            <ContentPreview channel={state.channel} content={state.content} />
          }
        />
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Próximo passo:</strong> ao salvar, o schedule fica
        registrado no banco. O disparo efetivo (envio real via Resend/etc.) será habilitado
        na Sub-fase 1.6.
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-0.5">
        {label}
      </div>
      <div className="flex-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function ContentPreview({
  channel,
  content,
}: {
  channel: ChannelKey | null;
  content: Record<string, any>;
}) {
  if (!channel) return <span className="text-muted-foreground italic">—</span>;
  if (channel === "email") {
    return (
      <div className="space-y-1">
        <div className="text-xs">
          <strong>Assunto:</strong> {content.subject || <em className="text-muted-foreground">—</em>}
        </div>
        <div className="text-xs whitespace-pre-wrap line-clamp-4">
          {content.body || <em className="text-muted-foreground">Sem corpo</em>}
        </div>
      </div>
    );
  }
  if (channel === "push" || channel === "popup") {
    return (
      <div className="space-y-1">
        <div className="text-xs">
          <strong>Título:</strong> {content.title || <em className="text-muted-foreground">—</em>}
        </div>
        <div className="text-xs whitespace-pre-wrap line-clamp-3">
          {content.body || <em className="text-muted-foreground">Sem corpo</em>}
        </div>
      </div>
    );
  }
  return (
    <div className="text-xs whitespace-pre-wrap line-clamp-4">
      {content.body || <em className="text-muted-foreground">Sem mensagem</em>}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function validateContent(state: WizardState): boolean {
  const c = state.content;
  if (!state.channel) return false;
  if (state.channel === "email") return !!(c.subject?.trim() && c.body?.trim());
  if (state.channel === "push" || state.channel === "popup")
    return !!(c.title?.trim() && c.body?.trim());
  return !!c.body?.trim();
}

function hasFilters(filters: AudienceFilters | null): boolean {
  if (!filters) return false;
  return Object.keys(filters).some((k) => (filters as any)[k] !== undefined);
}

function autoName(state: WizardState): string {
  if (!state.channel) return "";
  const ch = CHANNELS[state.channel];
  const date = new Date().toLocaleDateString("pt-BR");
  return `${ch.label} · ${date}`;
}
