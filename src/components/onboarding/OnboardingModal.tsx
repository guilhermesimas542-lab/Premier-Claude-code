import { useCallback, useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { CtaProvider, type CtaOverride } from "./cta-context";
import { NavBar } from "./NavBar";
import { StepIndicator } from "./StepIndicator";
import { useOnboardingState } from "./hooks/useOnboardingState";
import type { OnboardingStep, OnboardingUser } from "./types";

interface Props {
  /** Controla se o modal está aberto — vem do `useFirstAccessGate`. */
  open: boolean;
  /** Lista de passos (importada de `data/steps.tsx`). */
  steps: OnboardingStep[];
  /** Lead corrente (nome + url Telegram já com trigger). */
  user: OnboardingUser;
  /** Disparado quando o lead completa todos os passos OU clica o CTA final. */
  onComplete: () => void;
  /** Label do CTA do último step. */
  finalLabel?: string;
}

/**
 * Shell do onboarding in-app.
 *
 * Padrão espelhado de `IATipsterOnboardingModal` (app prod):
 *  - Dialog sem botão X (fluxo forçado)
 *  - Paleta `#112236` + gold `#00FF87`
 *  - StepIndicator no topo, conteúdo no meio, NavBar embaixo
 *
 * Cada step declara `presentation`: `'fullscreen'` (default) ocupa o viewport
 * inteiro; `'popup'` volta a ser um modal centralizado tipo "OK, entendi".
 * Step 6 (confirmação final) usa popup; os outros são full-screen.
 *
 * Steps podem controlar o CTA via `useApplyCtaOverride` (label/disabled/progress).
 */
export function OnboardingModal({ open, steps, user, onComplete, finalLabel }: Props) {
  const { step, total, goNext, goPrev } = useOnboardingState(steps.length);
  const current = steps[step - 1];

  const [ctaOverride, setCtaOverride] = useState<CtaOverride>({});
  const resetCta = useCallback(() => setCtaOverride({}), []);

  // Não fazemos `setCtaOverride({})` no efeito de troca de step. Como effects
  // bottom-up rodam (filho primeiro, depois pai), esse reset chegava DEPOIS do
  // `useApplyCtaOverride` do step novo e apagava o override aplicado.
  // A limpeza correta vem da cleanup do hook no step anterior (no unmount).

  if (!current) return null;

  const isPopup = current.presentation === "popup";

  const contentClassName = isPopup
    ? [
        // Modal centralizado (volta ao default do Radix).
        "fixed left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]",
        "w-[92vw] max-w-sm max-h-[90vh]",
        "m-0 p-0 gap-0 rounded-2xl border border-[#00FF87]/40 shadow-2xl",
        "bg-[#112236] text-white",
        "flex flex-col overflow-hidden",
        "[&>button]:hidden",
      ].join(" ")
    : [
        // Full-screen — reset total de posição/tamanho.
        "fixed inset-0 left-0 top-0 translate-x-0 translate-y-0",
        "w-screen h-[100dvh] max-w-none max-h-none",
        "m-0 p-0 gap-0 border-0 rounded-none shadow-none",
        "bg-[#112236] text-white",
        "flex flex-col",
        "[&>button]:hidden",
      ].join(" ");

  const contentStyle = isPopup
    ? undefined
    : ({
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      } as const);

  return (
    <Dialog open={open} onOpenChange={() => { /* fluxo forçado */ }}>
      <DialogContent
        aria-describedby={undefined}
        className={contentClassName}
        style={contentStyle}
      >
        <CtaProvider
          override={ctaOverride}
          set={setCtaOverride}
          reset={resetCta}
          goNext={goNext}
          goPrev={goPrev}
          user={user}
          onComplete={onComplete}
        >
          <StepIndicator current={step} total={total} />

          {/* `key={step}` re-monta o wrapper em cada troca → anima a entrada
              do novo step. Fullscreen usa fade-scale sutil; popup usa pop-in
              springy pra entrada mais satisfatória. */}
          <div
            key={step}
            className={cn(
              isPopup
                ? "animate-popup-pop-in px-1"
                : "flex-1 overflow-y-auto animate-fade-in-scale",
            )}
          >
            {current.render()}
          </div>

          {/* Popup: step controla seus próprios CTAs (ex: botão Telegram). */}
          {!isPopup && (
            <NavBar
              step={step}
              total={total}
              onPrev={goPrev}
              onNext={goNext}
              onComplete={onComplete}
              nextLabel={current.ctaLabel}
              finalLabel={finalLabel}
            />
          )}
        </CtaProvider>
      </DialogContent>
    </Dialog>
  );
}
