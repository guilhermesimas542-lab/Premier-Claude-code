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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_LIST, CHANNELS, type ChannelKey } from "@/admin/lib/crm/channels";
import { ChannelContentForm } from "@/admin/components/crm/journey/ChannelContentForm";
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
  onClose: () => void;
  onSave: (id: string, fields: UpdateNodeFields) => Promise<void> | void;
}

export function NodeConfigDrawer({ node, messageNodes, triggerType, onClose, onSave }: Props) {
  const open = !!node;
  const [channel, setChannel] = useState<ChannelKey | null>(null);
  const [content, setContent] = useState<Record<string, any>>({});
  const [delayValue, setDelayValue] = useState<number>(1);
  const [delayUnit, setDelayUnit] = useState<DelayUnit>("day");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!node) return;
    setChannel(node.data.channel ?? null);
    setContent(node.data.content ?? {});
    setDelayValue(node.data.delay_value ?? 1);
    setDelayUnit((node.data.delay_unit as DelayUnit) ?? "day");
    setConfig(node.data.config ?? {});
  }, [node?.id]);

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
            <div className="space-y-1.5">
              <Label>Tipo de gatilho</Label>
              <Input value={triggerType ?? "—"} disabled />
              <p className="text-[11px] text-muted-foreground">
                O gatilho da jornada é configurado no builder. Aqui é só o ponto de entrada.
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
                    <SelectItem value="opened">Abriu</SelectItem>
                    <SelectItem value="clicked">Clicou</SelectItem>
                    <SelectItem value="converted">Converteu</SelectItem>
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
              <div className="space-y-1.5">
                <Label>Mensagem de origem (opcional)</Label>
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

        <SheetFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {node.type !== "trigger" && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
