import { Button } from "@/components/ui/button";
import { Zap, ChevronRight } from "lucide-react";

interface BasicPlanAlertProps {
  checkoutUrl: string | null;
}

export const BasicPlanAlert = ({ checkoutUrl }: BasicPlanAlertProps) => {
  const handleClick = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#000636] via-[#001B70] to-[#000636] border-2 border-[#FFD700] p-6 shadow-2xl shadow-[#FFD700]/30 animate-fade-in">
      <div className="absolute inset-0 rounded-2xl border-glow"></div>
      
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
        <div className="particle particle-5"></div>
      </div>

      {/* Lightning Effect */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="lightning-effect"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#FFD700] blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-[#FFA500] to-[#FFD700] p-3 rounded-xl">
              <Zap className="w-6 h-6 text-black animate-pulse" fill="black" />
            </div>
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
              Nossos analistas da Premier Ultra estão enviando entradas exclusivas do Plano Básico!
            </h3>
            <p className="text-sm text-[#FFD700] font-semibold">
              Acesse nossas previsões automáticas e descubra as melhores oportunidades antes dos jogos começarem!
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleClick}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 bg-gradient-to-r from-[#FFA500] via-[#FFD700] to-[#FFA500] hover:from-[#FFD700] hover:via-[#FFE44D] hover:to-[#FFD700] text-black font-black px-8 py-6 text-base shadow-xl shadow-[#FFD700]/50 hover:shadow-[#FFE44D]/70 transition-all duration-300 border-0"
        >
          Ver Entradas
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD700]/20 via-[#FFA500]/20 to-[#FFD700]/20 blur-2xl -z-10 animate-pulse"></div>
    </div>
  );
};
