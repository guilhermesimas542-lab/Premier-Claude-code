import { Lock, ShieldCheck, X } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { ActivationTelegramCta } from "./ActivationLockScreen";
import { getStoredTelegramUrl } from "./gateStorage";

/**
 * Popup de ativação — mostrado quando o lead trava tenta usar uma feature
 * que exige conta ativada (ex.: gerar tip IA). Mesmo conteúdo da
 * `ActivationLockScreen` antiga (que ficava ocupando o app inteiro), agora
 * em popup com X pra fechar.
 *
 * O lead pode fechar e continuar navegando no app — só não consegue executar
 * a ação gated. Quando a trava de 10min cair, o app libera silenciosamente.
 */
export function ActivationGateModal({
  open,
  telegramUrl,
  onClose,
}: {
  open: boolean;
  telegramUrl: string;
  /** Fecha o popup. */
  onClose: () => void;
}) {
  // Lê na hora do clique pra não pegar valor stale do prop — o `startActivationGate`
  // pode ter rodado depois do App.tsx montar e o storage ter a URL nova.
  const handleTelegram = () => {
    if (typeof window === "undefined") return;
    const url = getStoredTelegramUrl() ?? telegramUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="fixed left-1/2 top-1/2 z-[110] m-0 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#229ED9]/40 bg-[#060D1E] p-0 text-white shadow-2xl animate-popup-pop-in [&>button]:hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-[#0c1a2d]/80 text-white shadow-lg transition hover:bg-white/15"
        >
          <X className="h-5 w-5" strokeWidth={2.6} />
        </button>

        <div className="relative px-6 pb-2 pt-7 text-center">
          <BackgroundGlow />

          <div className="relative z-10 flex flex-col items-center">
            <div
              className="mb-4 grid h-14 w-14 place-items-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg,#229ED9 0%,#0088cc 100%)",
                boxShadow: "0 0 28px rgba(34,158,217,0.5)",
              }}
            >
              <Lock className="h-6 w-6 text-white" strokeWidth={2.4} />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#229ED9]/40 bg-[#229ED9]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#229ED9]">
              <ShieldCheck className="h-3 w-3" /> Cuenta en activación
            </span>

            <h3 className="mt-3 font-display text-[22px] font-extrabold uppercase leading-[1.05] tracking-tight">
              Activa tu cuenta en{" "}
              <span className="text-[#229ED9]">Telegram</span> para liberar la app
            </h3>

            <p className="mt-3 text-[12.5px] leading-snug text-white/75">
              Tu acceso está casi listo. Habla con nuestra atención en Telegram
              para <span className="font-bold text-white">activar tu cuenta</span>{" "}
              — es la última etapa para desbloquear todo.
            </p>
          </div>
        </div>

        <div className="relative z-10 px-6 pb-6 pt-2">
          <ActivationTelegramCta onClick={handleTelegram} className="mt-2" />
          {/* Reentrada: se o lead ja chamou o bot, basta esperar 10min. */}
          <p className="mt-3 text-center text-[11.5px] leading-snug text-white/60">
            ¿Ya hablaste con el bot? Vuelve en{" "}
            <span className="font-bold text-[#00FF87]">hasta 10 minutos</span>{" "}
            y la app va a estar desbloqueada.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute -left-16 top-4 h-44 w-44 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle,#229ED9 0%,transparent 70%)" }}
      />
      <div
        className="absolute -right-16 bottom-0 h-44 w-44 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle,#00FF87 0%,transparent 70%)" }}
      />
    </div>
  );
}
