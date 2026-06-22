# `components/onboarding/` — entregável

Este diretório é o **único entregável real** deste projeto.
Tudo que estiver aqui é copy-paste-ready pro app de produção (`ultrateste111`).

## Como plugar no app prod

1. Copiar este diretório inteiro pra `src/components/onboarding/` no app prod.
2. Copiar `src/data/steps.ts` (e dependências de copy) pra `src/data/`.
3. No `Home.tsx` (ou onde fizer sentido bloquear o primeiro acesso), montar:

   ```tsx
   import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
   import { useFirstAccessGate } from "@/components/onboarding/hooks/useFirstAccessGate";
   import { STEPS, FINAL_CTA_LABEL } from "@/data/steps";

   const gate = useFirstAccessGate();
   const user = useCurrentUser(); // já existe no app prod

   <OnboardingModal
     open={gate.open}
     steps={STEPS}
     user={{
       firstName: user.firstName,
       telegramUrl: buildTelegramUrl(user.id, user.house),
     }}
     finalLabel={FINAL_CTA_LABEL}
     onComplete={() => {
       gate.markCompleted();
       window.open(telegramUrl, "_blank");
     }}
   />
   ```

4. Substituir `useFirstAccessGate` (que hoje usa `localStorage`) por uma versão
   que checa o flag de onboarding em Supabase — mantendo a mesma assinatura.

## Por que essa forma

- **Modal forçado** (sem X) — espelha o padrão de `IATipsterOnboardingModal`,
  que já é usado no app pra anúncios bloqueantes. Lead só sai ativando.
- **Steps em `data/steps.ts`** — separa copy/ordem da UI. Operador edita texto
  sem mexer em JSX.
- **`OnboardingUser` minúsculo** — o componente não conhece Supabase nem URL
  de Telegram. Quem monta passa pronto.

## O que ainda não está aqui

- Steps reais (Telegram, Diamante, features) — esperando a reformulação fina
  com o operador.
- Personalização nominal (`[Nome], você já está logado`) — vai entrar quando
  os steps existirem.
- Analytics (`trackOnboardingStepShown`, `trackOnboardingCompleted`) — vamos
  reaproveitar `lib/events.ts` do app prod no momento de plugar.
