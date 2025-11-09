import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, Copy, AlertCircle } from "lucide-react";
import { useState } from "react";

interface Indicator {
  label: string;
  value: string;
}

interface PremiumBettingCardProps {
  tier: "BÁSICO" | "PRO" | "VIP";
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
  onAddTip?: () => void;
  onViewAnalysis?: () => void;
  onCopy?: () => void;
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
  footer = "Gestão 1–2% • Pré-jogo • Sem múltiplas",
  lineAlert = false,
  onAddTip,
  onViewAnalysis,
  onCopy,
}: PremiumBettingCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const getTierConfig = () => {
    switch (tier) {
      case "VIP":
        return {
          gradient: "from-vip via-purple-600 to-vip",
          subtitle: tierSubtitle || "Alta confiança — janela curta",
          icon: <TrendingUp className="w-3.5 h-3.5" />,
        };
      case "PRO":
        return {
          gradient: "from-primary via-orange-600 to-primary",
          subtitle: tierSubtitle || "Curadoria avançada — risco controlado",
          icon: <TrendingUp className="w-3.5 h-3.5" />,
        };
      default:
        return {
          gradient: "from-success via-emerald-500 to-success",
          subtitle: tierSubtitle || "Sinal validado — perfil conservador",
          icon: null,
        };
    }
  };

  const config = getTierConfig();

  return (
    <Card
      className={`min-w-[360px] max-w-[360px] bg-gradient-to-br from-[#121826] to-[#0C0F14] border ${
        lineAlert 
          ? "border-warning/50 animate-shake" 
          : isHovered 
          ? "border-accent/50 shadow-[0_0_20px_rgba(34,211,238,0.3)]" 
          : "border-border/30"
      } overflow-hidden select-none transition-all duration-300 ${
        isHovered ? "-translate-y-1" : ""
      } backdrop-blur-sm relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Texture/Pattern */}
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_50%,rgba(34,211,238,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(255,92,31,0.1),transparent_50%)]" />
      
      {/* Tier Badge */}
      <div className="relative overflow-hidden animate-slide-up">
        <div
          className={`text-center py-3 px-4 font-display font-extrabold text-xs tracking-wider uppercase relative bg-gradient-to-r ${config.gradient} bg-[length:200%_100%] animate-gradient`}
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            {config.icon}
            <span className="text-white drop-shadow-lg tracking-tight">{tier}</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
          <div className="absolute inset-0 bg-white/10 animate-glow-pulse" />
        </div>
        <div className="bg-card/80 backdrop-blur-sm px-4 py-1.5 border-b border-border/20">
          <p className="text-[10px] text-muted-foreground text-center font-medium">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* Line Alert */}
      {lineAlert && (
        <div className="mx-4 mt-3 mb-1">
          <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] font-bold animate-bounce-micro">
            <AlertCircle className="w-3 h-3 mr-1" />
            Linha mudou
          </Badge>
        </div>
      )}

      <div className="p-5 space-y-4 relative">
        {/* Match Header */}
        <div className="space-y-2">
          <h3 className="text-lg font-display font-extrabold text-foreground tracking-tight leading-tight">
            {team1.name} <span className="text-muted-foreground font-bold">×</span> {team2.name}
          </h3>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {market}
          </p>
        </div>

        {/* Teams Logos */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="relative group/logo">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover/logo:opacity-100 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full bg-muted/30 backdrop-blur-sm flex items-center justify-center overflow-hidden ring-1 ring-border/30">
              <img
                src={team1.logo}
                alt={team1.name}
                className="w-10 h-10 object-contain filter brightness-110 saturate-0 group-hover/logo:saturate-100 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-3">
            <div className="text-muted-foreground/50 text-[10px] font-bold uppercase tracking-widest">
              VS
            </div>
          </div>

          <div className="relative group/logo">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover/logo:opacity-100 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full bg-muted/30 backdrop-blur-sm flex items-center justify-center overflow-hidden ring-1 ring-border/30">
              <img
                src={team2.logo}
                alt={team2.name}
                className="w-10 h-10 object-contain filter brightness-110 saturate-0 group-hover/logo:saturate-100 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Bet Details & Odds */}
        <div className="bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm rounded-xl p-4 border border-border/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Entrada
              </span>
              <span className="text-foreground font-bold text-base leading-tight">
                {betChoice}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Odd
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-success font-black text-3xl text-tabular leading-none animate-fade-in-scale">
                  {odds.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider">
                Confiança
              </span>
              <span className="text-foreground font-bold text-tabular">{confidence}%</span>
            </div>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  confidence >= 80
                    ? "bg-gradient-to-r from-success to-emerald-400"
                    : confidence >= 70
                    ? "bg-gradient-to-r from-warning to-yellow-400"
                    : "bg-gradient-to-r from-destructive to-red-400"
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Indicators */}
        {indicators && indicators.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {indicators.map((indicator, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-muted/20 border-border/30 text-[10px] font-medium text-foreground/80 animate-fade-in-scale backdrop-blur-sm"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {indicator.label}: {indicator.value}
              </Badge>
            ))}
          </div>
        )}

        {/* Insights */}
        {insights && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">
              {insights}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onAddTip}
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-6 text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group/btn"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
            <span className="relative">Adicionar tip</span>
          </Button>
          {onViewAnalysis && (
            <Button
              onClick={onViewAnalysis}
              variant="outline"
              className="bg-muted/20 border-border/50 hover:bg-muted/40 hover:border-accent/50 text-foreground font-semibold py-6 transition-all duration-300"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
          {onCopy && (
            <Button
              onClick={onCopy}
              variant="outline"
              className="bg-muted/20 border-border/50 hover:bg-muted/40 hover:border-accent/50 text-foreground font-semibold py-6 transition-all duration-300"
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="pt-2 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed font-medium">
            {footer}
          </p>
        </div>

        {/* Bottom Legal Notice */}
        <div className="pt-1">
          <p className="text-[9px] text-muted-foreground/60 text-center italic">
            Conteúdo informativo. Aposte com responsabilidade. +18.
          </p>
        </div>
      </div>
    </Card>
  );
};
