// Instrumentação do funil de onboarding.
//
// Reaproveita o motor de Funnel Analytics já existente (tabelas fa_*) via
// `faTracker`. Os passos recebem ids prefixados `onb_` para que o painel de
// admin os identifique de forma exata (filtro `.in(step_id, ...)`),
// independentemente do `funnel_slug` da sessão.
//
// Cada passo dispara um evento `loaded` quando o lead o alcança; a conversão
// entre passos (e o ponto de maior abandono) é derivada no admin a partir de
// quantas sessões distintas alcançaram cada passo.

import { trackStep, type FaStep } from "@/lib/faTracker";

export const ONB_FUNNEL_SLUG = "onboarding";

/** Catálogo fixo dos passos do onboarding, em ordem. O 6º é a conclusão. */
export const ONB_STEPS: FaStep[] = [
  { id: "onb_1_summary", ordem: 1, nome: "Resumen", tipo: "button" },
  { id: "onb_2_video", ordem: 2, nome: "Video de bienvenida", tipo: "button" },
  { id: "onb_3_shortcut", ordem: 3, nome: "Acceso directo", tipo: "button" },
  { id: "onb_4_activate", ordem: 4, nome: "Cómo activar", tipo: "button" },
  { id: "onb_5_telegram", ordem: 5, nome: "Telegram", tipo: "button" },
  { id: "onb_6_complete", ordem: 6, nome: "Completado", tipo: "other" },
];

export const ONB_STEP_IDS = ONB_STEPS.map((s) => s.id);

/** Marca que o lead alcançou (viu) o passo de índice 1..5 do onboarding. */
export function trackOnboardingReached(stepIndex1Based: number) {
  const step = ONB_STEPS[stepIndex1Based - 1];
  if (!step) return;
  void trackStep({ step, eventType: "loaded", funnelSlug: ONB_FUNNEL_SLUG });
}

/** Marca a conclusão do onboarding (passo final "Completado"). */
export function trackOnboardingCompleted() {
  const step = ONB_STEPS[ONB_STEPS.length - 1];
  void trackStep({ step, eventType: "loaded", funnelSlug: ONB_FUNNEL_SLUG });
}
