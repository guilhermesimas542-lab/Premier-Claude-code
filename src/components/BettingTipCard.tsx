import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  return (
    <Card className="min-w-[320px] max-w-[320px] bg-card border-border overflow-hidden select-none">
      <div
        className={`text-center py-2 px-4 font-bold text-sm ${
          category === "PRO"
            ? "bg-gradient-to-r from-warning to-secondary text-warning-foreground"
            : "bg-success text-success-foreground"
        }`}
      >
        {category}
      </div>
      
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              <img src={team1.logo} alt={team1.name} className="w-12 h-12 object-contain" />
            </div>
            <span className="text-foreground font-semibold text-center text-sm">
              {team1.name}
            </span>
          </div>
          
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              <img src={team2.logo} alt={team2.name} className="w-12 h-12 object-contain" />
            </div>
            <span className="text-foreground font-semibold text-center text-sm">
              {team2.name}
            </span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">{betType}</p>
          <div className="flex items-center justify-between">
            <span className="text-foreground font-medium">{betChoice}</span>
            <span className="text-foreground font-bold text-lg">{odds.toFixed(2)}</span>
          </div>
        </div>

        <Button 
          onClick={onAddTip}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Adicionar tip
        </Button>
      </div>
    </Card>
  );
};
