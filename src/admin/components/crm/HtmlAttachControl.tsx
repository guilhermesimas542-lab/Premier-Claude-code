import { useRef, useState } from "react";
import { Code2, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  html: string | null | undefined;
  onChange: (html: string | null) => void;
}

/**
 * Upload de um arquivo `.html` → guarda o conteúdo inline em `content.html`.
 * Usado nos canais de conteúdo rico (email, popup). Quando há HTML, ele
 * substitui o corpo de texto no envio. Preview em iframe com sandbox (sem scripts).
 */
export function HtmlAttachControl({ html, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite subir o mesmo arquivo de novo
    if (!file) return;
    const text = await file.text();
    onChange(text);
  };

  const sizeKb = html ? (new Blob([html]).size / 1024).toFixed(1) : "0";

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".html,text/html"
        className="hidden"
        onChange={handleFile}
      />
      {html ? (
        <div className="rounded-lg border border-border bg-muted/10 p-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                HTML anexado
              </div>
              <div className="text-[10px] text-muted-foreground">
                {sizeKb} KB — substitui o corpo de texto no envio
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 mt-1.5">
            <Button size="sm" variant="ghost" type="button" onClick={() => setPreviewOpen((v) => !v)}>
              <Eye className="w-3 h-3 mr-1" /> {previewOpen ? "Ocultar" : "Pré-visualizar"}
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => inputRef.current?.click()}>
              Trocar
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
          {previewOpen && (
            <iframe
              title="Pré-visualização do HTML"
              srcDoc={html}
              className="mt-2 w-full h-64 rounded border border-border bg-white"
              sandbox=""
            />
          )}
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <Code2 className="w-3.5 h-3.5 mr-1.5" />
          Subir HTML
        </Button>
      )}
    </div>
  );
}
