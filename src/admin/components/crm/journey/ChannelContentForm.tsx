import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { type ChannelKey, CHANNELS } from "../../../lib/crm/channels";
import { isImageSupportedChannel } from "../../../lib/crm/bannerTemplates";
import { ImageAttachControl } from "../ImageAttachControl";
import { LinkAttachControl } from "../LinkAttachControl";

interface Props {
  channel: ChannelKey;
  content: Record<string, any>;
  onChange: (content: Record<string, any>) => void;
}

/**
 * Form de conteúdo da mensagem, varia por canal.
 * Estrutura do content idem ao usado por crm_schedules:
 *   - email:    { subject, body, html? }
 *   - sms/telegram_group/telegram_x1/whatsapp: { body }
 *   - push:     { title, body }
 *   - popup:    { title, body, cta }
 */
export function ChannelContentForm({ channel, content, onChange }: Props) {
  const c = CHANNELS[channel];
  const isPending = c.integrationStatus === "blocked";

  const setField = (k: string, v: any) => onChange({ ...content, [k]: v });

  const imageControl = isImageSupportedChannel(channel) ? (
    <ImageAttachControl
      channel={channel}
      imageUrl={content.image_url ?? null}
      onChange={(url) => onChange({ ...content, image_url: url ?? undefined })}
    />
  ) : null;

  const linkControl = (
    <LinkAttachControl
      value={content.link_url ?? null}
      onChange={(url) => onChange({ ...content, link_url: url ?? undefined })}
    />
  );

  if (channel === "email") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Assunto</Label>
          <Input
            value={content.subject ?? ""}
            onChange={(e) => setField("subject", e.target.value)}
            placeholder="Ex: Sua nova entrada está pronta 🚀"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Corpo da mensagem</Label>
          <Textarea
            value={content.body ?? ""}
            onChange={(e) => setField("body", e.target.value)}
            placeholder="Olá {nome}, ..."
            rows={6}
          />
          <p className="text-[10px] text-muted-foreground">
            Variáveis: <code>{"{nome}"}</code>, <code>{"{plano}"}</code>,{" "}
            <code>{"{dias_sem_login}"}</code>, <code>{"{data_cadastro}"}</code>
          </p>
        </div>
        {imageControl}
      </div>
    );
  }

  if (
    channel === "sms" ||
    channel === "telegram_group" ||
    channel === "telegram_x1" ||
    channel === "whatsapp"
  ) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Mensagem</Label>
          <Textarea
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
            rows={5}
          />
          <p className="text-[10px] text-muted-foreground">
            {channel === "sms"
              ? "Máximo recomendado: 160 caracteres."
              : "Variáveis: {nome}, {plano}, etc."}
          </p>
        </div>
        {imageControl}
      </div>
    );
  }

  // push / popup
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input
          value={content.title ?? ""}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Ex: Nova feature disponível!"
          disabled={isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{channel === "push" ? "Mensagem" : "Descrição"}</Label>
        <Textarea
          value={content.body ?? ""}
          onChange={(e) => setField("body", e.target.value)}
          placeholder={
            channel === "push" ? "Toque pra ver — até 60 caracteres" : "Texto do popup..."
          }
          rows={3}
          disabled={isPending}
        />
      </div>
      {channel === "popup" && (
        <div className="space-y-1.5">
          <Label>Texto do botão (CTA)</Label>
          <Input
            value={content.cta ?? ""}
            onChange={(e) => setField("cta", e.target.value)}
            placeholder="Ex: Quero ver agora"
            disabled={isPending}
          />
        </div>
      )}
      {imageControl}
    </div>
  );
}
