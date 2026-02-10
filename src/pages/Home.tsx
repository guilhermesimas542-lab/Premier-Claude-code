import { LogOut, Menu, Headphones, X, Gift, Sparkles, ShoppingCart, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isAuthenticated, clearAuth, getStoredConfig, getBackgroundImageUrl } from "@/lib/auth";
import { mockGetUser } from "@/mocks/user";
import { MOCK_SPORTS } from "@/mocks/sports";
import { PremiumSportCard } from "@/components/PremiumSportCard";
import BasicPlanModal from "@/components/BasicPlanModal";
import { PromoCarousel } from "@/components/PromoCarousel";
import { QuickAccessCards } from "@/components/QuickAccessCards";
import { BottomNav } from "@/components/BottomNav";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import logoImg from "@/assets/premier-logo.png";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);

  const mockUser = mockGetUser();
  const config = getStoredConfig();
  const hasLifetimeAccess = true; // Mock: always ULTRA

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    setLoading(false);
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    const targetDate = new Date("2025-12-17T20:00:00").getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      if (difference <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleSupport = () => {
    navigate("/support");
    setMenuOpen(false);
  };

  const handlePromotions = () => {
    setShowPromotionsModal(true);
    setMenuOpen(false);
  };

  const handleBuyLifetime = () => {
    window.open(CHECKOUT_LINKS.vitalicio, '_blank');
    setShowLifetimeModal(false);
  };

  const sportEmojiMap: Record<number, string> = {
    1: "⚽", 2: "🥊", 3: "⚾", 4: "🏈", 5: "🎾", 6: "🏀",
    7: "⚽", 8: "🏒", 9: "🤾", 10: "🏐", 11: "🎰", 12: "✈️",
  };

  const sportColorSchemes: Record<number, { primary: string; secondary: string; glow: string }> = {
    1: { primary: "#00FF7F", secondary: "#00CC66", glow: "rgba(0, 255, 127, 0.35)" },
    2: { primary: "#FF4E4E", secondary: "#CC3E3E", glow: "rgba(255, 78, 78, 0.35)" },
    3: { primary: "#4A90FF", secondary: "#3A70CC", glow: "rgba(74, 144, 255, 0.35)" },
    4: { primary: "#2ECC71", secondary: "#27AE60", glow: "rgba(46, 204, 113, 0.35)" },
    5: { primary: "#FFD700", secondary: "#CCAC00", glow: "rgba(255, 215, 0, 0.35)" },
    6: { primary: "#FF8C42", secondary: "#CC7035", glow: "rgba(255, 140, 66, 0.35)" },
    7: { primary: "#00D4FF", secondary: "#00A8CC", glow: "rgba(0, 212, 255, 0.35)" },
    8: { primary: "#5BC0EB", secondary: "#4899BC", glow: "rgba(91, 192, 235, 0.35)" },
    9: { primary: "#FF6B9D", secondary: "#CC567E", glow: "rgba(255, 107, 157, 0.35)" },
    10: { primary: "#FFEA00", secondary: "#CCBB00", glow: "rgba(255, 234, 0, 0.35)" },
    11: { primary: "#A855F7", secondary: "#8644C5", glow: "rgba(168, 85, 247, 0.35)" },
    12: { primary: "#FF6B35", secondary: "#E85D2D", glow: "rgba(255, 107, 53, 0.35)" },
  };

  const mappedSports = MOCK_SPORTS.map((sport) => {
    const tipo = sport.tipo ?? 0;
    const colors = sportColorSchemes[sport.id] || sportColorSchemes[1];
    
    let cardType: 'premium' | 'locked' | 'development' | 'presale' = 'development';
    if (tipo === 0) cardType = sport.enabled ? 'premium' : 'locked';
    else if (tipo === 1) cardType = 'development';
    else if (tipo === 2) cardType = 'presale';

    let route = "#";
    if (cardType === 'premium') {
      route = sport.id === 11 ? '/cassino' : `/sport/${sport.id}`;
    }

    return {
      ...sport,
      emoji: sportEmojiMap[sport.id] || "🏆",
      route,
      image: getBackgroundImageUrl(sport.background),
      gradient: "from-[#000636] via-[#0026A3] to-[#0033C6]",
      isPremium: cardType === 'premium',
      isLocked: cardType === 'locked',
      isDevelopment: cardType === 'development',
      isPreSale: cardType === 'presale',
      colors,
      badgeColor: cardType === 'premium'
        ? `bg-[${colors.primary}]/20 text-[${colors.primary}] border-[${colors.primary}]/40`
        : "bg-muted/30 text-muted-foreground border-border/30",
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] relative overflow-hidden pb-20 md:pb-0">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0A1A]/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <img src={logoImg} alt="Premier Ultra" className="h-8 sm:h-10 w-auto" />
              <span className="text-base sm:text-lg font-bold text-white">Premier Ultra</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {mockUser && (
                <span className="hidden md:block text-xs sm:text-sm font-medium text-white/80 truncate max-w-[180px]">
                  {mockUser.email}
                </span>
              )}
              
              {hasLifetimeAccess ? (
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Acesso</span> vitalício
                </span>
              ) : (
                <button
                  onClick={() => setShowLifetimeModal(true)}
                  className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-colors cursor-pointer"
                >
                  <span className="hidden sm:inline">Sem</span> vitalício
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
                >
                  {menuOpen ? <X className="w-5 h-5 text-purple-300" /> : <Menu className="w-5 h-5 text-purple-300" />}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 sm:w-56 bg-[#0D0A1A]/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-xl shadow-purple-900/30 overflow-hidden z-50">
                    <div className="py-2">
                      <button onClick={handlePromotions} className="w-full px-4 py-3 flex items-center gap-3 text-left text-purple-200 hover:bg-purple-500/15 transition-colors">
                        <Gift className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Promoções</span>
                      </button>
                      <button onClick={handleSupport} className="w-full px-4 py-3 flex items-center gap-3 text-left text-purple-200 hover:bg-purple-500/15 transition-colors">
                        <Headphones className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Suporte</span>
                      </button>
                      <div className="my-2 border-t border-purple-500/20" />
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

        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
              Entradas Disponíveis
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-purple-300/60">Carregando esportes...</p>
              </div>
            ) : (
              mappedSports.filter(sport => sport.isPremium || sport.isPreSale).map((sport) => (
                <PremiumSportCard
                  key={sport.id}
                  id={sport.id}
                  name={sport.name}
                  emoji={sport.emoji}
                  isPremium={sport.isPremium}
                  isLocked={sport.isLocked}
                  isDevelopment={sport.isDevelopment}
                  isPreSale={sport.isPreSale}
                  colors={sport.colors}
                  countdown={sport.isPreSale ? countdown : undefined}
                  sportSubheadline={sport.id === 1 ? "Entradas Ativas no Premier Ultra" : undefined}
                  casinoTitle={sport.id === 11 ? "Painel IA em Execução" : undefined}
                  casinoSubheadline={sport.id === 11 ? "Dados processados continuamente para decisões rápidas" : undefined}
                  onClick={() => {
                    if (sport.isPremium && sport.route !== "#") {
                      navigate(sport.route);
                    }
                  }}
                />
              ))
            )}
          </div>
        </section>

        <QuickAccessCards />
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="border-t border-purple-500/20 pt-6 text-center space-y-2">
            <p className="text-sm text-purple-300/60 font-medium">Premier Ultra ©</p>
            <p className="text-xs text-purple-300/50">Análises processadas continuamente</p>
            <p className="text-[11px] text-purple-300/40 pt-2">
              Dados protegidos • 18+ • Jogue com responsabilidade
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-purple-300/50">
              <a href="/termos" className="hover:text-purple-400 transition-colors">Termos & Privacidade</a>
              <span className="text-purple-500/30">|</span>
              <a href="/support" className="hover:text-purple-400 transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>

      <BasicPlanModal open={showBasicModal} onClose={() => setShowBasicModal(false)} />

      {/* Modal Promoções */}
      {showPromotionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPromotionsModal(false)}>
          <div className="w-full max-w-md bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5 border-b border-purple-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-300" />
                </div>
                <div><h2 className="text-lg font-bold text-white">Promoções do Premier Ultra</h2></div>
              </div>
              <button onClick={() => setShowPromotionsModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors">
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Em breve!</h3>
              <p className="text-sm text-purple-300/70 leading-relaxed">
                Bônus, condições especiais e liberações exclusivas para membros do Premier Ultra.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowPromotionsModal(false)} className="w-full py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 font-medium hover:bg-purple-500/30 transition-colors">
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compra Vitalício */}
      {showLifetimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowLifetimeModal(false)}>
          <div className="w-full max-w-sm bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5 border-b border-purple-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border border-amber-500/50 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div><h2 className="text-lg font-bold text-white">Acesso vitalício</h2></div>
              </div>
              <button onClick={() => setShowLifetimeModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors">
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>
            <div className="px-6 py-6 text-center">
              <p className="text-sm text-purple-200/80 leading-relaxed">
                Desbloqueie acesso total e continue usando sem limitações.
              </p>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <button onClick={handleBuyLifetime} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-900/40">
                Adquirir vitalício
              </button>
              <button onClick={() => setShowLifetimeModal(false)} className="w-full py-2.5 rounded-xl bg-transparent border border-purple-500/30 text-purple-300 font-medium hover:bg-purple-500/10 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
