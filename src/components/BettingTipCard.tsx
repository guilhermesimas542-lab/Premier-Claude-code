import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useActivationLock } from "@/components/onboarding/ActivationGateProvider";

interface BettingTipCardProps {
  category: "PRO" | "BÁSICO";
  team1: {
    name: string;
    logo: string;
  };
  team2: {
    name: string;
    logo: string;
  };
  betType: string;
  betChoice: string;
  odds: number;
  onAddTip?: () => void;
}

export const BettingTipCard = ({
  category,
  team1,
  team2,
  betType,
  betChoice,
  odds,
  onAddTip,
}: BettingTipCardProps) => {
  const isPro = category === "PRO";
  const { isLocked, requestActivation } = useActivationLock();

  const handleAddTip = () => {
    if (isLocked) { requestActivation(); return; }
    onAddTip?.();
  };

  return (
    <Card className="min-w-[340px] max-w-[340px] bg-gradient-to-br from-card to-card/50 border border-border/50 overflow-hidden select-none hover:shadow-[0_8px_32px_-8px_rgba(66,153,225,0.5)] transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
      {/* Category Badge with Gradient */}
      <div className="relative overflow-hidden">
        <div
          className={`text-center py-3 px-4 font-bold text-sm tracking-wide relative ${
            isPro
              ? "bg-gradient-to-r from-warning via-secondary to-warning bg-[length:200%_100%] animate-gradient"
              : "bg-gradient-to-r from-success to-[#e9b949]"
          }`}
          style={{
            animation: isPro ? "gradient 3s ease infinite" : "none",
          }}
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            {isPro && <TrendingUp className="w-4 h-4" />}
            <span className="text-white font-extrabold tracking-wider drop-shadow-md">
              {category}
            </span>
          </div>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine" />
        </div>
      </div>
      
      <div className="p-6 space-y-5 bg-gradient-to-b from-transparent to-muted/20">
        {/* Teams Section */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col items-center gap-3 flex-1">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                <img 
                  src={team1.logo} 
                  alt={team1.name} 
                  className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300" 
                />
              </div>
            </div>
            <span className="text-foreground font-bold text-center text-sm leading-tight">
              {team1.name}
            </span>
          </div>
          
          <div className="flex flex-col items-center justify-center px-3">
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              VS
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-3 flex-1">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                <img 
                  src={team2.logo} 
                  alt={team2.name} 
                  className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300" 
                />
              </div>
            </div>
            <span className="text-foreground font-bold text-center text-sm leading-tight">
              {team2.name}
            </span>
          </div>
        </div>

        {/* Bet Details */}
        <div className="space-y-3 pt-2">
          <div className="text-center">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
              {betType}
            </p>
          </div>
          
          <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4 backdrop-blur-sm border border-border/30">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Apuesta
              </span>
              <span className="text-foreground font-bold text-base">
                {betChoice}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Cuota
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-primary font-black text-2xl tabular-nums">
                  {odds.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleAddTip}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-base shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          Añadir tip
        </Button>
      </div>
    </Card>
  );
};
