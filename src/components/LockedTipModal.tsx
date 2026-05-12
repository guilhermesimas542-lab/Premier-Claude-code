import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { getUnlockLink } from "@/lib/checkoutLinks";
import { trackEvent } from "@/lib/events";

interface LockedTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierLabel: string;
  tierRequired: string;
  addonRequired: string | null;
}

export function LockedTipModal({ isOpen, onClose, tierLabel, tierRequired, addonRequired }: LockedTipModalProps) {
  const unlockLink = getUnlockLink(tierRequired, addonRequired);

  const handleUpgrade = () => {
    trackEvent("upgrade_click", {
      target_plan: tierRequired,
      addon: addonRequired,
      screen: window.location.pathname,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1d24] border-white/10 text-white max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-yellow-400" />
          </div>
          <DialogTitle className="text-lg font-bold">Tip Bloqueado</DialogTitle>
          <DialogDescription className="text-white/70 text-sm">
            {addonRequired
              ? <>Este tip es exclusivo del add-on <span className="text-yellow-400 font-bold">{tierLabel}</span>. ¡Adquiérelo ya!</>
              : <>Este tip es exclusivo del plan <span className="text-yellow-400 font-bold">{tierLabel}</span>. ¡Adquiérelo ya!</>
            }
          </DialogDescription>
        </DialogHeader>
        <a
          href={unlockLink}
          id={`cta-checkout-locked-tip-${tierRequired}${addonRequired ? `-${addonRequired}` : ""}`}
          className="cta-checkout flex items-center justify-center w-full h-10 px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-400 text-black font-bold mt-2"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleUpgrade}
        >
          🔓 Desbloquear Plan {tierLabel}
        </a>
      </DialogContent>
    </Dialog>
  );
}
