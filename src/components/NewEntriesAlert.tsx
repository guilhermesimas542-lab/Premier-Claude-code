import { Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface NewEntriesAlertProps {
  betSiteUrl?: string | null;
}

export const NewEntriesAlert = ({ betSiteUrl }: NewEntriesAlertProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#000636] via-[#001B70] to-[#000636] border-2 border-[#00FF7F] p-6 shadow-2xl shadow-[#00FF7F]/30 animate-fade-in hot-entry-alert">
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl border-glow" />
      
      {/* Background particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
        <div className="particle particle-5" />
      </div>

      {/* Lightning bolt animation on border */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="lightning-effect" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* Animated icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#00FF7F] blur-xl opacity-50 animate-pulse" />
            <div className="relative bg-gradient-to-br from-[#005CFF] to-[#00FF7F] p-3 rounded-xl">
              <Zap className="w-6 h-6 text-white animate-pulse" fill="white" />
            </div>
          </div>

          {/* Text content */}
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
              🎁 WELCOME10
            </h3>
            <p className="text-sm text-[#00FF7F] font-semibold">
              Cupom disponível que dobra seu depósito (200%), pegue antes que a casa tire do ar
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          onClick={() => navigate("/")}
          className="bg-gradient-to-r from-[#005CFF] via-[#0066FF] to-[#005CFF] hover:from-[#0066FF] hover:via-[#0080FF] hover:to-[#0066FF] text-white font-black px-8 py-6 text-base shadow-xl shadow-[#005CFF]/50 hover:shadow-[#0066FF]/70 transition-all duration-300 border-0"
        >
          Dobrar minha banca
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Pulsing glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00FF7F]/20 via-[#005CFF]/20 to-[#00FF7F]/20 blur-2xl -z-10 animate-pulse" />
    </div>
  );
};
