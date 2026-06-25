import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { ActivationGateModal } from "./ActivationGateModal";
import { useActivationGate } from "./hooks/useActivationGate";

/**
 * Gate de ativação — versão "soft".
 *
 * Diferente do hard gate anterior: o app é renderizado normalmente mesmo
 * com a trava ativa. As funcionalidades é que checam `isLocked` e chamam
 * `requestActivation()` pra abrir o popup de ativação (com X pra fechar).
 *
 * Uso típico em qualquer feature gated:
 *
 *   const { isLocked, requestActivation } = useActivationLock();
 *   const handleClick = () => {
 *     if (isLocked) { requestActivation(); return; }
 *     // ...acao real
 *   };
 *
 * `telegramUrl` entra por prop — nada hardcoded aqui.
 */

interface ActivationLockContextValue {
  /** True enquanto a trava de 10min após o onboarding ainda corre. */
  isLocked: boolean;
  /** Abre o popup de "ative sua conta no Telegram" (apenas se isLocked). */
  requestActivation: () => void;
}

const ActivationLockContext = createContext<ActivationLockContextValue>({
  isLocked: false,
  requestActivation: () => {},
});

export function ActivationGateProvider({
  telegramUrl,
  children,
}: {
  telegramUrl: string;
  children: ReactNode;
}) {
  const { isLocked } = useActivationGate();
  const [modalOpen, setModalOpen] = useState(false);

  const requestActivation = useCallback(() => {
    if (isLocked) setModalOpen(true);
  }, [isLocked]);

  const value = useMemo<ActivationLockContextValue>(
    () => ({ isLocked, requestActivation }),
    [isLocked, requestActivation],
  );

  return (
    <ActivationLockContext.Provider value={value}>
      {children}
      {/* Modal renderizado sempre, controlado por estado local. Só abre via
          requestActivation() (que respeita o isLocked). */}
      <ActivationGateModal
        open={modalOpen}
        telegramUrl={telegramUrl}
        onClose={() => setModalOpen(false)}
      />
    </ActivationLockContext.Provider>
  );
}

/**
 * Hook pra features consumirem a trava: retorna `isLocked` (status atual)
 * e `requestActivation()` (abre o popup). Use no onClick de qualquer ação
 * que precise da conta ativada (gerar tip IA, abrir tipster premium, etc).
 */
export function useActivationLock() {
  return useContext(ActivationLockContext);
}
