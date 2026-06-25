import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Bell, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { InstallNotifyCard } from "@/components/pwa/InstallNotifyCard";
import logoImg from "@/assets/premier-logo-custom.png";

interface Props {
  open: boolean;
  /** Chamado ao final (após o lead clicar "Empezar"). */
  onComplete: () => void;
}

const TOTAL_STEPS = 2;

/**
 * Onboarding geral de 1º acesso — aparece UMA VEZ pra todo lead autenticado.
 *
 * Steps:
 *   1. Boas-vindas (apresentação rápida do CL Score)
 *   2. Instalar la app + activar notificaciones (passo estratégico de retenção)
 *
 * Sem botão X: o lead só sai avançando até "Empezar".
 */
export function AppOnboardingModal({ open, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const isLast = step === TOTAL_STEPS;

  return (
    <Dialog open={open} onOpenChange={() => { /* sem fechar por fora */ }}>
      <DialogContent className="bg-[#112236] border-[#e9b949]/40 text-white w-[96vw] max-w-md p-0 rounded-2xl overflow-hidden [&>button]:hidden max-h-[92vh] overflow-y-auto">
        {/* Indicador de passos */}
        <div className="flex items-center justify-center gap-1.5 pt-5 pb-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const idx = i + 1;
            const active = idx === step;
            const done = idx < step;
            return (
              <span
                key={idx}
                className="rounded-full transition-all duration-300"
                style={{
                  width: active ? 22 : 6,
                  height: 6,
                  background: active ? "#e9b949" : done ? "rgba(233,185,73,0.55)" : "rgba(255,255,255,0.2)",
                }}
              />
            );
          })}
          <span
            className="text-[10px] text-white/45 ml-2 uppercase tracking-wider"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Paso {step} de {TOTAL_STEPS}
          </span>
        </div>

        {step === 1 && <StepWelcome />}
        {step === 2 && <StepInstall />}

        <div className="px-6 pb-6 pt-2 sticky bottom-0 bg-[#112236]">
          <button
            onClick={isLast ? onComplete : () => setStep(2)}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99]"
            style={{
              background: "#e9b949",
              color: "#060D1E",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              border: "none",
              boxShadow: "0 0 24px rgba(233,185,73,0.3)",
            }}
          >
            {isLast ? (
              <>
                <Zap className="w-4 h-4" />
                Empezar
              </>
            ) : (
              <>
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepWelcome() {
  return (
    <div className="px-6 pt-3 pb-2">
      <div
        className="relative pt-4 pb-4 text-center"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(233,185,73,0.18) 0%, rgba(17,34,54,0) 60%)" }}
      >
        <div
          className="mx-auto mb-3 mt-1 flex items-center justify-center"
          style={{ width: 96, height: 96, borderRadius: "50%", background: "#0a1628", border: "2px solid rgba(233,185,73,0.4)", boxShadow: "0 0 24px rgba(233,185,73,0.18)", overflow: "hidden" }}
        >
          <img src={logoImg} alt="CL Score" style={{ width: "72%", height: "72%", objectFit: "contain" }} />
        </div>
        <h2 className="text-2xl font-bold leading-tight mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Bienvenido a <span style={{ color: "#e9b949" }}>CL Score</span>
        </h2>
        <p className="text-sm text-white/65 max-w-xs mx-auto">
          Los mejores tips de apuestas, con cuotas actualizadas y análisis con IA.
        </p>
      </div>

      <div className="space-y-2.5 mt-3">
        <Bullet icon={<TrendingUp className="w-4 h-4 text-[#e9b949]" />} title="Tips diarios" text="Selecciones con cuotas actualizadas, listas para apostar." />
        <Bullet icon={<Sparkles className="w-4 h-4 text-[#e9b949]" />} title="IA Tipster" text="Genera tus propios análisis para cualquier partido." />
        <Bullet icon={<Bell className="w-4 h-4 text-[#e9b949]" />} title="Avisos al instante" text="Recibe los tips en el momento, sin perderte ninguno." />
      </div>
    </div>
  );
}

function StepInstall() {
  return (
    <div className="px-6 pt-2 pb-2">
      <div className="text-center mb-4 pt-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#e9b949]/10 border border-[#e9b949]/25 mb-2">
          <Bell className="w-6 h-6 text-[#e9b949]" />
        </div>
        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          No te pierdas ningún tip
        </h2>
        <p className="text-xs text-white/55 max-w-sm mx-auto leading-relaxed">
          Instala la app en tu pantalla de inicio y activa las notificaciones para recibir los tips al instante.
        </p>
      </div>

      <InstallNotifyCard variant="onboarding" />
    </div>
  );
}

function Bullet({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[#e9b949]/10 border border-[#e9b949]/25 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white mb-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {title}
        </h4>
        <p className="text-[11px] text-white/55 leading-snug">{text}</p>
      </div>
    </div>
  );
}
