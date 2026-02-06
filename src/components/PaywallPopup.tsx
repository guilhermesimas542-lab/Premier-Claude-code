import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Gift } from 'lucide-react';
import { shouldShowPaywall, getCheckoutUrl, dismissPaywall } from '@/lib/api';

interface PaywallPopupProps {
  onContinueFree?: () => void;
}

export function PaywallPopup({ onContinueFree }: PaywallPopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Verificar se deve mostrar o paywall
    if (shouldShowPaywall()) {
      setOpen(true);
    }
  }, []);

  const handleBuyClick = () => {
    const checkoutUrl = getCheckoutUrl();
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
  };

  const handleContinueFree = () => {
    dismissPaywall();
    setOpen(false);
    onContinueFree?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-gradient-to-br from-[#121826] to-[#0C0F14] border-purple-500/30 max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-white text-xl font-bold">
            Desbloqueie todo o potencial!
          </DialogTitle>
          <DialogDescription className="text-white/70 mt-2">
            Você está usando a versão gratuita. Atualize agora e tenha acesso a:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
            <Zap className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="text-white/90 text-sm">Entradas exclusivas Pro e Ultra</span>
          </div>
          <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
            <Gift className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="text-white/90 text-sm">Análises aprofundadas de IA</span>
          </div>
          <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
            <Crown className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="text-white/90 text-sm">Suporte prioritário via Telegram</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleBuyClick}
            className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-700 text-white font-bold py-6 text-base shadow-xl shadow-emerald-500/30"
          >
            Assinar agora
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleContinueFree}
            className="w-full text-white/60 hover:text-white/80 hover:bg-white/5"
          >
            Continuar no plano gratuito
          </Button>
        </div>

        <p className="text-center text-white/40 text-xs pt-2">
          Cancele a qualquer momento • Satisfação garantida
        </p>
      </DialogContent>
    </Dialog>
  );
}
