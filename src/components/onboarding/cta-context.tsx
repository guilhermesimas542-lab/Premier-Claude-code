import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";

import type { OnboardingUser } from "./types";

/**
 * Override do CTA do step atual.
 *
 * Steps que precisam controlar o botão "Continuar" (ex.: Step 2 com gating
 * de vídeo, Step 3 com modal de confirmação) chamam `useApplyCtaOverride()`.
 * O `OnboardingModal` reseta automaticamente entre steps.
 */
export interface CtaOverride {
  /** Substitui o label do step (ex.: "Assista o vídeo para continuar"). */
  label?: string;
  /** Desabilita o clique. Visualmente fica em estado "carregando". */
  disabled?: boolean;
  /**
   * 0..1 — quando definido, o botão vira "barra de progresso":
   * fundo navy escuro com fill gradiente verde→gold crescendo da esquerda.
   * Em 1.0 o botão fica 100% colorido e habilitado.
   */
  progress?: number;
  /**
   * Substitui o handler do clique. Quando definido, NavBar chama isso em
   * vez do `onNext` padrão — o step decide quando avançar via `goNext()`.
   */
  onClick?: () => void;
  /**
   * Esconde o botão "Volver" da NavBar (útil em steps que travam o lead
   * no fluxo atual, ex: após iniciar uma ativação irreversível).
   */
  hidePrev?: boolean;
}

interface CtaContextValue {
  override: CtaOverride;
  set: (next: CtaOverride) => void;
  reset: () => void;
  /** Avança um step. Exposto pra steps que interceptam o clique do CTA. */
  goNext: () => void;
  /** Volta um step. */
  goPrev: () => void;
  /** Lead corrente — usado por steps que precisam do telegramUrl etc. */
  user: OnboardingUser;
  /** Encerra o onboarding inteiro (no step final). */
  onComplete: () => void;
}

const CtaContext = createContext<CtaContextValue>({
  override: {},
  set: () => {},
  reset: () => {},
  goNext: () => {},
  goPrev: () => {},
  user: { telegramUrl: "" },
  onComplete: () => {},
});

export function CtaProvider({
  override,
  set,
  reset,
  goNext,
  goPrev,
  user,
  onComplete,
  children,
}: CtaContextValue & { children: ReactNode }) {
  return (
    <CtaContext.Provider value={{ override, set, reset, goNext, goPrev, user, onComplete }}>
      {children}
    </CtaContext.Provider>
  );
}

export function useCtaOverride() {
  return useContext(CtaContext);
}

/**
 * Helper pra steps: declara o override do CTA via dependências.
 * Aplica em `useEffect` (com cleanup que reseta no unmount).
 */
export function useApplyCtaOverride(override: CtaOverride) {
  const { set, reset } = useCtaOverride();

  useEffect(() => {
    set(override);
    return reset;
    // override é objeto literal — comparamos por valores que afetam o NavBar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override.label, override.disabled, override.progress, override.onClick, override.hidePrev]);
}
