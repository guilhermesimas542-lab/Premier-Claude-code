import { useEffect, useRef, useState } from "react";

/**
 * Hook que orquestra o gating do step de vídeo.
 *
 * Estados:
 *   - `started`: lead já deu play
 *   - `progress`: 0..1
 *
 * Fontes de progresso:
 *  1. **vTurb (postMessage)** — quando o iframe oficial estiver embedado, o
 *     player do vTurb dispara eventos `play` / `timeupdate` / `ended` via
 *     `window.postMessage`. Escutamos e mapeamos pro estado.
 *
 *     ⚠️ A spec de eventos do vTurb não é pública e varia por versão. Os
 *     handlers abaixo cobrem os shapes mais comuns; ajustar quando integrar
 *     com a conta real.
 *
 *  2. **Simulação dev** — botão "Simular reprodução" chama `simulate()` e
 *     enche o progress em N segundos pra testar a UX sem video real.
 */
export function useVideoGating(options?: { simulateSeconds?: number }) {
  const simulateSeconds = options?.simulateSeconds ?? 30;

  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // ──────────────── 1. vTurb postMessage ────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const origin = e.origin ?? "";
      if (
        !origin.includes("converteai") &&
        !origin.includes("vturb") &&
        !origin.includes("smartplayer")
      ) {
        return;
      }

      const data = e.data;
      if (!data || typeof data !== "object") return;

      // Tipos de evento que o vTurb tipicamente dispara — cobrimos as variações
      // de shape mais comuns. Quando integrar com a conta real, validar.
      const eventName: string | undefined = data.event ?? data.type ?? data.name;

      if (!eventName) return;

      if (/^(play|video-?start|started)$/i.test(eventName)) {
        setStarted(true);
        return;
      }

      if (/^(timeupdate|progress|video-?progress|on-?time-?update)$/i.test(eventName)) {
        const currentTime = Number(data.currentTime ?? data.time ?? data.played);
        const duration = Number(data.duration ?? data.total);
        if (Number.isFinite(currentTime) && Number.isFinite(duration) && duration > 0) {
          setProgress(Math.min(1, Math.max(0, currentTime / duration)));
        }
        return;
      }

      if (/^(ended|finish|complete|video-?end)$/i.test(eventName)) {
        setProgress(1);
        return;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // ──────────────── 2. Simulação dev ────────────────
  function simulate() {
    if (intervalRef.current != null) return; // já rodando
    setStarted(true);
    const stepMs = 200;
    const totalSteps = (simulateSeconds * 1000) / stepMs;
    let i = 0;
    intervalRef.current = window.setInterval(() => {
      i += 1;
      const p = Math.min(1, i / totalSteps);
      setProgress(p);
      if (p >= 1 && intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, stepMs);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { started, progress, simulate };
}
