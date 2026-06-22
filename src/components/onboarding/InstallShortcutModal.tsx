import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Step3Shortcut } from "@/components/onboarding/steps/Step3Shortcut";

/**
 * Modal disparado pelo botão "App" no header. Mostra exatamente o mesmo
 * conteúdo do passo de instalação do onboarding (Step3Shortcut: ilustração do
 * celular + botão "Añadir a la pantalla de inicio" + instruções iOS).
 *
 * O Step3Shortcut usa `useApplyCtaOverride`/`goNext` do cta-context, que tem
 * defaults no-op fora do onboarding — então renderiza sem problemas aqui.
 */
export function InstallShortcutModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="w-[96vw] max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-[#00FF87]/40 bg-[#060d1e] p-0 text-white"
      >
        <DialogTitle className="sr-only">Instalar la app</DialogTitle>
        <div className="py-4">
          <Step3Shortcut />
        </div>
      </DialogContent>
    </Dialog>
  );
}
