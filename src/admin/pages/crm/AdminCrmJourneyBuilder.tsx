import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Save,
  Play,
  Pause,
  ChevronDown,
  BookmarkPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { useJourneys, type Journey } from "../../hooks/crm/useJourneys";
import { useJourneySteps } from "../../hooks/crm/useJourneySteps";
import { useAudiences } from "../../hooks/crm/useAudiences";
import { useJourneyTemplates } from "../../hooks/crm/useJourneyTemplates";
import { ChannelPicker } from "../../components/crm/journey/ChannelPicker";
import { StepCard } from "../../components/crm/journey/StepCard";
import {
  TRIGGERS,
  TRIGGER_LIST,
  JOURNEY_STATUS_META,
  type JourneyStatus,
  type TriggerKey,
} from "../../lib/crm/triggers";
import type { ChannelKey } from "../../lib/crm/channels";

export default function AdminCrmJourneyBuilder() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const { create, update, setStatus, refresh } = useJourneys();
  const { items: audiences } = useAudiences();
  const { saveFromJourney } = useJourneyTemplates();
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [journey, setJourney] = useState<Journey | null>(null);
  const [loadingJourney, setLoadingJourney] = useState(!isNew);
  const [creating, setCreating] = useState(false);

  // ============================================================
  // Carrega jornada existente (modo edit)
  // ============================================================
  useEffect(() => {
    if (isNew) return;
    let mounted = true;
    (async () => {
      setLoadingJourney(true);
      const { data, error } = await (supabase as any)
        .from("crm_journeys")
        .select(
          `id, name, description, trigger_type, trigger_config,
           audience_id, audience_filters, status, stats,
           created_by, created_at, updated_at,
           audience:crm_audiences ( id, name, kind, filters )`
        )
        .eq("id", id)
        .single();
      if (!mounted) return;
      if (error) {
        toast.error(`Erro ao carregar jornada: ${error.message}`);
        navigate("/admin/crm/journeys");
        return;
      }
      setJourney(data as Journey);
      setLoadingJourney(false);
    })();
    return () => {
      mounted = false;
    };
  }, [id, isNew, navigate]);

  // ============================================================
  // Estado do header (edição inline)
  // ============================================================
  const [headerDraft, setHeaderDraft] = useState({
    name: "",
    description: "",
    trigger_type: "onboarding" as TriggerKey,
    trigger_config: {} as Record<string, any>,
    audience_id: null as string | null,
  });
  const [headerInitialized, setHeaderInitialized] = useState(false);

  useEffect(() => {
    if (!journey || headerInitialized) return;
    setHeaderDraft({
      name: journey.name,
      description: journey.description ?? "",
      trigger_type: journey.trigger_type,
      trigger_config: journey.trigger_config ?? {},
      audience_id: journey.audience_id,
    });
    setHeaderInitialized(true);
  }, [journey, headerInitialized]);

  const isHeaderDirty =
    journey
      ? headerDraft.name !== journey.name ||
        (headerDraft.description ?? "") !== (journey.description ?? "") ||
        headerDraft.trigger_type !== journey.trigger_type ||
        JSON.stringify(headerDraft.trigger_config) !== JSON.stringify(journey.trigger_config) ||
        headerDraft.audience_id !== journey.audience_id
      : true;

  // ============================================================
  // Steps (só faz sentido quando jornada existe)
  // ============================================================
  const {
    items: steps,
    loading: loadingSteps,
    create: createStep,
    update: updateStep,
    remove: removeStep,
    move: moveStep,
  } = useJourneySteps(journey?.id ?? null);

  const [pickerOpen, setPickerOpen] = useState(false);

  // ============================================================
  // Handlers
  // ============================================================

  const handleCreateJourney = async () => {
    if (!headerDraft.name.trim()) {
      toast.error("Dê um nome à jornada");
      return;
    }
    setCreating(true);
    const created = await create({
      name: headerDraft.name.trim(),
      description: headerDraft.description.trim() || undefined,
      trigger_type: headerDraft.trigger_type,
      trigger_config: headerDraft.trigger_config,
      audience_id: headerDraft.audience_id,
      status: "draft",
    });
    setCreating(false);
    if (created) {
      navigate(`/admin/crm/journeys/${created.id}/edit`, { replace: true });
    }
  };

  const handleSaveHeader = async () => {
    if (!journey) return;
    if (!headerDraft.name.trim()) {
      toast.error("Dê um nome à jornada");
      return;
    }
    const ok = await update(journey.id, {
      name: headerDraft.name.trim(),
      description: headerDraft.description.trim() || undefined,
      trigger_type: headerDraft.trigger_type,
      trigger_config: headerDraft.trigger_config,
      audience_id: headerDraft.audience_id,
    });
    if (ok) {
      toast.success("Cabeçalho salvo");
      // Re-fetch local
      setJourney((j) =>
        j
          ? {
              ...j,
              name: headerDraft.name.trim(),
              description: headerDraft.description.trim() || null,
              trigger_type: headerDraft.trigger_type,
              trigger_config: headerDraft.trigger_config,
              audience_id: headerDraft.audience_id,
            }
          : j
      );
      await refresh();
    }
  };

  const handleStatusToggle = async () => {
    if (!journey) return;
    if (steps.length === 0 && journey.status !== "active") {
      toast.error("Adicione pelo menos 1 passo antes de ativar.");
      return;
    }
    const next: JourneyStatus = journey.status === "active" ? "paused" : "active";
    const ok = await setStatus(journey.id, next);
    if (ok) {
      setJourney((j) => (j ? { ...j, status: next } : j));
    }
  };

  const handlePickChannel = async (channel: ChannelKey) => {
    if (!journey) return;
    setPickerOpen(false);
    // Primeiro step entra com delay 0; demais entram com delay 1 dia
    const isFirstEver = steps.length === 0;
    await createStep({
      journey_id: journey.id,
      channel,
      content: {},
      delay_value: isFirstEver ? 0 : 1,
      delay_unit: "day",
    });
  };

  // ============================================================
  // Render
  // ============================================================

  if (loadingJourney) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Voltar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin/crm/journeys")}
        className="text-muted-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        Voltar para jornadas
      </Button>

      {/* Top Bar — Header da jornada */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-3">
            <Input
              value={headerDraft.name}
              onChange={(e) => setHeaderDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Nome da jornada — ex: Onboarding Premium"
              className="text-lg font-bold border-0 bg-transparent px-0 focus-visible:ring-0 h-auto"
            />
            <Textarea
              value={headerDraft.description}
              onChange={(e) => setHeaderDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Descrição opcional — qual é o objetivo desta jornada?"
              rows={2}
              className="text-sm border-0 bg-transparent px-0 focus-visible:ring-0 resize-none"
            />
          </div>
          {journey && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusBadge status={journey.status} />
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
            </div>
          )}
        </div>

        {/* Trigger + audiência */}
        <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-border/50">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Trigger (quando o lead entra)
            </Label>
            <Select
              value={headerDraft.trigger_type}
              onValueChange={(v) =>
                setHeaderDraft((d) => ({ ...d, trigger_type: v as TriggerKey }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_LIST.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground italic">
              {TRIGGERS[headerDraft.trigger_type].description}
            </p>
            {headerDraft.trigger_type === "churn_inactive" && (
              <div className="pt-2">
                <Label className="text-xs">Dias sem login</Label>
                <Input
                  type="number"
                  min={1}
                  value={headerDraft.trigger_config.days_inactive ?? 7}
                  onChange={(e) =>
                    setHeaderDraft((d) => ({
                      ...d,
                      trigger_config: {
                        ...d.trigger_config,
                        days_inactive: parseInt(e.target.value) || 7,
                      },
                    }))
                  }
                  className="mt-1 w-32"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Audiência (opcional)
            </Label>
            <Select
              value={headerDraft.audience_id ?? "none"}
              onValueChange={(v) =>
                setHeaderDraft((d) => ({ ...d, audience_id: v === "none" ? null : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Toda a base" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Toda a base (sem filtro)</SelectItem>
                {audiences.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground italic">
              Filtra quem pode entrar na jornada quando o trigger acontecer.
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
          {isNew ? (
            <Button onClick={handleCreateJourney} disabled={creating || !headerDraft.name.trim()}>
              {creating ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Criar jornada
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!journey) return;
                  const proposed = window.prompt(
                    "Nome do template:",
                    journey.name
                  );
                  if (proposed === null) return;
                  setSavingTemplate(true);
                  await saveFromJourney(journey.id, proposed);
                  setSavingTemplate(false);
                }}
                disabled={!journey || savingTemplate}
              >
                {savingTemplate ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
                )}
                Salvar como template
              </Button>
              <Button
                onClick={handleSaveHeader}
                disabled={!isHeaderDirty}
                variant={isHeaderDirty ? "default" : "outline"}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Salvar cabeçalho
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canvas de Steps */}
      {!isNew && journey && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Passos da jornada</h2>
            <span className="text-xs text-muted-foreground">
              {steps.length} {steps.length === 1 ? "passo" : "passos"}
            </span>
          </div>

          {loadingSteps ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {steps.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Esta jornada ainda não tem passos.
                  </p>
                  <Button onClick={() => setPickerOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar primeiro passo
                  </Button>
                </div>
              )}

              {steps.map((s, idx) => (
                <div key={s.id} className="space-y-2">
                  {idx > 0 && (
                    <div className="flex justify-center">
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <StepCard
                    step={s}
                    index={idx}
                    isFirst={idx === 0}
                    isLast={idx === steps.length - 1}
                    onUpdate={(patch) => updateStep(s.id, patch)}
                    onRemove={async () => {
                      await removeStep(s.id);
                    }}
                    onMoveUp={async () => {
                      await moveStep(s.id, "up");
                    }}
                    onMoveDown={async () => {
                      await moveStep(s.id, "down");
                    }}
                  />
                </div>
              ))}

              {steps.length > 0 && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={() => setPickerOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar passo
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isNew && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Crie a jornada primeiro pra começar a adicionar passos.
          </p>
        </div>
      )}

      {pickerOpen && (
        <ChannelPicker onPick={handlePickChannel} onCancel={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: JourneyStatus }) {
  const meta = JOURNEY_STATUS_META[status];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
      style={{
        background: `${meta.color}20`,
        border: `1px solid ${meta.color}50`,
        color: meta.color,
      }}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}
