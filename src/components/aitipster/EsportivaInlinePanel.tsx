import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseAnalysis } from "@/lib/parseAnalysis";

interface EsportivaInlinePanelProps {
  matchLabel: string;
  markdown: string | null;
  altenarEventUrl: string | null;
  onClose: () => void;
}

function extractMarketLine(rawLine: string): string {
  return rawLine
    .replace(/\*+/g, "")
    .replace(/_+/g, "")
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^[🎯⚡📋🔍⏱️\s]+/u, "")
    .trim();
}

function extractEntrada(section: string): string {
  if (!section) return "";
  const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
  const marketLine =
    lines.find((l) => l.includes("@")) ??
    lines.find((l) => l.includes("**")) ??
    lines[0];
  if (!marketLine) return "";
  return extractMarketLine(marketLine).slice(0, 140);
}

function extractAlternativas(section: string): string[] {
  if (!section) return [];
  const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-*]\s+/.test(l));

  if (bullets.length === 0) {
    return lines
      .filter((l) => l.includes("@"))
      .map(extractMarketLine)
      .filter(Boolean)
      .slice(0, 3);
  }

  return bullets
    .map((l) => {
      const clean = extractMarketLine(l);
      const cut = clean.split(/—|–/)[0];
      return cut.trim().slice(0, 100);
    })
    .filter(Boolean)
    .slice(0, 3);
}

export function EsportivaInlinePanel({
  matchLabel,
  markdown,
  altenarEventUrl,
  onClose,
}: EsportivaInlinePanelProps) {
  const parsed = parseAnalysis(markdown);
  const hasMapping = !!altenarEventUrl;
  const iframeSrc = altenarEventUrl ?? "https://esportiva.bet.br/sports/futebol";

  const entrada = extractEntrada(parsed.entrada);
  const alternativas = extractAlternativas(parsed.alternativas);

  return (
    <div className="flex flex-col h-[100dvh] bg-background fixed inset-0 z-50">
      {/* Header sticky compacto */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b bg-card sticky top-0 z-10">
        <Button onClick={onClose} variant="ghost" size="sm" className="h-8 px-2 shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <span className="text-sm font-semibold truncate px-2 flex-1 text-center">
          {matchLabel}
        </span>
        <div className="w-[72px] shrink-0" />
      </div>

      {/* Resumo da análise */}
      {(entrada || alternativas.length > 0) && (
        <div className="px-3 py-2 border-b bg-muted/30 space-y-1">
          {entrada && (
            <div className="flex items-start gap-1.5 text-[11px] leading-snug">
              <span>🎯</span>
              <p className="flex-1">
                <span className="font-semibold text-primary">Entrada: </span>
                <span className="text-foreground">{entrada}</span>
              </p>
            </div>
          )}
          {alternativas.length > 0 && (
            <div className="flex items-start gap-1.5 text-[11px] leading-snug">
              <span>⚡</span>
              <p className="flex-1">
                <span className="font-semibold text-primary">Alternativas: </span>
                {alternativas.map((alt, i) => (
                  <span key={i} className="text-foreground">
                    {i > 0 && <span className="text-muted-foreground mx-1">|</span>}
                    {alt}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Banner de fallback */}
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
