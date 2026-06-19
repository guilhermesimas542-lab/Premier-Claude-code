import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Headphones,
  ShieldCheck,
  X,
} from "lucide-react";

import { useCtaOverride } from "@/components/onboarding/cta-context";

/**
 * Step 5 — Popup final com botão Telegram brand.
 *
 * Mode `popup` no `OnboardingModal` esconde a NavBar default. O step provê
 * seus próprios CTAs: 1 botão Telegram primário + link "voltar" pequeno.
 *
 * X no canto: ao clicar, mostra uma confirmação curta perguntando se o lead
 * já chamou no Telegram. O CTA primário da confirmação é "Ainda não chamei"
 * (volta pra tela do Telegram) — a saída ("Sim, pode fechar") fica como
 * link secundário pra reter o lead no funil sem manipular demais.
 */
export function Step5Confirm() {
  const { user, onComplete, goPrev } = useCtaOverride();
  const [confirmingClose, setConfirmingClose] = useState(false);

  const handleOpenTelegram = () => {
    if (typeof window !== "undefined" && user.telegramUrl) {
      window.open(user.telegramUrl, "_blank", "noopener,noreferrer");
    }
    onComplete();
  };

  if (confirmingClose) {
    return (
      <CloseConfirmation
        onStay={() => setConfirmingClose(false)}
        onClose={onComplete}
      />
    );
  }

  return (
    <div className="relative flex flex-col text-white">
      <button
        type="button"
        onClick={() => setConfirmingClose(true)}
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <header className="px-5 pb-3 pt-6 text-center">
        <div
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#00FF87 0%,#0c8a4f 100%)",
            boxShadow: "0 0 24px rgba(0,255,135,0.4)",
          }}
        >
          <CheckCircle2 className="h-6 w-6 text-[#04091a]" strokeWidth={2.6} />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00FF87]/40 bg-[#00FF87]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#00FF87]">
          <ShieldCheck className="h-3 w-3" /> Última etapa
        </span>

        <h3 className="mt-3 font-display text-[22px] font-extrabold uppercase leading-[1.1] tracking-tight">
          Actívala en <span className="text-[#229ED9]">Telegram</span> y libera{" "}
          <span className="text-[#00FF87]">todo.</span>
        </h3>

        <p className="mt-2 text-[13px] leading-snug text-white/75">
          Todas las funciones de la app se desbloquean{" "}
          <span className="font-bold text-[#00FF87]">al tiro</span>.
        </p>
      </header>

      {/* Disclaimer principal — o que o lead PRECISA saber. Visual destacado. */}
      <div className="mx-5 mb-3 rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/[0.06] p-3">
        <div className="flex items-start gap-2.5">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#00FF87]" strokeWidth={2.4} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#00FF87]">
              Importante
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-white/85">
              Después de terminar el flujo en Telegram, tu cuenta se activa
              automáticamente en{" "}
              <span className="font-bold text-[#00FF87]">hasta 10 minutos</span>{" "}
              y la app queda lista para usar.
            </p>
          </div>
        </div>
      </div>

      {/* Bullets secundários — só reforço, sem borda nem fundo. */}
      <ul className="mx-5 mb-3 space-y-1">
        <Bullet
          icon={<Headphones className="h-3 w-3" />}
          text="Atención humana, sin robots"
        />
        <Bullet
          icon={<Clock3 className="h-3 w-3" />}
          text="Tu cuenta activada en ~3 minutos"
        />
        <Bullet
          icon={<ShieldCheck className="h-3 w-3" />}
          text="Todas las funciones se desbloquean al tiro"
        />
      </ul>

      <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#0c1a2d] p-4">
        <TelegramCta onClick={handleOpenTelegram} />
        <button
          type="button"
          onClick={goPrev}
          className="inline-flex h-9 items-center justify-center gap-1 self-center rounded-md px-3 text-[11.5px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── confirmação ao fechar ─────────────────── */

function CloseConfirmation({
  onStay,
  onClose,
}: {
  /** Volta pra tela do Telegram (lead ainda não chamou). */
  onStay: () => void;
  /** Confirma que já chamou — encerra o onboarding. */
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col text-white">
      <header className="px-5 pb-3 pt-6 text-center">
        <div
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#fbbf24 0%,#f97316 100%)",
            boxShadow: "0 0 24px rgba(251,191,36,0.35)",
          }}
        >
          <AlertCircle className="h-6 w-6 text-[#1a1206]" strokeWidth={2.6} />
        </div>

        <h3 className="font-display text-[20px] font-extrabold uppercase leading-tight tracking-tight">
          ¿Ya hablaste por Telegram?
        </h3>
        <p className="mt-2 text-[13px] leading-snug text-white/70">
          Sin esa conversación rápida, tu cuenta queda bloqueada y no podrás
          usar la app.
        </p>
      </header>

      <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#0c1a2d] p-4">
        <button
          type="button"
          onClick={onStay}
          className="group relative h-12 w-full overflow-hidden rounded-full border-0 px-5 font-display text-[14px] font-extrabold uppercase tracking-wider text-[#0c1a2d] transition-transform hover:scale-[1.015] active:scale-[0.985]"
          style={{
            background: "linear-gradient(135deg, #00FF87 0%, #0c8a4f 100%)",
            boxShadow: "0 0 24px rgba(0,255,135,0.35), 0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          <span className="relative inline-flex items-center gap-2">
            Aún no — volver
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center justify-center self-center rounded-md px-3 text-[11.5px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white/80"
        >
          Sí, ya hablé
        </button>
      </div>
    </div>
  );
}

function Bullet({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 text-[11.5px] leading-snug text-white/55">
      <span className="text-white/40">{icon}</span>
      {text}
    </li>
  );
}

/** Botão primário com identidade Telegram (azul oficial + paper plane). */
function TelegramCta({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-12 w-full overflow-hidden rounded-full border-0 px-5 font-display text-[14px] font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.015] active:scale-[0.985]"
      style={{
        background: "linear-gradient(135deg, #229ED9 0%, #0088cc 100%)",
        boxShadow:
          "0 0 28px rgba(34,158,217,0.5), 0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      <span className="relative inline-flex items-center gap-2">
        <TelegramGlyph className="h-5 w-5" />
        Activar mi cuenta
      </span>
    </button>
  );
}

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}
