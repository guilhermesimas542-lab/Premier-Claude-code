import { LogOut, Headphones, X, Gift, Sparkles, ShoppingCart, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppHeader from "@/components/AppHeader";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isAuthenticated, clearAuth, getStoredConfig, getBackgroundImageUrl } from "@/lib/auth";
import { parseAudience, matchesAudienceCriteria } from "@/lib/audienceUtils";
import { supabase } from "@/integrations/supabase/client";
import type { PayCardData } from "@/hooks/usePayCards";
import { mockGetUser } from "@/mocks/user";
import { trackEvent } from "@/lib/events";
import BasicPlanModal from "@/components/BasicPlanModal";

import { BottomNav } from "@/components/BottomNav";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import logoImg from "@/assets/premier-logo-custom.png";

import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { useCards, useCardsBySlugs, CardData } from "@/hooks/useCards";
import { useUserAccess } from "@/hooks/useUserAccess";
import { CardType1Lateral } from "@/components/cards/CardType1Lateral";
import CardType2Top from "@/components/cards/CardType2Top";
import { CardFunnelModal } from "@/components/cards/CardFunnelModal";
import { usePayCardTrigger } from "@/hooks/usePayCardTrigger";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import { useLinks } from "@/contexts/LinksContext";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);
  const [showLifetimeInfoModal, setShowLifetimeInfoModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [funnelCard, setFunnelCard] = useState<CardData | null>(null);
  const [bannerPayCard, setBannerPayCard] = useState<PayCardData | null>(null);

  const mockUser = mockGetUser();
  const config = getStoredConfig();
  const { house: userHouse } = useUserBettingHouse();
  const { cards: availableEntries, loading: loadingEntries } = useCardsBySlugs(["futebol"]);
  const { cards: quickCards } = useCards("quick_access");
  const { cards: ultimosGreensCards } = useCardsBySlugs(["ultimos-greens"]);
  const ultimosGreensCard = ultimosGreensCards?.[0] || null;
  const access = useUserAccess();
  const { triggerPayCard, payCard: pcData, open: pcOpen, closePayCard } = usePayCardTrigger();
  const { links } = useLinks();

  // Derive lifetime for info modal only
  const [isLifetime, setIsLifetime] = useState(false);
  const [telegramGroupUrl, setTelegramGroupUrl] = useState<string | null>(null);
  useEffect(() => {
    const checkEntitlements = async () => {
      if (!mockUser) return;
      const { data: userData } = await supabase.from("users").select("id").eq("email", mockUser.email.toLowerCase().trim()).maybeSingle();
      if (!userData?.id) return;
      const { data: ents } = await supabase
        .from("entitlements")
        .select("product_key")
        .eq("user_id", userData.id)
        .eq("status", "active");
      const keys = (ents ?? []).map((e) => e.product_key);
      setIsLifetime(keys.includes("acesso_vitalicio"));
    };
    checkEntitlements();
  }, []);

  // Track app_open event once on mount
  useEffect(() => {
    trackEvent("app_open");
  }, []);


  useEffect(() => {
    console.log("DADOS BRUTOS RECEBIDOS DO BANCO:", JSON.stringify(availableEntries, null, 2));
  }, [availableEntries]);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login"); return; }
    setLoading(false);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('popup_shown_') || key === 'welcome_popup_shown') localStorage.removeItem(key);
    });
  }, [navigate]);

  const handleLogout = () => { clearAuth(); toast.success("Logout realizado com sucesso"); navigate("/login"); };
  const handleSupport = () => { navigate("/support"); };
  const handlePromotions = () => { setShowPromotionsModal(true); };
  const handleBuyLifetime = () => { window.open(CHECKOUT_LINKS.vitalicio, '_blank'); setShowLifetimeModal(false); };

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
        ...(access.hasMultiplasBingo ? ["multiplas_bingo"] : []),
        ...(access.hasLiveTelegram ? ["live_telegram"] : []),
      ],
    );
    return !isBlocked;
  };

  const handleOpenPayCardById = async (payCardId: string) => {
    const { data } = await supabase.from("pay_cards" as any).select("*").eq("id", payCardId).maybeSingle();
    if (data) setBannerPayCard(data as any as PayCardData);
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
    const s = (card.slug || "").toLowerCase();
    if (s === "futebol") { navigate("/sport/1"); return; }
    if (s === "multiplas_bingo") { navigate("/odds-altas"); return; }
    if (s === "alavancagem") { navigate("/alavancagem"); return; }
  };

  const renderCard = (card: CardData) => {
    const access = hasAccess(card);
    if (card.card_type === "type1_lateral") {
      return <CardType1Lateral key={card.id} card={card} hasAccess={access} onAction={() => handleCardAction(card)} />;
    }
    return (
      <CardType2Top key={card.id} card={card} hasAccess={access} onAction={() => handleCardAction(card)} />
    );
  };

  return (
    <>
    <style>{`
  @keyframes futebol-frame-pulse {
        0%, 100% {
      background-color: rgba(0, 255, 127, 0.4);
        }
        50% {
      background-color: rgba(0, 255, 127, 1);
        }
      }
      .futebol-glow-wrapper {
    animation: futebol-frame-pulse 0.9s ease-in-out infinite;
    border-radius: 20px;
    padding: 5px;
        display: block;
  }
  .futebol-glow-wrapper > * {
    border-radius: 15px;
    overflow: hidden;
      }
    `}</style>
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0 bg-navy-dark">
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none" style={{ background: "rgba(0,255,127,0.06)" }} />

      <AppHeader onShowLifetimeInfoModal={() => setShowLifetimeInfoModal(true)} />

      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">
        

        {/* Main Entry Cards */}
        <section className="space-y-4 sm:space-y-6">
          <h2
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '20px',
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Entradas Disponíveis
          </h2>
          <div className="space-y-3">
            {loadingEntries ? (
              <p className="px-1 text-sm text-muted-foreground">Carregando...</p>
            ) : availableEntries.length > 0 ? (
              availableEntries.map((card) => (
              card.slug?.toLowerCase() === "futebol" ? (
                  <div key={card.id} className="futebol-glow-wrapper">
                    <CardType1Lateral card={card} onAction={() => handleCardAction(card)} />
                  </div>
                ) : (
                  <CardType1Lateral key={card.id} card={card} onAction={() => handleCardAction(card)} />
                )
              ))
            ) : (
              <p className="px-1 text-sm text-muted-foreground">Nenhuma entrada disponível no momento.</p>
            )}
          </div>
        </section>

        {/* Quick Access */}
        {quickCards.length > 0 && (
          <section className="space-y-2.5">
            <h2
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: '18px',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              ⚡ Acesso Rápido
            </h2>
            <div className="flex flex-col gap-3">
              {quickCards.map(renderCard)}
            </div>
          </section>
        )}

        {/* Seção Últimos Bilhetes */}
        <div>
          {/* Título da seção */}
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: '18px',
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🎫 ÚLTIMOS BILHETES
          </h2>
          {/* Card no formato lateral — idêntico ao CardType1Lateral */}
          <div
            onClick={() => navigate("/ultimos-greens")}
            style={{
              background: '#112236',
              border: '1.5px solid rgba(255,255,255,0.22)',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'stretch',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* Imagem lateral esquerda — 100×120px igual ao CardType1Lateral */}
            <div style={{
              width: '100px',
              minWidth: '100px',
              height: '120px',
              borderRadius: '10px 0 0 10px',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #1a2a1a 0%, #0d1f0d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {ultimosGreensCard?.image_urls?.mobile ? (
                <img
                  src={ultimosGreensCard.image_urls.mobile}
                  alt="Últimos Greens"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '40px', lineHeight: 1 }}>🏆</span>
              )}
            </div>
            {/* Conteúdo direito */}
            <div style={{
              flex: 1,
              padding: '12px 12px 12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}>
              {/* Badge GREENS no canto superior direito */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(240,180,41,0.15)',
                border: '1px solid rgba(240,180,41,0.3)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '11px',
                color: '#F0B429',
                letterSpacing: '1px',
              }}>
                🏆 GREENS
              </div>
              {/* Título e subtítulo */}
              <div style={{ paddingRight: '70px' }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: '18px',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                  marginBottom: '4px',
                }}>
                  {ultimosGreensCard?.title || 'Últimos Greens'}
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: '12px',
                  color: '#94A3B8',
                  lineHeight: 1.3,
                }}>
                  {ultimosGreensCard?.subtitle || 'Veja os bilhetes que bateram'}
                </div>
              </div>
              {/* Botão VER HISTÓRICO */}
              <button
                onClick={(e) => { e.stopPropagation(); navigate("/ultimos-greens"); }}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '7px 0',
                  background: '#00FF7F',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#000000',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                }}
              >
                VER HISTÓRICO
              </button>
            </div>
          </div>
        </div>
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

      <BasicPlanModal open={showBasicModal} onClose={() => setShowBasicModal(false)} />

      {/* Modal Promoções */}
      {showPromotionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPromotionsModal(false)}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.25)", boxShadow: "0 0 40px rgba(0,255,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.1)", border: "1px solid rgba(0,255,0,0.3)" }}>
                  <Gift className="w-5 h-5" style={{ color: "#00FF00" }} />
                </div>
                <div><h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Promoções do Premier Ultra</h2></div>
              </div>
              <button onClick={() => setShowPromotionsModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]">
                <X className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
            </div>
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.2)" }}>
                <Sparkles className="w-8 h-8" style={{ color: "#00FF00" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#FFFFFF" }}>Em breve!</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
                Bônus, condições especiais e liberações exclusivas para membros do Premier Ultra.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowPromotionsModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compra Vitalício is now in AppHeader */}

      {/* Modal Info Vitalício */}
      {showLifetimeInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLifetimeInfoModal(false)}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.25)", boxShadow: "0 0 40px rgba(0,255,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.1)", border: "1px solid rgba(0,255,0,0.3)" }}>
                  <Crown className="w-5 h-5" style={{ color: "#00FF00" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Parabéns! 🎉</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>Membro Vitalício</p>
                </div>
              </div>
              <button onClick={() => setShowLifetimeInfoModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]">
                <X className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
                Você tem <span style={{ color: "#00FF00", fontWeight: 600 }}>acesso vitalício e ilimitado</span> a todas as funcionalidades e futuras atualizações do Premier Ultra. Aproveite!
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowLifetimeInfoModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}


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

      
      <BottomNav />

      {funnelCard && (
        <CardFunnelModal card={funnelCard} open={!!funnelCard} onClose={() => setFunnelCard(null)} />
      )}
      {/* PayCard modal now in AppHeader for header pills; keep for banner pay cards */}
      {bannerPayCard && (
        <PayCardFunnelModal payCard={bannerPayCard} open={!!bannerPayCard} onClose={() => setBannerPayCard(null)} />
      )}
    </div>
    </>
  );
};

export default Home;
