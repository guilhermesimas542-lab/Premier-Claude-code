import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpCircle, Info } from "lucide-react";
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
  insights?: string;
  footer?: string;
  lineAlert?: boolean;
  isLocked?: boolean;
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

// Get tier styling configuration
const getTierConfig = (tier: string) => {
  switch (tier) {
    case "ULTRA":
      return {
        bgColor: "bg-[#9333EA]",
        textColor: "text-white",
        glowColor: "shadow-[0_0_30px_rgba(147,51,234,0.6)]",
        borderColor: "border-purple-500/60",
      };
    case "PRO":
      return {
        bgColor: "bg-gradient-to-r from-orange-500 to-orange-600",
        textColor: "text-white",
        glowColor: "shadow-[0_0_20px_rgba(249,115,22,0.5)]",
        borderColor: "border-orange-500/50",
      };
    case "GRÁTIS":
      return {
        bgColor: "bg-gradient-to-r from-cyan-500 to-cyan-600",
        textColor: "text-white",
        glowColor: "shadow-[0_0_20px_rgba(34,211,238,0.4)]",
        borderColor: "border-cyan-500/40",
      };
    case "MÚLTIPLA":
      return {
        bgColor: "bg-gradient-to-r from-purple-600 to-purple-700",
        textColor: "text-white",
        glowColor: "shadow-[0_0_20px_rgba(147,51,234,0.5)]",
        borderColor: "border-purple-500/50",
      };
    default: // BÁSICO
      return {
        bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        textColor: "text-white",
        glowColor: "shadow-[0_0_20px_rgba(16,185,129,0.5)]",
        borderColor: "border-emerald-500/50",
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
  isLocked = false,
  onAddTip,
}: PremiumBettingCardProps) => {
  const [showMarketHelp, setShowMarketHelp] = useState(false);
  const [showBetHelp, setShowBetHelp] = useState(false);
  const marketHelpRef = useRef<HTMLDivElement>(null);
  const betHelpRef = useRef<HTMLDivElement>(null);

  const config = getTierConfig(tier);
  const marketExplanation = getMarketExplanation(market);
  const betExplanation = getBetExplanation(betChoice);

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
      className={`w-full overflow-hidden select-none relative rounded-2xl ${config.borderColor} border-2 ${config.glowColor} transition-all duration-300 hover:scale-[1.02]`}
    >
      {/* Stadium Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/futsal-arena.jpg')`,
        }}
      />
      
      {/* Dark Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />
      
      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm" />
      )}

      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col items-center">
        
        {/* Tier Badge - Centered Top */}
        <div className={`${config.bgColor} ${config.textColor} px-6 py-1.5 rounded-full font-bold text-sm tracking-wide shadow-lg mb-2`}>
          {tier}
        </div>

        {/* Market Help Button - Top Right */}
        <div className="absolute top-3 right-3" ref={marketHelpRef}>
          <button
            onClick={() => setShowMarketHelp(!showMarketHelp)}
            className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Ajuda do mercado"
          >
            <Info className="w-3.5 h-3.5 text-white/80" />
          </button>
          
          {/* Market Help Tooltip */}
          {showMarketHelp && (
            <div className="absolute right-0 top-8 w-48 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2.5 shadow-xl z-50">
              <p className="text-xs text-white/90 leading-relaxed">
                {marketExplanation}
              </p>
            </div>
          )}
        </div>

        {/* Match Date */}
        {matchDate && (
          <p className="text-white/80 text-xs font-medium mb-3">
            {matchDate}
          </p>
        )}

        {/* Teams Section */}
        <div className="flex items-center justify-center gap-6 w-full mb-3">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20 shadow-lg">
              <img
                src={team1.logo}
                alt={team1.name}
                className="w-10 h-10 object-contain"
              />
            </div>
            <span className="text-white text-[11px] font-semibold text-center max-w-[80px] leading-tight truncate">
              {team1.name}
            </span>
          </div>

          {/* VS Separator - Hidden, implicit */}
          <div className="text-white/30 text-xs font-bold"></div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20 shadow-lg">
              <img
                src={team2.logo}
                alt={team2.name}
                className="w-10 h-10 object-contain"
              />
            </div>
            <span className="text-white text-[11px] font-semibold text-center max-w-[80px] leading-tight truncate">
              {team2.name}
            </span>
          </div>
        </div>

        {/* Market Name - Centered */}
        <p className="text-white/90 text-sm font-medium mb-3">
          {market}
        </p>

        {/* Bet Details Row */}
        <div className="w-full bg-black/50 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between mb-4">
          <span className="text-emerald-400 font-bold text-base">
            {betChoice}
          </span>
          <span className="text-white font-black text-xl">
            {odds.toFixed(1)}
          </span>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 w-full">
          {/* Add Button - Primary */}
          <Button
            onClick={onAddTip}
            className={`flex-1 font-bold py-5 text-sm shadow-lg transition-all duration-300 hover:scale-[1.03] ${
              isLocked 
                ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/40" 
                : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/40"
            }`}
          >
            <span className="font-extrabold">
              {isLocked ? "🔒 Desbloquear" : "Adicionar"}
            </span>
          </Button>

          {/* "Como bater?" Help Button */}
          <div className="relative" ref={betHelpRef}>
            <button
              onClick={() => setShowBetHelp(!showBetHelp)}
              className="h-[42px] px-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-1.5 hover:bg-white/20 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-white/80" />
              <span className="text-white/90 text-xs font-medium whitespace-nowrap">
                Como bater?
              </span>
            </button>
            
            {/* Bet Help Tooltip */}
            {showBetHelp && (
              <div className="absolute right-0 bottom-12 w-52 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2.5 shadow-xl z-50">
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
