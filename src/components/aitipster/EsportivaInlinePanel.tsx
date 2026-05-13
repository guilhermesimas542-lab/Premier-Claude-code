import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseAnalysis } from "@/lib/parseAnalysis";

interface EsportivaInlinePanelProps {
  matchLabel: string;
  markdown: string | null;
  altenarEventUrl: string | null;
  onClose: () => void;
}

/**
 * Renderiza a análise condensada no topo + iframe da Esportiva
 * embaixo, sem sair da rota /ia-tipster.
 */
export function EsportivaInlinePanel({
  matchLabel,
  markdown,
  altenarEventUrl,
  onClose,
}: EsportivaInlinePanelProps) {
  const parsed = parseAnalysis(markdown);
  const hasMapping = !!altenarEventUrl;
  const iframeSrc = altenarEventUrl ?? "https://esportiva.bet.br/sports/futebol";

  const extractShortLine = (section: string): string => {
    if (!section) return "";
    const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
    const marketLine = lines.find((l) => l.includes("@") || l.includes("**"));
    if (marketLine) {
      return marketLine
        .replace(/\*+/g, "")
        .replace(/_+/g, "")
        .replace(/^\s*-\s*/, "")
        .slice(0, 120);
    }
    return lines[0]?.slice(0, 120) ?? "";
  };

  const entradaLine = extractShortLine(parsed.entrada);
  const alternativasLine = extractShortLine(parsed.alternativas);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card">
        <Button onClick={onClose} variant="ghost" size="sm" className="h-8 px-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <span className="text-sm font-semibold truncate max-w-[60%] text-center">
          {matchLabel}
        </span>
        <div className="w-[72px]" />
      </div>

      {/* Resumo da análise */}
      {(entradaLine || alternativasLine) && (
        <div className="px-3 py-2 border-b bg-muted/30 space-y-1">
          {entradaLine && (
            <p className="text-[11px] leading-snug">
              <span className="font-semibold text-primary">🎯 Entrada:</span>{" "}
              <span className="text-foreground">{entradaLine}</span>
            </p>
          )}
          {alternativasLine && (
            <p className="text-[11px] leading-snug">
              <span className="font-semibold text-primary">⚡ Alternativas:</span>{" "}
              <span className="text-foreground">{alternativasLine}</span>
            </p>
          )}
        </div>
      )}

      {/* Banner de fallback se não houver mapping */}
      {!hasMapping && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] border-b border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Jogo não disponível na Esportiva — mostrando home.</span>
        </div>
      )}

      {/* Iframe */}
      <div className="flex-1 min-h-0 bg-background">
        <iframe
          src={iframeSrc}
          title={`Esportiva - ${matchLabel}`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
