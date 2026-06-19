import { Step1Summary } from "@/components/onboarding/steps/Step1Summary";
import { Step2Video } from "@/components/onboarding/steps/Step2Video";
import { Step3Shortcut } from "@/components/onboarding/steps/Step3Shortcut";
import { Step4Activate } from "@/components/onboarding/steps/Step4Activate";
import { Step5Confirm } from "@/components/onboarding/steps/Step5Confirm";
import type { OnboardingStep } from "@/components/onboarding/types";
import { mockGetOnboardingUser } from "@/mocks/user";

/**
 * STEPS DEL ONBOARDING — registro central.
 *
 * 1. Resumen del onboarding       (full-screen)
 * 2. Video de bienvenida          (full-screen)
 * 3. Acceso directo en el celular (full-screen)
 * 4. Cómo activar la cuenta       (full-screen)
 * 5. Confirmación final           (POPUP)
 *
 * Cada step nuevo es un archivo en `components/onboarding/steps/`.
 * Aquí solo registramos `id`, `title`, `presentation` y `render`.
 */

const SUMMARY_ITEMS = [
  {
    num: 2,
    title: "Tour de la app",
    hint: "En 1 minuto ves todo lo que compraste.",
  },
  {
    num: 3,
    title: "Acceso desde tu celular",
    hint: "CLSCORE listo, a un toque en tu celular.",
  },
  {
    num: 4,
    title: "Activación de tu acceso",
    hint: "Un detalle rápido para desbloquear todo.",
  },
  {
    num: 5,
    title: "Listo para usar",
    hint: "Sales de aquí usando la app al tiro.",
  },
];

export const STEPS: OnboardingStep[] = [
  {
    id: "summary",
    title: "Resumen del onboarding",
    presentation: "fullscreen",
    ctaLabel: "Empezar",
    render: () => (
      <Step1Summary
        firstName={mockGetOnboardingUser().firstName}
        items={SUMMARY_ITEMS}
      />
    ),
  },
  {
    id: "video-features",
    title: "Video de bienvenida",
    presentation: "fullscreen",
    // Sin ctaLabel — quien manda es el `useApplyCtaOverride` adentro del Step2Video.
    render: () => (
      <Step2Video
        // videoId="vid-XXXXXXXX"  ← el operador conecta acá después
        simulateSeconds={30}
      />
    ),
  },
  {
    id: "shortcut",
    title: "Acceso directo en el celular",
    presentation: "fullscreen",
    // ctaLabel definido dinámicamente por el Step3 vía useApplyCtaOverride.
    render: () => <Step3Shortcut />,
  },
  {
    id: "activate-explainer",
    title: "Cómo activar y empezar",
    presentation: "fullscreen",
    // Sin ctaLabel — quien manda es el `useApplyCtaOverride` adentro del Step4.
    render: () => (
      <Step4Activate
        // videoId="vid-XXXXXXXX"  ← el operador conecta el video del vTurb acá
        simulateSeconds={22}
      />
    ),
  },
  {
    id: "confirm",
    title: "Listo para empezar",
    presentation: "popup",
    render: () => <Step5Confirm />,
  },
];

/** Label del CTA final. */
export const FINAL_CTA_LABEL = "Activar en Telegram";
