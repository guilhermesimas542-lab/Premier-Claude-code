import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface TelegramAlertProps {
  telegramUrl: string | null;
}

export const TelegramAlert = ({ telegramUrl }: TelegramAlertProps) => {
  const handleClick = () => {
    const scrollToBottom = () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    };
    scrollToBottom();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#000636] via-[#001B70] to-[#000636] border-2 border-[#00D4FF] p-6 shadow-2xl shadow-[#00D4FF]/30 animate-fade-in">
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
            <div className="absolute inset-0 bg-[#00D4FF] blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-[#005CFF] to-[#00D4FF] p-3 rounded-xl">
              <svg 
                viewBox="0 0 24 24" 
                className="w-6 h-6 text-white animate-pulse" 
                fill="currentColor"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L9.1 13.617l-2.97-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
              Nossos analistas estão enviando entradas AO VIVO dos jogos!
            </h3>
            <p className="text-sm text-[#00D4FF] font-semibold">
              Entre no grupo vip e aproveite!
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => telegramUrl && window.open(telegramUrl, "_blank")}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 bg-gradient-to-r from-[#00D4FF] via-[#00E0FF] to-[#00D4FF] hover:from-[#00E0FF] hover:via-[#00F0FF] hover:to-[#00E0FF] text-black font-black px-8 py-6 text-base shadow-xl shadow-[#00D4FF]/50 hover:shadow-[#00E0FF]/70 transition-all duration-300 border-0"
        >
          Clique Aqui
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF]/20 via-[#005CFF]/20 to-[#00D4FF]/20 blur-2xl -z-10 animate-pulse"></div>
    </div>
  );
};
