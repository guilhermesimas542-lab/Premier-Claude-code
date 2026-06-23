import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TRIGGERS, TRIGGER_LIST, PAYT_EVENT_OPTIONS, type TriggerKey } from "@/admin/lib/crm/triggers";
import { useAudiences } from "@/admin/hooks/crm/useAudiences";
import { NewAudienceInlineButton } from "@/admin/components/crm/NewAudienceInlineButton";
import { JOURNEY_PALETTE, type JourneyRow } from "@/admin/hooks/crm/useUnifiedWhiteboard";

interface Props {
  journey: JourneyRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (
    journeyId: string,
    fields: {
      name?: string;
      color?: string;
      trigger_type?: string;
      trigger_config?: Record<string, any>;
      audience_id?: string | null;
      status?: string;
    }
  ) => Promise<void> | void;
}

const STATUSES = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativa" },
  { value: "paused", label: "Pausada" },
  { value: "archived", label: "Arquivada" },
];

export function JourneyConfigSheet({ journey, open, onOpenChange, onSave }: Props) {
  const { items: audiences, create: createAudience, refresh: refreshAudiences } = useAudiences();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(JOURNEY_PALETTE[0]);
  const [triggerType, setTriggerType] = useState<TriggerKey>("manual");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [audienceId, setAudienceId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!journey) return;
    setName(journey.name ?? "");
    setColor(journey.color ?? JOURNEY_PALETTE[0]);
    setTriggerType((journey.trigger_type && journey.trigger_type in TRIGGERS ? journey.trigger_type : "manual") as TriggerKey);
    setTriggerConfig(journey.trigger_config ?? {});
    setAudienceId(journey.audience_id ?? null);
    setStatus(journey.status ?? "draft");
  }, [journey]);

  if (!journey) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(journey.id, {
      name: name.trim() || journey.name,
      color,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      audience_id: audienceId,
      status,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[460px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configuração da jornada</SheetTitle>
          <SheetDescription>
            Edita gatilho, audiência e status. Tudo salva no banco.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Cor */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {JOURNEY_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-md border border-border"
                  style={{
                    background: c,
                    outline: c === color ? "2px solid hsl(var(--foreground))" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gatilho */}
          <div className="space-y-1.5 pt-3 border-t border-border/50">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Gatilho (quando o lead entra)
            </Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGER_LIST.map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground italic">
              {(TRIGGERS[triggerType] ?? TRIGGERS.manual).description}
            </p>
            {triggerType === "churn_inactive" && (
              <div className="pt-2">
                <Label className="text-xs">Dias sem login</Label>
                <Input
                  type="number"
                  min={1}
                  value={triggerConfig.days_inactive ?? 7}
                  onChange={(e) =>
                    setTriggerConfig((c) => ({ ...c, days_inactive: parseInt(e.target.value) || 7 }))
                  }
                  className="mt-1 w-32"
                />
              </div>
            )}
            {triggerType === "webhook_status" && (
              <div className="pt-2 space-y-1.5">
                <Label className="text-xs">Evento da Payt</Label>
                <Select
                  value={triggerConfig.payt_event ?? ""}
                  onValueChange={(v) =>
                    setTriggerConfig((c) => ({ ...c, payt_event: v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Escolha um evento" /></SelectTrigger>
                  <SelectContent>
                    {PAYT_EVENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground italic">
                  A jornada dispara automaticamente quando o lead atingir esse status no checkout da Payt.
                </p>
              </div>
            )}
          </div>

          {/* Audiência */}
          <div className="space-y-1.5 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Audiência (opcional)
              </Label>
              <NewAudienceInlineButton
                create={createAudience}
                refresh={refreshAudiences}
                onCreated={(a) => setAudienceId(a.id)}
              />
            </div>
            <Select
              value={audienceId ?? "none"}
              onValueChange={(v) => setAudienceId(v === "none" ? null : v)}
            >
              <SelectTrigger><SelectValue placeholder="Toda a base" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Toda a base (sem filtro)</SelectItem>
                {audiences.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground italic">
              Filtra quem pode entrar na jornada quando o gatilho acontecer.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
