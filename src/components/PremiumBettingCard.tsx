import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface Indicator {
  label: string;
  value: string;
}

interface PremiumBettingCardProps {
  tier: "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA";
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
  confidence: number;
  indicators?: Indicator[];
  insights?: string;
  footer?: string;
  lineAlert?: boolean;
  isLocked?: boolean;
  onAddTip?: () => void;
  onViewAnalysis?: () => void;
}

export const PremiumBettingCard = ({
  tier,
  tierSubtitle,
  team1,
  team2,
  market,
  betChoice,
  odds,
  confidence,
  indicators,
  insights,
  footer = "Gestão 1–2% • Pré-jogo",
  lineAlert = false,
  isLocked = false,
  onAddTip,
  onViewAnalysis,
}: PremiumBettingCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [peopleCount, setPeopleCount] = useState(0);
  
  // Gera número aleatório final entre 100 e 5000
  const [finalCount] = useState(() => Math.floor(Math.random() * (5000 - 100 + 1)) + 100);
  
  // Anima o contador subindo
  useEffect(() => {
    const startCount = Math.floor(finalCount * 0.3); // Começa com 30% do valor final
    const duration = 2000; // 2 segundos
    const steps = 60;
    const increment = (finalCount - startCount) / steps;
    let current = startCount;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current += increment;
      
      if (step >= steps) {
        setPeopleCount(finalCount);
        clearInterval(timer);
      } else {
        setPeopleCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [finalCount]);

  const getTierConfig = () => {
    switch (tier) {
      case "MÚLTIPLA":
        return {
          gradient: "from-vip via-purple-600 to-vip",
          subtitle: tierSubtitle || "Combinação de entradas",
          icon: <TrendingUp className="w-3 h-3" />,
        };
      case "PRO":
        return {
          gradient: "from-primary via-orange-600 to-primary",
          subtitle: tierSubtitle || "Curadoria avançada",
          icon: <TrendingUp className="w-3 h-3" />,
        };
      case "GRÁTIS":
        return {
          gradient: "from-accent via-cyan-500 to-accent",
          subtitle: tierSubtitle || "Entrada gratuita",
          icon: null,
        };
      default:
        return {
          gradient: "from-success via-emerald-500 to-success",
          subtitle: tierSubtitle || "Sinal validado",
          icon: null,
        };
    }
  };

  const config = getTierConfig();

  return (
    <Card
      className={`w-full bg-gradient-to-br from-[#121826] to-[#0C0F14] border ${
        lineAlert 
          ? "border-warning/50 animate-shake" 
          : isHovered 
          ? "border-accent/50 shadow-[0_0_20px_rgba(34,211,238,0.3)]" 
          : "border-border/30"
      } overflow-hidden select-none transition-all duration-300 ${
        isHovered ? "-translate-y-1" : ""
      } ${isLocked ? "opacity-70" : ""} backdrop-blur-sm relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_50%,rgba(34,211,238,0.1),transparent_50%)]" />
      
      {/* Locked Overlay - Discreto */}
      {isLocked && (
        <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[1px]" />
      )}
      
      {/* Animated GIF Background for Premium Tiers */}
      {(tier === "PRO" || tier === "MÚLTIPLA") && !isLocked && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <img 
            src="https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" 
            alt="" 
            className="w-full h-full object-cover mix-blend-screen"
          />
        </div>
      )}
      
      {/* Tier Badge */}
      <div className="relative overflow-hidden animate-slide-up">
        <div
          className={`text-center py-2 px-3 font-display font-extrabold text-[10px] tracking-wider uppercase relative bg-gradient-to-r ${config.gradient} bg-[length:200%_100%] animate-gradient`}
        >
          <div className="relative z-10 flex items-center justify-center gap-1.5">
            {config.icon}
            <span className="text-white drop-shadow-lg tracking-tight">{tier}</span>
            {/* Sparkle GIF for special tiers */}
            {(tier === "PRO" || tier === "MÚLTIPLA") && (
              <img 
                src="https://media.giphy.com/media/26tPnAAJxXTvpLwJy/giphy.gif" 
                alt="" 
                className="w-3 h-3 inline-block ml-0.5 opacity-80"
              />
            )}
            {tier === "GRÁTIS" && (
              <img 
                src="https://media.giphy.com/media/xUPGcC0R9QjyxkPnS8/giphy.gif" 
                alt="" 
                className="w-3 h-3 inline-block ml-0.5 opacity-70"
              />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
        </div>
      </div>

      {/* Line Alert */}
      {lineAlert && (
        <div className="mx-3 mt-2 mb-1">
          <Badge className="bg-warning/20 text-warning border-warning/30 text-[9px] font-bold animate-bounce-micro">
            <AlertCircle className="w-2.5 h-2.5 mr-1" />
            Linha mudou
          </Badge>
        </div>
      )}

      <div className="p-3 space-y-2.5 relative">
        {/* Match Header */}
        <div className="space-y-1">
          <h3 className="text-sm font-display font-extrabold text-foreground tracking-tight leading-tight">
            {team1.name} <span className="text-muted-foreground">×</span> {team2.name}
          </h3>
          <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">
            {isLocked ? "***************" : market}
          </p>
        </div>

        {/* Teams Logos - Compact */}
        <div className="flex items-center justify-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-muted/30 backdrop-blur-sm flex items-center justify-center overflow-hidden ring-1 ring-border/30">
              <img
                src={team1.logo}
                alt={team1.name}
                className="w-7 h-7 object-contain"
              />
            </div>
          </div>

          <div className="text-muted-foreground/50 text-[9px] font-bold">VS</div>

          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-muted/30 backdrop-blur-sm flex items-center justify-center overflow-hidden ring-1 ring-border/30">
              <img
                src={team2.logo}
                alt={team2.name}
                className="w-7 h-7 object-contain"
              />
            </div>
          </div>
        </div>

        {/* People Counter with Fire Animation */}
        <div className="bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border border-warning/20 rounded-lg p-2 flex items-center gap-2 animate-fade-in">
          <div className="relative">
            <img 
              src="https://media.giphy.com/media/l0HlR3kHtkgFbYfgQ/giphy.gif" 
              alt="" 
              className="w-5 h-5 object-contain opacity-90 animate-pulse"
            />
          </div>
          <p className="text-[10px] text-foreground font-bold leading-tight">
            Já são <span className="text-warning font-extrabold text-xs">{peopleCount.toLocaleString('pt-BR')}</span> pessoas nessa aposta!
          </p>
        </div>

        {/* Insights - Moved below people counter */}
        {insights && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-2">
            <p className="text-[10px] text-foreground/90 leading-snug font-medium line-clamp-2">
              {insights}
            </p>
          </div>
        )}

        {/* Bet Details & Odds - Compact */}
        <div className="bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm rounded-lg p-2.5 border border-border/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase block mb-0.5">
                Entrada
              </span>
              <span className="text-foreground font-bold text-xs leading-tight">
                {betChoice}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-muted-foreground font-semibold uppercase block mb-0.5">
                Odd
              </span>
              <span className="text-success font-black text-xl text-tabular leading-none">
                {odds.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Confidence Bar - Compact */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-muted-foreground font-semibold">Confiança</span>
              <span className="text-foreground font-bold">{confidence}%</span>
            </div>
            <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  confidence >= 80
                    ? "bg-gradient-to-r from-success to-emerald-400"
                    : "bg-gradient-to-r from-warning to-yellow-400"
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Compact */}
        <div className="pt-1">
          <Button
            onClick={onAddTip}
            className={`w-full font-bold py-4 text-xs shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group/btn ${
              isLocked 
                ? "bg-warning hover:bg-warning/90 text-black shadow-warning/30" 
                : "bg-primary hover:bg-primary/90 text-white shadow-primary/30"
            }`}
          >
            <span className="relative">{isLocked ? "🔒 Desbloquear" : "Adicionar"}</span>
          </Button>
        </div>

        {/* Footer - Compact */}
        <div className="pt-1.5 border-t border-border/20">
          <p className="text-[9px] text-muted-foreground text-center leading-relaxed font-medium">
            {footer}
          </p>
        </div>
      </div>
    </Card>
  );
};
