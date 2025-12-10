import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Flame, Clock, X } from 'lucide-react';
import { getStoredConfig } from '@/lib/auth';

interface BasicPlanModalProps {
  open: boolean;
  onClose: () => void;
}

const BasicPlanModal = ({ open, onClose }: BasicPlanModalProps) => {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const config = getStoredConfig();

  useEffect(() => {
    if (!open) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          return 15 * 60; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleActivate = () => {
    if (config?.checkout) {
      window.open(config.checkout, '_blank');
    }
    onClose();
  };

  const benefits = [
    'Sinais ocultos revelados',
    'Entradas exclusivas todos os dias',
    'Prioridade nas análises',
    'Suporte Premier',
    'Resultados em até 24h',
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none overflow-hidden">
        <div className="relative bg-gradient-to-br from-[#0B0B0B] via-[#0D1117] to-[#0B0B0B] rounded-[22px] p-6 md:p-8 border border-white/10 shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Premium card */}
          <div className="bg-white rounded-[18px] p-6 md:p-7 shadow-xl">
            {/* Title */}
            <h2 className="text-[#111111] text-xl md:text-2xl font-bold leading-tight mb-3 text-center">
              DESBLOQUEIE HOJE OS SINAIS OCULTOS DO PREMIER
            </h2>

            {/* Subtitle */}
            <p className="text-[#333333] text-sm md:text-base text-center mb-6 leading-relaxed">
              Comece a receber as entradas que o plano gratuito não libera.
            </p>

            {/* Plan badge */}
            <div className="bg-gradient-to-r from-[#00FF7F]/10 to-[#00FF7F]/5 border border-[#00FF7F]/30 rounded-xl p-4 mb-6">
              <h3 className="text-[#111111] font-bold text-lg mb-3 text-center">
                PLANO BASIC — Acesso Imediato
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
                <span className="text-[#FF3B30] font-bold text-base">OFERTA ATIVA: -45%</span>
              </div>
              
              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#FF3B30]" />
                <span className="text-[#333333] text-sm">Expira em:</span>
                <span className="text-[#FF3B30] font-mono font-bold text-xl animate-pulse">
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <p className="text-[#666666] text-xs text-center">
                Após o tempo expirar, o valor pode voltar ao normal conforme a demanda do dia.
              </p>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleActivate}
              className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-bold text-base rounded-xl shadow-lg shadow-[#007AFF]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#007AFF]/40 hover:scale-[1.02]"
            >
              ATIVAR PLANO BASIC AGORA →
            </Button>

            {/* Social proof */}
            <p className="text-[#666666] text-xs text-center mt-4">
              +18.000 usuários ativaram hoje.
            </p>
          </div>

          {/* Micro-frame */}
          <p className="text-white/70 text-xs text-center mt-4 px-2 leading-relaxed">
            Você está literalmente a um clique de sair do "modo gratuito" e ver o que realmente faz o Premier entregar consistência.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BasicPlanModal;
