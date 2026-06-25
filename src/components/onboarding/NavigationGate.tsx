import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useActivationLock } from "./ActivationGateProvider";

/**
 * Lista de rotas que exigem conta ativada. Quando o lead navega pra uma
 * dessas com `isLocked=true`, o popup de ativação aparece e a navegação
 * é revertida pra rota anterior (ou pra "/" se for a primeira).
 *
 * Rotas livres (login, onboarding, support, obrigado, política, admin, /)
 * continuam acessíveis sem trigger.
 */
const GATED_PREFIXES = [
  "/sport",
  "/alavancagem",
  "/odds-altas",
  "/ultimos-greens",
  "/ia-tipster",
  "/ia-tipster-preview",
];

function isGatedPath(pathname: string): boolean {
  return GATED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Componente montado dentro do BrowserRouter (precisa do contexto do router).
 * Observa `location.pathname` — se mudar pra uma rota gated com o lead em
 * trava, dispara o popup e volta pra rota anterior.
 *
 * Sem renderizar nada (efeito puro).
 */
export function NavigationGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLocked, requestActivation } = useActivationLock();
  const prevPathRef = useRef<string>(location.pathname);

  useEffect(() => {
    const current = location.pathname;
    if (isLocked && isGatedPath(current)) {
      requestActivation();
      // Volta pra rota anterior se for diferente; senão pro home.
      const fallback = prevPathRef.current !== current ? prevPathRef.current : "/";
      navigate(fallback, { replace: true });
      return;
    }
    prevPathRef.current = current;
  }, [location.pathname, isLocked, requestActivation, navigate]);

  return null;
}
