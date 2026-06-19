import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lock, Play, Zap } from "lucide-react";

import { useApplyCtaOverride } from "@/components/onboarding/cta-context";
import { useVideoGating } from "@/components/onboarding/hooks/useVideoGating";
import { cn } from "@/lib/utils";
import clscoreLogo from "@/assets/clscore-logo.webp";

type State = "idle" | "activating" | "complete";

interface Props {
  /** ID do vídeo curto do vTurb explicando o que falta fazer. */
  videoId?: string;
  /** Duração estimada pra simulação dev. */
  simulateSeconds?: number;
}

/**
 * Step 4 — Ativação gameificada da conta.
 *
 * `idle` → grande chip HUD com logo + botão "ATIVAR CONTA".
 * `activating` → anéis girando + vídeo no centro + trilha horizontal de 4
 * checkpoints embaixo. CTA do NavBar enche com o progresso do vídeo.
 * `complete` → check verde, libera o "Continuar" do NavBar.
 *
 * O chip cresce pra ocupar quase toda a tela (flex-1) — o vídeo tem que
 * dominar a atenção do lead. Os checkpoints e a CTA ficam sempre visíveis.
 */
export function Step4Activate({ videoId, simulateSeconds = 22 }: Props) {
  const [state, setState] = useState<State>("idle");
  const { progress, started, simulate } = useVideoGating({ simulateSeconds });

  // Vídeo terminou → vai pra `complete`, mas o player continua visível
  // (o lead pode reassistir). Quem avança pra step 5 é o NavBar CTA.
  useEffect(() => {
    if (state === "activating" && progress >= 1) {
      setState("complete");
    }
  }, [state, progress]);

  const override = useMemo(() => {
    if (state === "idle") {
      return {
        label: "Toca en Activar Cuenta",
        disabled: true,
        progress: 0,
      };
    }
    if (state === "activating") {
      return {
        label: started ? "Mira hasta el final" : "Iniciando...",
        disabled: progress < 1,
        progress,
      };
    }
    return { label: "Ir al último paso" };
  }, [state, progress, started]);
  useApplyCtaOverride(override);

  function startActivation() {
    setState("activating");
    if (!videoId) {
      setTimeout(() => simulate(), 400);
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <BackgroundGlow />

      <div className="relative z-10 flex h-full flex-col gap-3 px-5 pb-3 pt-2">
        <Header state={state} progress={progress} />

        {/* `mt-6` dá folga pros anéis orbitais (escala 1.3) não colidirem com
            o headline acima quando o chip entra no estado activating. */}
        <div className="mt-6 flex justify-center">
          <ActivationChip state={state} videoId={videoId} progress={progress} />
        </div>

        <BottomArea state={state} onActivate={startActivation} progress={progress} />
      </div>
    </div>
  );
}

/* ─────────────────── background ─────────────────── */

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute -left-24 top-12 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #00FF87 0%, transparent 70%)" }}
      />
      <div
        className="absolute -right-24 top-1/3 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #00FF87 0%, transparent 70%)" }}
      />
    </div>
  );
}

/* ─────────────────── header ─────────────────── */

function Header({ state, progress }: { state: State; progress: number }) {
  const pct = Math.round(progress * 100);

  return (
    <header className="text-center animate-fade-in-scale">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
          state === "complete"
            ? "border-[#00FF87]/55 bg-[#00FF87]/15 text-[#00FF87]"
            : state === "activating"
              ? "border-[#00FF87]/40 bg-[#00FF87]/10 text-[#00FF87] animate-hud-blink"
              : "border-white/15 bg-white/5 text-white/70",
        )}
      >
        {state === "complete" ? (
          <>
            <CheckCircle2 className="h-3 w-3" /> Cuenta activada
          </>
        ) : state === "activating" ? (
          <>
            <Zap className="h-3 w-3" /> Activando {pct}%
          </>
        ) : (
          <>
            <Lock className="h-3 w-3" /> Lista para activar
          </>
        )}
      </span>

      <h2 className="mt-2 font-display text-[24px] font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-[26px]">
        {state === "complete" ? (
          <>
            Activada con <span style={gradientText}>éxito.</span>
          </>
        ) : state === "activating" ? (
          <>
            Activando <span style={gradientText}>tu cuenta.</span>
          </>
        ) : (
          <>
            Activa <span style={gradientText}>tu cuenta.</span>
          </>
        )}
      </h2>

      {state === "idle" && (
        <p className="mt-1.5 max-w-[290px] mx-auto text-[12.5px] leading-snug text-white/75">
          Toca el <span className="font-bold text-[#00FF87]">botón verde</span>{" "}
          abajo. En pocos minutos tu cuenta queda activa.
        </p>
      )}
      {state === "complete" && (
        <p className="mt-1.5 max-w-[300px] mx-auto text-[12.5px] leading-snug text-white/75">
          Toca en{" "}
          <span className="font-bold text-[#00FF87]">"Ir al último paso"</span>{" "}
          abajo para liberar todo.
        </p>
      )}
    </header>
  );
}

const gradientText = {
  background: "linear-gradient(135deg,#00FF87 0%, #0c8a4f 100%)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
};

/* ─────────────────── chip central (HUD + vídeo + anéis) ─────────────────── */

function ActivationChip({
  state,
  videoId,
  progress,
}: {
  state: State;
  videoId?: string;
  progress: number;
}) {
  // Container com altura fixa pra os dois estados (idle / hud) crossfaderem
  // no mesmo espaço sem pulo de layout. Dimensão = ratio 4:5 com w-92vw.
  return (
    <div className="relative aspect-[4/5] w-[92vw] max-w-[340px]">
      {/* IDLE — orb circular com sonar (sem frame; foco vai pro botão). */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-500",
          state === "idle" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={state !== "idle"}
      >
        <IdleOrb />
      </div>

      {/* ACTIVATING + COMPLETE — frame HUD com rings + vídeo. */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          state === "idle" ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={state === "idle"}
      >
        <HudFrame state={state} videoId={videoId} progress={progress} />
      </div>
    </div>
  );
}

/**
 * Orb circular do estado IDLE — chip dourado-verde com PREMIER logo no centro,
 * cercado de 3 sonar rings que se expandem em loop. SEM moldura retangular —
 * o foco visual fica no botão "Ativar Conta" abaixo.
 */
function IdleOrb() {
  return (
    <div className="relative flex h-[260px] w-[260px] items-center justify-center">
      {/* Sonar pings — 3 anéis com delays escalonados */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border-2 border-[#00FF87]/45 animate-sonar-ping"
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border-2 border-[#00FF87]/35 animate-sonar-ping"
        style={{ animationDelay: "1s" }}
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border-2 border-[#00FF87]/25 animate-sonar-ping"
        style={{ animationDelay: "2s" }}
      />

      {/* Halo difuso */}
      <span
        aria-hidden
        className="absolute inset-[18%] rounded-full bg-[#00FF87]/15 blur-2xl"
      />

      {/* Orb central com CLSCORE logo — fundo branco pra contrastar com logo preta */}
      <div
        className="relative grid h-[130px] w-[130px] place-items-center rounded-full animate-premier-app-pulse"
        style={{
          background: "#ffffff",
          border: "1.5px solid rgba(0,255,135,0.55)",
          boxShadow:
            "0 0 36px rgba(0,255,135,0.55), inset 0 0 14px rgba(0,255,135,0.18)",
        }}
      >
        <img
          src={clscoreLogo}
          alt="CLSCORE"
          className="h-16 w-16 object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}

/**
 * HUD retangular com cantos brackets, anéis orbitais e conteúdo (vídeo ou
 * check). Aparece apenas em `activating` e `complete`.
 */
function HudFrame({
  state,
  videoId,
  progress,
}: {
  state: State;
  videoId?: string;
  progress: number;
}) {
  const accent = "#00FF87";
  // Vídeo permanece visível no estado `complete` pra o lead poder reassistir.
  // Os anéis orbitais + scanline somem (sinalizam fim do processamento).
  const showVideo = state === "activating" || state === "complete";
  const isProcessing = state === "activating";

  return (
    <div className="relative h-full w-full">
      {isProcessing && (
        <>
          <OrbitalRing scale={1.06} duration={14} color="rgba(0,255,135,0.55)" dash="6 16" />
          <OrbitalRing scale={1.14} duration={22} color="rgba(234,192,100,0.4)" dash="3 30" reverse />
          <OrbitalRing scale={1.22} duration={9} color="rgba(0,255,135,0.3)" dash="2 10" />
        </>
      )}

      <div
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-3xl",
          isProcessing && "animate-activation-glow",
        )}
        style={{
          background:
            "linear-gradient(135deg,rgba(0,255,135,0.22),rgba(234,192,100,0.12))",
        }}
      />

      <div
        className="relative h-full w-full overflow-hidden rounded-3xl border bg-[#04091a]"
        style={{ borderColor: accent }}
      >
        <Corner pos="tl" color={accent} />
        <Corner pos="tr" color={accent} />
        <Corner pos="bl" color={accent} />
        <Corner pos="br" color={accent} />

        {isProcessing && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-2 top-0 h-[2px] animate-scanline"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #00FF87 50%, transparent 100%)",
              boxShadow: "0 0 12px #00FF87",
            }}
          />
        )}

        {showVideo && (
          <ActivatingCenter
            state={state}
            videoId={videoId}
            progress={progress}
          />
        )}
      </div>
    </div>
  );
}

function OrbitalRing({
  scale,
  duration,
  color,
  dash,
  reverse,
}: {
  scale: number;
  duration: number;
  color: string;
  dash: string;
  reverse?: boolean;
}) {
  const expand = `${((scale - 1) / 2) * -100}%`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className={cn(
        "absolute",
        reverse ? "animate-orbit-spin-reverse" : "animate-orbit-spin",
      )}
      style={{
        // Cresce em volta do frame proporcionalmente.
        inset: expand,
        // @ts-expect-error CSS var
        "--orbit-duration": `${duration}s`,
      }}
    >
      <circle
        cx="100"
        cy="100"
        r="96"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={dash}
      />
    </svg>
  );
}

function Corner({
  pos,
  color,
}: {
  pos: "tl" | "tr" | "bl" | "br";
  color: string;
}) {
  const styles: Record<typeof pos, string> = {
    tl: "top-2 left-2 border-l-2 border-t-2 rounded-tl-lg",
    tr: "top-2 right-2 border-r-2 border-t-2 rounded-tr-lg",
    bl: "bottom-2 left-2 border-l-2 border-b-2 rounded-bl-lg",
    br: "bottom-2 right-2 border-r-2 border-b-2 rounded-br-lg",
  };
  return (
    <span
      aria-hidden
      className={cn("absolute h-4 w-4 z-10", styles[pos])}
      style={{ borderColor: color }}
    />
  );
}

/* ─────────────────── conteúdos do centro ─────────────────── */

function ActivatingCenter({
  state,
  videoId,
  progress,
}: {
  state: State;
  videoId?: string;
  progress: number;
}) {
  const pct = Math.round(progress * 100);
  const done = state === "complete";

  return (
    <div className="relative h-full w-full">
      {videoId ? <VturbEmbed videoId={videoId} /> : <FakeVideoFrame />}

      <div
        className={cn(
          "absolute inset-x-2 bottom-2 flex items-center justify-between rounded-md border bg-[#04091a]/85 px-2 py-1.5 backdrop-blur",
          done ? "border-[#00FF87]/60" : "border-[#00FF87]/30",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 font-display text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#00FF87]",
            !done && "animate-hud-blink",
          )}
        >
          {done && <CheckCircle2 className="h-3 w-3" />}
          {done ? "Activación completa" : "Activando"}
        </span>
        <span className="font-mono text-[10px] font-bold text-[#00FF87]">{pct}%</span>
      </div>
    </div>
  );
}

function FakeVideoFrame() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center"
      style={{
        background:
          "radial-gradient(circle at center, rgba(0,255,135,0.08) 0%, transparent 70%)",
      }}
    >
      <div
        className="grid h-14 w-14 place-items-center rounded-full"
        style={{
          background: "linear-gradient(135deg,#00FF87 0%, #0c8a4f 100%)",
          boxShadow: "0 0 26px rgba(0,255,135,0.6)",
        }}
      >
        <Play className="h-6 w-6 fill-[#0c1a2d] text-[#0c1a2d]" />
      </div>
      <p className="font-display text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/55">
        Reproduciendo video
      </p>
    </div>
  );
}

function VturbEmbed({ videoId }: { videoId: string }) {
  return (
    <div
      className="absolute inset-0"
      ref={(el) => {
        if (!el || el.dataset.mounted) return;
        el.dataset.mounted = "1";
        const player = document.createElement("vturb-smartplayer");
        player.id = videoId;
        (player as unknown as HTMLElement).style.cssText = "display:block;width:100%;height:100%;";
        el.appendChild(player);

        const SDK_SRC = "https://scripts.converteai.net/lib/js/smartplayer/v4/sdk.min.js";
        if (!document.querySelector(`script[src="${SDK_SRC}"]`)) {
          const script = document.createElement("script");
          script.src = SDK_SRC;
          script.async = true;
          document.head.appendChild(script);
        }
      }}
    />
  );
}

/* ─────────────────── área inferior ─────────────────── */

function BottomArea({
  state,
  onActivate,
  progress,
}: {
  state: State;
  onActivate: () => void;
  progress: number;
}) {
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onActivate}
          className="group relative h-14 w-full max-w-[340px] overflow-hidden rounded-full border-0 px-5 font-display text-[14px] font-extrabold uppercase tracking-wider text-[#0c1a2d] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #00FF87 0%, #0c8a4f 100%)",
            boxShadow: "0 0 32px rgba(0,255,135,0.45), 0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          <span className="relative inline-flex items-center gap-2">
            <Zap className="h-4 w-4" strokeWidth={2.6} />
            Activar cuenta ahora
          </span>
        </button>
      </div>
    );
  }

  if (state === "activating") {
    return <ProgressTrail progress={progress} />;
  }

  // Complete: trail vira badge de pronto. Vídeo segue visível no chip
  // (lead pode reassistir); o avanço fica por conta do NavBar.
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#00FF87]/45 bg-[#00FF87]/12 px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-[#00FF87]">
        <CheckCircle2 className="h-4 w-4" /> Todo listo · avanza ahora
      </div>
    </div>
  );
}

/**
 * Trilha horizontal de 4 checkpoints — espaço compacto comparado à lista
 * vertical. Cada dot pinta conforme o progresso passa do threshold dele.
 */
function ProgressTrail({ progress }: { progress: number }) {
  const steps = [
    { label: "Identidad" },
    { label: "Cuenta" },
    { label: "Permisos" },
    { label: "Activación" },
  ];

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="relative flex items-start justify-between">
        {/* Linha de fundo */}
        <span
          aria-hidden
          className="absolute left-3 right-3 top-[5px] h-[2px] rounded-full bg-white/10"
        />
        {/* Linha preenchida */}
        <span
          aria-hidden
          className="absolute left-3 top-[5px] h-[2px] rounded-full bg-[#00FF87] transition-[width] duration-300 ease-out"
          style={{
            width: `calc((100% - 24px) * ${Math.min(1, progress)})`,
            boxShadow: "0 0 8px #00FF87",
          }}
        />

        {steps.map((s, i) => {
          const stepProgress = (i + 1) / steps.length;
          const done = progress >= stepProgress - 0.02;
          const active = !done && progress >= stepProgress - 0.25;

          return (
            <div key={i} className="relative z-10 flex w-12 flex-col items-center gap-1">
              <span
                className={cn(
                  "grid h-3 w-3 place-items-center rounded-full transition",
                  done && "bg-[#00FF87]",
                  active && "border border-[#00FF87] bg-[#04091a] animate-hud-blink",
                  !done && !active && "border border-white/25 bg-[#04091a]",
                )}
              />
              <span
                className={cn(
                  "text-center font-display text-[9px] font-bold uppercase tracking-wider transition-colors",
                  done ? "text-white/85" : active ? "text-[#00FF87]" : "text-white/40",
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
