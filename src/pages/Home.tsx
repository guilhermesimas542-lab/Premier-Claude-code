import { LogOut, Menu, Headphones, X, Gift, Sparkles, ShoppingCart, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { getStoredConfig, clearAuth } from "@/lib/auth";
import { isAuthenticated as isAuthenticatedNew, getStoredUser, getMe, persistAuth } from "@/lib/api";
import { AppConfig } from "@/types/auth";
import { getBackgroundImageUrl } from "@/lib/sports";
import { Sport } from "@/types/sports";
import { PremiumSportCard } from "@/components/PremiumSportCard";
import BasicPlanModal from "@/components/BasicPlanModal";
import { PromoCarousel } from "@/components/PromoCarousel";
import { QuickAccessCards } from "@/components/QuickAccessCards";
import { BottomNav } from "@/components/BottomNav";
import { useSession } from "@/hooks/useSession";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import logoImg from "@/assets/premier-logo.png";

const Home = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);

  // Session tracking (start/heartbeat/end)
  useSession();

  // Dados do novo backend
  const newUser = getStoredUser();
  const hasLifetimeAccess = newUser?.is_vitalicio ?? false;

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
    // Verificar autenticação (nova API primeiro, fallback para antiga)
    const hasNewAuth = isAuthenticatedNew();
    const hasOldAuth = !!localStorage.getItem("jwt");
    
    if (!hasNewAuth && !hasOldAuth) {
      navigate("/login");
      return;
    }

    // Se tem nova auth, chamar /me para validar token
    if (hasNewAuth) {
      getMe().then(response => {
        if (response.success && response.user && response.allowed_access) {
          const token = localStorage.getItem('premier_token') || '';
          persistAuth(token, response.user, response.allowed_access, 
                      response.show_paywall_popup ?? false, response.checkout ?? null);
        }
      }).catch(err => {
        console.error('Error refreshing auth:', err);
      });
    }

    const storedConfig = getStoredConfig();
    if (storedConfig) {
      setConfig(storedConfig);
    }

    // Dados mockados com diferentes estados
    const mockSports: Sport[] = [
      {
        id: 1,
        name: "Futebol",
        enabled: true,
        isproplan: false,
        background: "cyberbet_3ef04120-9b39-44f5-9e4e-0127a76326bb",
        tipo: 0, // Premium ativo - único liberado
      },
      {
        id: 2,
        name: "MMA",
        enabled: true,
        isproplan: false,
        background: "cyberbet_76a934f8-71c1-41a2-a9fe-93c36359dd7f",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 3,
        name: "Basquete",
        enabled: true,
        isproplan: false,
        background: "cyberbet_20d5c209-1849-49d0-9475-4eabf2541b07",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 4,
        name: "Tenis",
        enabled: true,
        isproplan: false,
        background: "cyberbet_75203e34-3699-4203-9063-24bb8b805083",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 5,
        name: "Futsal",
        enabled: true,
        isproplan: false,
        background: "cyberbet_3164bd85-f9f8-4113-b776-fb37acf872a3",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 6,
        name: "Volei",
        enabled: true,
        isproplan: false,
        background: "cyberbet_55e38087-eeb7-4031-9a11-a326b50db79f",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 8,
        name: "Hoquei",
        enabled: true,
        isproplan: false,
        background: "cyberbet_255695b8-2046-4b5b-b6c5-17e7bb5e3df2",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 9,
        name: "E-Sports",
        enabled: true,
        isproplan: false,
        background: "cyberbet_3ef04120-9b39-44f5-9e4e-0127a76326bb",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 11,
        name: "Cassino",
        enabled: true,
        isproplan: false,
        background: "casino-custom",
        tipo: 0, // Premium ativo
      },
      {
        id: 12,
        name: "Premier Ultra - IA",
        enabled: true,
        isproplan: false,
        background: "futsal-custom",
        tipo: 1, // Em breve (bloqueado)
      },
    ];

    // Usar apenas mock (não busca API)
    setSports(mockSports);
    setLoading(false);
  }, [navigate]);

  // Countdown timer for Aviator launch (Dec 17, 2024 at 20:00)
  useEffect(() => {
    const targetDate = new Date("2025-12-17T20:00:00").getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      
      if (difference <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show modal for free plan users
  useEffect(() => {
    const storedConfig = getStoredConfig();
    const purchasedPlan = storedConfig?.user?.purchasedPlan ?? 0;
    const isFreeUser = purchasedPlan === 0 || purchasedPlan === -1;
    
    // Também verificar pelo novo sistema
    const newTier = newUser?.main_tier;
    const isFreeNewSystem = newTier === 'free';
    
    if (isFreeUser || isFreeNewSystem) {
      localStorage.removeItem('basicPlanModalViews');
      localStorage.removeItem('basicPlanModalExpiration');
      setShowBasicModal(true);
    }
  }, [newUser]);

  const handleLogout = () => {
    clearAuth();
    // Limpar também novo sistema
    localStorage.removeItem('premier_token');
    localStorage.removeItem('premier_user');
    localStorage.removeItem('premier_access');
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

  // Mapear esportes da API para o formato do componente (por ID)
  const sportEmojiMap: Record<number, string> = {
    1: "⚽",  // Futebol
    2: "🥊",  // MMA
    3: "⚾",  // Baseball
    4: "🏈",  // Rugby
    5: "🎾",  // Tenis
    6: "🏀",  // Basquete
    7: "⚽",  // Futsal
    8: "🏒",  // Hoquei
    9: "🤾",  // Handball
    10: "🏐", // Volei
    11: "🎰", // Cassino
    12: "✈️", // Premier Ultra - IA
  };

  // Cores premium tecnológicas por esporte (paleta dark + neon sutil)
  const sportColorSchemes: Record<number, {
    primary: string;
    secondary: string;
    glow: string;
  }> = {
    1: { // Futebol - Verde neon
      primary: "#00FF7F",
      secondary: "#00CC66",
      glow: "rgba(0, 255, 127, 0.35)",
    },
    2: { // MMA - Vermelho intenso
      primary: "#FF4E4E",
      secondary: "#CC3E3E",
      glow: "rgba(255, 78, 78, 0.35)",
    },
    3: { // Baseball - Azul royal
      primary: "#4A90FF",
      secondary: "#3A70CC",
      glow: "rgba(74, 144, 255, 0.35)",
    },
    4: { // Rugby - Verde escuro
      primary: "#2ECC71",
      secondary: "#27AE60",
      glow: "rgba(46, 204, 113, 0.35)",
    },
    5: { // Tenis - Amarelo dourado
      primary: "#FFD700",
      secondary: "#CCAC00",
      glow: "rgba(255, 215, 0, 0.35)",
    },
    6: { // Basquete - Laranja queimado
      primary: "#FF8C42",
      secondary: "#CC7035",
      glow: "rgba(255, 140, 66, 0.35)",
    },
    7: { // Futsal - Azul água / Cyan
      primary: "#00D4FF",
      secondary: "#00A8CC",
      glow: "rgba(0, 212, 255, 0.35)",
    },
    8: { // Hoquei - Azul gelo
      primary: "#5BC0EB",
      secondary: "#4899BC",
      glow: "rgba(91, 192, 235, 0.35)",
    },
    9: { // Handball - Rosa magenta
      primary: "#FF6B9D",
      secondary: "#CC567E",
      glow: "rgba(255, 107, 157, 0.35)",
    },
    10: { // Volei - Amarelo vibrante
      primary: "#FFEA00",
      secondary: "#CCBB00",
      glow: "rgba(255, 234, 0, 0.35)",
    },
    11: { // Cassino - Roxo neon
      primary: "#A855F7",
      secondary: "#8644C5",
      glow: "rgba(168, 85, 247, 0.35)",
    },
    12: { // Premier Ultra - IA - Vermelho/Laranja vibrante
      primary: "#FF6B35",
      secondary: "#E85D2D",
      glow: "rgba(255, 107, 53, 0.35)",
    },
  };

  const mappedSports = sports.map((sport) => {
    const tipo = sport.tipo ?? 0;
    const colors = sportColorSchemes[sport.id] || sportColorSchemes[1];
    
    let cardType: 'premium' | 'locked' | 'development' | 'presale' = 'development';
    
    if (tipo === 0) {
      cardType = sport.enabled ? 'premium' : 'locked';
    } else if (tipo === 1) {
      cardType = 'development';
    } else if (tipo === 2) {
      cardType = 'presale';
    }

    // Rota especial para Cassino
    let route = "#";
    if (cardType === 'premium') {
      route = sport.id === 11 ? '/cassino' : `/sport/${sport.id}`;
    }

    return {
      ...sport,
      emoji: sportEmojiMap[sport.id] || "🏆",
      route: route,
      image: getBackgroundImageUrl(sport.background),
      gradient: "from-[#000636] via-[#0026A3] to-[#0033C6]",
      isPremium: cardType === 'premium',
      isLocked: cardType === 'locked',
      isDevelopment: cardType === 'development',
      isPreSale: cardType === 'presale',
      colors: colors,
      badgeColor: cardType === 'premium'
        ? `bg-[${colors.primary}]/20 text-[${colors.primary}] border-[${colors.primary}]/40`
        : "bg-muted/30 text-muted-foreground border-border/30",
      priceFrom: cardType === 'presale' ? (sport.priceFrom || "R$ 299,00") : undefined,
      priceTo: cardType === 'presale' ? (sport.priceTo || "R$ 149,00") : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] relative overflow-hidden pb-20 md:pb-0">
      {/* Purple glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0A1A]/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo + Nome */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <img src={logoImg} alt="Premier Ultra" className="h-8 sm:h-10 w-auto" />
              <span className="text-base sm:text-lg font-bold text-white">Premier Ultra</span>
            </div>
            
            {/* Right side: Email (desktop only) + Badge + Cart + Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Email - HIDDEN no mobile, visível no md+ */}
              {(config?.user || newUser) && (
                <span className="hidden md:block text-xs sm:text-sm font-medium text-white/80 truncate max-w-[180px]">
                  {newUser?.email || config?.user?.userMail}
                </span>
              )}
              
              {/* Status Badge */}
              {hasLifetimeAccess ? (
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Acesso</span> vitalício
                </span>
              ) : (
                <button
                  onClick={() => setShowLifetimeModal(true)}
                  className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-colors cursor-pointer"
                  title="Adquirir acesso vitalício"
                >
                  <span className="hidden sm:inline">Sem</span> vitalício
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              {/* Menu Hamburger */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
                >
                  {menuOpen ? (
                    <X className="w-5 h-5 text-purple-300" />
                  ) : (
                    <Menu className="w-5 h-5 text-purple-300" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 sm:w-56 bg-[#0D0A1A]/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-xl shadow-purple-900/30 overflow-hidden z-50">
                    <div className="py-2">
                      {/* Promoções */}
                      <button
                        onClick={handlePromotions}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-purple-200 hover:bg-purple-500/15 transition-colors"
                      >
                        <Gift className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Promoções</span>
                      </button>

                      {/* Suporte */}
                      <button
                        onClick={handleSupport}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-purple-200 hover:bg-purple-500/15 transition-colors"
                      >
                        <Headphones className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Suporte</span>
                      </button>

                      {/* Divider */}
                      <div className="my-2 border-t border-purple-500/20" />

                      {/* Sair */}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-red-400 hover:bg-red-500/10 transition-colors"
                      >
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
        {/* Carrossel de Promoções */}
        <PromoCarousel />

        {/* Entradas Disponíveis - Premium */}
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
            ) : mappedSports.filter(sport => sport.isPremium || (sport as any).isPreSale).length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-purple-300/60">Nenhum esporte disponível</p>
              </div>
            ) : (
              mappedSports.filter(sport => sport.isPremium || (sport as any).isPreSale).map((sport) => (
                <PremiumSportCard
                  key={sport.id}
                  id={sport.id}
                  name={sport.name}
                  emoji={(sport as any).emoji}
                  isPremium={sport.isPremium}
                  isLocked={(sport as any).isLocked}
                  isDevelopment={(sport as any).isDevelopment}
                  isPreSale={(sport as any).isPreSale}
                  colors={(sport as any).colors}
                  priceFrom={(sport as any).priceFrom}
                  priceTo={(sport as any).priceTo}
                  countdown={(sport as any).isPreSale ? countdown : undefined}
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

        {/* Quick Access Cards - Bilhetes, Alavancagem, Odds Altas */}
        <QuickAccessCards />
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="border-t border-purple-500/20 pt-6 text-center space-y-2">
            {/* Identidade */}
            <p className="text-sm text-purple-300/60 font-medium">Premier Ultra ©</p>
            <p className="text-xs text-purple-300/50">Análises processadas continuamente</p>
            
            {/* Compliance */}
            <p className="text-[11px] text-purple-300/40 pt-2">
              Dados protegidos • 18+ • Jogue com responsabilidade
            </p>
            
            {/* Links */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-purple-300/50">
              <a 
                href="/termos" 
                className="hover:text-purple-400 transition-colors"
              >
                Termos & Privacidade
              </a>
              <span className="text-purple-500/30">|</span>
              <a 
                href="/support" 
                className="hover:text-purple-400 transition-colors"
              >
                Suporte
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Basic Plan Conversion Modal for Free Users */}
      <BasicPlanModal 
        open={showBasicModal} 
        onClose={() => setShowBasicModal(false)} 
      />

      {/* Modal Promoções */}
      {showPromotionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPromotionsModal(false)}>
          <div 
            className="w-full max-w-md bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-purple-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Promoções do Premier Ultra</h2>
                </div>
              </div>
              <button
                onClick={() => setShowPromotionsModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Em breve!</h3>
              <p className="text-sm text-purple-300/70 leading-relaxed">
                Bônus, condições especiais e liberações exclusivas para membros do Premier Ultra.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowPromotionsModal(false)}
                className="w-full py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 font-medium hover:bg-purple-500/30 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compra Vitalício (Carrinho) */}
      {showLifetimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowLifetimeModal(false)}>
          <div 
            className="w-full max-w-sm bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-purple-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border border-amber-500/50 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Acesso vitalício</h2>
                </div>
              </div>
              <button
                onClick={() => setShowLifetimeModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 text-center">
              <p className="text-sm text-purple-200/80 leading-relaxed">
                Desbloqueie acesso total e continue usando sem limitações.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={handleBuyLifetime}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-900/40"
              >
                Adquirir vitalício
              </button>
              <button
                onClick={() => setShowLifetimeModal(false)}
                className="w-full py-2.5 rounded-xl bg-transparent border border-purple-500/30 text-purple-300 font-medium hover:bg-purple-500/10 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav - Mobile only */}
      <BottomNav />
    </div>
  );
};

export default Home;
