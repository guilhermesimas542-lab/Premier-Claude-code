import { LogOut, Headphones, X, Gift, Sparkles, ShoppingCart, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { PromoCarousel } from "@/components/PromoCarousel";
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
  const { cards: availableEntries, loading: loadingEntries } = useCardsBySlugs(["futebol", "cassino"]);
  const { cards: quickCards } = useCards("quick_access");
  const access = useUserAccess();
  const { triggerPayCard, payCard: pcData, open: pcOpen, closePayCard } = usePayCardTrigger();
  const { links } = useLinks();

  // Derive lifetime & telegram from entitlements table (single source of truth)
  const [isLifetime, setIsLifetime] = useState(false);
  const [isTelegramMember, setIsTelegramMember] = useState(false);
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
      setIsTelegramMember(keys.includes("live_telegram"));
    };
    checkEntitlements();
  }, []);

  // Load telegram group URL from the user's betting house
  useEffect(() => {
    if (!userHouse?.id) return;
    supabase
      .from("betting_houses")
      .select("telegram_group_url")
      .eq("id", userHouse.id)
      .maybeSingle()
      .then(({ data }) => {
        setTelegramGroupUrl((data as any)?.telegram_group_url ?? null);
      });
  }, [userHouse?.id]);

  // Track app_open event once on mount
  useEffect(() => {
    trackEvent("app_open");
  }, []);

  // Listen for pay_card banner events
  useEffect(() => {
    const handlePayCardFromBanner = async (e: Event) => {
      const { payCardId } = (e as CustomEvent).detail;
      if (!payCardId) return;
      const { data } = await supabase.from("pay_cards" as any).select("*").eq("id", payCardId).maybeSingle();
      if (data) {
        setBannerPayCard(data as any as PayCardData);
      }
    };
    window.addEventListener("open-paycard-from-banner", handlePayCardFromBanner);
    return () => window.removeEventListener("open-paycard-from-banner", handlePayCardFromBanner);
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
        ...(access.hasOddsAltas ? ["desaltas"] : []),
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
    if (s === "cassino") { navigate("/cassino"); return; }
    if (s === "odds_altas") { navigate("/odds-altas"); return; }
    if (s === "alavancagem") { navigate("/alavancagem"); return; }
  };

  const renderCard = (card: CardData) => {
    if (card.card_type === "type1_lateral") {
      return <CardType1Lateral key={card.id} card={card} onAction={() => handleCardAction(card)} />;
    }
    return (
      <CardType2Top key={card.id} card={card} hasAccess={hasAccess(card)} onAction={() => handleCardAction(card)} />
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0 bg-navy-dark">
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none" style={{ background: "rgba(0,255,127,0.06)" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(0,0,0,0.92)", borderColor: "rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo — icon only */}
            <div className="shrink-0">
              <img src={logoImg} alt="Premier Ultra" className="h-10 sm:h-12 w-auto" style={{ filter: "drop-shadow(0 0 10px rgba(0,255,0,0.5))" }} />
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live Telegram pill */}
              {isTelegramMember ? (
                <a
                  href={telegramGroupUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full cursor-pointer transition-all hover:scale-105"
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0,255,127,0.08)',
                    border: '1px solid rgba(0,255,127,0.2)',
                    animation: 'telegramPulse 2s ease-in-out infinite',
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" style={{ color: "#FFFFFF" }}>
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L9.1 13.617l-2.97-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                  </svg>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#FFFFFF',
                    letterSpacing: '1px',
                  }}>
                    CANAL
                  </span>
                </a>
              ) : (
                <button onClick={async () => { await triggerPayCard('live_telegram'); }} className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer" style={{ background: "rgba(255,0,0,0.1)", color: "#FF4444", border: "1px solid rgba(255,0,0,0.3)" }}>
                  Live <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              )}

              {/* Vitalício button */}
              {isLifetime ? (
                <button onClick={() => setShowLifetimeInfoModal(true)} className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold cursor-pointer transition-all hover:scale-105" style={{ background: "rgba(0,255,0,0.1)", color: "#FFFFFF", border: "1px solid rgba(0,255,0,0.4)", boxShadow: "0 0 10px rgba(0,255,0,0.2)" }}>
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Acesso</span> vitalício
                </button>
              ) : (
                <button onClick={async () => { const found = await triggerPayCard('vitalicio'); if (!found) setShowLifetimeModal(true); }} className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer" style={{ background: "rgba(255,0,0,0.1)", color: "#FF4444", border: "1px solid rgba(255,0,0,0.3)" }}>
                  <span className="hidden sm:inline">Sem</span> vitalício
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">
        <PromoCarousel />

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
                <CardType1Lateral key={card.id} card={card} onAction={() => handleCardAction(card)} />
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}>
              {quickCards.map(renderCard)}
            </div>
          </section>
        )}

        {/* Últimos Bilhetes */}
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
            🎫 Últimos Bilhetes
          </h2>
          <button
            onClick={() => navigate("/ultimos-greens")}
            className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all hover:-translate-y-0.5"
            style={{ background: "#112236", borderColor: "rgba(255,255,255,0.30)" }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(0,255,0,0.1)", border: "1px solid rgba(0,255,0,0.3)" }}>
              <span className="text-lg">🏆</span>
            </div>
            <div className="flex-1 text-left">
              <h3 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '16px',
                color: '#FFFFFF',
              }}>Histórico de Greens</h3>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: '13px',
                color: '#94A3B8',
              }}>Veja os últimos bilhetes vencedores</p>
            </div>
            <span
              style={{
                background: 'transparent',
                border: '1.5px solid #00FF7F',
                color: '#00FF7F',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                padding: '6px 14px',
              }}
            >
              Ver todos
            </span>
          </button>
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

      {/* Modal Compra Vitalício */}
      {showLifetimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLifetimeModal(false)}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.25)", boxShadow: "0 0 40px rgba(0,255,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.1)", border: "1px solid rgba(0,255,0,0.3)" }}>
                  <Crown className="w-5 h-5" style={{ color: "#00FF00" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Acesso Vitalício</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>Pagamento único • Acesso permanente</p>
                </div>
              </div>
              <button onClick={() => setShowLifetimeModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]">
                <X className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
            </div>
            <div className="px-6 py-6">
              <button onClick={handleBuyLifetime} className="w-full py-3.5 rounded-xl font-bold text-sm transition-all" style={{ background: "#00FF00", color: "#000000", boxShadow: "0 0 20px rgba(0,255,0,0.4)" }}>
                Quero Acesso Vitalício
              </button>
              <button onClick={() => setShowLifetimeModal(false)} className="w-full text-center mt-3 text-xs py-2 transition-colors" style={{ color: "#AAAAAA" }}>
                Não agora
              </button>
            </div>
          </div>
        </div>
      )}

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
      {pcData && (
        <PayCardFunnelModal payCard={pcData} open={pcOpen} onClose={closePayCard} />
      )}
      {bannerPayCard && (
        <PayCardFunnelModal payCard={bannerPayCard} open={!!bannerPayCard} onClose={() => setBannerPayCard(null)} />
      )}
    </div>
  );
};

export default Home;
