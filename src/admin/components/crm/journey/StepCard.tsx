import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChannelContentForm } from "./ChannelContentForm";
import { CHANNELS } from "../../../lib/crm/channels";
import {
  type JourneyStep,
  type DelayUnit,
} from "../../../hooks/crm/useJourneySteps";

interface Props {
  step: JourneyStep;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<JourneyStep>) => Promise<boolean>;
  onRemove: () => Promise<void>;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
}

const DELAY_UNITS: { value: DelayUnit; label: string }[] = [
  { value: "minute", label: "minutos" },
  { value: "hour", label: "horas" },
  { value: "day", label: "dias" },
  { value: "week", label: "semanas" },
];

export function StepCard({
  step,
  index,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  const channel = CHANNELS[step.channel];
  const Icon = channel.icon;
  const isPending = channel.integrationStatus === "blocked";

  const [expanded, setExpanded] = useState(isFirst);
  const [draft, setDraft] = useState({
    content: step.content,
    delay_value: step.delay_value,
    delay_unit: step.delay_unit,
  });
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);

  const isDirty =
    JSON.stringify(draft.content) !== JSON.stringify(step.content) ||
    draft.delay_value !== step.delay_value ||
    draft.delay_unit !== step.delay_unit;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({
      content: draft.content,
      delay_value: draft.delay_value,
      delay_unit: draft.delay_unit,
    });
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!confirm(`Remover o step #${index + 1} (${channel.label})?`)) return;
    setWorking(true);
    await onRemove();
    setWorking(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header colapsado */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/20"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Numeração */}
        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
          {index + 1}
        </div>

        {/* Badge do canal */}
        <div
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md shrink-0"
          style={{ background: `${channel.color}20`, border: `1px solid ${channel.color}50` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: channel.color }} />
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: channel.color }}
          >
            {channel.shortLabel}
          </span>
        </div>

        {/* Resumo */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">
            {step.content?.subject ||
              step.content?.title ||
              step.content?.body?.slice(0, 60) ||
              <span className="text-muted-foreground italic">Sem conteúdo</span>}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Delay: {step.delay_value}{" "}
            {DELAY_UNITS.find((u) => u.value === step.delay_unit)?.label}
          </div>
        </div>

        {/* Aviso pending */}
        {isPending && (
          <div title={channel.warning} className="shrink-0">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </div>
        )}

        {/* Ordem */}
        <div className="flex gap-0 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            disabled={isFirst || working}
            onClick={onMoveUp}
            title="Mover para cima"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLast || working}
            onClick={onMoveDown}
            title="Mover para baixo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Toggle */}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Corpo expandido */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/10">
          {channel.warning && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">{channel.warning}</p>
            </div>
          )}

          {/* Delay */}
          <div className="space-y-1.5">
            <Label>Esperar antes deste passo</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min={0}
                value={draft.delay_value}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, delay_value: parseInt(e.target.value) || 0 }))
                }
                className="w-24"
              />
              <Select
                value={draft.delay_unit}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, delay_unit: v as DelayUnit }))
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELAY_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {isFirst ? "após entrada na jornada" : "após o passo anterior"}
              </span>
            </div>
          </div>

          {/* Conteúdo da mensagem */}
          <ChannelContentForm
            channel={step.channel}
            content={draft.content}
            onChange={(c) => setDraft((d) => ({ ...d, content: c }))}
          />

          {/* Ações */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={working}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Remover step
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saving}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Salvar passo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
