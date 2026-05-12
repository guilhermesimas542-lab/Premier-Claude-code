import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Target, Zap, ClipboardList, Search, ChevronDown, ChevronUp } from "lucide-react";
import { parseAnalysis } from "@/lib/parseAnalysis";

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  iconColorClass: string;
  borderColorClass?: string;
  bgColorClass?: string;
  collapsedMaxHeight?: string;
  markdown: string;
  gradientFromClass?: string;
}

function SectionCard({
  icon,
  title,
  iconColorClass,
  borderColorClass = "border-border",
  bgColorClass = "bg-card",
  collapsedMaxHeight = "5rem",
  markdown,
  gradientFromClass = "from-card",
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      aria-expanded={expanded}
      className={`rounded-lg border ${borderColorClass} ${bgColorClass} overflow-hidden cursor-pointer hover:brightness-110 transition-all`}
    >
      <div className="w-full flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className={iconColorClass}>{icon}</span>
          <span className={`text-xs font-bold uppercase tracking-wider ${iconColorClass}`}>
            {title}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className={`w-5 h-5 ${iconColorClass} animate-pulse`} />
        )}
      </div>
      <div
        className="px-4 pb-3 relative"
        style={{
          maxHeight: expanded ? "none" : collapsedMaxHeight,
          overflow: "hidden",
        }}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              a: ({ children, href }) => (
                <a
                  href={href}
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
        {!expanded && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t ${gradientFromClass} via-${gradientFromClass.replace("from-", "")}/80 to-transparent pointer-events-none flex items-end justify-center pb-1`}
          >
            <span className="text-[10px] text-muted-foreground italic">
              Toque para ver mais
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface TipAnalysisProps {
  markdown: string;
}

export function TipAnalysis({ markdown }: TipAnalysisProps) {
  const sections = parseAnalysis(markdown);

  return (
    <div className="space-y-3 w-full">
      {sections.entrada && (
        <SectionCard
          icon={<Target className="w-4 h-4" />}
          title="Entrada Principal"
          iconColorClass="text-primary"
          borderColorClass="border-primary/30"
          bgColorClass="bg-primary/5"
          gradientFromClass="from-primary/5"
          markdown={sections.entrada}
        />
      )}

      {sections.alternativas && (
        <SectionCard
          icon={<Zap className="w-4 h-4" />}
          title="Alternativas"
          iconColorClass="text-amber-500"
          borderColorClass="border-amber-500/30"
          bgColorClass="bg-amber-500/5"
          gradientFromClass="from-amber-500/5"
          markdown={sections.alternativas}
        />
      )}

      {sections.resumo && (
        <SectionCard
          icon={<ClipboardList className="w-4 h-4" />}
          title="Resumo"
          iconColorClass="text-muted-foreground"
          markdown={sections.resumo}
        />
      )}

      {sections.contexto && (
        <SectionCard
          icon={<Search className="w-4 h-4" />}
          title="Contexto"
          iconColorClass="text-muted-foreground"
          bgColorClass="bg-muted/30"
          gradientFromClass="from-muted/30"
          markdown={sections.contexto}
        />
      )}

      {sections.footer && (
        <div className="text-xs text-muted-foreground text-center italic px-2 pt-1">
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
