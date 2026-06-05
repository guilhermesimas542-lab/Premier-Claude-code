import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sparkles,
  MessageSquare,
  Radio,
  Coins,
  ArrowRight,
  ArrowLeft,
  Zap,
  ExternalLink,
  Target,
} from "lucide-react";
import iaTipsterCartoon from "@/assets/ia-tipster-cartoon.png";

interface Props {
  open: boolean;
  /** Chamado ao final do step 4 (após o lead clicar "Começar agora"). */
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

/**
 * Modal de onboarding em 4 steps — funil COMPLETO em popup (sem sidebar).
 *
 * Steps:
 *   1. Boas-vindas (apresentação da feature)
 *   2. Como usar (3 passos: escolher jogo → gerar análise → apostar)
 *   3. Créditos (semanal, pacotes, ilimitado)
 *   4. Próxima etapa (aviso "vamos criar sua primeira análise")
 *
 * Aparece UMA VEZ. Sem botão X — o lead só sai clicando "Começar agora".
 */
export function IATipsterOnboardingModal({ open, onComplete }: Props) {
  const [step, setStep] = useState(1);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <Dialog open={open} onOpenChange={() => { /* sem fechar por fora */ }}>
      <DialogContent
        className="bg-[#112236] border-[#00FF7F]/40 text-white w-[96vw] max-w-md p-0 rounded-2xl overflow-hidden [&>button]:hidden max-h-[92vh] overflow-y-auto"
      >
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {step === 1 && <StepWelcome />}
        {step === 2 && <StepHowToUse />}
        {step === 3 && <StepCredits />}
        {step === 4 && <StepFinal />}

        <NavBar
          step={step}
          total={TOTAL_STEPS}
          onPrev={goPrev}
          onNext={goNext}
          onComplete={onComplete}
        />
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Indicador de progresso (4 dots no topo)
// ============================================================

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-5 pb-1">
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const active = idx === current;
        const done = idx < current;
        return (
          <span
            key={idx}
            className="rounded-full transition-all duration-300"
            style={{
              width: active ? 22 : 6,
              height: 6,
              background: active
                ? "#00FF7F"
                : done
                  ? "rgba(0,255,127,0.55)"
                  : "rgba(255,255,255,0.2)",
            }}
          />
        );
      })}
      <span
        className="text-[10px] text-white/45 ml-2 uppercase tracking-wider"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Passo {current} de {total}
      </span>
    </div>
  );
}

// ============================================================
// STEP 1 — Boas-vindas
// ============================================================

function StepWelcome() {
  return (
    <div className="px-6 pt-3 pb-2">
      <div
        className="relative pt-4 pb-4 text-center"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(0,255,127,0.18) 0%, rgba(17,34,54,0) 60%)",
        }}
      >
        <Badge label="Nova feature" />

        <div
          className="mx-auto mb-3 mt-3"
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#0a1628",
            border: "2px solid rgba(0,255,127,0.4)",
            boxShadow: "0 0 24px rgba(0,255,127,0.18)",
          }}
        >
          <img
            src={iaTipsterCartoon}
            alt="IA Tipster"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <h2
          className="text-2xl font-bold leading-tight mb-1"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Conoce <span style={{ color: "#00FF7F" }}>IA Tipster</span>
        </h2>
        <p className="text-sm text-white/65 max-w-xs mx-auto">
          Ahora creas tus propios análisis de IA para cualquier partido.
        </p>
      </div>

      <div className="space-y-2.5 mt-3">
        <Bullet
          icon={<MessageSquare className="w-4 h-4 text-[#00FF7F]" />}
          title="Chat con la IA"
          text="Escribe los equipos y recibe análisis completo en segundos."
        />
        <Bullet
          icon={<Radio className="w-4 h-4 text-[#00FF7F]" />}
          title="Partidos en vivo"
          text="Elige un partido en curso y la IA analiza en tiempo real."
        />
        <Bullet
          icon={<Coins className="w-4 h-4 text-[#00FF7F]" />}
          title="Sistema de créditos"
          text="Recibes créditos semanales y puedes comprar más cuando necesites."
        />
      </div>
    </div>
  );
}

// ============================================================
// STEP 2 — Como usar (3 passos)
// ============================================================

function StepHowToUse() {
  return (
    <div className="px-6 pt-2 pb-2">
      <Header
        icon={<Zap className="w-6 h-6 text-[#00FF7F]" />}
        title="Cómo usar en 3 pasos"
        subtitle="Flujo simple — desde elegir el partido hasta apostar en la casa."
      />

      <div className="space-y-2.5 mt-1">
        <StepCard
          number={1}
          icon={<MessageSquare className="w-4 h-4" />}
          title="Elige el partido"
          text="En el Chat, escribe los equipos (ej: 'Colo-Colo x U. de Chile'). En Vivo, elige un partido de la lista."
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

// ============================================================
// STEP 3 — Créditos
// ============================================================

function StepCredits() {
  return (
    <div className="px-6 pt-2 pb-2">
      <Header
        icon={<Coins className="w-6 h-6 text-[#00FF7F]" />}
        title="Cómo funcionan los créditos"
        subtitle="Siempre puedes generar análisis — gratis o comprando más cuando necesites."
      />

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <CreditRow
          label="Cuota semanal"
          text="Recibes créditos cada semana según tu plan. Reinicia cada lunes."
          valueLabel="Gratis"
          valueColor="#00FF7F"
        />
        <CreditRow
          label="Paquetes extra"
          text="¿Compraste? Se vuelve saldo permanente. Úsalo cuando quieras, no caduca."
          valueLabel="Desde $9.900"
          valueColor="#FACC15"
        />
        <CreditRow
          label="Acceso ilimitado"
          text="Análisis sin contar créditos por 1 o 3 meses. Para quien usa mucho."
          valueLabel="Desde $29.900"
          valueColor="#00FF7F"
        />
      </div>
    </div>
  );
}

// ============================================================
// STEP 4 — Próxima etapa: aviso + CTA final
// ============================================================

function StepFinal() {
  return (
    <div className="px-6 pt-2 pb-2 text-center">
      <div
        className="mx-auto mb-4 mt-2"
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(0,255,127,0.12)",
          border: "2px solid rgba(0,255,127,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 28px rgba(0,255,127,0.25)",
        }}
      >
        <Target className="w-7 h-7 text-[#00FF7F]" />
      </div>

      <h2
        className="text-2xl font-bold leading-tight mb-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Vamos a crear tu <span style={{ color: "#00FF7F" }}>primer análisis</span>
      </h2>
      <p className="text-sm text-white/70 max-w-sm mx-auto mb-5 leading-relaxed">
        En el próximo paso, vas a la pantalla del IA Tipster para armar tu{" "}
        <strong className="text-white">primera cuota con IA</strong>. Es rápido — eliges un partido, generas el análisis y listo.
      </p>

      <div
        className="rounded-xl px-4 py-3 mb-4 text-left"
        style={{
          background: "rgba(0,255,127,0.06)",
          border: "1px solid rgba(0,255,127,0.25)",
        }}
      >
        <p
          className="text-[10px] uppercase tracking-wider mb-1 font-bold"
          style={{ color: "#00FF7F", fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Qué va a pasar
        </p>
        <ul className="text-xs text-white/80 space-y-1.5 leading-snug">
          <li className="flex gap-2">
            <span className="text-[#00FF7F] font-bold">1.</span>
            Vamos a abrir la pantalla del IA Tipster
          </li>
          <li className="flex gap-2">
            <span className="text-[#00FF7F] font-bold">2.</span>
            Eliges un partido (En Vivo o Chat)
          </li>
          <li className="flex gap-2">
            <span className="text-[#00FF7F] font-bold">3.</span>
            La IA genera tu análisis en segundos — 1 crédito es descontado
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// Barra inferior: voltar / próximo / começar
// ============================================================

function NavBar({
  step,
  total,
  onPrev,
  onNext,
  onComplete,
}: {
  step: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
}) {
  const isFirst = step === 1;
  const isLast = step === total;

  return (
    <div className="px-6 pb-6 pt-2 flex gap-2 sticky bottom-0 bg-[#112236]">
      {!isFirst && (
        <button
          onClick={onPrev}
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

      <button
        onClick={isLast ? onComplete : onNext}
        className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99]"
        style={{
          background: "#24c660",
          color: "#FFFFFF",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: "0.6px",
          textTransform: "uppercase",
          border: "none",
          boxShadow: "0 0 24px rgba(0,255,127,0.3)",
        }}
      >
        {isLast ? (
          <>
            <Zap className="w-4 h-4" />
            Empezar ahora
          </>
        ) : (
          <>
            Siguiente
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// Subcomponentes visuais
// ============================================================

function Badge({ label }: { label: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5"
      style={{
        padding: "5px 12px",
        borderRadius: "999px",
        background: "rgba(0,255,127,0.12)",
        border: "1.5px solid rgba(0,255,127,0.45)",
      }}
    >
      <Sparkles className="w-3.5 h-3.5 text-[#00FF7F]" />
      <span
        className="text-[10px] font-bold uppercase tracking-wider text-[#00FF7F]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1.5px" }}
      >
        {label}
      </span>
    </div>
  );
}

function Header({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-4 pt-2">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#00FF7F]/10 border border-[#00FF7F]/25 mb-2">
        {icon}
      </div>
      <h2
        className="text-xl font-bold mb-1"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {title}
      </h2>
      <p className="text-xs text-white/55 max-w-sm mx-auto leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function Bullet({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[#00FF7F]/10 border border-[#00FF7F]/25 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className="text-sm font-bold text-white mb-0.5"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {title}
        </h4>
        <p className="text-[11px] text-white/55 leading-snug">{text}</p>
      </div>
    </div>
  );
}

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
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[#00FF7F] text-[#0a1628] flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 text-white">
          {icon}
          <h4
            className="text-sm font-bold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {title}
          </h4>
        </div>
        <p className="text-[11px] text-white/55 leading-snug">{text}</p>
      </div>
    </div>
  );
}

function CreditRow({
  label,
  text,
  valueLabel,
  valueColor,
}: {
  label: string;
  text: string;
  valueLabel: string;
  valueColor: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
        <h4
          className="text-sm font-bold text-white"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {label}
        </h4>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: valueColor }}
        >
          {valueLabel}
        </span>
      </div>
      <p className="text-[11px] text-white/55 leading-snug">{text}</p>
    </div>
  );
}
