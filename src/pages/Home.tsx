import { LogOut, Menu, Headphones, X, Gift, Sparkles, ShoppingCart, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isAuthenticated, clearAuth, getStoredConfig, getBackgroundImageUrl } from "@/lib/auth";
import { mockGetUser } from "@/mocks/user";
import BasicPlanModal from "@/components/BasicPlanModal";
import { PromoCarousel } from "@/components/PromoCarousel";
import { BottomNav } from "@/components/BottomNav";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import logoImg from "@/assets/premier-logo-custom.png";
import MatrixRain from "@/components/MatrixRain";
import { WelcomePopup } from "@/components/HousePopups";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { useCards, CardData } from "@/hooks/useCards";
import { useUserAccess } from "@/hooks/useUserAccess";
import { CardType1Lateral } from "@/components/cards/CardType1Lateral";
import { CardType2Top } from "@/components/cards/CardType2Top";
import { CardFunnelModal } from "@/components/cards/CardFunnelModal";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [funnelCard, setFunnelCard] = useState<CardData | null>(null);

  const mockUser = mockGetUser();
  const config = getStoredConfig();
  const hasLifetimeAccess = true;
  const { house: userHouse } = useUserBettingHouse();
  const { cards: sportCards } = useCards("sport");
  const { cards: quickCards } = useCards("quick_access");
  const access = useUserAccess();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login"); return; }
    setLoading(false);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('popup_shown_') || key === 'welcome_popup_shown') localStorage.removeItem(key);
    });
  }, [navigate]);

  const handleLogout = () => { clearAuth(); toast.success("Logout realizado com sucesso"); navigate("/login"); };
  const handleSupport = () => { navigate("/support"); setMenuOpen(false); };
  const handlePromotions = () => { setShowPromotionsModal(true); setMenuOpen(false); };
  const handleBuyLifetime = () => { window.open(CHECKOUT_LINKS.vitalicio, '_blank'); setShowLifetimeModal(false); };

  const hasAccess = (card: CardData): boolean => {
    if (!card.requires_access || !card.access_field) return true;
    return !!(access as any)[card.access_field];
  };

  const handleCardAction = (card: CardData) => {
    if (card.requires_access && !hasAccess(card)) {
      if ((card.questions && card.questions.length > 0) || card.checkout_url) {
        setFunnelCard(card);
      }
      return;
    }
    if (card.slug === "futebol") { navigate("/sport/1"); return; }
    if (card.slug === "cassino") { navigate("/cassino"); return; }
    if (card.slug === "odds_altas") { navigate("/odds-altas"); return; }
    if (card.slug === "alavancagem") { navigate("/alavancagem"); return; }
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
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0" style={{
      background: "linear-gradient(135deg, rgba(0,255,0,0.04) 0%, #000000 35%, #000000 65%, rgba(0,255,0,0.03) 100%)",
    }}>
      <MatrixRain opacity={0.28} />
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none" style={{ background: "rgba(0,255,0,0.035)" }} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,200,0,0.025)" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(0,0,0,0.92)", borderColor: "rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <img src={logoImg} alt="Premier Ultra" className="h-10 sm:h-12 w-auto" style={{ filter: "drop-shadow(0 0 10px rgba(0,255,0,0.5))" }} />
              <span className="text-2xl sm:text-4xl font-bold" style={{ color: "#FFFFFF", textShadow: "0 0 14px rgba(0,255,0,0.3)" }}>Premier Ultra</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {mockUser && (
                <span className="hidden md:block text-xs sm:text-sm font-medium truncate max-w-[180px]" style={{ color: "#CCCCCC" }}>
                  {mockUser.email}
                </span>
              )}
              
              {hasLifetimeAccess ? (
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold" style={{ background: "rgba(0,255,0,0.1)", color: "#FFFFFF", border: "1px solid rgba(0,255,0,0.4)", boxShadow: "0 0 10px rgba(0,255,0,0.2)" }}>
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Acesso</span> vitalício
                </span>
              ) : (
                <button onClick={() => setShowLifetimeModal(true)} className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer" style={{ background: "rgba(255,0,0,0.1)", color: "#FF4444", border: "1px solid rgba(255,0,0,0.3)" }}>
                  <span className="hidden sm:inline">Sem</span> vitalício
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg transition-colors" style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.25)" }}>
                  {menuOpen ? <X className="w-5 h-5" style={{ color: "#00FF00" }} /> : <Menu className="w-5 h-5" style={{ color: "#00FF00" }} />}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 sm:w-56 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden z-50" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.2)", boxShadow: "0 0 30px rgba(0,255,0,0.1)" }}>
                    <div className="py-2">
                      <button onClick={handlePromotions} className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-[rgba(0,255,0,0.07)]">
                        <Gift className="w-4 h-4" style={{ color: "#00FF00" }} />
                        <span className="text-sm font-medium" style={{ color: "#FFFFFF" }}>Promoções</span>
                      </button>
                      <button onClick={handleSupport} className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-[rgba(0,255,0,0.07)]">
                        <Headphones className="w-4 h-4" style={{ color: "#00FF00" }} />
                        <span className="text-sm font-medium" style={{ color: "#FFFFFF" }}>Suporte</span>
                      </button>
                      <div className="my-2 border-t" style={{ borderColor: "rgba(0,255,0,0.15)" }} />
                      <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="w-full px-4 py-3 flex items-center gap-3 text-left text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Sair</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">
        <PromoCarousel />

        {/* Sport Cards */}
        <section className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight" style={{ color: "#FFFFFF" }}>
            Entradas Disponíveis
          </h2>
          <div className="space-y-3">
            {sportCards.map(renderCard)}
          </div>
        </section>

        {/* Quick Access */}
        {quickCards.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold" style={{ color: "#FFFFFF" }}>
              ⚡ Acesso Rápido
            </h2>
            <div className="space-y-3">
              {quickCards.map(renderCard)}
            </div>
          </section>
        )}
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
              <a href="https://wa.link/1p68qg" target="_blank" rel="noopener noreferrer" className="transition-colors hover:underline" style={{ color: "#CCCCCC" }}>
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

      {/* Terms Modal */}
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

      <WelcomePopup house={userHouse} />
      <BottomNav />

      {funnelCard && (
        <CardFunnelModal card={funnelCard} open={!!funnelCard} onClose={() => setFunnelCard(null)} />
      )}
    </div>
  );
};

export default Home;
