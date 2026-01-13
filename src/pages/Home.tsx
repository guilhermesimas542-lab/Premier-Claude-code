import { LogOut, Menu, Headphones, Crown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { AppConfig } from "@/types/auth";
import { getBackgroundImageUrl } from "@/lib/sports";
import { Sport } from "@/types/sports";
import { PremiumSportCard } from "@/components/PremiumSportCard";
import BasicPlanModal from "@/components/BasicPlanModal";
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

  // Boolean para acesso vitalício (trocar depois pela lógica real)
  const hasLifetimeAccess = false;

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
    
    console.log('[Home] purchasedPlan:', purchasedPlan, 'isFreeUser:', isFreeUser);
    
    if (isFreeUser) {
      // Reset counter for testing (remove this line in production)
      localStorage.removeItem('basicPlanModalViews');
      localStorage.removeItem('basicPlanModalExpiration');
      setShowBasicModal(true);
    }
  }, []);

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleSupport = () => {
    toast.info("Em breve");
    setMenuOpen(false);
  };

  const handleAcquireAccess = () => {
    toast.info("Em breve: redirecionamento para checkout");
    setMenuOpen(false);
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
    const colors = sportColorSchemes[sport.id] || sportColorSchemes[1]; // Fallback para Futebol (ID 1)
    
    // Tipo 0: Verifica enabled para premium ou bloqueado
    // Tipo 1: Em desenvolvimento
    // Tipo 2: Pré-venda
    
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
    <div className="min-h-screen bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] relative overflow-hidden">
      {/* Purple glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0A1A]/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Premier Ultra" className="h-10 w-auto" />
            <span className="text-lg font-bold text-white">Premier Ultra</span>
          </div>
          
          <div className="flex items-center gap-3">
            {config?.user && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-purple-300/60">Usuário</span>
                <span className="text-sm font-bold text-white">{config.user.userMail}</span>
              </div>
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#0D0A1A]/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-xl shadow-purple-900/30 overflow-hidden z-50">
                  <div className="py-2">
                    {/* Suporte */}
                    <button
                      onClick={handleSupport}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left text-purple-200 hover:bg-purple-500/15 transition-colors"
                    >
                      <Headphones className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium">Suporte</span>
                    </button>

                    {/* Acesso condicional */}
                    {hasLifetimeAccess ? (
                      <div className="px-4 py-3 flex items-center gap-3 text-purple-400/60">
                        <Crown className="w-4 h-4" />
                        <span className="text-sm">Cliente com acesso vitalício</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleAcquireAccess}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-purple-200 hover:bg-purple-500/15 transition-colors"
                      >
                        <Crown className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Adquirir acesso</span>
                      </button>
                    )}

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
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Entradas Disponíveis - Premium */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
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
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="border-t border-purple-500/20 pt-6 text-center">
            <p className="text-sm text-purple-300/50 font-medium">Premier Ultra ©</p>
            <p className="text-xs text-purple-300/40 mt-1">Análises processadas continuamente</p>
          </div>
        </div>
      </footer>

      {/* Basic Plan Conversion Modal for Free Users */}
      <BasicPlanModal 
        open={showBasicModal} 
        onClose={() => setShowBasicModal(false)} 
      />
    </div>
  );
};

export default Home;
