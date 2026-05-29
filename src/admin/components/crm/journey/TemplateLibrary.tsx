import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, ArrowRight, Sparkles, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { JOURNEY_TEMPLATES, type JourneyTemplate } from "../../../lib/crm/journeyTemplates";
import { CHANNELS } from "../../../lib/crm/channels";
import { TRIGGERS } from "../../../lib/crm/triggers";

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

export function TemplateLibrary({ onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const [installing, setInstalling] = useState<string | null>(null);

  const handleInstall = async (template: JourneyTemplate) => {
    setInstalling(template.key);

    // 1) cria a journey (em rascunho)
    const { data: journey, error: jErr } = await (supabase as any)
      .from("crm_journeys")
      .insert({
        name: template.name,
        description: template.description,
        trigger_type: template.trigger_type,
        trigger_config: template.trigger_config,
        status: "draft",
      })
      .select()
      .single();

    if (jErr || !journey) {
      toast.error(`Erro ao criar jornada: ${jErr?.message ?? "desconhecido"}`);
      setInstalling(null);
      return;
    }

    // 2) cria steps em batch
    const stepsPayload = template.steps.map((s, idx) => ({
      journey_id: journey.id,
      step_order: idx + 1,
      channel: s.channel,
      content: s.content,
      delay_value: s.delay_value,
      delay_unit: s.delay_unit,
    }));

    const { error: sErr } = await (supabase as any)
      .from("crm_journey_steps")
      .insert(stepsPayload);

    if (sErr) {
      toast.error(`Jornada criada mas falhou ao inserir steps: ${sErr.message}`);
      // segue mesmo assim — usuário pode adicionar steps depois
    } else {
      toast.success(`Template "${template.name}" criado com ${template.steps.length} passos`);
    }

    setInstalling(null);
    onCreated();
    navigate(`/admin/crm/journeys/${journey.id}/edit`);
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
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Templates de jornada</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comece com fluxos prontos do brief. Editáveis depois.
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

        {/* Lista de templates */}
        <div className="p-5 space-y-4">
          {JOURNEY_TEMPLATES.map((t) => {
            const trig = TRIGGERS[t.trigger_type];
            const TIcon = trig.icon;
            const isInstalling = installing === t.key;
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
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
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

                {/* Steps preview */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3 pl-12">
                  {t.steps.map((s, idx) => {
                    const ch = CHANNELS[s.channel];
                    const Icon = ch.icon;
                    return (
                      <div key={idx} className="flex items-center gap-1">
                        {idx > 0 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                        )}
                        <div
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                          style={{
                            background: `${ch.color}15`,
                            border: `1px solid ${ch.color}40`,
                          }}
                          title={`${ch.label} · delay ${s.delay_value}${DELAY_UNIT_SHORT[s.delay_unit]}`}
                        >
                          <Icon className="w-3 h-3" style={{ color: ch.color }} />
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: ch.color }}
                          >
                            {ch.shortLabel}
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

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleInstall(t)}
                    disabled={installing !== null}
                  >
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
          })}
        </div>

        <div className="border-t border-border p-4 text-[11px] text-muted-foreground bg-muted/10">
          As jornadas criadas ficam como <strong>rascunho</strong>. Revise os steps no
          builder e clique <strong>Ativar</strong> quando quiser começar a inscrever leads.
        </div>
      </div>
    </div>
  );
}
