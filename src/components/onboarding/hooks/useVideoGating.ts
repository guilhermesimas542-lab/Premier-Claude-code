import { useEffect, useRef, useState } from "react";

/**
 * Persistência local de vídeos já vistos por completo.
 *
 * Quando o lead assiste um vídeo gated até o fim e depois navega (volta /
 * avança) entre os steps, o componente desmonta. Sem persistir, o CTA voltava
 * a ficar bloqueado e ele teria que rever. Aqui marcamos o `videoId` num set
 * em localStorage — toda nova instância do hook checa esse set e já inicia
 * com `ended=true` (CTA liberado), mesmo se o lead reassistir.
 */
const COMPLETED_KEY = "onb_videos_completed_v1";

function readCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function markVideoCompleted(videoId: string) {
  if (typeof window === "undefined" || !videoId) return;
  const set = readCompleted();
  if (set.has(videoId)) return;
  set.add(videoId);
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...set]));
  } catch {
    /* quota / disabled — ignora silenciosamente */
  }
}

export function isVideoCompleted(videoId?: string): boolean {
  return !!videoId && readCompleted().has(videoId);
}

/**
 * Curva de "ganhos antecipados" da barra de progresso — mesma estratégia
 * usada pela barra do próprio player de vídeo (vTurb VSL): infla o progresso
 * mostrado no começo pra dar sensação de "estou quase no fim" e reduzir
 * abandono. O gating (liberação do CTA) continua atrelado ao tempo REAL
 * (ended por sinal do player), só o número exibido é "esticado".
 *
 * Cubic ease-out (1 - (1-p)^3) — derivada finita em todo intervalo (sem
 * "salto" no inicio que pow(p,0.45) causava). Em 10% real → 27%, em 25% → 58%,
 * em 50% → 87%, em 75% → 98%. Bate com a barra do vTurb e fica suave.
 */
function fakeProgress(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const q = 1 - p;
  return 1 - q * q * q;
}

/**
 * Gating do step de vídeo, integrado ao player REAL do vTurb (smartplayer v4),
 * com barra de progresso SUAVE (interpolada via requestAnimationFrame).
 *
 * Tempo/duração vêm da instância do player (capturada no evento `player:ready`):
 *   - `playback.currentTime` / eventos `video:timeupdate` (detail.time em s)
 *   - duração: `playback.duration` ou `playback.video.duration` ou o
 *     `video:loadedmetadata` (detail.video)
 *   - fim: evento `video:ended` (sinal exato) ou `playback.video.ended`
 *
 * A barra é interpolada a ~30fps entre as leituras (que vêm em saltos), pra
 * encher liso. Se a duração ainda não estiver disponível, usamos
 * `simulateSeconds` só pra animar a barra (cosmético) — mas o FIM/liberação só
 * acontece por sinal REAL do vídeo (nunca pela estimativa), pra não liberar antes.
 *
 * Estados: `started`, `progress` (0..1, suave), `ended`.
 * `simulate()` segue para o caso SEM vídeo conectado (dev/fallback).
 */
export function useVideoGating(options?: { simulateSeconds?: number; videoId?: string }) {
  const simulateSeconds = options?.simulateSeconds ?? 30;
  const videoId = options?.videoId;

  // Se o lead ja viu esse video ate o final (em qualquer visita anterior),
  // o CTA ja inicia liberado — mesmo que ele reassista agora.
  const wasCompleted = isVideoCompleted(videoId);

  const [started, setStarted] = useState(wasCompleted);
  const [progress, setProgress] = useState(wasCompleted ? 1 : 0);
  const [ended, setEnded] = useState(wasCompleted);

  const timeRef = useRef(0);        // último currentTime conhecido (s)
  const durRef = useRef(0);         // duração REAL (s); 0 = ainda não conhecida
  const syncAtRef = useRef(0);      // performance.now() do último sync
  const playingRef = useRef(false);
  const endedRef = useRef(wasCompleted);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!videoId) return; // sem vídeo conectado → quem dirige é simulate()

    const wantId = videoId.replace(/^vid-/, "");
    const ac = new AbortController();
    const bound = new Set<any>();

    const idMatches = (inst: any) => {
      try {
        const id = String(inst?.config?.id ?? "").replace(/^vid-/, "");
        return !id || !wantId || id === wantId || id.includes(wantId) || wantId.includes(id);
      } catch {
        return true;
      }
    };

    // Lê a duração de várias fontes; trata 0/NaN como "ainda não disponível".
    const readDur = (inst: any): number => {
      const pb = inst?.playback;
      const a = Number(pb?.duration);
      if (a > 0 && Number.isFinite(a)) return a;
      const b = Number(pb?.video?.duration);
      if (b > 0 && Number.isFinite(b)) return b;
      const c = Number(inst?.duration);
      if (c > 0 && Number.isFinite(c)) return c;
      return 0;
    };

    const markEnded = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      playingRef.current = false;
      setEnded(true);
      setProgress(1);
      // Persiste — se o lead voltar pra este step, ja inicia liberado.
      if (videoId) markVideoCompleted(videoId);
    };

    const sync = (t: number, d: number) => {
      if (Number.isFinite(t) && t >= 0) {
        // Só reseta a base da extrapolação quando o tempo AVANÇA. Polls que
        // pegam o mesmo currentTime (vTurb nem sempre atualiza a cada 400ms)
        // não devem zerar `extra` — isso causava o "stop-and-go" visivel.
        if (t > timeRef.current + 0.001) {
          timeRef.current = t;
          syncAtRef.current = performance.now();
        } else if (t === 0 && timeRef.current === 0) {
          syncAtRef.current = performance.now();
        }
        if (t > 0) setStarted(true);
      }
      if (d > 0) durRef.current = d;
      // Fim só por sinal REAL (com duração real).
      if (durRef.current > 0 && timeRef.current / durRef.current >= 0.985) markEnded();
    };

    const bind = (inst: any) => {
      if (!inst || bound.has(inst) || typeof inst.addEventListener !== "function") return;
      if (!idMatches(inst) && bound.size > 0) return;
      bound.add(inst);
      const opt = { signal: ac.signal } as any;
      inst.addEventListener("video:play", () => { playingRef.current = true; setStarted(true); }, opt);
      inst.addEventListener("video:playing", () => { playingRef.current = true; setStarted(true); }, opt);
      inst.addEventListener("video:pause", () => { playingRef.current = false; }, opt);
      inst.addEventListener("video:loadedmetadata", (e: any) => {
        const d = Number(e?.detail?.video?.duration) || readDur(inst);
        sync(Number(inst?.playback?.currentTime) || timeRef.current, d);
      }, opt);
      inst.addEventListener("video:timeupdate", (e: any) => {
        playingRef.current = true;
        sync(Number(e?.detail?.time), readDur(inst));
      }, opt);
      inst.addEventListener("video:ended", markEnded, opt);
    };

    const onReady = (e: any) => bind(e?.detail?.player);
    document.addEventListener("player:ready", onReady, { signal: ac.signal });

    // Poll de backup: pega instâncias prontas (API global) e lê o estado direto.
    // NÃO mexe em `playingRef.current` — esse flag é controlado pelos eventos
    // video:play / video:pause / video:timeupdate. Mexer aqui causava "stop-
    // and-go" quando o poll catchava o mesmo currentTime duas vezes.
    const poll = window.setInterval(() => {
      const list = (window as any).smartplayer?.instances;
      if (Array.isArray(list)) list.forEach((vp: any) => bind(vp?.instance ?? vp));
      for (const inst of bound) {
        const pb = inst?.playback;
        if (!pb) continue;
        const t = Number(pb.currentTime ?? pb.video?.currentTime);
        if (Number.isFinite(t)) {
          sync(t, readDur(inst));
        }
        if (pb.video?.ended === true || pb.ended === true) markEnded();
      }
    }, 400);

    // Loop de animação: interpola entre os syncs pra barra encher liso.
    // 60fps (16ms) — preço barato por uma única transition CSS num span.
    let lastEmit = 0;
    let lastP = -1;
    const animate = (now: number) => {
      if (!endedRef.current) {
        const real = durRef.current;
        const d = real > 0 ? real : simulateSeconds; // fallback só cosmético
        const extra = playingRef.current ? (now - syncAtRef.current) / 1000 : 0;
        const shown = Math.min(d, timeRef.current + extra);
        let p = d > 0 ? Math.min(1, shown / d) : 0;
        // Sem duração real, a barra nunca chega a 100% (o fim é por sinal real).
        if (real <= 0) p = Math.min(p, 0.99);
        // Emite a 60fps, mas só se houve mudança real (evita render à toa).
        if (now - lastEmit >= 16 && Math.abs(p - lastP) > 0.0005) {
          lastEmit = now;
          lastP = p;
          setProgress(fakeProgress(p));
        }
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      ac.abort();
      window.clearInterval(poll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [videoId]);

  // ──────────────── Simulação (sem vídeo conectado) ────────────────
  function simulate() {
    if (rafRef.current != null) return;
    setStarted(true);
    const durationMs = Math.max(1, simulateSeconds * 1000);
    const start = performance.now();
    let lastEmit = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      if (p >= 1 || now - lastEmit >= 33) {
        lastEmit = now;
        setProgress(p >= 1 ? 1 : fakeProgress(p));
        if (p >= 1) {
          setEnded(true);
          if (videoId) markVideoCompleted(videoId);
        }
      }
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { started, progress: ended ? 1 : progress, ended, simulate };
}
