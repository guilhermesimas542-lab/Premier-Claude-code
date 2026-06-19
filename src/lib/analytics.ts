/**
 * Stub de tracking — sem provider real plugado.
 *
 * Quando integrar no app prod, trocar por chamadas ao `trackEvent` de
 * `src/lib/events.ts` (que já dispara pra Supabase + Meta Pixel + GTM).
 */

type Payload = Record<string, unknown>;

export function trackOnboardingStepShown(stepId: string, extra?: Payload) {
  if (import.meta.env.DEV) {
    console.debug("[onboarding] step shown", stepId, extra);
  }
}

export function trackOnboardingCompleted(extra?: Payload) {
  if (import.meta.env.DEV) {
    console.debug("[onboarding] completed", extra);
  }
}
