import { AppMockShell } from "@/components/preview/AppMockShell";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useFirstAccessGate } from "@/components/onboarding/hooks/useFirstAccessGate";
import { mockGetOnboardingUser } from "@/mocks/user";
import { FINAL_CTA_LABEL, STEPS } from "@/data/steps";

/**
 * Harness de preview — não vai pro app prod.
 * Renderiza o mock visual da Home + o OnboardingModal por cima.
 * Tem um botão "Reabrir onboarding" pro caso de já ter completado uma vez
 * (o gate é via localStorage).
 */
export default function Preview() {
  const gate = useFirstAccessGate();
  const user = mockGetOnboardingUser();

  if (!gate.hydrated) return null;

  return (
    <AppMockShell>
      <OnboardingModal
        open={gate.open}
        steps={STEPS}
        user={user}
        finalLabel={FINAL_CTA_LABEL}
        // `onComplete` apenas encerra o onboarding (fecha o modal).
        // O Telegram é aberto pelo Step 5 ao clicar no botão de atendimento,
        // não quando o lead confirma "Sim, já chamei" no popup de saída.
        onComplete={gate.markCompleted}
      />

      {!gate.open && <ResetButton onClick={gate.reset} />}
    </AppMockShell>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 right-3 z-40 rounded-full border border-[#00FF87]/40 bg-[#112236] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#00FF87] shadow-lg"
    >
      Reabrir onboarding (dev)
    </button>
  );
}
