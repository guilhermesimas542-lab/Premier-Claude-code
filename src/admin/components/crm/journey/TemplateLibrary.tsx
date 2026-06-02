import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, ArrowRight, Sparkles, Layers, Trash2, BookOpen, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOURNEY_TEMPLATES, type JourneyTemplate } from "../../../lib/crm/journeyTemplates";
import { CHANNELS, CHANNEL_LIST, type ChannelKey } from "../../../lib/crm/channels";
import { TRIGGERS } from "../../../lib/crm/triggers";
import { useJourneyTemplates, type CustomJourneyTemplate } from "../../../hooks/crm/useJourneyTemplates";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const DELAY_UNIT_SHORT: Record<string, string> = {
  minute: "min",
  hour: "h",
  day: "d",
  week: "sem",
};

/** Normaliza tanto built-in quanto custom pro mesmo shape de exibição/install. */
type UnifiedTemplate = Omit<JourneyTemplate, "channel"> & {
  /** Pode ser null pra templates customizados antigos (mistos). */
  channel: ChannelKey | null;
  source: "builtin" | "custom";
  custom_id?: string;
};

function normalizeCustom(c: CustomJourneyTemplate): UnifiedTemplate {
  const steps = (c.steps ?? [])
    .slice()
    .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
    .map((s) => ({
      channel: s.channel,
      content: s.content ?? {},
      delay_value: s.delay_value ?? 0,
      delay_unit: s.delay_unit ?? "day",
    }));
  // Se o template antigo não tem `channel` mas todos os steps usam o mesmo,
  // inferimos pra exibir como single-channel.
  const inferredChannel =
    c.channel ??
    (steps.length > 0 && steps.every((s) => s.channel === steps[0].channel)
      ? (steps[0].channel as ChannelKey)
      : null);
  return {
    key: `custom:${c.id}`,
    name: c.name,
    description: c.description ?? "",
    trigger_type: c.trigger_type,
    trigger_config: c.trigger_config ?? {},
    steps,
    channel: inferredChannel,
    source: "custom",
    custom_id: c.id,
  };
}

export function TemplateLibrary({ onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const [installing, setInstalling] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelKey | "all">("all");
  const { items: customs, loading: loadingCustoms, remove } = useJourneyTemplates();

  const builtins: UnifiedTemplate[] = JOURNEY_TEMPLATES.map((t) => ({
    ...t,
    source: "builtin",
  }));
  const customsUnified: UnifiedTemplate[] = customs.map(normalizeCustom);

  const filteredBuiltins = useMemo(
    () => (channelFilter === "all" ? builtins : builtins.filter((t) => t.channel === channelFilter)),
    [builtins, channelFilter]
  );
  const filteredCustoms = useMemo(
    () =>
      channelFilter === "all"
        ? customsUnified
        : customsUnified.filter((t) => t.channel === channelFilter),
    [customsUnified, channelFilter]
  );

  const handleInstall = async (template: UnifiedTemplate) => {
    setInstalling(template.key);

    const { data: journey, error: jErr } = await (supabase as any)
      .from("crm_journeys")
      .insert({
        name: template.name,
        description: template.description,
        trigger_type: template.trigger_type,
        trigger_config: template.trigger_config,
        channel: template.channel ?? null,
        status: "draft",
      })
      .select()
      .single();

    if (jErr || !journey) {
      toast.error(`Erro ao criar jornada: ${jErr?.message ?? "desconhecido"}`);
      setInstalling(null);
      return;
    }

    const stepsPayload = template.steps.map((s, idx) => ({
      journey_id: journey.id,
      step_order: idx + 1,
      // Força o canal da jornada em todos os steps (single-channel).
      channel: template.channel ?? s.channel,
      content: s.content,
      delay_value: s.delay_value,
      delay_unit: s.delay_unit,
    }));

    const { error: sErr } = await (supabase as any)
      .from("crm_journey_steps")
      .insert(stepsPayload);

    if (sErr) {
      toast.error(`Jornada criada mas falhou ao inserir steps: ${sErr.message}`);
    } else {
      toast.success(`Template "${template.name}" criado com ${template.steps.length} passos`);
    }

    setInstalling(null);
    onCreated();
    navigate(`/admin/crm/journeys/${journey.id}/edit`);
  };

  const handleDeleteCustom = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Excluir o template "${name}"? Esta ação não pode ser desfeita.`)) return;
    await remove(id);
  };

  const renderCard = (t: UnifiedTemplate) => {
    const trig = TRIGGERS[t.trigger_type];
    if (!trig) return null;
    const TIcon = trig.icon;
    const isInstalling = installing === t.key;
    const ch = t.channel ? CHANNELS[t.channel] : null;
    const ChIcon = ch?.icon;
    return (
      <div key={t.key} className="rounded-xl border border-border bg-muted/10 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${trig.color}20`,
              border: `1px solid ${trig.color}50`,
            }}
          >
            <TIcon className="w-4 h-4" style={{ color: trig.color }} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-foreground">{t.name}</h4>
            {t.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {ch && ChIcon ? (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1"
                  style={{
                    background: `${ch.color}15`,
                    border: `1px solid ${ch.color}40`,
                    color: ch.color,
                  }}
                >
                  <ChIcon className="w-3 h-3" />
                  {ch.shortLabel}
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400">
                  Misto / legado
                </span>
              )}
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  background: `${trig.color}15`,
                  border: `1px solid ${trig.color}40`,
                  color: trig.color,
                }}
              >
                {trig.shortLabel}
              </span>
              {t.trigger_type === "churn_inactive" &&
                t.trigger_config.days_inactive && (
                  <span className="text-[11px] text-muted-foreground">
                    {t.trigger_config.days_inactive} dias sem login
                  </span>
                )}
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {t.steps.length} passos
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-3 pl-12">
          {t.steps.map((s, idx) => {
            const sch = CHANNELS[s.channel];
            if (!sch) return null;
            const Icon = sch.icon;
            return (
              <div key={idx} className="flex items-center gap-1">
                {idx > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground/50" />}
                <div
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                  style={{
                    background: `${sch.color}15`,
                    border: `1px solid ${sch.color}40`,
                  }}
                  title={`${sch.label} · delay ${s.delay_value}${DELAY_UNIT_SHORT[s.delay_unit]}`}
                >
                  <Icon className="w-3 h-3" style={{ color: sch.color }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: sch.color }}
                  >
                    {sch.shortLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    +{s.delay_value}
                    {DELAY_UNIT_SHORT[s.delay_unit]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          {t.source === "custom" && t.custom_id && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => handleDeleteCustom(e, t.custom_id!, t.name)}
              disabled={installing !== null}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Excluir
            </Button>
          )}
          <Button size="sm" onClick={() => handleInstall(t)} disabled={installing !== null}>
            {isInstalling ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Criar a partir deste template
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border p-5 flex items-start justify-between gap-3 z-10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Templates de jornada</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comece com fluxos prontos ou seus próprios templates salvos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Filtro por canal */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Canal:
            </span>
            <Select
              value={channelFilter}
              onValueChange={(v) => setChannelFilter(v as ChannelKey | "all")}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue />
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
          </div>

          {/* Built-in */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Prontos
              </h4>
            </div>
            {filteredBuiltins.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 text-center">
                <p className="text-xs text-muted-foreground">
                  Nenhum template pronto pra esse canal.
                </p>
              </div>
            ) : (
              <div className="space-y-4">{filteredBuiltins.map(renderCard)}</div>
            )}
          </section>

          {/* Customs */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Meus templates
              </h4>
            </div>
            {loadingCustoms ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustoms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 text-center">
                <p className="text-xs text-muted-foreground">
                  Pra criar um template, monte uma jornada e clique{" "}
                  <strong>"Salvar como template"</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">{filteredCustoms.map(renderCard)}</div>
            )}
          </section>
        </div>

        <div className="border-t border-border p-4 text-[11px] text-muted-foreground bg-muted/10">
          As jornadas criadas ficam como <strong>rascunho</strong>. Revise os steps no
          builder e clique <strong>Ativar</strong> quando quiser começar a inscrever leads.
        </div>
      </div>
    </div>
  );
}
