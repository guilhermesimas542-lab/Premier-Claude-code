import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Anchor, Gift, Clock, HelpCircle, BarChart3 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type SpecialCardType = "ALAVANCAGEM" | "ODDS_ALTAS";

interface SpecialBettingCardProps {
  tipId: number;
  type: SpecialCardType;
  market: string;
  betChoice: string;
  odds: number;
  matchDate?: string;
  expirationDate?: string;
  isLocked?: boolean;
  isExpired?: boolean;
  onAddTip?: () => void;
}

// Helper function to format countdown
const formatCountdown = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "00:00:00";
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

// Get card config based on type
const getCardConfig = (type: SpecialCardType) => {
  if (type === "ALAVANCAGEM") {
    return {
      icon: Anchor,
      title: "Alavancagem",
      subtitle: "Sequência do dia",
      bgColor: "bg-gradient-to-r from-teal-600 to-emerald-700",
      textColor: "text-white",
      glowColor: "shadow-[0_0_25px_rgba(20,184,166,0.5)]",
      borderColor: "border-teal-500/50",
      iconBg: "bg-teal-500/30",
      iconColor: "text-teal-300",
    };
  }
  // ODDS_ALTAS
  return {
    icon: Gift,
    title: "Odds Altas",
    subtitle: "Seleções especiais",
    bgColor: "bg-gradient-to-r from-amber-600 to-orange-700",
    textColor: "text-white",
    glowColor: "shadow-[0_0_25px_rgba(245,158,11,0.5)]",
    borderColor: "border-amber-500/50",
    iconBg: "bg-amber-500/30",
    iconColor: "text-amber-300",
  };
};

export const SpecialBettingCard = ({
  tipId,
  type,
  market,
  betChoice,
  odds,
  matchDate,
  expirationDate,
  isLocked = false,
  isExpired: isExpiredProp = false,
  onAddTip,
}: SpecialBettingCardProps) => {
  const [showHelp, setShowHelp] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const config = getCardConfig(type);
  const IconComponent = config.icon;
  const isExpired = isExpiredProp || isExpiredLocal;

  // Countdown timer effect
  useEffect(() => {
    if (!expirationDate || isExpiredProp) return;

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expireAt = new Date(expirationDate).getTime();
      const diff = Math.floor((expireAt - now) / 1000);
      return diff;
    };

    const initialRemaining = calculateRemaining();
    if (initialRemaining <= 0) {
      setIsExpiredLocal(true);
      setCountdown("00:00:00");
      return;
    }
    setCountdown(formatCountdown(initialRemaining));

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      if (remaining <= 0) {
        setIsExpiredLocal(true);
        setCountdown("00:00:00");
        clearInterval(interval);
      } else {
        setCountdown(formatCountdown(remaining));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expirationDate, isExpiredProp]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Card
      className={`w-full overflow-hidden select-none relative rounded-2xl border-2 transition-all duration-300 flex flex-col aspect-[3/4] max-h-[480px] ${
        isExpired 
          ? "border-gray-600/50 shadow-none grayscale-[60%]" 
          : `${config.borderColor} ${config.glowColor} hover:scale-[1.02]`
      }`}
    >
      {/* Stadium Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/futsal-arena.jpg')`,
        }}
      />
      
      {/* Dark Overlay with gradient based on type */}
      <div className={`absolute inset-0 ${
        isExpired 
          ? "bg-gradient-to-b from-gray-900/70 via-gray-900/80 to-gray-900/90" 
          : type === "ALAVANCAGEM"
            ? "bg-gradient-to-b from-teal-900/60 via-black/60 to-black/80"
            : "bg-gradient-to-b from-amber-900/60 via-black/60 to-black/80"
      }`} />
      
      {/* Locked Overlay */}
      {isLocked && !isExpired && (
        <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm" />
      )}

      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col flex-1">
        
        {/* Header Section */}
        <div className="h-12 flex items-center justify-center relative mb-1">
          {/* Timer - Top Left Corner */}
          {!isExpired && countdown && (
            <div className="absolute top-0 left-0 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
              <Clock className="w-3 h-3 text-white/70" />
              <span className="text-[10px] text-white/90 font-medium tabular-nums">
                {countdown}
              </span>
            </div>
          )}

          {/* Type Badge - Centered */}
          {isExpired ? (
            <div className="bg-gray-600 text-gray-300 px-5 py-1 rounded-full font-bold text-xs tracking-wide shadow-lg">
              EXPIRADA
            </div>
          ) : (
            <div className={`${config.bgColor} ${config.textColor} px-5 py-1 rounded-full font-bold text-xs tracking-wide shadow-lg`}>
              {type === "ALAVANCAGEM" ? "ALAVANCAGEM" : "ODDS ALTAS"}
            </div>
          )}
        </div>

        {/* Match Date */}
        <div className="h-5 flex items-center justify-center">
          {matchDate && (
            <p className={`text-[11px] font-medium ${isExpired ? "text-gray-400" : "text-white/80"}`}>
              {matchDate}
            </p>
          )}
        </div>

        {/* Special Icon Section (replaces teams) */}
        <div className="h-24 flex flex-col items-center justify-center gap-2 w-full">
          <div className={`w-16 h-16 rounded-full ${config.iconBg} backdrop-blur-sm flex items-center justify-center ring-2 shadow-lg ${
            isExpired ? "ring-gray-600/30" : "ring-white/20"
          }`}>
            <IconComponent className={`w-8 h-8 ${isExpired ? "text-gray-500" : config.iconColor}`} />
          </div>
          <div className="text-center">
            <h3 className={`text-lg font-bold ${isExpired ? "text-gray-400" : "text-white"}`}>
              {config.title}
            </h3>
            <p className={`text-[10px] ${isExpired ? "text-gray-500" : "text-white/60"}`}>
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Market Name */}
        <div className="h-10 flex items-center justify-center">
          <div className={`px-3 py-1.5 rounded-lg backdrop-blur-sm border ${
            isExpired 
              ? "bg-gray-800/60 border-gray-600/30" 
              : "bg-black/60 border-white/10"
          }`}>
            <p className={`text-xs font-semibold line-clamp-1 ${isExpired ? "text-gray-400" : "text-white"}`}>
              {market}
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-7" />

        {/* Bet Details Row */}
        <div className={`h-14 w-full backdrop-blur-sm rounded-xl px-4 flex items-center justify-between ${
          isExpired 
            ? "bg-gray-800/50" 
            : "bg-black/50"
        }`}>
          <span className={`font-bold text-sm line-clamp-1 ${isExpired ? "text-gray-500" : "text-emerald-400"}`}>
            {betChoice}
          </span>
          <span className={`font-black text-lg ${isExpired ? "text-gray-500" : "text-white"}`}>
            {odds.toFixed(1)}
          </span>
        </div>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1 min-h-3" />

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 w-full mt-auto">
          {/* Main Add Button */}
          <Button
            onClick={isExpired ? undefined : onAddTip}
            disabled={isExpired}
            className={`flex-1 font-bold py-4 text-sm shadow-lg transition-all duration-300 ${
              isExpired 
                ? "bg-gray-600 text-gray-400 cursor-not-allowed shadow-none" 
                : isLocked 
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/40 hover:scale-[1.03]" 
                  : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/40 hover:scale-[1.03]"
            }`}
          >
            <span className="font-extrabold text-xs">
              {isExpired ? "Expirada" : isLocked ? "🔒 Desbloquear" : "Adicionar"}
            </span>
          </Button>

          {/* Help Icon Button */}
          <div className="relative" ref={helpRef}>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`w-12 h-12 rounded-xl backdrop-blur-sm border flex items-center justify-center transition-colors ${
                isExpired 
                  ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              }`}
              aria-label="Ajuda"
            >
              <HelpCircle className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>
            
            {showHelp && (
              <div className="absolute right-0 bottom-14 w-48 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 shadow-xl z-50">
                <p className="text-[11px] text-white/90 leading-relaxed">
                  {type === "ALAVANCAGEM" 
                    ? "Sequência especial para alavancar sua banca. Siga todas as entradas na ordem."
                    : "Seleções com odds elevadas para maior retorno. Maior risco, maior recompensa."
                  }
                </p>
              </div>
            )}
          </div>

          {/* Stats Icon Button */}
          <button
            className={`w-12 h-12 rounded-xl backdrop-blur-sm border flex items-center justify-center transition-colors ${
              isExpired 
                ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                : "bg-white/10 border-white/20 hover:bg-white/20"
            }`}
            aria-label="Estatísticas"
          >
            <BarChart3 className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
          </button>
        </div>
      </div>
    </Card>
  );
};
