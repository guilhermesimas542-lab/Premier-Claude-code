import ReactMarkdown from "react-markdown";
import { Target, Zap, Search } from "lucide-react";
import { parseAnalysis } from "@/lib/parseAnalysis";

interface Props {
  markdown: string;
}

export function TipAnalysis({ markdown }: Props) {
  const sections = parseAnalysis(markdown);

  return (
    <div className="space-y-3 w-full">
      {sections.opening && (
        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{sections.opening}</ReactMarkdown>
          </div>
        </div>
      )}

      {sections.entrada && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Entrada Principal
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{sections.entrada}</ReactMarkdown>
          </div>
        </div>
      )}

      {sections.alternativas && (
        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Alternativas
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{sections.alternativas}</ReactMarkdown>
          </div>
        </div>
      )}

      {sections.contexto && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contexto
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{sections.contexto}</ReactMarkdown>
          </div>
        </div>
      )}

      {sections.footer && (
        <div className="text-xs text-muted-foreground text-center italic px-2">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="m-0">{children}</p>,
              em: ({ children }) => <em className="italic">{children}</em>,
            }}
          >
            {sections.footer}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
