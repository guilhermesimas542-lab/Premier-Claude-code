import { useEffect, useRef, useState } from "react";

import {
  GATE_CHANGED_EVENT,
  computeIsLocked,
  getLockUntil,
} from "../gateStorage";

/** De quanto em quanto tempo re-checamos o relógio (silencioso). */
const POLL_MS = 1000;

/**
 * Decide se o app real deve ficar travado pela ativação.
 *
 * Expõe SÓ `{ isLocked }` — de propósito. O lead não pode saber quanto falta
 * (sem contador), então o tempo restante nunca sai daqui. Internamente um
 * `setInterval` re-checa o relógio e vira `isLocked=false` sozinho aos 10 min,
 * sem aviso/animação.
 *
 * Enquanto livre, não há polling. Quando a trava é armada (`startActivationGate`
 * dispara `GATE_CHANGED_EVENT`), o hook reavalia e inicia o polling. Sem
 * `lock_until` (leads de fora do funil) → nunca trava.
 */
export function useActivationGate(): { isLocked: boolean } {
  const [isLocked, setIsLocked] = useState(() =>
    computeIsLocked(getLockUntil(), Date.now()),
  );
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const stopPolling = () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Reavalia o relógio; liga o polling se travado, desliga se já livre.
    const evaluate = () => {
      const locked = computeIsLocked(getLockUntil(), Date.now());
      setIsLocked(locked);
      if (locked && intervalRef.current == null) {
        intervalRef.current = window.setInterval(evaluate, POLL_MS);
      } else if (!locked) {
        stopPolling();
      }
    };

    evaluate();

    // Trava armada/limpa na mesma aba (onComplete) ou em outra aba (storage).
    window.addEventListener(GATE_CHANGED_EVENT, evaluate);
    window.addEventListener("storage", evaluate);

    return () => {
      window.removeEventListener(GATE_CHANGED_EVENT, evaluate);
      window.removeEventListener("storage", evaluate);
      stopPolling();
    };
  }, []);

  return { isLocked };
}
