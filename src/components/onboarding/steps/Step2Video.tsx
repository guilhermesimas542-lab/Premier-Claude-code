import { useEffect, useMemo, useRef } from "react";
import { Play, Sparkles } from "lucide-react";

import { useApplyCtaOverride } from "@/components/onboarding/cta-context";
import { useVideoGating } from "@/components/onboarding/hooks/useVideoGating";
import { trackOnboardingVideoPlay } from "@/components/onboarding/onboardingFunnel";
import { vturbPlayerSrc } from "@/components/onboarding/lib/vturb";

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
  const hasVideo = !!videoId;
  const { started, progress, ended } = useVideoGating({ simulateSeconds, videoId });

  // Mede "deu play" no vídeo (engajamento) — uma vez por montagem. A diferença
  // entre "chegou no passo" e "deu play" mostra quem nem começou o vídeo.
  const playTrackedRef = useRef(false);
  useEffect(() => {
    if (started && !playTrackedRef.current) {
      playTrackedRef.current = true;
      trackOnboardingVideoPlay(2);
    }
  }, [started]);

  // Com vídeo (vTurb), o CTA libera conforme o progresso real do vídeo
  // (postMessage). Sem vídeo conectado, não há nada a assistir — a pessoa
  // avança direto; o vTurb coloca o delay do botão quando o vídeo entrar.
  const override = useMemo(
    () =>
      hasVideo
        ? {
            label: started ? playingLabel : beforePlayLabel,
            disabled: !ended,
            progress,
          }
        : { label: playingLabel },
    [hasVideo, started, progress, ended, beforePlayLabel, playingLabel],
  );
  useApplyCtaOverride(override);

  return (
    <div className="relative flex h-full flex-col px-5 pb-3 pt-0">
      <Header />

      <section className="mt-3 flex flex-1 min-h-0 justify-center">
        <VideoFrame videoId={videoId} />
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="text-center animate-fade-in-scale">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00FF87]/35 bg-[#00FF87]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00FF87]">
        <Sparkles className="h-3 w-3" /> Tour de la app
      </span>

      <h2 className="mt-2 font-display text-[26px] font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-3xl">
        En 1 min lo ves todo
      </h2>

      <p className="mt-1.5 max-w-xs mx-auto text-[13px] leading-snug text-white/65">
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
    const SDK_SRC = vturbPlayerSrc(videoId);
    if (!document.querySelector(`script[src="${SDK_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SDK_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [videoId]);

  return (
    <div
      className="relative mx-auto h-[92%] overflow-hidden rounded-2xl border border-white/10 bg-black/60"
      style={{
        // Vídeo vertical 9:16 — preenche 92% da altura disponível na section
        // (8% de folga no rodapé pra não cortar a barra do player no mobile).
        aspectRatio: "9 / 16",
        maxWidth: "100%",
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

      <div ref={containerRef} className="absolute inset-0 z-10">
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
        Reproduciendo
      </p>
    </div>
  );
}
