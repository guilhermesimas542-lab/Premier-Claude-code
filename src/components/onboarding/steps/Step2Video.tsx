import { useEffect, useMemo, useRef } from "react";
import { Play, Sparkles } from "lucide-react";

import { useApplyCtaOverride } from "@/components/onboarding/cta-context";
import { useVideoGating } from "@/components/onboarding/hooks/useVideoGating";

interface Props {
  /**
   * ID do vídeo no vTurb (formato `vid-xxxxxxxxxx`). Quando informado,
   * o smartplayer é injetado e o `useVideoGating` escuta os eventos via
   * postMessage. Quando vazio, mostra placeholder com botão "Simular".
   */
  videoId?: string;
  /** Pré-label antes de o lead dar play. */
  beforePlayLabel?: string;
  /** Label durante e após reprodução (vai virando "preenchido"). */
  playingLabel?: string;
  /** Duração estimada pra simulação dev (segundos). */
  simulateSeconds?: number;
}

/**
 * Step 2 — Vídeo de boas-vindas (gating).
 *
 * O lead precisa assistir o vídeo inteiro pra liberar o CTA. Antes do play,
 * o botão diz "Assista o vídeo para continuar"; durante, "Próximo passo"
 * com barra preenchendo conforme o vídeo avança.
 */
export function Step2Video({
  videoId,
  beforePlayLabel = "Mira el video para continuar",
  playingLabel = "Próximo paso",
  simulateSeconds = 30,
}: Props) {
  const { started, progress, simulate } = useVideoGating({ simulateSeconds });

  // Empurra o estado pro NavBar — label muda quando o lead dá play; CTA fica
  // desabilitado e mostra a barra de progresso até completar.
  const override = useMemo(
    () => ({
      label: started ? playingLabel : beforePlayLabel,
      disabled: progress < 1,
      progress,
    }),
    [started, progress, beforePlayLabel, playingLabel],
  );
  useApplyCtaOverride(override);

  return (
    <div className="relative flex h-full flex-col px-5 pb-5 pt-2">
      <Header />

      <section className="mt-5 flex flex-1 flex-col">
        <VideoFrame videoId={videoId} />

        {/* Dev fallback — sem videoId, mostra botão pra simular o gating
            sem precisar carregar vídeo. Pode ficar visível em prod também
            até a primeira reprodução real chegar (operador remove depois). */}
        {!videoId && !started && (
          <button
            type="button"
            onClick={simulate}
            className="mt-4 inline-flex items-center justify-center gap-2 self-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-white/70 transition hover:bg-white/10"
          >
            <Play className="h-3.5 w-3.5 fill-white/70" /> Simular reproducción
          </button>
        )}
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="text-center animate-fade-in-scale">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00FF87]/35 bg-[#00FF87]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00FF87]">
        <Sparkles className="h-3 w-3" /> Tour de la app
      </span>

      <h2 className="mt-3 font-display text-[28px] font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-3xl">
        En 1 min lo ves todo
      </h2>

      <p className="mt-2 max-w-xs mx-auto text-[13px] leading-snug text-white/65">
        Dale play y te muestro por dentro lo que acabas de comprar.
      </p>
    </header>
  );
}

/**
 * Container do vídeo. Tenta carregar o smartplayer do vTurb quando `videoId`
 * é fornecido; senão mostra um placeholder estilizado.
 *
 * Embed do vTurb (referência):
 *   <vturb-smartplayer id="vid-XXXXX" />
 *   <script src="https://scripts.converteai.net/lib/js/smartplayer/v4/sdk.min.js" />
 */
function VideoFrame({ videoId }: { videoId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    // Limpa qualquer player anterior (caso de troca de videoId).
    containerRef.current.innerHTML = "";

    const player = document.createElement("vturb-smartplayer");
    player.id = videoId;
    player.style.display = "block";
    player.style.width = "100%";
    player.style.height = "100%";
    containerRef.current.appendChild(player);

    // Injeta o SDK do vTurb (idempotente — só uma vez).
    const SDK_SRC = "https://scripts.converteai.net/lib/js/smartplayer/v4/sdk.min.js";
    if (!document.querySelector(`script[src="${SDK_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SDK_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [videoId]);

  return (
    <div
      className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-black/60"
      style={{
        // Vertical 1080×1350 → 4:5
        aspectRatio: "1080 / 1350",
        boxShadow: "0 12px 36px rgba(0,0,0,0.45), 0 0 32px rgba(0,255,135,0.08)",
      }}
    >
      {/* Glow lateral verde sutil — combina com a paleta do step 1. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-2xl opacity-25 blur-2xl"
        style={{
          background: "linear-gradient(135deg, #00FF87 0%, #0c8a4f 100%)",
        }}
      />

      <div ref={containerRef} className="relative z-10 h-full w-full">
        {!videoId && <Placeholder />}
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center">
      <div
        className="grid h-14 w-14 place-items-center rounded-full"
        style={{
          background: "linear-gradient(135deg, #00FF87 0%, #0c8a4f 100%)",
          boxShadow: "0 0 28px rgba(0,255,135,0.35)",
        }}
      >
        <Play className="h-6 w-6 fill-[#0c1a2d] text-[#0c1a2d]" strokeWidth={2} />
      </div>
      <p className="mt-3 font-display text-xs font-bold uppercase tracking-[0.18em] text-white/60">
        video · vTurb
      </p>
      <p className="mt-1 text-[11px] text-white/35">
        El ID del video se conectará aquí
      </p>
    </div>
  );
}
