import { useEffect, useState } from "react";
import { X, ChevronRight } from "lucide-react";
import InstallPWA from "@/components/InstallPWA";
import EnablePushButton from "@/components/EnablePushButton";

const DONE_KEY = "onboarding_done";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true
  );
}

/**
 * Fluxo curto pós-login: 1) instalar app, 2) ativar notificações.
 * Mostrado só pra novos usuários (sem flag onboarding_done).
 * "No volver a preguntar" marca onboarding_done=1.
 */
export default function OnboardingPWA() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    try {
      const done = localStorage.getItem(DONE_KEY) === "1";
      if (done) return;
      // pequeno delay pra não atropelar render inicial
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    } catch {
      /* noop */
    }
  }, []);

  const close = (markDone: boolean) => {
    if (markDone) {
      try {
        localStorage.setItem(DONE_KEY, "1");
      } catch {
        /* noop */
      }
    }
    setOpen(false);
  };

  if (!open) return null;

  const installedAlready = isStandalone();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(6,13,30,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4 relative"
        style={{ background: "#0B1628", border: "1.5px solid rgba(255,255,255,0.20)" }}
      >
        <button
          onClick={() => close(false)}
          aria-label="Cerrar"
          className="absolute top-3 right-3 p-1 rounded-md text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: "rgba(27,108,254,0.18)", color: "#7AB1FF", fontFamily: "'DM Sans', sans-serif" }}
          >
            Paso {step} de 2
          </span>
        </div>

        {step === 1 && (
          <>
            <h2
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900,
                fontSize: 24,
                color: "#FFFFFF",
                textTransform: "uppercase",
                lineHeight: 1.1,
              }}
            >
              Instalá CL Score
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#CBD5E1", lineHeight: 1.5 }}>
              Tené la app en tu pantalla de inicio para entrar al toque y no perder ningún tip.
            </p>

            {installedAlready ? (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#22C55E" }}>
                ✓ Ya estás usando la app instalada
              </p>
            ) : (
              <InstallPWA variant="card" />
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => close(true)}
                className="text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#94A3B8" }}
              >
                No volver a preguntar
              </button>
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl font-medium text-white"
                style={{ background: "#1B6CFE", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900,
                fontSize: 24,
                color: "#FFFFFF",
                textTransform: "uppercase",
                lineHeight: 1.1,
              }}
            >
              Activá las notificaciones
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#CBD5E1", lineHeight: 1.5 }}>
              Te avisamos en el momento exacto en que sale un tip o un green. Sin spam.
            </p>

            <EnablePushButton variant="card" />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => close(true)}
                className="text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#94A3B8" }}
              >
                No volver a preguntar
              </button>
              <button
                onClick={() => close(true)}
                className="px-4 py-2 rounded-xl font-medium text-white"
                style={{ background: "#1B6CFE", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
              >
                Listo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
