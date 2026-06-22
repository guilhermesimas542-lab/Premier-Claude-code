import { useEffect, useState } from "react";

const LS_KEY = "premier_onboarding_completed_v1";

/**
 * Decide se o onboarding deve abrir no primeiro acesso do lead.
 *
 * Mock-first: lê/escreve em localStorage. Quando integrar no app prod, trocar
 * por uma chamada que checa um flag no Supabase (ex: `users.onboarding_seen_at`)
 * e dispara o equivalente em update — mantendo a mesma assinatura.
 */
export function useFirstAccessGate() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(LS_KEY) === "1";
    setOpen(!seen);
    setHydrated(true);
  }, []);

  const markCompleted = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, "1");
    setOpen(false);
  };

  const reset = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LS_KEY);
    setOpen(true);
  };

  return { open, hydrated, markCompleted, reset };
}
