import { Lock, Anchor, Gift, Crown, Zap, ArrowUpCircle, LogIn, Headset } from "lucide-react";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { SpecialBettingCard } from "@/components/SpecialBettingCard";
import { CardType2Top } from "@/components/cards/CardType2Top";

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

// Mock data for PremiumBettingCard previews
const MOCK_TEAM1 = { name: "Time A", shirt: { variant: "solid" as const, primaryColor: "#22c55e" } };
const MOCK_TEAM2 = { name: "Time B", shirt: { variant: "solid" as const, primaryColor: "#ef4444" } };

export function PayCardMiniaturePreview({ payCard, onClick }: Props) {
  const plan = payCard.associated_plan?.toLowerCase() || "";
  const location = payCard.location?.toLowerCase() || "";

  const wrapClick = (content: React.ReactNode) => (
    <div
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:ring-2 hover:ring-white/30 rounded-lg transition-all" : ""}
    >
      {content}
    </div>
  );

  // 1. BUTTON-TYPE TRIGGERS
  if (plan === "login_aquisicao") {
    return wrapClick(
      <div className="flex items-center justify-center rounded-lg border-2 border-cyan-400 bg-gradient-to-r from-cyan-500 to-blue-600 overflow-hidden" style={{ width: 90, height: 58 }}>
        <div className="flex flex-col items-center gap-0.5">
          <LogIn className="w-3.5 h-3.5 text-white" />
          <span className="text-[6px] text-white font-bold">Adquirir acesso</span>
        </div>
      </div>
    );
  }

  if (plan === "vitalicio") {
    return wrapClick(
      <div className="flex items-center justify-center rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-600 overflow-hidden" style={{ width: 90, height: 58 }}>
        <div className="flex flex-col items-center gap-0.5">
          <Crown className="w-3.5 h-3.5 text-white" />
          <span className="text-[6px] text-white font-bold">Acesso vitalício</span>
        </div>
      </div>
    );
  }

  if (plan === "suporte_upgrade") {
    return wrapClick(
      <div className="flex items-center justify-center rounded-lg border-2 border-sky-500 bg-sky-600 overflow-hidden" style={{ width: 90, height: 58 }}>
        <div className="flex flex-col items-center gap-0.5">
          <Headset className="w-3.5 h-3.5 text-white" />
          <span className="text-[6px] text-white font-bold">Upgrade</span>
        </div>
      </div>
    );
  }

  // 2. HOME CARDS (CardType2Top)
  if (location === "home") {
    const mockCard = {
      id: "preview",
      slug: null,
      name: payCard.name || "Card",
      title: payCard.name || "Card da Home",
      subtitle: "Preview do card",
      description: null,
      image_urls: null,
      card_type: "type2_top",
      category: "home",
      badges: null,
      badge_color: null,
      button_text_access: "Acessar",
      button_text_acquire: "Adquirir",
      button_bg_color: null,
      button_font_color: null,
      requires_access: true,
      access_field: null,
      checkout_url: null,
      questions: [],
      display_order: 0,
      product_id: null,
      target_audience: "all",
      is_active: true,
    };

    return wrapClick(
      <ScaledMiniature width={300} height={260}>
        <CardType2Top card={mockCard as any} hasAccess={false} onAction={() => {}} />
      </ScaledMiniature>
    );
  }

  // 3. TIPS CARDS — PremiumBettingCard
  const tierMap: Record<string, "BÁSICO" | "PRO" | "ULTRA"> = {
    basic: "BÁSICO",
    basico: "BÁSICO",
    upgrade_basico: "BÁSICO",
    pro: "PRO",
    upgrade_pro: "PRO",
    ultra: "ULTRA",
    upgrade_ultra: "ULTRA",
  };

  if (tierMap[plan]) {
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

  // 4. SPECIAL CARDS — SpecialBettingCard (Alavancagem / Odds Altas)
  if (plan === "alavancagem") {
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
  }

  if (plan === "desaltas" || plan === "odds_altas") {
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
  }

  // 5. FALLBACK
  return wrapClick(
    <div className="flex items-center justify-center rounded-lg border border-white/10 bg-gray-800 text-[7px] text-gray-400 p-1 text-center" style={{ width: 90, height: 58 }}>
      Preview: {plan || "?"}
    </div>
  );
}
