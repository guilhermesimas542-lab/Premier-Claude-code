import { useState } from "react";
import {
  Sparkles,
  MessageSquare,
  Radio,
  Coins,
  Infinity as InfinityIcon,
  Zap,
  ThumbsUp,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface TutorialSectionProps {
  /**
   * Quando o usuário clica "Testar agora!" no fim do tutorial.
   * Marca o tutorial como visto e leva o user pra tab "Ao Vivo" pra fazer
   * a primeira análise (que finalmente libera o Chat).
   */
  onTestNow?: () => void;
  /** Se true, o tutorial já foi concluído — esconde os CTAs de onboarding. */
  completed?: boolean;
}

// Paleta Claude Design (dourado / quase-preto)
const GOLD = "#e9b949";
const GOLD_SOFT = "#c9a56b";
const INK = "#ECEAE4";
const GRAY = "#9a9ca4";
const GRAY_DIM = "#8a8c94";
const GREEN = "#6fb58c";
const LIVE = "#e5484d";
const CARD_BG = "#111217";
const CARD_BORDER = "rgba(235,235,245,.07)";
const MONO = "'JetBrains Mono', monospace";

/**
 * Tutorial da IA Tipster em 2 etapas (padrão onboarding fluido).
 *
 * Etapa 1: COMO USAR (3 passos + quando usar cada aba)
 * Etapa 2: CRÉDITOS + CACHE + DICAS (e CTA "Testar agora!")
 *
 * Quando o tutorial já foi concluído (`completed=true`), exibe tudo numa
 * única tela scrollável, sem navegação por slides.
 */
export function TutorialSection({ onTestNow, completed }: TutorialSectionProps = {}) {
  const [page, setPage] = useState<1 | 2>(1);

  // Modo "já completou": vira página de consulta livre (mostra tudo, sem CTAs)
  if (completed) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4 pb-8">
        <HeroHeader />
        <SectionHowToUse />
        <SectionWhichTab />
        <SectionCredits />
        <SectionTips />
        <Disclaimer />
      </div>
    );
  }

  // Modo onboarding (2 slides + CTA Testar)
  return (
    <div className="h-full overflow-y-auto px-4 py-4 pb-6 flex flex-col">
      {/* Slide indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-4">
        <span
          className="rounded-full transition-all duration-300"
          style={{
            width: page === 1 ? "20px" : "6px",
            height: "6px",
            background: page === 1 ? GOLD : "rgba(235,235,245,0.18)",
          }}
        />
        <span
          className="rounded-full transition-all duration-300"
          style={{
            width: page === 2 ? "20px" : "6px",
            height: "6px",
            background: page === 2 ? GOLD : "rgba(235,235,245,0.18)",
          }}
        />
        <span
          className="text-[10px] ml-2 uppercase"
          style={{ fontFamily: MONO, color: GRAY, letterSpacing: ".16em" }}
        >
          Paso {page} de 2
        </span>
      </div>

      {/* Conteúdo do slide */}
      <div className="flex-1">
        {page === 1 ? (
          <>
            <HeroHeader title="Cómo usar" subtitle="En 3 pasos simples + cuándo usar cada pestaña." />
            <SectionHowToUse />
            <SectionWhichTab />
          </>
        ) : (
          <>
            <HeroHeader title="Créditos & tips" subtitle="Todo lo que necesitas saber para sacar el máximo de la herramienta." />
            <SectionCredits />
            <SectionTips />
            <Disclaimer compact />
          </>
        )}
      </div>

      {/* Navegação */}
      <div className="mt-6 flex gap-2 sticky bottom-0 bg-background pt-2">
        {page === 2 && (
          <button
            onClick={() => setPage(1)}
            className="px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "rgba(235,235,245,0.04)",
              border: "1px solid rgba(235,235,245,0.14)",
              color: INK,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        )}

        {page === 1 ? (
          <button
            onClick={() => setPage(2)}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: GOLD,
              color: "#1c1810",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              border: "none",
              boxShadow: "0 0 22px rgba(233,185,73,0.2)",
            }}
          >
            Siguiente
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onTestNow}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99]"
            style={{
              background: GOLD,
              color: "#1c1810",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              border: "none",
              boxShadow: "0 0 24px rgba(233,185,73,0.3)",
            }}
          >
            <Zap className="w-4 h-4" />
            ¡Probar ahora!
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Seções reutilizáveis do tutorial
// ============================================================

/** Rótulo de seção: ícone dourado + texto mono com tracking largo (estilo lâmina). */
function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: GOLD_SOFT, display: "flex" }}>{icon}</span>
      <span
        className="uppercase"
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".18em",
          color: INK,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function HeroHeader({
  title = "Cómo usar IA Tipster",
  subtitle = "Análisis inteligente de fútbol en segundos, basado en datos reales. Aquí va una guía rápida para sacar el máximo.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-6 pt-1">
      <div
        className="inline-flex items-center justify-center w-13 h-13 rounded-full mb-3"
        style={{
          width: 52,
          height: 52,
          background: "rgba(140,147,200,.1)",
          border: "1px solid rgba(140,147,200,.25)",
        }}
      >
        <Sparkles className="w-6 h-6" style={{ color: INK }} />
      </div>
      <h2
        className="text-xl font-bold mb-1.5"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", color: INK, letterSpacing: "-.01em" }}
      >
        {title}
      </h2>
      <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: GRAY }}>
        {subtitle}
      </p>
    </div>
  );
}

function SectionHowToUse() {
  return (
    <div className="mb-6">
      <SectionLabel icon={<Zap className="w-4 h-4" />}>En 3 pasos</SectionLabel>

      <div className="space-y-2.5">
        <StepCard
          number={1}
          icon={<MessageSquare className="w-3.5 h-3.5" />}
          title="Elige el partido"
          text="En la pestaña Chat, escribe los equipos (ej: 'Colo-Colo x U. de Chile'). En Vivo, elige un partido de la lista."
        />
        <StepCard
          number={2}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          title="Genera el análisis"
          text="La IA estudia forma, historial, lesiones y estadísticas en segundos. Cada análisis consume 1 crédito."
        />
        <StepCard
          number={3}
          icon={<ExternalLink className="w-3.5 h-3.5" />}
          title="Apuesta en la casa"
          text="Con el análisis en mano, abre directo el evento en la casa para armar tu apuesta."
        />
      </div>
    </div>
  );
}

function SectionWhichTab() {
  return (
    <div className="mb-2">
      <SectionLabel icon={<span style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD_SOFT, display: "block" }} />}>
        Cuándo usar cada pestaña
      </SectionLabel>

      <div className="grid grid-cols-2 gap-2.5">
        <div
          className="rounded-xl p-3.5"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="w-3.5 h-3.5" style={{ color: GOLD_SOFT }} />
            <span
              className="uppercase"
              style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".12em", color: INK }}
            >
              Chat
            </span>
          </div>
          <p className="text-[11px] leading-snug" style={{ color: GRAY }}>
            Para cualquier partido de los siguientes 15 días. Tú eliges qué analizar.
          </p>
        </div>

        <div
          className="rounded-xl p-3.5"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: LIVE, display: "block" }} />
            <span
              className="uppercase"
              style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".12em", color: INK }}
            >
              En Vivo
            </span>
          </div>
          <p className="text-[11px] leading-snug" style={{ color: GRAY }}>
            Para partidos en curso ahora. Análisis actualizado con lo que está pasando en el partido.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionCredits() {
  return (
    <div className="mb-6">
      <SectionLabel icon={<Coins className="w-4 h-4" />}>Cómo funcionan los créditos</SectionLabel>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${CARD_BORDER}`, background: "rgba(235,235,245,.06)" }}
      >
        <CreditRow
          icon={<RefreshCw className="w-4 h-4" />}
          label="Cota semanal"
          text="Recibes créditos cada semana según tu plan. Reset todos los lunes."
          valueLabel="Gratis"
          valueColor={GREEN}
        />
        <CreditRow
          icon={<Coins className="w-4 h-4" />}
          label="Paquetes extra"
          text="¿Compraste? Se vuelve saldo permanente. Úsalo cuando quieras, no caduca."
          valueLabel="Desde $9.900"
          valueColor={GOLD_SOFT}
        />
        <CreditRow
          icon={<InfinityIcon className="w-4 h-4" />}
          label="Acceso ilimitado"
          text="Análisis sin gastar créditos por 1 o 3 meses. Para quien usa mucho."
          valueLabel="Desde $29.900"
          valueColor={GOLD_SOFT}
        />
      </div>
    </div>
  );
}

function SectionTips() {
  return (
    <div className="mb-2">
      <SectionLabel icon={<Sparkles className="w-4 h-4" />}>Tips avanzados</SectionLabel>

      <div className="space-y-2.5">
        <TipCard
          icon={<ThumbsUp className="w-4 h-4" />}
          title="Usa los feedbacks 👍👎"
          text="Ayudan a la IA a aprender qué funciona para ti. ¿Análisis malo? Pulgar abajo + reporte."
        />
        <TipCard
          icon={<RefreshCw className="w-4 h-4" />}
          title="Repite análisis del mismo partido"
          text="Cerca del inicio, los datos cambian (alineaciones, lesiones). Vale generar de nuevo si cambió contexto."
        />
        <TipCard
          icon={<ExternalLink className="w-4 h-4" />}
          title="Abre directo en la casa"
          text="El botón 'Abrir en la casa' te lleva al evento correcto del partido analizado. Sin clics extra."
        />
      </div>
    </div>
  );
}

function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`${compact ? "mt-4" : "mt-6"} p-3 rounded-xl`}
      style={{ background: "rgba(235,235,245,.03)", border: "1px solid rgba(235,235,245,.06)" }}
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GRAY_DIM }} />
        <p className="text-[11px] leading-relaxed" style={{ color: GRAY }}>
          IA Tipster es una <strong style={{ color: INK }}>herramienta de orientación</strong> basada en datos estadísticos.
          Úsala como apoyo a tu análisis — ningún análisis es garantía de resultado. Juega con responsabilidad.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Subcomponentes auxiliares
// ============================================================

function StepCard({
  number,
  icon,
  title,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      className="flex gap-3 rounded-xl p-3.5"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: `1px solid rgba(201,165,107,.4)`,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: GOLD_SOFT }}>
          {number}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1" style={{ color: GOLD_SOFT }}>
          {icon}
          <h4
            className="text-sm font-semibold leading-tight"
            style={{ color: INK }}
          >
            {title}
          </h4>
        </div>
        <p className="text-[12px] leading-snug" style={{ color: GRAY }}>{text}</p>
      </div>
    </div>
  );
}

function CreditRow({
  icon,
  label,
  text,
  valueLabel,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  valueLabel: string;
  valueColor: string;
}) {
  return (
    <div
      className="flex gap-3 items-start p-3.5"
      style={{ background: CARD_BG }}
    >
      <span className="shrink-0 mt-0.5" style={{ color: GRAY_DIM, display: "flex" }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span
            className="uppercase"
            style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", color: INK }}
          >
            {label}
          </span>
          <span
            className="whitespace-nowrap"
            style={{ color: valueColor, fontSize: 10.5, fontWeight: 700 }}
          >
            {valueLabel}
          </span>
        </div>
        <p className="text-[11.5px] leading-snug" style={{ color: GRAY }}>{text}</p>
      </div>
    </div>
  );
}

function TipCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      className="flex gap-3 rounded-xl p-3.5"
      style={{ background: "rgba(233,185,73,.04)", border: "1px solid rgba(233,185,73,.18)" }}
    >
      <span className="shrink-0 mt-0.5" style={{ color: GOLD_SOFT, display: "flex" }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <h4
          className="text-sm font-semibold mb-1 leading-tight"
          style={{ color: INK }}
        >
          {title}
        </h4>
        <p className="text-[12px] leading-snug" style={{ color: GRAY }}>{text}</p>
      </div>
    </div>
  );
}
