import { useCallback, useState } from "react";

/**
 * Estado local do onboarding (passo atual + helpers).
 * Mantido em um hook isolado pra simplificar testes e o plug-in no app prod.
 */
export function useOnboardingState(total: number) {
  const [step, setStep] = useState(1);

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
