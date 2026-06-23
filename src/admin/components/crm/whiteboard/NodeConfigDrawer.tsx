import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ENGAGEMENT_OPTIONS,
  FUNNEL_STATUS_OPTIONS,
} from "@/admin/lib/crm/conditionEvents";
import { CHANNEL_LIST, CHANNELS, type ChannelKey } from "@/admin/lib/crm/channels";
import { ChannelContentForm } from "@/admin/components/crm/journey/ChannelContentForm";
import {
  TRIGGERS,
  TRIGGER_LIST,
  PAYT_EVENT_OPTIONS,
  type TriggerKey,
} from "@/admin/lib/crm/triggers";
import type {
  RFNode,
  DelayUnit,
  UpdateNodeFields,
} from "@/admin/hooks/crm/useJourneyGraph";
import { toast } from "sonner";

interface Props {
  node: RFNode | null;
  messageNodes: RFNode[];
  triggerType?: string | null;
  triggerConfig?: Record<string, any> | null;
  onClose: () => void;
  onSave: (id: string, fields: UpdateNodeFields) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onTriggerSave?: (fields: { trigger_type: string; trigger_config: Record<string, any> }) => Promise<void> | void;
}

export function NodeConfigDrawer({ node, messageNodes, triggerType, triggerConfig, onClose, onSave, onDelete, onTriggerSave }: Props) {
  const open = !!node;
  const [channel, setChannel] = useState<ChannelKey | null>(null);
  const [content, setContent] = useState<Record<string, any>>({});
  const [delayValue, setDelayValue] = useState<number>(1);
  const [delayUnit, setDelayUnit] = useState<DelayUnit>("day");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [trigType, setTrigType] = useState<TriggerKey>("manual");
  const [trigCfg, setTrigCfg] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!node) return;
    setChannel(node.data.channel ?? null);
    setContent(node.data.content ?? {});
    setDelayValue(node.data.delay_value ?? 1);
    setDelayUnit((node.data.delay_unit as DelayUnit) ?? "day");
    setConfig(node.data.config ?? {});
    setTrigType(((triggerType as TriggerKey) ?? "manual"));
    setTrigCfg(triggerConfig ?? {});
  }, [node?.id, triggerType, triggerConfig]);

  if (!node) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields: UpdateNodeFields = {};
      if (node.type === "message") {
        if (!channel) {
          toast.error("Escolha um canal");
          setSaving(false);
          return;
        }
        fields.channel = channel;
        fields.content = content;
      } else if (node.type === "wait") {
        if (!delayValue || delayValue <= 0) {
          toast.error("Informe um tempo de espera válido");
          setSaving(false);
          return;
        }
        fields.delay_value = delayValue;
        fields.delay_unit = delayUnit;
      } else if (node.type === "condition") {
        if (!config.event) {
          toast.error("Escolha um evento");
          setSaving(false);
          return;
        }
        fields.config = {
          event: config.event,
          window_hours: config.window_hours ?? 72,
          source_node_id: config.source_node_id ?? null,
        };
      } else if (node.type === "tag") {
        if (!config.tag || !String(config.tag).trim()) {
          toast.error("Informe o nome da tag");
          setSaving(false);
          return;
        }
        fields.config = {
          action: config.action ?? "add",
          tag: String(config.tag).trim(),
        };
      } else if (node.type === "trigger") {
        if (trigType === "webhook_status" && !trigCfg.payt_event) {
          toast.error("Escolha o evento da Payt");
          setSaving(false);
          return;
        }
        if (onTriggerSave) {
          await onTriggerSave({ trigger_type: trigType, trigger_config: trigCfg });
          toast.success("Gatilho atualizado");
          onClose();
          return;
        }
      }
      await onSave(node.id, fields);
      toast.success("Nó salvo");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const titleByType: Record<string, string> = {
    trigger: "Gatilho",
    message: "Mensagem",
    wait: "Esperar",
    condition: "Condição",
    tag: "Marcar usuário",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{titleByType[node.type]}</SheetTitle>
          <SheetDescription>Configure este nó da jornada</SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {node.type === "trigger" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Tipo de gatilho</Label>
                <Select value={trigType} onValueChange={(v) => setTrigType(v as TriggerKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_LIST.map((t) => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground italic">
                  {TRIGGERS[trigType].description}
                </p>
              </div>
              {trigType === "churn_inactive" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Dias sem login</Label>
                  <Input
                    type="number"
                    min={1}
                    value={trigCfg.days_inactive ?? 7}
                    onChange={(e) =>
                      setTrigCfg((c) => ({ ...c, days_inactive: parseInt(e.target.value) || 7 }))
                    }
                    className="w-32"
                  />
                </div>
              )}
              {trigType === "webhook_status" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Evento da Payt</Label>
                  <Select
                    value={trigCfg.payt_event ?? ""}
                    onValueChange={(v) => setTrigCfg((c) => ({ ...c, payt_event: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Escolha um evento" /></SelectTrigger>
                    <SelectContent>
                      {PAYT_EVENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground italic">
                    A jornada dispara automaticamente quando o lead atingir esse status na Payt.
                  </p>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                O que você ajusta aqui é o gatilho <b>da jornada inteira</b>.
              </p>
            </div>
          )}

          {node.type === "message" && (
            <>
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={channel ?? undefined} onValueChange={(v) => setChannel(v as ChannelKey)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_LIST.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {channel && CHANNELS[channel].warning && (
                  <p className="text-[11px] text-amber-600">{CHANNELS[channel].warning}</p>
                )}
              </div>
              {channel && (
                <ChannelContentForm channel={channel} content={content} onChange={setContent} />
              )}
            </>
          )}

          {node.type === "wait" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quanto</Label>
                <Input
                  type="number"
                  min={1}
                  value={delayValue}
                  onChange={(e) => setDelayValue(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={delayUnit} onValueChange={(v) => setDelayUnit(v as DelayUnit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minute">Minuto(s)</SelectItem>
                    <SelectItem value="hour">Hora(s)</SelectItem>
                    <SelectItem value="day">Dia(s)</SelectItem>
                    <SelectItem value="week">Semana(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {node.type === "condition" && (
            <>
              <div className="space-y-1.5">
                <Label>Evento a checar</Label>
                <Select
                  value={config.event ?? undefined}
                  onValueChange={(v) => setConfig({ ...config, event: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Engajamento</SelectLabel>
                      {ENGAGEMENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Status do funil (Payt)</SelectLabel>
                      {FUNNEL_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Janela de tempo (horas)</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.window_hours ?? 72}
                  onChange={(e) =>
                    setConfig({ ...config, window_hours: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="link-source-msg"
                    checked={config.source_node_id !== undefined && config.source_node_id !== null}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfig({ ...config, source_node_id: "auto" });
                      } else {
                        const { source_node_id, ...rest } = config;
                        setConfig({ ...rest, source_node_id: null });
                      }
                    }}
                  />
                  <Label htmlFor="link-source-msg" className="cursor-pointer font-normal">
                    Vincular a uma mensagem de origem
                  </Label>
                </div>
                {config.source_node_id !== undefined && config.source_node_id !== null && (
                  <Select
                    value={config.source_node_id ?? "auto"}
                    onValueChange={(v) =>
                      setConfig({ ...config, source_node_id: v === "auto" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Nó de mensagem anterior (auto)</SelectItem>
                      {messageNodes.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.data.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-[11px] text-muted-foreground">
                  As saídas <b>sim</b> e <b>não</b> são definidas pelos handles do nó.
                </p>
              </div>
            </>
          )}

          {node.type === "tag" && (
            <>
              <div className="space-y-1.5">
                <Label>Ação</Label>
                <Select
                  value={config.action ?? "add"}
                  onValueChange={(v) => setConfig({ ...config, action: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Adicionar</SelectItem>
                    <SelectItem value="remove">Remover</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nome da tag</Label>
                <Input
                  value={config.tag ?? ""}
                  onChange={(e) => setConfig({ ...config, tag: e.target.value })}
                  placeholder="Ex: CONVERTEU"
                />
              </div>
            </>
          )}
        </div>

        <SheetFooter className="gap-2 sm:justify-between">
          <div>
            {onDelete && node.type !== "trigger" && (
              <Button
                variant="destructive"
                disabled={saving}
                onClick={async () => {
                  if (!confirm("Excluir este nó? Ligações conectadas também serão removidas.")) return;
                  setSaving(true);
                  try { await onDelete(node.id); onClose(); }
                  finally { setSaving(false); }
                }}
              >
                Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            {(node.type !== "trigger" || onTriggerSave) && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
