import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { getUnlockLink } from "@/lib/checkoutLinks";

interface LockedTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierLabel: string;
  tierRequired: string;
  addonRequired: string | null;
}

export function LockedTipModal({ isOpen, onClose, tierLabel, tierRequired, addonRequired }: LockedTipModalProps) {
  const handleUpgrade = () => {
    const link = getUnlockLink(tierRequired, addonRequired);
    window.open(link, "_blank");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1d24] border-white/10 text-white max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-yellow-400" />
          </div>
          <DialogTitle className="text-lg font-bold">Entrada Bloqueada</DialogTitle>
          <DialogDescription className="text-white/70 text-sm">
            {addonRequired 
              ? <>Esta entrada é exclusiva do add-on <span className="text-yellow-400 font-bold">{tierLabel}</span>. Adquira já!</>
              : <>Esta entrada é exclusiva do plano <span className="text-yellow-400 font-bold">{tierLabel}</span>. Adquira já!</>
            }
          </DialogDescription>
        </DialogHeader>
        <Button
          onClick={handleUpgrade}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold mt-2"
        >
          🔓 Desbloquear Plano {tierLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
