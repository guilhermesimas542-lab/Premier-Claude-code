/**
 * Tipos públicos do OnboardingFlow.
 *
 * Mantemos isso minúsculo de propósito — a especificação real de cada step
 * fica em `src/data/steps.ts` e a UI de cada um em `steps/`.
 */

import type { ReactNode } from "react";

export type OnboardingPresentation = "fullscreen" | "popup";

export interface OnboardingStep {
  /** Identificador estável usado em analytics e localStorage (ex: "welcome-logged"). */
  id: string;
  /** Título curto — aparece na lista de resumo do step 1 e em analytics. */
  title: string;
  /** Como o modal se apresenta: tela cheia (default) ou popup centralizado (step 6). */
  presentation?: OnboardingPresentation;
  /** Label do CTA "Continuar" desse step. Default: "Continuar". */
  ctaLabel?: string;
  /** Componente que renderiza o conteúdo desse passo. */
  render: () => ReactNode;
}

export interface OnboardingUser {
  /** Nome (do webhook de pagamento). Usado em personalização ("Olá, [Nome]"). */
  firstName?: string;
  /** Telegram deep-link já com o trigger correto da casa parceira do lead. */
  telegramUrl: string;
}
