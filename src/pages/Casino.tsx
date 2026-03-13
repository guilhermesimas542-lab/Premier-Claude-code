import { Crown, ShoppingCart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredConfig, isAuthenticated } from "@/lib/auth";
import { useEffect, useState } from "react";
import { parseAudience, matchesAudienceCriteria } from "@/lib/audienceUtils";
import { BottomNav } from "@/components/BottomNav";
import { PromoCarousel } from "@/components/PromoCarousel";
import AppHeader from "@/components/AppHeader";

import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { useCards, CardData } from "@/hooks/useCards";
import { useUserAccess } from "@/hooks/useUserAccess";
import { CardType1Lateral } from "@/components/cards/CardType1Lateral";
import CardType2Top from "@/components/cards/CardType2Top";
import { CardFunnelModal } from "@/components/cards/CardFunnelModal";
import { supabase } from "@/integrations/supabase/client";
import type { PayCardData } from "@/hooks/usePayCards";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import { usePayCardTrigger } from "@/hooks/usePayCardTrigger";
import { mockGetUser } from "@/mocks/user";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { useLinks } from "@/contexts/LinksContext";

const Casino = () => {
  const navigate = useNavigate();
  const { house: userHouse } = useUserBettingHouse();
  const { cards: casinoCards, loading } = useCards("casino");
  const access = useUserAccess();
  const [funnelCard, setFunnelCard] = useState<CardData | null>(null);
  const [cardPayCard, setCardPayCard] = useState<PayCardData | null>(null);
  const { triggerPayCard } = usePayCardTrigger();
  const mockUser = mockGetUser();
  const { links } = useLinks();

  const [showLifetimeInfoModal, setShowLifetimeInfoModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated()) { navigate("/login"); return; }
    // Navigation achievement
    const grantNavAch = async () => {
      if (!mockUser) return;
      const { data: u } = await supabase.from('users').select('id').eq('email', mockUser.email).maybeSingle();
      if (u?.id) {
        await supabase.from('user_achievements').insert({ user_id: u.id, achievement_id: 'open_casino' } as any).select();
      }
    };
    grantNavAch();
  }, [navigate]);

  const hasAccess = (card: CardData): boolean => {
    if (!card.requires_access) return true;
    const criteria = parseAudience(card.access_field);
    if (criteria.length === 0) return true;
    const isBlocked = matchesAudienceCriteria(
      criteria,
      access.mainTier,
      access.isVitalicio,
      [
        ...(access.hasAlavancagem ? ["alavancagem"] : []),
        ...(access.hasOddsAltas ? ["desaltas"] : []),
        ...(access.hasLiveTelegram ? ["live_telegram"] : []),
      ],
    );
    return !isBlocked;
  };

  const handleOpenPayCardById = async (payCardId: string) => {
    const { data } = await supabase.from("pay_cards" as any).select("*").eq("id", payCardId).maybeSingle();
    if (data) setCardPayCard(data as any as PayCardData);
  };

  const handleCardAction = (card: CardData) => {
    if (card.requires_access && !hasAccess(card)) {
      if (card.pay_card_id) {
        handleOpenPayCardById(card.pay_card_id);
        return;
      }
      if ((card.questions && card.questions.length > 0) || card.checkout_url) {
        setFunnelCard(card);
      }
      return;
    }
    if (card.slug && card.category === "casino") {
      const slug = card.slug === "football_studio" ? "football-studio" : card.slug;
      navigate(`/cassino/${slug}`);
      return;
    }
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

  const handleBuyLifetime = () => { window.open(CHECKOUT_LINKS.vitalicio, '_blank'); setShowLifetimeModal(false); };

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0 bg-navy-dark">
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,255,127,0.05)" }} />

      <AppHeader onShowLifetimeInfoModal={() => setShowLifetimeInfoModal(true)} />

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">
        <PromoCarousel context="cassino" />

        <section>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: '18px',
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '16px 12px 8px',
          }}>
            🎲 JOGOS DISPONÍVEIS
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            padding: '0 12px',
          }}>
            {casinoCards.filter(c => c.slug !== "cassino").map(renderCard)}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="pt-6 text-center space-y-2" style={{ borderTop: "1px solid rgba(0,255,0,0.1)" }}>
            <p className="text-sm font-medium" style={{ color: "#FFFFFF" }}>Premier Ultra ©</p>
            <p className="text-xs" style={{ color: "#AAAAAA" }}>Análises processadas continuamente</p>
            <p className="text-[11px] pt-2" style={{ color: "#888888" }}>
              Dados protegidos • 18+ • Jogue com responsabilidade
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px]" style={{ color: "#AAAAAA" }}>
              <button onClick={() => setShowTermsModal(true)} className="transition-colors hover:underline" style={{ color: "#CCCCCC" }}>
                Termos & Privacidade
              </button>
              <span style={{ color: "#555555" }}>|</span>
              <a href={links.support_whatsapp_url || "https://wa.link/1p68qg"} target="_blank" rel="noopener noreferrer" className="transition-colors hover:underline" style={{ color: "#CCCCCC" }}>
                Suporte
              </a>
            </div>
          </div>
        </div>
      </footer>

      <BottomNav />

      {/* Modal Termos */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.25)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5 sticky top-0 z-10" style={{ background: "rgba(0,8,0,0.97)", borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
              <h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Termos de Uso & Privacidade</h2>
              <button onClick={() => setShowTermsModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]">
                <X className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
              <p>O Premier Ultra é uma plataforma de análise e previsão de resultados esportivos. Ao utilizar nossos serviços, você concorda com os seguintes termos:</p>
              <p><strong style={{ color: "#FFFFFF" }}>1. Natureza do serviço:</strong> Fornecemos análises estatísticas e palpites baseados em dados. Não garantimos resultados.</p>
              <p><strong style={{ color: "#FFFFFF" }}>2. Responsabilidade:</strong> O usuário é responsável por suas decisões de apostas. Jogue com responsabilidade.</p>
              <p><strong style={{ color: "#FFFFFF" }}>3. Idade mínima:</strong> É necessário ter 18 anos ou mais para utilizar nossos serviços.</p>
              <p><strong style={{ color: "#FFFFFF" }}>4. Privacidade:</strong> Seus dados são protegidos e utilizados apenas para melhorar sua experiência na plataforma.</p>
              <p><strong style={{ color: "#FFFFFF" }}>5. Reembolso:</strong> Política de reembolso conforme termos do provedor de pagamento.</p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowTermsModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lifetime modals now handled by AppHeader */}

      {funnelCard && (
        <CardFunnelModal
          card={funnelCard}
          open={!!funnelCard}
          onClose={() => setFunnelCard(null)}
        />
      )}
      {cardPayCard && (
        <PayCardFunnelModal
          payCard={cardPayCard}
          open={!!cardPayCard}
          onClose={() => setCardPayCard(null)}
        />
      )}
    </div>
  );
};

export default Casino;
