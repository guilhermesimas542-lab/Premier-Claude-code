import { Lock, LogIn, Crown, Headset } from "lucide-react";
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

// Wrapper that scales down a real component into a miniature
function ScaledMiniature({ children, width = 340, height = 220 }: { children: React.ReactNode; width?: number; height?: number }) {
  const scale = 90 / width;
  const miniHeight = height * scale;
  return (
    <div
      className="rounded-lg overflow-hidden border border-white/10"
      style={{ width: 90, height: miniHeight, position: "relative" }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width,
          height,
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const MOCK_TEAM1 = { name: "Time A", shirt: { variant: "solid" as const, primaryColor: "#22c55e" } };
const MOCK_TEAM2 = { name: "Time B", shirt: { variant: "solid" as const, primaryColor: "#ef4444" } };

export function PayCardMiniaturePreview({ payCard, onClick }: Props) {
  const plan = payCard.associated_plan?.toLowerCase() || "";

  const wrapClick = (content: React.ReactNode) => (
    <div
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:ring-2 hover:ring-white/30 rounded-lg transition-all" : ""}
    >
      {content}
    </div>
  );

  // Tier mapping for PremiumBettingCard
  const tierMap: Record<string, "BÁSICO" | "PRO" | "ULTRA"> = {
    basic: "BÁSICO", basico: "BÁSICO", upgrade_basico: "BÁSICO",
    pro: "PRO", upgrade_pro: "PRO",
    ultra: "ULTRA", upgrade_ultra: "ULTRA",
  };

  switch (plan) {
    // === BUTTON-TYPE TRIGGERS ===
    case "login_aquisicao":
      return wrapClick(
        <div className="flex items-center justify-center rounded-lg border-2 border-cyan-400 bg-gradient-to-r from-cyan-500 to-blue-600 overflow-hidden" style={{ width: 90, height: 58 }}>
          <div className="flex flex-col items-center gap-0.5">
            <LogIn className="w-3.5 h-3.5 text-white" />
            <span className="text-[6px] text-white font-bold">Adquirir acesso</span>
          </div>
        </div>
      );

    case "vitalicio":
      return wrapClick(
        <div className="flex items-center justify-center rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-600 overflow-hidden" style={{ width: 90, height: 58 }}>
          <div className="flex flex-col items-center gap-0.5">
            <Crown className="w-3.5 h-3.5 text-white" />
            <span className="text-[6px] text-white font-bold">Acesso vitalício</span>
          </div>
        </div>
      );

    case "suporte_upgrade":
      return wrapClick(
        <div className="flex items-center justify-center rounded-lg border-2 border-sky-500 bg-sky-600 overflow-hidden" style={{ width: 90, height: 58 }}>
          <div className="flex flex-col items-center gap-0.5">
            <Headset className="w-3.5 h-3.5 text-white" />
            <span className="text-[6px] text-white font-bold">Upgrade</span>
          </div>
        </div>
      );

    // === PREMIUM BETTING CARD TIERS ===
    case "basico":
    case "basic":
    case "upgrade_basico":
    case "pro":
    case "upgrade_pro":
    case "ultra":
    case "upgrade_ultra": {
      const isUpgrade = plan.startsWith("upgrade_");
      return wrapClick(
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

    // === SPECIAL BETTING CARDS ===
    case "alavancagem":
      return wrapClick(
        <ScaledMiniature width={340} height={220}>
          <SpecialBettingCard
            tipId={0}
            type="ALAVANCAGEM"
            market="Mercado Especial"
            betChoice="Seleção"
            odds={2.10}
            isLocked
          />
        </ScaledMiniature>
      );

    case "desaltas":
    case "odds_altas":
      return wrapClick(
        <ScaledMiniature width={340} height={220}>
          <SpecialBettingCard
            tipId={0}
            type="ODDS_ALTAS"
            market="Mercado Especial"
            betChoice="Seleção"
            odds={3.50}
            isLocked
          />
        </ScaledMiniature>
      );

    // === FALLBACK ===
    default:
      return wrapClick(
        <div className="flex items-center justify-center rounded-lg border border-white/10 bg-gray-800 text-[7px] text-gray-400 p-1 text-center" style={{ width: 90, height: 58 }}>
          Preview: {plan || "?"}
        </div>
      );
  }
}
