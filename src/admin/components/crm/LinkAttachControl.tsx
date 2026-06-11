import { useState } from "react";
import { Link2, Scissors, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { shortenUrl } from "../../lib/crm/shortenUrl";

interface Props {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Texto auxiliar abaixo do input. */
  hint?: string;
}

/**
 * Campo de link clicável + botão "Encurtar" (TinyURL).
 * Usado em todos os canais do CRM (schedule + journey step).
 * Quando só houver imagem no disparo, esse link vira o destino do clique na imagem.
 */
export function LinkAttachControl({ value, onChange, hint }: Props) {
  const [shortening, setShortening] = useState(false);
  const url = value ?? "";

  const handleShorten = async () => {
    if (!url.trim()) {
      toast.error("Cole um link primeiro.");
      return;
    }
    setShortening(true);
    const short = await shortenUrl(url.trim());
    setShortening(false);
    if (short !== url.trim()) {
      onChange(short);
      toast.success("Link encurtado");
    } else {
      toast.message("Não foi possível encurtar — link mantido.");
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5" />
        Link clicável <span className="text-muted-foreground font-normal">(opcional)</span>
      </Label>
      <div className="flex gap-2">
        <Input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="https://..."
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShorten}
          disabled={shortening || !url.trim()}
        >
          {shortening ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Scissors className="w-3.5 h-3.5" />
          )}
          <span className="ml-1.5">Encurtar</span>
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {hint ??
          "Quando o disparo tiver só imagem, o clique na imagem leva pra cá. Caso contrário, vira um botão / link no conteúdo."}
      </p>
    </div>
  );
}
