import { LOCK_DURATION_MS, setLock, setStoredTelegramUrl } from "./gateStorage";

/**
 * Arma a trava de ativação. Chamado no `onComplete` do passo 5 (Telegram).
 *
 * Crava `lock_until = agora + 10min` e persiste o `telegramUrl` em localStorage
 * pra ser lido pelo popup de ativação acionado de dentro do app (em qualquer
 * rota). A partir daí o `ActivationGateProvider` (envoltório global do app)
 * pode disparar o popup quando uma feature gated for clicada.
 *
 * `durationMs` é injetável só pra testes/flexibilidade — o default é a regra
 * de negócio (10 min).
 */
export function startActivationGate(
  telegramUrl: string,
  durationMs: number = LOCK_DURATION_MS,
): void {
  setStoredTelegramUrl(telegramUrl);
  setLock(Date.now() + durationMs);
}
