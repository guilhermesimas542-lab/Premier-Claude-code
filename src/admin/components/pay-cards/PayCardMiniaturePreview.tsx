import { ShoppingCart, Crown, Rocket } from "lucide-react";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { SpecialBettingCard } from "@/components/SpecialBettingCard";

interface Props {
  payCard: {
    associated_plan: string;
    location?: string | null;
    name?: string;
  };
  onClick?: () => void;
}

function ScaledMiniature({ children, width = 340, height = 220 }: { children: React.ReactNode; width?: number; height?: number }) {
  const scale = 90 / width;
  const miniHeight = height * scale;
  return (
    <div className="rounded-lg overflow-hidden border border-white/10" style={{ width: 90, height: miniHeight, position: "relative" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width, height, pointerEvents: "none" }}>
        {children}
      </div>
    </div>
  );
}

const MOCK_TEAM1 = { name: "Time A", shirt: { variant: "solid" as const, primaryColor: "#22c55e" } };
const MOCK_TEAM2 = { name: "Time B", shirt: { variant: "solid" as const, primaryColor: "#ef4444" } };

export function PayCardMiniaturePreview({ payCard, onClick }: Props) {
  const plan = payCard.associated_plan?.toUpperCase() || "";

  const wrap = (content: React.ReactNode) => (
    <div onClick={onClick} className={onClick ? "cursor-pointer hover:ring-2 hover:ring-white/30 rounded-lg transition-all" : ""}>
      {content}
    </div>
  );

  const tierMap: Record<string, "BÁSICO" | "PRO" | "ULTRA"> = {
    BASIC: "BÁSICO", BASICO: "BÁSICO", UPGRADE_BASICO: "BÁSICO",
    PRO: "PRO", UPGRADE_PRO: "PRO",
    ULTRA: "ULTRA", UPGRADE_ULTRA: "ULTRA",
  };

  switch (plan) {
    // === BUTTON TRIGGERS (matching real UI from screenshots) ===
    case "LOGIN_AQUISICAO":
      return wrap(
        <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-500/60 bg-zinc-900 overflow-hidden gap-1 py-2" style={{ width: 90, height: 58 }}>
          <div className="flex items-center gap-1">
            <ShoppingCart className="w-3 h-3 text-emerald-400" />
            <span className="text-[7px] text-emerald-400 font-bold">Adquirir acesso</span>
          </div>
          <span className="text-[5px] text-emerald-600/80">Acesso rápido</span>
        </div>
      );

    case "VITALICIO":
      return wrap(
        <div className="flex items-center justify-center rounded-full border border-red-500/60 bg-red-900/40 overflow-hidden gap-1" style={{ width: 90, height: 32 }}>
          <span className="text-[7px] text-red-400 font-bold">Sem vitalício</span>
          <ShoppingCart className="w-3 h-3 text-red-400" />
        </div>
      );

    case "SUPORTE_UPGRADE":
      return wrap(
        <div className="flex items-center justify-center rounded-full bg-emerald-500 overflow-hidden gap-1" style={{ width: 90, height: 32 }}>
          <Rocket className="w-3 h-3 text-black" />
          <span className="text-[7px] text-black font-bold">Upgrade</span>
        </div>
      );

    // === PREMIUM TIER CARDS ===
    case "BASIC":
    case "BASICO":
    case "UPGRADE_BASICO":
    case "PRO":
    case "UPGRADE_PRO":
    case "ULTRA":
    case "UPGRADE_ULTRA": {
      const isUpgrade = plan.startsWith("UPGRADE_");
      return wrap(
        <ScaledMiniature width={340} height={220}>
          <PremiumBettingCard
            tipId={0}
            tier={tierMap[plan]}
            team1={MOCK_TEAM1}
            team2={MOCK_TEAM2}
            market="Resultado Final"
            betChoice="Time A"
            odds={1.85}
            isLocked
            lockedLabel={isUpgrade ? `↑ ${tierMap[plan]}` : undefined}
          />
        </ScaledMiniature>
      );
    }

    // === SPECIAL CARDS ===
    case "ALAVANCAGEM":
      return wrap(
        <ScaledMiniature width={340} height={220}>
          <SpecialBettingCard tipId={0} type="ALAVANCAGEM" market="Mercado" betChoice="Seleção" odds={2.10} isLocked />
        </ScaledMiniature>
      );

    case "DESALTAS":
    case "ODDS_ALTAS":
      return wrap(
        <ScaledMiniature width={340} height={220}>
          <SpecialBettingCard tipId={0} type="ODDS_ALTAS" market="Mercado" betChoice="Seleção" odds={3.50} isLocked />
        </ScaledMiniature>
      );

    default:
      return wrap(
        <div className="flex items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-[7px] text-zinc-400 p-1 text-center" style={{ width: 90, height: 58 }}>
          {plan || "?"}
        </div>
      );
  }
}
