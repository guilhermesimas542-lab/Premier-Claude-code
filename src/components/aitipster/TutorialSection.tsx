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
            background: page === 1 ? "#e9b949" : "rgba(255,255,255,0.2)",
          }}
        />
        <span
          className="rounded-full transition-all duration-300"
          style={{
            width: page === 2 ? "20px" : "6px",
            height: "6px",
            background: page === 2 ? "#e9b949" : "rgba(255,255,255,0.2)",
          }}
        />
        <span className="text-[10px] text-white/40 ml-2 uppercase tracking-wider"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Passo {page} de 2
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
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#FFFFFF",
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
              background: "#e9b949",
              color: "#FFFFFF",
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
              background: "#e9b949",
              color: "#FFFFFF",
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

function HeroHeader({
  title = "Cómo usar IA Tipster",
  subtitle = "Análisis inteligente de fútbol en segundos, basado en datos reales. Aquí va una guía rápida para sacar el máximo.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-5 pt-1">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {title}
      </h2>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function SectionHowToUse() {
  return (
    <div className="mb-6">
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <Zap className="w-4 h-4 text-primary" />
        En 3 pasos
      </h3>

      <div className="space-y-2.5">
        <StepCard
          number={1}
          icon={<MessageSquare className="w-4 h-4" />}
          title="Elige el partido"
          text="En la pestaña Chat, escribe los equipos (ej: 'Colo-Colo x U. de Chile'). En Vivo, elige un partido de la lista."
        />
        <StepCard
          number={2}
          icon={<Sparkles className="w-4 h-4" />}
          title="Genera el análisis"
          text="La IA estudia forma, historial, lesiones y estadísticas en segundos. Cada análisis consume 1 crédito."
        />
        <StepCard
          number={3}
          icon={<ExternalLink className="w-4 h-4" />}
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
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <Radio className="w-4 h-4 text-primary" />
        Cuándo usar cada pestaña
      </h3>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Chat
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Para cualquier partido de los siguientes 15 días. Tú eliges qué analizar.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Radio className="w-4 h-4 text-primary" />
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              En Vivo
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
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
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <Coins className="w-4 h-4 text-primary" />
        Cómo funcionan los créditos
      </h3>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <CreditRow
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          label="Cota semanal"
          text="Recibes créditos cada semana según tu plan. Reset todos los lunes."
          valueLabel="Gratis"
          valueColor="#e9b949"
        />
        <CreditRow
          icon={<Coins className="w-3.5 h-3.5" />}
          label="Paquetes extra"
          text="¿Compraste? Se vuelve saldo permanente. Úsalo cuando quieras, no caduca."
          valueLabel="Desde $9.900"
          valueColor="#FACC15"
        />
        <CreditRow
          icon={<InfinityIcon className="w-3.5 h-3.5" />}
          label="Acesso ilimitado"
          text="Análisis sin gastar créditos por 1 o 3 meses. Para quien usa mucho."
          valueLabel="A partir de R$ 99,00"
          valueColor="#e9b949"
        />
      </div>
    </div>
  );
}

function SectionTips() {
  return (
    <div className="mb-2">
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <Sparkles className="w-4 h-4 text-primary" />
        Tips avanzados
      </h3>

      <div className="space-y-2.5">
        <TipCard
          icon={<ThumbsUp className="w-4 h-4 text-primary" />}
          title="Usa los feedbacks 👍👎"
          text="Ayudan a la IA a aprender qué funciona para ti. ¿Análisis malo? Pulgar abajo + reporte."
        />
        <TipCard
          icon={<RefreshCw className="w-4 h-4 text-primary" />}
          title="Repite análisis del mismo partido"
          text="Cerca del inicio, los datos cambian (alineaciones, lesiones). Vale generar de nuevo si cambió contexto."
        />
        <TipCard
          icon={<ExternalLink className="w-4 h-4 text-primary" />}
          title="Abre directo en la casa"
          text="El botón 'Abrir en la casa' te lleva al evento correcto del partido analizado. Sin clics extra."
        />
      </div>
    </div>
  );
}

function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${compact ? "mt-4" : "mt-6"} p-3 rounded-xl bg-muted/30 border border-white/5`}>
      <div className="flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          IA Tipster es una <strong>herramienta de orientación</strong> basada en datos estadísticos.
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
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        <span
          className="text-sm font-bold text-primary"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {number}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 text-primary">
          {icon}
          <h4
            className="text-sm font-bold text-foreground leading-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {title}
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{text}</p>
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
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className="text-xs font-bold uppercase tracking-wide text-foreground"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {label}
          </span>
          <span
            className="text-[10px] font-bold whitespace-nowrap"
            style={{ color: valueColor, fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {valueLabel}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{text}</p>
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
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className="text-sm font-bold text-foreground mb-0.5 leading-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {title}
        </h4>
        <p className="text-[11px] text-muted-foreground leading-snug">{text}</p>
      </div>
    </div>
  );
}
