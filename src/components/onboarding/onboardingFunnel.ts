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

// Mesma chave usada no Home (`LS_ONBOARDING_TEST_MODE`). Quando o onboarding é
// aberto em modo teste (`?test_onb=1`, usado por QA/admin), NÃO registramos
// eventos — senão os testes internos contaminam as métricas reais do funil.
const LS_ONBOARDING_TEST_MODE = "onb_test_mode";
function isTestMode(): boolean {
  try {
    return localStorage.getItem(LS_ONBOARDING_TEST_MODE) === "1";
  } catch {
    return false;
  }
}

/** Marca que o lead alcançou (viu) o passo de índice 1..5 do onboarding. */
export function trackOnboardingReached(stepIndex1Based: number) {
  if (isTestMode()) return;
  const step = ONB_STEPS[stepIndex1Based - 1];
  if (!step) return;
  void trackStep({ step, eventType: "loaded", funnelSlug: ONB_FUNNEL_SLUG });
}

/** Marca o clique no botão do Telegram (passo 5) — a ação de ativação real. */
export function trackOnboardingTelegramClick() {
  if (isTestMode()) return;
  void trackStep({ step: ONB_STEPS[4], eventType: "clicked", funnelSlug: ONB_FUNNEL_SLUG });
}

/** Marca engajamento com o vídeo de um passo (deu play / iniciou a ativação). */
export function trackOnboardingVideoPlay(stepIndex1Based: number) {
  if (isTestMode()) return;
  const step = ONB_STEPS[stepIndex1Based - 1];
  if (!step) return;
  void trackStep({ step, eventType: "clicked", funnelSlug: ONB_FUNNEL_SLUG });
}

/** Marca a conclusão do onboarding (passo final "Completado"). */
export function trackOnboardingCompleted() {
  if (isTestMode()) return;
  const step = ONB_STEPS[ONB_STEPS.length - 1];
  void trackStep({ step, eventType: "loaded", funnelSlug: ONB_FUNNEL_SLUG });
}
