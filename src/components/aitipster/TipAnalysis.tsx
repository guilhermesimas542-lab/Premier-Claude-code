import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Target, Zap, ClipboardList, Search, ChevronDown } from "lucide-react";
import { parseAnalysis } from "@/lib/parseAnalysis";

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  /** Cor do rótulo/ícone e do chevron (hex). */
  accentColor: string;
  /** Borda do card (CSS border value). */
  borderStyle?: string;
  /** Fundo do card (CSS background value). */
  bgStyle?: string;
  collapsedMaxHeight?: string;
  markdown: string;
  /** Cor do gradiente de fade (deve casar com o fundo do card). */
  fadeColor?: string;
}

function SectionCard({
  icon,
  title,
  accentColor,
  borderStyle = "1px solid rgba(235,235,245,.07)",
  bgStyle = "rgba(17,18,23,.7)",
  collapsedMaxHeight = "58px",
  markdown,
  fadeColor = "rgba(17,18,23,.85)",
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
      className="overflow-hidden cursor-pointer hover:brightness-110 transition-all"
      style={{ border: borderStyle, borderRadius: 16, background: bgStyle }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "15px 15px 9px",
        }}
      >
        <span style={{ color: accentColor, display: "flex" }}>{icon}</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: accentColor,
          }}
        >
          {title}
        </span>
      </div>
      <div
        className="relative"
        style={{
          padding: "0 15px",
          maxHeight: expanded ? "none" : collapsedMaxHeight,
          overflow: "hidden",
        }}
      >
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          style={{ fontSize: 12.5, color: "#c2c4cc", lineHeight: 1.5 }}
        >
          <ReactMarkdown
            components={{
              // Espaçamento consistente entre blocos. Cada parágrafo / lista /
              // subtítulo (negrito sozinho) ganha mb-3 pra criar 1 linha em
              // branco visual entre os tópicos.
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 last:mb-0 space-y-1 list-disc pl-5">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 last:mb-0 space-y-1 list-decimal pl-5">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              h1: ({ children }) => (
                <h1 className="mb-3 mt-4 first:mt-0 text-base font-bold">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-3 mt-4 first:mt-0 text-sm font-bold">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-4 first:mt-0 text-sm font-bold">
                  {children}
                </h3>
              ),
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
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 22,
              background: `linear-gradient(transparent, ${fadeColor})`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "4px 0 11px",
        }}
      >
        <ChevronDown
          aria-label={expanded ? "Recolher" : "Expandir"}
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "#6a6c74" }}
        />
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
    <div className="flex flex-col gap-2.5 w-full">
      {sections.entrada && (
        <SectionCard
          icon={<Target className="w-4 h-4" />}
          title="Entrada Principal"
          accentColor="#e9b949"
          borderStyle="1px solid rgba(233,185,73,.3)"
          bgStyle="rgba(233,185,73,.06)"
          fadeColor="#15140f"
          markdown={sections.entrada}
        />
      )}

      {sections.alternativas && (
        <SectionCard
          icon={<Zap className="w-4 h-4" />}
          title="Alternativas"
          accentColor="#9aa0d8"
          borderStyle="1px solid rgba(140,147,200,.3)"
          bgStyle="rgba(140,147,200,.06)"
          fadeColor="#131420"
          markdown={sections.alternativas}
        />
      )}

      {sections.resumo && (
        <SectionCard
          icon={<ClipboardList className="w-4 h-4" />}
          title="Resumo"
          accentColor="#8a8c94"
          markdown={sections.resumo}
        />
      )}

      {sections.contexto && (
        <SectionCard
          icon={<Search className="w-4 h-4" />}
          title="Contexto"
          accentColor="#8a8c94"
          markdown={sections.contexto}
        />
      )}

      {sections.footer && (
        <div
          className="text-center italic"
          style={{
            fontSize: 11,
            color: "#8a8c94",
            padding: "4px 8px 0",
            lineHeight: 1.5,
          }}
        >
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
