import { forwardRef, useRef } from "react";
import { Lock, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Tela de ativação em tela cheia — o lead fica PRESO aqui enquanto a trava
 * está ativa. O app real não carrega por baixo (o Provider troca um pelo outro).
 *
 * Só o CTA do Telegram funciona de verdade. Qualquer clique FORA dele dispara
 * `onBlockedInteraction` → o Provider abre o `ActivationGateModal`.
 *
 * SEM contador: o lead não pode saber que esperar 10 min libera.
 */
export function ActivationLockScreen({
  telegramUrl,
  onBlockedInteraction,
}: {
  telegramUrl: string;
  onBlockedInteraction: () => void;
}) {
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Captura ANTES do clique chegar nos filhos: se o alvo não está dentro do
  // CTA do Telegram, intercepta e abre o modal (o lead "não pode" sair daqui).
  const handleCapture = (e: React.MouseEvent) => {
    if (ctaRef.current && ctaRef.current.contains(e.target as Node)) return;
    onBlockedInteraction();
  };

  return (
    <div
      onClickCapture={handleCapture}
      className="fixed inset-0 z-40 flex flex-col items-center overflow-y-auto bg-[#060D1E] px-6 py-10 text-center text-white"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <BackgroundGlow />

      <div className="relative z-10 my-auto flex w-full max-w-sm flex-col items-center">
        <div
          className="mb-5 grid h-16 w-16 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#229ED9 0%,#0088cc 100%)",
            boxShadow: "0 0 32px rgba(34,158,217,0.5)",
          }}
        >
          <Lock className="h-7 w-7 text-white" strokeWidth={2.4} />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#229ED9]/40 bg-[#229ED9]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#229ED9]">
          <ShieldCheck className="h-3 w-3" /> Cuenta en activación
        </span>

        <h1 className="mt-4 font-display text-[26px] font-extrabold uppercase leading-[1.05] tracking-tight sm:text-3xl">
          Activa tu cuenta en{" "}
          <span className="text-[#229ED9]">Telegram</span> para liberar la app
        </h1>

        <p className="mt-3 text-[13.5px] leading-snug text-white/75">
          Tu acceso está casi listo. Habla con nuestra atención en Telegram para{" "}
          <span className="font-bold text-white">activar tu cuenta</span> — es la
          última etapa para desbloquear todo.
        </p>

        <ActivationTelegramCta
          ref={ctaRef}
          onClick={() => {
            if (typeof window !== "undefined" && telegramUrl) {
              window.open(telegramUrl, "_blank", "noopener,noreferrer");
            }
          }}
        />

        <p className="mt-4 text-[11.5px] leading-snug text-white/45">
          La app solo se abre cuando tu cuenta esté activada.
        </p>
      </div>
    </div>
  );
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute -left-24 top-10 h-80 w-80 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle,#229ED9 0%,transparent 70%)" }}
      />
      <div
        className="absolute -right-24 bottom-10 h-80 w-80 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle,#00FF87 0%,transparent 70%)" }}
      />
    </div>
  );
}

/**
 * CTA primário com identidade Telegram. Exportado pra ser reusado no
 * `ActivationGateModal` — mesma linguagem visual nos dois lugares.
 *
 * `forwardRef` porque a LockScreen precisa da ref pra distinguir "clique no
 * CTA" de "clique em qualquer outro lugar" na captura.
 */
export const ActivationTelegramCta = forwardRef<
  HTMLButtonElement,
  { onClick: () => void; className?: string }
>(function ActivationTelegramCta({ onClick, className }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        "group relative mt-6 h-14 w-full overflow-hidden rounded-full border-0 px-5 font-display text-[15px] font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.015] active:scale-[0.985]",
        className,
      )}
      style={{
        background: "linear-gradient(135deg,#229ED9 0%,#0088cc 100%)",
        boxShadow: "0 0 28px rgba(34,158,217,0.5), 0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      <span className="relative inline-flex items-center justify-center gap-2">
        <TelegramGlyph className="h-5 w-5" />
        Hablar con atención
      </span>
    </button>
  );
});

export function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}
