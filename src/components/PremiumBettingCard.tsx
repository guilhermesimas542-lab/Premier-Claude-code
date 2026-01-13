import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpCircle, Info, Link2, Clock, Layers } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface PremiumBettingCardProps {
  tipId: number;
  tier: "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" | "ULTRA";
  tierSubtitle?: string;
  team1: {
    name: string;
    logo: string;
  };
  team2: {
    name: string;
    logo: string;
  };
  market: string;
  betChoice: string;
  odds: number;
  matchDate?: string;
  expirationDate?: string; // ISO date string for countdown
  selectionsCount?: number; // Number of selections for multiple bets
  insights?: string;
  footer?: string;
  lineAlert?: boolean;
  isLocked?: boolean;
  isExpired?: boolean;
  onAddTip?: () => void;
  onViewAnalysis?: () => void;
}

// Helper function to generate market explanation
const getMarketExplanation = (market: string): string => {
  const marketLower = market.toLowerCase();
  
  if (marketLower.includes("total de gols")) {
    return "Total de gols = soma dos gols dos dois times.";
  }
  if (marketLower.includes("escanteios")) {
    return "Escanteios = total de escanteios dos dois times.";
  }
  if (marketLower.includes("ambas marcam")) {
    return "Ambas marcam = os dois times precisam fazer gol.";
  }
  if (marketLower.includes("resultado final")) {
    return "Resultado final = quem vence ou se empata.";
  }
  if (marketLower.includes("handicap")) {
    return "Handicap = vantagem/desvantagem aplicada ao placar.";
  }
  if (marketLower.includes("cartões")) {
    return "Cartões = total de cartões mostrados no jogo.";
  }
  
  return "Esse é o tipo de mercado da aposta.";
};

// Helper function to generate bet explanation
const getBetExplanation = (betChoice: string): string => {
  const betLower = betChoice.toLowerCase();
  
  // Match "Mais de X.X" pattern
  const maisDeMatch = betLower.match(/mais de\s*(\d+[.,]?\d*)/);
  if (maisDeMatch) {
    const value = parseFloat(maisDeMatch[1].replace(",", "."));
    const needed = Math.ceil(value);
    return `Precisa sair ${needed} ou mais para bater.`;
  }
  
  // Match "Menos de X.X" pattern  
  const menosDeMatch = betLower.match(/menos de\s*(\d+[.,]?\d*)/);
  if (menosDeMatch) {
    const value = parseFloat(menosDeMatch[1].replace(",", "."));
    const max = Math.floor(value);
    return `Precisa ter no máximo ${max} para bater.`;
  }
  
  // Match "Sim" or "Não"
  if (betLower === "sim") {
    return "A condição do mercado precisa acontecer.";
  }
  if (betLower === "não") {
    return "A condição do mercado NÃO pode acontecer.";
  }
  
  return "O jogo precisa seguir exatamente essa condição.";
};

// Helper function to format countdown
const formatCountdown = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "00:00:00";
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

// Get tier styling configuration
const getTierConfig = (tier: string) => {
  switch (tier) {
    case "ULTRA":
      return {
        bgColor: "bg-[#9333EA]",
        textColor: "text-white",
        glowColor: "shadow-[0_0_30px_rgba(147,51,234,0.6)]",
        borderColor: "border-purple-500/60",
        iconColor: "text-purple-400",
        iconBorderColor: "border-purple-500/50",
      };
    case "PRO":
      return {
        bgColor: "bg-gradient-to-r from-orange-500 to-orange-600",
        textColor: "text-white",
        glowColor: "shadow-[0_0_20px_rgba(249,115,22,0.5)]",
        borderColor: "border-orange-500/50",
        iconColor: "text-orange-400",
        iconBorderColor: "border-orange-500/50",
      };
    case "GRÁTIS":
      return {
        bgColor: "bg-gradient-to-r from-cyan-500 to-cyan-600",
        textColor: "text-white",
        glowColor: "shadow-[0_0_20px_rgba(34,211,238,0.4)]",
        borderColor: "border-cyan-500/40",
        iconColor: "text-cyan-400",
        iconBorderColor: "border-cyan-500/50",
      };
    case "MÚLTIPLA":
      return {
        bgColor: "bg-gradient-to-r from-purple-600 to-purple-700",
        textColor: "text-white",
        glowColor: "shadow-[0_0_20px_rgba(147,51,234,0.5)]",
        borderColor: "border-purple-500/50",
        iconColor: "text-purple-400",
        iconBorderColor: "border-purple-500/50",
      };
    default: // BÁSICO
      return {
        bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        textColor: "text-white",
        glowColor: "shadow-[0_0_20px_rgba(16,185,129,0.5)]",
        borderColor: "border-emerald-500/50",
        iconColor: "text-emerald-400",
        iconBorderColor: "border-emerald-500/50",
      };
  }
};

export const PremiumBettingCard = ({
  tipId,
  tier,
  team1,
  team2,
  market,
  betChoice,
  odds,
  matchDate,
  expirationDate,
  selectionsCount,
  isLocked = false,
  isExpired: isExpiredProp = false,
  onAddTip,
}: PremiumBettingCardProps) => {
  const [showMarketHelp, setShowMarketHelp] = useState(false);
  const [showBetHelp, setShowBetHelp] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState(false);
  const marketHelpRef = useRef<HTMLDivElement>(null);
  const betHelpRef = useRef<HTMLDivElement>(null);

  const config = getTierConfig(tier);
  const marketExplanation = getMarketExplanation(market);
  const betExplanation = getBetExplanation(betChoice);
  
  // Combine prop expired with local expired state
  const isExpired = isExpiredProp || isExpiredLocal;
  
  // Detect if it's a multiple bet
  const isMultiple = tier === "MÚLTIPLA" || (selectionsCount && selectionsCount > 1);

  // Countdown timer effect
  useEffect(() => {
    if (!expirationDate || isExpiredProp) return;

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expireAt = new Date(expirationDate).getTime();
      const diff = Math.floor((expireAt - now) / 1000);
      return diff;
    };

    // Initial calculation
    const initialRemaining = calculateRemaining();
    if (initialRemaining <= 0) {
      setIsExpiredLocal(true);
      setCountdown("00:00:00");
      return;
    }
    setCountdown(formatCountdown(initialRemaining));

    // Update every second
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

  // Close tooltips when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (marketHelpRef.current && !marketHelpRef.current.contains(event.target as Node)) {
        setShowMarketHelp(false);
      }
      if (betHelpRef.current && !betHelpRef.current.contains(event.target as Node)) {
        setShowBetHelp(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Card
      className={`w-full overflow-hidden select-none relative rounded-2xl border-2 transition-all duration-300 ${
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
      
      {/* Dark Overlay for readability */}
      <div className={`absolute inset-0 ${
        isExpired 
          ? "bg-gradient-to-b from-gray-900/70 via-gray-900/80 to-gray-900/90" 
          : "bg-gradient-to-b from-black/40 via-black/50 to-black/80"
      }`} />
      
      {/* Expired Chain Pattern Overlay */}
      {isExpired && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <Link2 className="w-20 h-20 text-gray-500/20 rotate-45" />
        </div>
      )}
      
      {/* Locked Overlay */}
      {isLocked && !isExpired && (
        <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm" />
      )}

      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col items-center">
        
        {/* Timer - Top Left Corner */}
        {!isExpired && countdown && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
            <Clock className="w-3 h-3 text-white/70" />
            <span className="text-[11px] text-white/90 font-medium tabular-nums">
              {countdown}
            </span>
          </div>
        )}

        {/* Tier Badge or Expired Badge - Centered Top */}
        {isExpired ? (
          <div className="bg-gray-600 text-gray-300 px-6 py-1.5 rounded-full font-bold text-sm tracking-wide shadow-lg mb-2">
            EXPIRADA
          </div>
        ) : (
          <div className={`${config.bgColor} ${config.textColor} px-6 py-1.5 rounded-full font-bold text-sm tracking-wide shadow-lg mb-2`}>
            {tier}
          </div>
        )}

        {/* Market Help Button - Top Right (colored by tier) */}
        <div className="absolute top-3 right-3" ref={marketHelpRef}>
          <button
            onClick={() => setShowMarketHelp(!showMarketHelp)}
            className={`w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm border ${
              isExpired ? "border-gray-500/50" : config.iconBorderColor
            } flex items-center justify-center hover:bg-black/60 transition-colors`}
            aria-label="Ajuda do mercado"
          >
            <Info className={`w-4 h-4 ${isExpired ? "text-gray-400" : config.iconColor}`} />
          </button>
          
          {/* Market Help Tooltip */}
          {showMarketHelp && (
            <div className="absolute right-0 top-9 w-48 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2.5 shadow-xl z-50">
              <p className="text-xs text-white/90 leading-relaxed">
                {marketExplanation}
              </p>
            </div>
          )}
        </div>

        {/* Match Date */}
        {matchDate && (
          <p className={`text-xs font-medium mb-3 ${isExpired ? "text-gray-400" : "text-white/80"}`}>
            {matchDate}
          </p>
        )}

        {/* Teams Section */}
        <div className="flex items-center justify-center gap-6 w-full mb-3">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-14 h-14 rounded-full backdrop-blur-sm flex items-center justify-center ring-2 shadow-lg ${
              isExpired ? "bg-gray-800/50 ring-gray-600/30" : "bg-white/10 ring-white/20"
            }`}>
              <img
                src={team1.logo}
                alt={team1.name}
                className={`w-10 h-10 object-contain ${isExpired ? "opacity-50" : ""}`}
              />
            </div>
            <span className={`text-[11px] font-semibold text-center max-w-[80px] leading-tight truncate ${
              isExpired ? "text-gray-400" : "text-white"
            }`}>
              {team1.name}
            </span>
          </div>

          {/* VS Separator - Hidden, implicit */}
          <div className="text-white/30 text-xs font-bold"></div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-14 h-14 rounded-full backdrop-blur-sm flex items-center justify-center ring-2 shadow-lg ${
              isExpired ? "bg-gray-800/50 ring-gray-600/30" : "bg-white/10 ring-white/20"
            }`}>
              <img
                src={team2.logo}
                alt={team2.name}
                className={`w-10 h-10 object-contain ${isExpired ? "opacity-50" : ""}`}
              />
            </div>
            <span className={`text-[11px] font-semibold text-center max-w-[80px] leading-tight truncate ${
              isExpired ? "text-gray-400" : "text-white"
            }`}>
              {team2.name}
            </span>
          </div>
        </div>

        {/* Market Name - Centered in Pill */}
        <div className={`px-4 py-2 rounded-xl backdrop-blur-sm border mb-3 ${
          isExpired 
            ? "bg-gray-800/60 border-gray-600/30" 
            : "bg-black/60 border-white/10"
        }`}>
          <p className={`text-sm font-semibold ${isExpired ? "text-gray-400" : "text-white"}`}>
            {market}
          </p>
        </div>

        {/* Multiple Bet Label */}
        {isMultiple && !isExpired && (
          <div className="flex items-center gap-1.5 bg-purple-500/20 backdrop-blur-sm px-3 py-1 rounded-lg border border-purple-500/30 mb-3">
            <Layers className="w-3 h-3 text-purple-400" />
            <span className="text-[11px] text-purple-300 font-medium">
              Bilhete pronto ({selectionsCount || 2} seleções)
            </span>
          </div>
        )}

        {/* Bet Details Row */}
        <div className={`w-full backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between mb-4 ${
          isExpired 
            ? "bg-gray-800/50" 
            : "bg-black/50"
        }`}>
          <span className={`font-bold text-base ${isExpired ? "text-gray-500" : "text-emerald-400"}`}>
            {betChoice}
          </span>
          <span className={`font-black text-xl ${isExpired ? "text-gray-500" : "text-white"}`}>
            {odds.toFixed(1)}
          </span>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3 w-full">
          {/* Add Button - Primary (dominates on mobile) */}
          <Button
            onClick={isExpired ? undefined : onAddTip}
            disabled={isExpired}
            className={`flex-1 font-bold py-5 text-sm shadow-lg transition-all duration-300 ${
              isExpired 
                ? "bg-gray-600 text-gray-400 cursor-not-allowed shadow-none" 
                : isLocked 
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/40 hover:scale-[1.03]" 
                  : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/40 hover:scale-[1.03]"
            }`}
          >
            <span className="font-extrabold">
              {isExpired ? "Expirada" : isLocked ? "🔒 Desbloquear" : "Adicionar"}
            </span>
          </Button>

          {/* "Como bater?" Help Button - Icon only on mobile, text on desktop */}
          <div className="relative" ref={betHelpRef}>
            <button
              onClick={() => setShowBetHelp(!showBetHelp)}
              className={`h-11 w-11 md:w-auto md:px-3 rounded-lg backdrop-blur-sm border flex items-center justify-center md:gap-1.5 transition-colors ${
                isExpired 
                  ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              }`}
            >
              <HelpCircle className={`w-5 h-5 md:w-4 md:h-4 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
              <span className={`hidden md:inline text-xs font-medium whitespace-nowrap ${
                isExpired ? "text-gray-500" : "text-white/90"
              }`}>
                Como bater?
              </span>
            </button>
            
            {/* Bet Help Tooltip */}
            {showBetHelp && (
              <div className="absolute right-0 bottom-14 w-52 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2.5 shadow-xl z-50">
                <p className="text-xs text-white/90 leading-relaxed">
                  <strong className="text-emerald-400">{betChoice}:</strong>{" "}
                  {betExplanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
