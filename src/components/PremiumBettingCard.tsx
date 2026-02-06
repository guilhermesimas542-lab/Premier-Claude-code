import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpCircle, Info, Link2, Clock, Layers, BarChart3 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ShirtIcon } from "./ShirtIcon";

export interface ShirtConfig {
  variant: "solid" | "stripes";
  primaryColor: string;
  secondaryColor?: string;
}

export interface TeamWithShirt {
  name: string;
  logo?: string;
  shirt?: ShirtConfig;
}

interface PremiumBettingCardProps {
  tipId: number;
  tier: "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" | "ULTRA";
  tierSubtitle?: string;
  team1: TeamWithShirt;
  team2: TeamWithShirt;
  market: string;
  betChoice: string;
  odds: number;
  matchDate?: string;
  expirationDate?: string;
  selectionsCount?: number;
  insights?: string;
  footer?: string;
  lineAlert?: boolean;
  isLocked?: boolean;
  isExpired?: boolean;
  justificativa?: string;
  onAddTip?: () => void;
  onViewAnalysis?: () => void;
  onOpenJustificativa?: (texto: string) => void;
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
  
  const maisDeMatch = betLower.match(/mais de\s*(\d+[.,]?\d*)/);
  if (maisDeMatch) {
    const value = parseFloat(maisDeMatch[1].replace(",", "."));
    const needed = Math.ceil(value);
    return `Precisa sair ${needed} ou mais para bater.`;
  }
  
  const menosDeMatch = betLower.match(/menos de\s*(\d+[.,]?\d*)/);
  if (menosDeMatch) {
    const value = parseFloat(menosDeMatch[1].replace(",", "."));
    const max = Math.floor(value);
    return `Precisa ter no máximo ${max} para bater.`;
  }
  
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

// Get display tier - MÚLTIPLA maps to PRO (never show MÚLTIPLA as badge)
const getDisplayTier = (tier: string): "GRÁTIS" | "BÁSICO" | "PRO" | "ULTRA" => {
  if (tier === "MÚLTIPLA") return "PRO"; // Múltipla uses PRO styling
  if (tier === "ULTRA") return "ULTRA";
  if (tier === "PRO") return "PRO";
  if (tier === "GRÁTIS") return "GRÁTIS";
  return "BÁSICO";
};

// Get tier styling configuration (only 4 tiers now)
// Border colors per category (2px solid)
const getTierConfig = (tier: string) => {
  const displayTier = getDisplayTier(tier);
  
  switch (displayTier) {
    case "ULTRA":
      return {
        bgColor: "bg-[#9333EA]",
        textColor: "text-white",
        glowColor: "", // Removed glow
        borderColor: "border-[#A855F7]", // Roxo
        iconColor: "text-purple-400",
        iconBorderColor: "border-purple-500/50",
      };
    case "PRO":
      return {
        bgColor: "bg-gradient-to-r from-orange-500 to-orange-600",
        textColor: "text-white",
        glowColor: "", // Removed glow
        borderColor: "border-[#F59E0B]", // Amarelo/Laranja
        iconColor: "text-orange-400",
        iconBorderColor: "border-orange-500/50",
      };
    case "GRÁTIS":
      return {
        bgColor: "bg-gradient-to-r from-cyan-500 to-cyan-600",
        textColor: "text-white",
        glowColor: "", // Removed glow
        borderColor: "border-[#38BDF8]", // Azul claro/ciano
        iconColor: "text-cyan-400",
        iconBorderColor: "border-cyan-500/50",
      };
    default: // BÁSICO
      return {
        bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        textColor: "text-white",
        glowColor: "", // Removed glow
        borderColor: "border-[#22C55E]", // Verde
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
  justificativa,
  onAddTip,
  onOpenJustificativa,
}: PremiumBettingCardProps) => {
  const [showMarketHelp, setShowMarketHelp] = useState(false);
  const [showBetHelp, setShowBetHelp] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState(false);
  const marketHelpRef = useRef<HTMLDivElement>(null);
  const betHelpRef = useRef<HTMLDivElement>(null);

  // Get display tier (never MÚLTIPLA)
  const displayTier = getDisplayTier(tier);
  const config = getTierConfig(tier);
  const marketExplanation = getMarketExplanation(market);
  const betExplanation = getBetExplanation(betChoice);
  
  // Combine prop expired with local expired state
  const isExpired = isExpiredProp || isExpiredLocal;
  
  // Detect if it's a multiple bet (by selectionsCount or MÚLTIPLA tier or ULTRA tier)
  const isMultiple = tier === "MÚLTIPLA" || tier === "ULTRA" || (selectionsCount && selectionsCount > 1);
  
  // For ULTRA, always show at least 3 selections as fallback
  const displaySelectionsCount = selectionsCount || (tier === "ULTRA" ? 3 : 2);

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
      className={`w-full select-none relative rounded-xl border-2 transition-all duration-300 flex flex-col ${
        isExpired 
          ? "border-gray-600/50 shadow-none grayscale-[60%]" 
          : `${config.borderColor} hover:scale-[1.02]`
      }`}
      style={{
        aspectRatio: '332 / 213',
        minHeight: 0,
        overflow: 'visible', // Allow badge to float outside
      }}
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

      {/* Floating Tier Badge - OUTSIDE the card */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 z-50"
        style={{ top: '-14px' }}
      >
        {isExpired ? (
          <div 
            className="bg-gray-600 text-gray-200 rounded-full font-extrabold uppercase tracking-wide shadow-lg flex items-center justify-center"
            style={{ height: '30px', padding: '0 14px', fontSize: '13px', letterSpacing: '0.5px' }}
          >
            EXPIRADA
          </div>
        ) : (
          <div 
            className={`${config.bgColor} ${config.textColor} rounded-full font-extrabold uppercase tracking-wide shadow-lg flex items-center justify-center`}
            style={{ height: '30px', padding: '0 14px', fontSize: '13px', letterSpacing: '0.5px' }}
          >
            {displayTier}
          </div>
        )}
      </div>

      {/* Content - Improved legibility layout */}
      <div className="relative z-10 p-3 flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl">
        
        {/* Top Row - Timer (left), Info (right) - no badge here anymore */}
        <div className="relative h-7 mb-0.5">
          {/* Timer - Top Left Corner - SMALLER */}
          {!isExpired && countdown && (
            <div 
              className="absolute flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full z-40"
              style={{ top: '0px', left: '0px', height: '28px', padding: '0 10px' }}
            >
              <Clock className="w-3.5 h-3.5 text-white/80" />
              <span className="text-[13px] text-white font-bold tabular-nums">
                {countdown}
              </span>
            </div>
          )}

          {/* Info Button - Top Right */}
          <div className="absolute top-0 right-0" ref={marketHelpRef}>
            <button
              onClick={() => setShowMarketHelp(!showMarketHelp)}
              className={`w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border ${
                isExpired ? "border-gray-500/50" : config.iconBorderColor
              } flex items-center justify-center hover:bg-black/70 transition-colors`}
              aria-label="Ajuda do mercado"
            >
              <Info className={`w-3.5 h-3.5 ${isExpired ? "text-gray-400" : config.iconColor}`} />
            </button>
            
            {/* Market Help Tooltip */}
            {showMarketHelp && (
              <div className="absolute right-0 top-8 w-40 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 shadow-xl z-50">
                <p className="text-[11px] text-white/90 leading-relaxed">
                  {marketExplanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Match Date - Repositioned */}
        <div className="flex items-center justify-center" style={{ height: '16px' }}>
          {matchDate && (
            <p 
              className={`font-bold ${isExpired ? "text-gray-400" : "text-white/90"}`}
              style={{ fontSize: '12px' }}
            >
              {matchDate}
            </p>
          )}
        </div>

        {/* Teams Section - Larger */}
        <div className="flex items-center justify-center gap-6 w-full" style={{ height: '52px', marginTop: '2px' }}>
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-0.5">
            <div className={`rounded-lg backdrop-blur-sm flex items-center justify-center ring-1 shadow-lg ${
              isExpired ? "bg-gray-800/50 ring-gray-600/30" : "bg-white/10 ring-white/20"
            }`} style={{ width: '40px', height: '40px' }}>
              {team1.shirt ? (
                <ShirtIcon
                  variant={team1.shirt.variant}
                  primaryColor={team1.shirt.primaryColor}
                  secondaryColor={team1.shirt.secondaryColor}
                  size={28}
                />
              ) : team1.logo ? (
                <img
                  src={team1.logo}
                  alt={team1.name}
                  className={`object-contain ${isExpired ? "opacity-50" : ""}`}
                  style={{ width: '28px', height: '28px' }}
                />
              ) : (
                <ShirtIcon variant="solid" primaryColor="#6B7280" size={28} />
              )}
            </div>
            <span 
              className={`font-bold text-center max-w-[60px] leading-tight line-clamp-1 ${
                isExpired ? "text-gray-400" : "text-white"
              }`}
              style={{ fontSize: '11px' }}
            >
              {team1.name}
            </span>
          </div>

          <div className="text-white/50 font-extrabold" style={{ fontSize: '11px' }}>VS</div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-0.5">
            <div className={`rounded-lg backdrop-blur-sm flex items-center justify-center ring-1 shadow-lg ${
              isExpired ? "bg-gray-800/50 ring-gray-600/30" : "bg-white/10 ring-white/20"
            }`} style={{ width: '40px', height: '40px' }}>
              {team2.shirt ? (
                <ShirtIcon
                  variant={team2.shirt.variant}
                  primaryColor={team2.shirt.primaryColor}
                  secondaryColor={team2.shirt.secondaryColor}
                  size={28}
                />
              ) : team2.logo ? (
                <img
                  src={team2.logo}
                  alt={team2.name}
                  className={`object-contain ${isExpired ? "opacity-50" : ""}`}
                  style={{ width: '28px', height: '28px' }}
                />
              ) : (
                <ShirtIcon variant="solid" primaryColor="#6B7280" size={28} />
              )}
            </div>
            <span 
              className={`font-bold text-center max-w-[60px] leading-tight line-clamp-1 ${
                isExpired ? "text-gray-400" : "text-white"
              }`}
              style={{ fontSize: '11px' }}
            >
              {team2.name}
            </span>
          </div>
        </div>

        {/* Market Name - Smaller badge */}
        <div className="flex items-center justify-center" style={{ height: '24px', marginTop: '4px', marginBottom: '4px' }}>
          <div 
            className={`rounded-full backdrop-blur-sm border ${
              isExpired 
                ? "bg-gray-800/70 border-gray-600/40" 
                : "bg-black/70 border-white/15"
            }`}
            style={{ padding: '5px 12px' }}
          >
            <p 
              className={`font-extrabold line-clamp-1 ${isExpired ? "text-gray-400" : "text-white"}`}
              style={{ fontSize: '12px' }}
            >
              {market}
            </p>
          </div>
        </div>

        {/* Multiple Bet Label - Compact (always reserve space) */}
        <div className="flex items-center justify-center" style={{ height: '16px' }}>
          {isMultiple && !isExpired && (
            <div className="flex items-center gap-1 bg-purple-500/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-purple-500/30">
              <Layers className="w-2.5 h-2.5 text-purple-400" />
              <span className="text-[9px] text-purple-300 font-semibold">
                Bilhete ({displaySelectionsCount})
              </span>
            </div>
          )}
        </div>

        {/* Bet Details Row - BIGGER text */}
        <div 
          className={`w-full backdrop-blur-sm rounded-lg flex items-center justify-between ${
            isExpired 
              ? "bg-gray-800/60" 
              : "bg-black/60"
          }`}
          style={{ height: '36px', padding: '0 12px' }}
        >
          <span 
            className={`font-extrabold line-clamp-2 ${isExpired ? "text-gray-500" : "text-emerald-400"}`}
            style={{ fontSize: '14px', lineHeight: '1.15', maxWidth: '65%' }}
          >
            {betChoice}
          </span>
          <span 
            className={`font-black ${isExpired ? "text-gray-500" : "text-white"}`}
            style={{ fontSize: '18px' }}
          >
            {odds.toFixed(1)}
          </span>
        </div>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1 min-h-0.5" />

        {/* Action Buttons Row - Aligned */}
        <div className="flex items-center gap-2 w-full mt-auto">
          {/* Main Add Button */}
          <Button
            onClick={isExpired ? undefined : onAddTip}
            disabled={isExpired}
            size="sm"
            className={`flex-1 font-extrabold shadow-lg transition-all duration-300 ${
              isExpired 
                ? "bg-gray-600 text-gray-400 cursor-not-allowed shadow-none" 
                : isLocked 
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/40 hover:scale-[1.03]" 
                  : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/40 hover:scale-[1.03]"
            }`}
            style={{ height: '40px', fontSize: '14px' }}
          >
            {isExpired ? "Expirada" : isLocked ? "🔒 Desbloquear" : "Adicionar"}
          </Button>

          {/* Icon Buttons Group */}
          <div className="flex items-center gap-1.5">
            {/* "Como bater?" Icon Button */}
            <div className="relative" ref={betHelpRef}>
              <button
                onClick={() => setShowBetHelp(!showBetHelp)}
                className={`rounded-lg backdrop-blur-sm border flex items-center justify-center transition-colors ${
                  isExpired 
                    ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                    : "bg-white/10 border-white/20 hover:bg-white/20"
                }`}
                style={{ width: '40px', height: '40px' }}
                aria-label="Como bater?"
              >
                <HelpCircle className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
              </button>
              
              {showBetHelp && (
                <div className="absolute right-0 bottom-12 w-44 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 shadow-xl z-50">
                  <p className="text-[11px] text-white/90 leading-relaxed">
                    <strong className="text-emerald-400">{betChoice}:</strong>{" "}
                    {betExplanation}
                  </p>
                </div>
              )}
            </div>

            {/* "Dados/Justificativa" Icon Button */}
            <button
              onClick={() => onOpenJustificativa?.(justificativa || "Em breve: dados e percentuais do confronto.")}
              className={`rounded-lg backdrop-blur-sm border flex items-center justify-center transition-colors cursor-pointer ${
                isExpired 
                  ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                  : "bg-white/10 border-white/20 hover:bg-white/20 active:scale-95"
              }`}
              style={{ width: '40px', height: '40px' }}
              aria-label="Justificativa da entrada"
            >
              <BarChart3 className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};
