import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppConfig } from "@/types/auth";
import { BottomNav } from "@/components/BottomNav";
import { PromoCarousel } from "@/components/PromoCarousel";
import logoImg from "@/assets/premier-logo-custom.png";
import MatrixRain from "@/components/MatrixRain";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { useCards, CardData } from "@/hooks/useCards";
import { useUserAccess } from "@/hooks/useUserAccess";
import { CardType1Lateral } from "@/components/cards/CardType1Lateral";
import { CardType2Top } from "@/components/cards/CardType2Top";
import { CardFunnelModal } from "@/components/cards/CardFunnelModal";

const Casino = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const { house: userHouse } = useUserBettingHouse();
  const { cards: casinoCards, loading } = useCards("casino");
  const access = useUserAccess();
  const [funnelCard, setFunnelCard] = useState<CardData | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated()) { navigate("/login"); return; }
    const storedConfig = getStoredConfig();
    if (storedConfig) setConfig(storedConfig);
  }, [navigate]);

  const getGameUrl = (slug: string): string | null => {
    if (!userHouse) return null;
    const map: Record<string, string | null> = {
      aviator: userHouse.aviator_url,
      roleta: userHouse.roleta_url,
      mines: userHouse.mines_url,
      football_studio: userHouse.football_studio_url,
    };
    return map[slug] ?? null;
  };

  const hasAccess = (card: CardData): boolean => {
    if (!card.requires_access || !card.access_field) return true;
    return !!(access as any)[card.access_field];
  };

  const handleCardAction = (card: CardData) => {
    // Cards that require access and user doesn't have it → open funnel/checkout
    if (card.requires_access && !hasAccess(card)) {
      if ((card.questions && card.questions.length > 0) || card.checkout_url) {
        setFunnelCard(card);
      }
      return;
    }

    // Casino game cards → navigate to game page
    if (card.slug && card.category === "casino") {
      const slug = card.slug === "football_studio" ? "football-studio" : card.slug;
      navigate(`/cassino/${slug}`);
      return;
    }

    // Quick access cards → navigate to route
    if (card.slug === "odds_altas") { navigate("/odds-altas"); return; }
    if (card.slug === "alavancagem") { navigate("/alavancagem"); return; }
  };

  const renderCard = (card: CardData) => {
    if (card.card_type === "type1_lateral") {
      return <CardType1Lateral key={card.id} card={card} onAction={() => handleCardAction(card)} />;
    }
    return (
      <CardType2Top
        key={card.id}
        card={card}
        hasAccess={hasAccess(card)}
        onAction={() => handleCardAction(card)}
      />
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0" style={{ background: "#000000" }}>
      <MatrixRain opacity={0.18} />
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,255,0,0.04)" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.92)", borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button onClick={() => navigate("/")} className="p-2 rounded-lg transition-colors" style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.25)" }}>
                <ArrowLeft className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
              <img src={logoImg} alt="Premier Ultra" className="h-8 sm:h-10 w-auto" style={{ filter: "drop-shadow(0 0 6px rgba(0,255,0,0.4))" }} />
              <span className="text-base sm:text-lg font-bold" style={{ color: "#FFFFFF" }}>Cassino</span>
            </div>
            {config?.user && (
              <span className="hidden md:block text-xs sm:text-sm font-medium truncate max-w-[180px]" style={{ color: "#00AA00" }}>
                {config.user.userMail}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">
        <PromoCarousel context="cassino" />

        <section className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight" style={{ color: "#FFFFFF" }}>
            Jogos Disponíveis
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {casinoCards.filter(c => c.slug !== "cassino").map(renderCard)}
          </div>
        </section>
      </main>

      <BottomNav />

      {funnelCard && (
        <CardFunnelModal
          card={funnelCard}
          open={!!funnelCard}
          onClose={() => setFunnelCard(null)}
        />
      )}
    </div>
  );
};

export default Casino;
