import { useEffect, useState } from "react";
import {
  Clock3,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

import { useCtaOverride } from "@/components/onboarding/cta-context";
import { trackOnboardingTelegramClick } from "@/components/onboarding/onboardingFunnel";

/**
 * Cronômetro de ativação: os 10 minutos começam a contar quando o lead CHEGA
 * nesta tela (regra de negócio). Persistimos o deadline em localStorage pra o
 * tempo continuar correndo mesmo se ele sair pro Telegram e voltar / recarregar.
 */
const ACTIVATION_DEADLINE_KEY = "clscore_onb_activation_deadline_v1";
const ACTIVATION_WINDOW_MS = 10 * 60 * 1000;

function useActivationCountdown() {
  const readDeadline = () => {
    if (typeof window === "undefined") return Date.now() + ACTIVATION_WINDOW_MS;
    const stored = Number(localStorage.getItem(ACTIVATION_DEADLINE_KEY));
    if (stored && !Number.isNaN(stored)) return stored;
    const deadline = Date.now() + ACTIVATION_WINDOW_MS;
    localStorage.setItem(ACTIVATION_DEADLINE_KEY, String(deadline));
    return deadline;
  };

  const [remaining, setRemaining] = useState(() => Math.max(0, readDeadline() - Date.now()));

  useEffect(() => {
    const deadline = readDeadline();
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  return {
    expired: remaining <= 0,
    label: `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
  };
}

/**
 * Step 5 — Último passo CONGELADO ("ativar a conta no Telegram").
 *
 * Regra de negócio: todo lead que chega aqui PRECISA finalizar a ativação num
 * passo fora do app (o bot do Telegram). Por isso a tela é uma "jaula":
 *
 *  - Sem botão "Voltar" e sem fechar de verdade (o Dialog já bloqueia ESC /
 *    clique fora — `onOpenChange` é noop no OnboardingModal).
 *  - O único caminho útil é o botão azul do Telegram.
 *  - QUALQUER tentativa de escapar (o "X" do canto) cai na tela `blocked`, que
 *    só reforça que ele tem que ir ao Telegram — não oferece saída.
 *  - Depois de abrir o Telegram, a tela vira `awaiting`: o app segue travado.
 *    O IDEAL é só liberar quando a ativação for confirmada de fora (webhook do
 *    Telegram → flag no Supabase → `onComplete`). Enquanto esse gancho não
 *    existe, o `awaiting` oferece uma saída explícita ("já falei com o bot"),
 *    que só aparece DEPOIS de o lead ter ido ao Telegram — o atrito de forçar
 *    o passo externo já foi cumprido.
 *
 * Mode `popup` no `OnboardingModal` esconde a NavBar default; este step provê
 * seus próprios CTAs.
 */
export function Step5Confirm() {
  const { user, onComplete } = useCtaOverride();
  const [screen, setScreen] = useState<"main" | "blocked" | "awaiting">("main");

  const telegramHref = user.telegramUrl ?? "";

  // Side-effect ao clicar no CTA do Telegram: muda pra "awaiting".
  // A navegação em nova guia é feita pelo proprio <a target="_blank">.
  const handleTelegramClick = () => {
    trackOnboardingTelegramClick();
    setScreen("awaiting");
  };

  if (screen === "blocked") {
    return (
      <BlockedNotice
        telegramHref={telegramHref}
        onTelegramClick={handleTelegramClick}
        onBack={() => setScreen("main")}
        onClose={onComplete}
      />
    );
  }

  if (screen === "awaiting") {
    return (
      <AwaitingActivation
        telegramHref={telegramHref}
        onDone={onComplete}
      />
    );
  }

  return (
    <div className="relative flex flex-col text-white">
      {/* O "X" não fecha nada — qualquer tentativa de sair cai no aviso. */}
      <button
        type="button"
        onClick={() => setScreen("blocked")}
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <header className="px-5 pb-3 pt-6 text-center">
        <div
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#229ED9 0%,#0088cc 100%)",
            boxShadow: "0 0 24px rgba(34,158,217,0.45)",
          }}
        >
          <Lock className="h-6 w-6 text-white" strokeWidth={2.6} />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00FF87]/40 bg-[#00FF87]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#00FF87]">
          <ShieldCheck className="h-3 w-3" /> Última etapa
        </span>

        <h3 className="mt-3 font-display text-[22px] font-extrabold uppercase leading-[1.1] tracking-tight">
          Actívala en <span className="text-[#229ED9]">Telegram</span> y{" "}
          <span className="whitespace-nowrap">
            desbloquea <span className="text-[#00FF87]">todo.</span>
          </span>
        </h3>

        <p className="mt-2 text-[13px] leading-snug text-white/75">
          Este es el <span className="font-bold text-white">único paso</span> que
          falta. Sin activar en Telegram, la app{" "}
          <span className="whitespace-nowrap">
            queda <span className="font-bold text-[#229ED9]">bloqueada</span>.
          </span>
        </p>
      </header>

      {/* Aviso estatico: o app desbloqueia em ate 10 min DEPOIS de falar com
          o bot no Telegram (sem countdown — nao queremos pressao temporal aqui). */}
      <div className="mx-5 mb-3 flex items-center gap-3 rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/[0.06] p-3">
        <Clock3 className="h-5 w-5 shrink-0 text-[#00FF87]" strokeWidth={2.4} />
        <p className="text-[12.5px] leading-snug text-white/80">
          Después de hablar con el bot, la app se desbloquea en{" "}
          <span className="font-bold text-[#00FF87]">hasta 10 minutos</span>.
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#0c1a2d] p-4">
        <TelegramCta href={telegramHref} onClick={handleTelegramClick} />
        {/* Sem "Volver": daqui o lead só sale activando en Telegram. */}
        <p className="text-center text-[11px] leading-snug text-white/40">
          No puedes saltarte este paso.
        </p>
      </div>
    </div>
  );
}

/* ─────────────── aviso de bloqueio (qualquer tentativa de sair) ─────────────── */

function BlockedNotice({
  telegramHref,
  onTelegramClick,
  onBack,
  onClose,
}: {
  /** URL do bot — passada pro <a target="_blank"> do CTA. */
  telegramHref: string;
  /** Side-effect ao clicar (ex.: mudar pra screen "awaiting"). */
  onTelegramClick: () => void;
  /** Volta pra tela de ativação — NÃO fecha o onboarding. */
  onBack: () => void;
  /** Fecha o onboarding de vez (lead insistiu em sair apos o aviso). */
  onClose: () => void;
}) {
  return (
    <div className="relative flex flex-col text-white">
      {/* X aqui FECHA o onboarding — o lead ja recebeu o aviso na main e
          insistiu em sair clicando X de novo. Respeitar a vontade dele. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <header className="px-5 pb-3 pt-6 text-center">
        <div
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#fbbf24 0%,#f97316 100%)",
            boxShadow: "0 0 24px rgba(251,191,36,0.35)",
          }}
        >
          <ShieldAlert className="h-6 w-6 text-[#1a1206]" strokeWidth={2.6} />
        </div>

        <h3 className="font-display text-[20px] font-extrabold uppercase leading-tight tracking-tight">
          Tu cuenta sigue bloqueada
        </h3>
        <p className="mt-2 text-[13px] leading-snug text-white/70">
          Para usar la app necesitas{" "}
          <span className="font-bold text-white">finalizar tu activación en
          Telegram</span>. No hay forma de saltarte este paso.
        </p>
      </header>

      <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#0c1a2d] p-4">
        <TelegramCta href={telegramHref} onClick={onTelegramClick} />
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center justify-center self-center rounded-md px-3 text-[11.5px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white/80"
        >
          Volver a la activación
        </button>
      </div>
    </div>
  );
}

/* ─────────────── aguardando ativação (após abrir o Telegram) ─────────────── */

function AwaitingActivation({
  telegramHref,
  onDone,
}: {
  /** URL do bot — passada pro <a target="_blank"> do CTA. */
  telegramHref: string;
  /** Libera o app (fecha o onboarding). Saída só visível aqui, após o Telegram. */
  onDone: () => void;
}) {
  const countdown = useActivationCountdown();
  return (
    <div className="relative flex flex-col text-white">
      {/* X fecha o onboarding — equivalente ao "Ya hablé con el bot · entrar"
          embaixo, mas como atalho no canto pra quem prefere fechar direto. */}
      <button
        type="button"
        onClick={onDone}
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-4 w-4" strokeWidth={2.4} />
      </button>

      <header className="px-5 pb-3 pt-6 text-center">
        <div
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg,#229ED9 0%,#0088cc 100%)",
            boxShadow: "0 0 24px rgba(34,158,217,0.45)",
          }}
        >
          <span className="flex gap-1">
            <span className="h-2 w-2 animate-hud-blink rounded-full bg-white" />
            <span
              className="h-2 w-2 animate-hud-blink rounded-full bg-white"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="h-2 w-2 animate-hud-blink rounded-full bg-white"
              style={{ animationDelay: "0.4s" }}
            />
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#229ED9]/40 bg-[#229ED9]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#229ED9]">
          <Clock3 className="h-3 w-3" /> Esperando activación
        </span>

        <h3 className="mt-3 font-display text-[20px] font-extrabold uppercase leading-tight tracking-tight">
          Termina la conversación en{" "}
          <span className="text-[#229ED9]">Telegram</span>
        </h3>
        <p className="mt-2 text-[13px] leading-snug text-white/75">
          En cuanto completes el flujo con nuestro bot, tu cuenta se activa en{" "}
          <span className="font-bold text-[#00FF87]">hasta 10 minutos</span> y la
          app queda lista para usar.
        </p>
      </header>

      <ActivationTimer label={countdown.label} expired={countdown.expired} />

      <div className="mx-5 mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-center text-[12px] leading-snug text-white/55">
          ¿No se abrió Telegram? Vuelve a tocar el botón de abajo.
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#0c1a2d] p-4">
        <TelegramCta href={telegramHref} label="Volver a abrir Telegram" />
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-9 items-center justify-center self-center rounded-md px-3 text-[11.5px] font-semibold uppercase tracking-wider text-white/55 transition hover:text-white/80"
        >
          Ya hablé con el bot · entrar
        </button>
      </div>
    </div>
  );
}

/** Cartão do cronômetro de ativação (MM:SS) — destaque verde. */
function ActivationTimer({ label, expired }: { label: string; expired: boolean }) {
  return (
    <div className="mx-5 mb-3 rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/[0.06] p-3">
      <div className="flex items-center gap-3">
        <Clock3 className="h-5 w-5 shrink-0 text-[#00FF87]" strokeWidth={2.4} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#00FF87]">
            {expired ? "Se acabó el tiempo" : "El plazo ya empezó a correr"}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-white/80">
            {expired
              ? "Si aún no tienes acceso, vuelve a hablar con el bot en Telegram."
              : "Actívala en Telegram antes de que termine. Tu cuenta queda lista en hasta 10 minutos."}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-[#00FF87]/40 bg-[#04091a] px-2.5 py-1.5">
          <span className="font-mono text-[18px] font-bold leading-none tabular-nums text-[#00FF87]">
            {expired ? "00:00" : label}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Botão primário com identidade Telegram (azul oficial + paper plane).
 *
 * Renderizado como `<a target="_blank">` em vez de `<button>` pra garantir
 * que o Telegram (web/app) abre numa NOVA GUIA — não redireciona a aba
 * atual do onboarding (alguns browsers e PWAs ignoravam o window.open).
 *
 * `onClick` é opcional pra side-effects (ex.: transitioning de tela);
 * a navegação acontece pelo `href` mesmo se onClick não for passado.
 */
function TelegramCta({
  href,
  onClick,
  label,
}: {
  href: string;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-full border-0 px-5 font-display text-[14px] font-extrabold uppercase tracking-wider text-white transition-transform hover:scale-[1.015] active:scale-[0.985]"
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
        {label ?? "Activar mi cuenta"}
      </span>
    </a>
  );
}

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}
