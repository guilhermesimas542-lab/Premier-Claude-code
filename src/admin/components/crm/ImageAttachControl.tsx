import { useState } from "react";
import { ImageIcon, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageComposer } from "./ImageComposer";
import { isImageSupportedChannel } from "../../lib/crm/bannerTemplates";
import type { ChannelKey } from "../../lib/crm/channels";

interface Props {
  channel: ChannelKey;
  imageUrl: string | null | undefined;
  onChange: (url: string | null) => void;
}

/**
 * Botão "Criar/anexar imagem" + thumbnail + remover.
 * Reutilizado entre Schedule wizard e Journey StepCard.
 */
export function ImageAttachControl({ channel, imageUrl, onChange }: Props) {
  const [open, setOpen] = useState(false);

  if (!isImageSupportedChannel(channel)) return null;

  return (
    <div className="space-y-2">
      {imageUrl ? (
        <div className="rounded-lg border border-border bg-muted/10 p-2 flex items-center gap-3">
          <img
            src={imageUrl}
            alt="Imagem anexada"
            className="w-20 h-20 object-cover rounded border border-border bg-black/40"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
              Imagem anexada
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{imageUrl}</div>
            <div className="flex gap-1.5 mt-1.5">
              <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(true)}>
                <Sparkles className="w-3 h-3 mr-1" /> Trocar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange(null)}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Remover
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
          Criar / anexar imagem
        </Button>
      )}

      {open && (
        <ImageComposer
          channel={channel}
          onGenerated={(url) => onChange(url)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
