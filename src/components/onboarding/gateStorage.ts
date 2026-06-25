/**
 * Persistência do gate de ativação (trava dura pós-onboarding).
 *
 * No fork: localStorage. No app prod: trocar a implementação por leitura/escrita
 * da coluna `users.onboarding_locked_until` (timestamp) — MANTENDO a assinatura
 * destas funções, pra o resto do gate não saber de onde vem o lock.
 *
 * Regra de negócio: `lock_until` é um instante (epoch ms). Enquanto
 * `now < lock_until`, o lead fica preso. Quem NÃO tem `lock_until` (leads de
 * fora do funil) nunca trava.
 */

const LS_KEY = "premier_activation_lock_until_v1";
const LS_TELEGRAM_KEY = "premier_activation_telegram_url_v1";

/** Duração da trava: 10 minutos. Desbloqueio é SÓ por tempo. */
export const LOCK_DURATION_MS = 10 * 60 * 1000;

/** Lê o telegramUrl armazenado para o popup de ativação. */
export function getStoredTelegramUrl(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LS_TELEGRAM_KEY);
}

/** Persiste o telegramUrl quando a trava é armada. */
export function setStoredTelegramUrl(url: string): void {
  if (typeof window === "undefined" || !url) return;
  window.localStorage.setItem(LS_TELEGRAM_KEY, url);
}

/**
 * Evento (mesma aba) emitido ao armar/limpar a trava. `storage` só dispara
 * entre abas; este custom event deixa o `useActivationGate` reagir na hora
 * quando a trava é armada no `onComplete`, sem precisar ficar fazendo polling
 * enquanto o lead está livre.
 */
export const GATE_CHANGED_EVENT = "premier:activation-gate-changed";

function notifyGateChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GATE_CHANGED_EVENT));
}

/** Lê o instante de desbloqueio (epoch ms) ou `null` se não houver lock. */
export function getLockUntil(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LS_KEY);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Crava o instante de desbloqueio (epoch ms). */
export function setLock(untilMs: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, String(untilMs));
  notifyGateChanged();
}

/** Remove o lock (usado em dev/reset; em prod equivale a zerar a coluna). */
export function clearLock(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY);
  notifyGateChanged();
}

/**
 * Lógica pura do gate — isolada de React/storage pra ser trivial de testar.
 *
 * Travado quando há `lockUntil` E o agora ainda não o alcançou. Sem lock
 * (`null`) → livre. Exatamente no instante (`now === lockUntil`) → já liberado.
 */
export function computeIsLocked(lockUntil: number | null, now: number): boolean {
  return lockUntil != null && now < lockUntil;
}
