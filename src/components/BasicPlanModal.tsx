import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Flame, Clock } from 'lucide-react';
import { getStoredConfig } from '@/lib/auth';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface BasicPlanModalProps {
  open: boolean;
  onClose: () => void;
}

const MODAL_VIEW_KEY = 'basicPlanModalViews';
const MAX_VIEWS = 5;

const BasicPlanModal = ({ open, onClose }: BasicPlanModalProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 7, hours: 0, minutes: 0, seconds: 0 });
  const [canShow, setCanShow] = useState(true);
  const config = getStoredConfig();

  // Check if modal can be shown on mount
  useEffect(() => {
    const viewCount = parseInt(localStorage.getItem(MODAL_VIEW_KEY) || '0', 10);
    console.log('[BasicPlanModal] View count:', viewCount, '/ Max:', MAX_VIEWS);
    console.log('[BasicPlanModal] Can show:', viewCount < MAX_VIEWS);
    if (viewCount >= MAX_VIEWS) {
      setCanShow(false);
    }
  }, []);

  // Increment view count only when modal actually opens
  useEffect(() => {
    if (open && canShow) {
      const viewCount = parseInt(localStorage.getItem(MODAL_VIEW_KEY) || '0', 10);
      if (viewCount < MAX_VIEWS) {
        localStorage.setItem(MODAL_VIEW_KEY, String(viewCount + 1));
      }
    }
  }, [open, canShow]);

  // Countdown timer
  useEffect(() => {
    if (!open || !canShow) return;

    // Get or set expiration date (1 week from first view)
    const expirationKey = 'basicPlanModalExpiration';
    let expirationDate = localStorage.getItem(expirationKey);
    
    if (!expirationDate) {
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      expirationDate = oneWeekFromNow.toISOString();
      localStorage.setItem(expirationKey, expirationDate);
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiration = new Date(expirationDate!).getTime();
      const difference = expiration - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [open, canShow]);

  const formatTime = () => {
    const { days, hours, minutes, seconds } = timeLeft;
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleActivate = () => {
    if (config?.checkout) {
      window.open(config.checkout, '_blank');
    }
    onClose();
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const benefits = [
    'Señales ocultas reveladas',
    'Tips exclusivos todos los días',
    'Prioridad en los análisis',
    'Soporte Premier Ultra',
    'Resultados en hasta 24h',
  ];

  // Don't render if exceeded max views
  if (!canShow) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none overflow-hidden" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Oferta Plan Basic</DialogTitle>
        </VisuallyHidden>
        
        <div className="relative bg-gradient-to-br from-[#0B0B0B] via-[#0D1117] to-[#0B0B0B] rounded-[22px] p-6 md:p-8 border border-white/10 shadow-2xl">

          {/* Premium card */}
          <div className="bg-white rounded-[18px] p-6 md:p-7 shadow-xl">
            {/* Title */}
            <h2 className="text-[#111111] text-xl md:text-2xl font-bold leading-tight mb-3 text-center">
              DESBLOQUEA AHORA SEÑALES CON MÁS DE 97% DE ACIERTO
            </h2>

            {/* Subtitle */}
            <p className="text-[#333333] text-sm md:text-base text-center mb-6 leading-relaxed">
              Comienza a recibir los tips que el plan gratis no libera.
            </p>

            {/* Plan badge */}
            <div className="bg-gradient-to-r from-[#00FF7F]/10 to-[#00FF7F]/5 border border-[#00FF7F]/30 rounded-xl p-4 mb-6">
              <h3 className="text-[#111111] font-bold text-lg mb-3 text-center">
                PLAN BASIC — Acceso Inmediato
              </h3>
              
              {/* Benefits */}
              <div className="space-y-2.5">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#00FF7F] flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" strokeWidth={3} />
                    </div>
                    <span className="text-[#222222] text-sm font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgency block */}
            <div className="bg-gradient-to-r from-[#FF3B30]/10 to-[#FF3B30]/5 border border-[#FF3B30]/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-[#FF3B30]" />
                <span className="text-[#FF3B30] font-bold text-base">ÚLTIMA SEMANA: -67%</span>
              </div>
              
              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#FF3B30]" />
                <span className="text-[#333333] text-sm">Expira en:</span>
                <span className="text-[#FF3B30] font-mono font-bold text-xl animate-pulse">
                  {formatTime()}
                </span>
              </div>
              
              <p className="text-[#666666] text-xs text-center">
                Después de que el tiempo expire, el valor puede volver al normal según la demanda del día.
              </p>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleActivate}
              className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-bold text-base rounded-xl shadow-lg shadow-[#007AFF]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#007AFF]/40 hover:scale-[1.02]"
            >
              ACTIVAR PLAN BASIC AHORA →
            </Button>

            {/* Social proof */}
            <p className="text-[#666666] text-xs text-center mt-4">
              +18.000 usuarios activaron hoy.
            </p>
          </div>

          {/* Micro-frame */}
          <p className="text-white/70 text-xs text-center mt-4 px-2 leading-relaxed">
            Estás literalmente a un clic de salir del "modo gratis" y ver lo que realmente hace que Premier Ultra entregue consistencia.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BasicPlanModal;
