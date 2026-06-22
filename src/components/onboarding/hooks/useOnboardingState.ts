import { useCallback, useEffect, useState } from "react";

/**
 * Estado local do onboarding (passo atual + helpers).
 *
 * O step atual é persistido em localStorage. Se o lead recarrega a página
 * (F5, fecha/abre o navegador, vem do Telegram), ao reabrir o onboarding
 * ele cai exatamente no step em que estava — não precisa refazer o fluxo.
 *
 * `clearPersistedStep()` deve ser chamado quando o onboarding completa
 * (Home → handleAppOnboardingComplete) pra limpar a chave.
 */
const LS_STEP_KEY = "onb_current_step_v1";

function readPersistedStep(total: number): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(LS_STEP_KEY);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) return Math.min(Math.floor(n), total);
  } catch {
    /* localStorage disabled — ignora silenciosamente */
  }
  return 1;
}

function persistStep(s: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_STEP_KEY, String(s));
  } catch {
    /* quota / disabled — ignora silenciosamente */
  }
}

export function clearPersistedStep() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LS_STEP_KEY);
  } catch {
    /* */
  }
}

export function useOnboardingState(total: number) {
  const [step, setStep] = useState(() => readPersistedStep(total));

  useEffect(() => {
    persistStep(step);
  }, [step]);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, total));
  }, [total]);

  const goPrev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      setStep(Math.min(Math.max(target, 1), total));
    },
    [total],
  );

  return { step, total, goNext, goPrev, goTo };
}
