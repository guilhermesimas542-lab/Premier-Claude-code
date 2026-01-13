import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { SpecialBettingCard } from "@/components/SpecialBettingCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { fetchSportById } from "@/lib/sports";
import { AppConfig } from "@/types/auth";
import { Sport as SportType } from "@/types/sports";
import { useIsMobile } from "@/hooks/use-mobile";

// ============ TIPOS DE TIER (incluindo novas categorias) ============
type TierType = "GRÁTIS" | "ALAVANCAGEM" | "ODDS_ALTAS" | "BÁSICO" | "PRO" | "ULTRA" | "MÚLTIPLA";

// ============ MOCK TIPS (ÚNICA FONTE DE DADOS) ============
interface MockTip {
  id: number;
  time1_name: string;
  time2_name: string;
  time1_logo: string;
  time2_logo: string;
  real_odd_market: string;
  odd_Name: string;
  odd_Value: number;
  odd_market: string;
  is_pro_plan: number;
  expiration_date: string;
  url_iframe: string;
  selections_count?: number;
  // Nova propriedade para categorias especiais
  special_type?: "ALAVANCAGEM" | "ODDS_ALTAS";
}

// Para teste de expiração, ajuste o horário de uma tip para já ter passado
const MOCK_TIPS: MockTip[] = [
  {
    id: 99901,
    time1_name: "Time 1",
    time2_name: "Time 2",
    time1_logo: "",
    time2_logo: "",
    real_odd_market: "Total de gols",
    odd_Name: "Mais de 1.5",
    odd_Value: 1.41,
    odd_market: "Tip gratuita de demonstração",
    is_pro_plan: -1, // GRÁTIS
    expiration_date: "2026-01-14T23:59:59.000Z",
    url_iframe: "https://example.com/gratis",
  },
  // Mock ALAVANCAGEM
  {
    id: 99910,
    time1_name: "",
    time2_name: "",
    time1_logo: "",
    time2_logo: "",
    real_odd_market: "Sequência Especial",
    odd_Name: "Entrada 1/3",
    odd_Value: 1.65,
    odd_market: "Alavancagem do dia",
    is_pro_plan: 10, // Custom code for ALAVANCAGEM
    expiration_date: "2026-01-14T23:59:59.000Z",
    url_iframe: "https://example.com/alavancagem",
    special_type: "ALAVANCAGEM",
  },
  // Mock ODDS ALTAS
  {
    id: 99911,
    time1_name: "",
    time2_name: "",
    time1_logo: "",
    time2_logo: "",
    real_odd_market: "Alta Cotação",
    odd_Name: "Seleção Premium",
    odd_Value: 4.50,
    odd_market: "Odds altas do dia",
    is_pro_plan: 11, // Custom code for ODDS_ALTAS
    expiration_date: "2026-01-14T23:59:59.000Z",
    url_iframe: "https://example.com/odds-altas",
    special_type: "ODDS_ALTAS",
  },
  {
    id: 99902,
    time1_name: "Time 1",
    time2_name: "Time 2",
    time1_logo: "",
    time2_logo: "",
    real_odd_market: "Total de gols",
    odd_Name: "Mais de 1.5",
    odd_Value: 1.55,
    odd_market: "Tip básica de demonstração",
    is_pro_plan: 0, // BÁSICO
    expiration_date: "2026-01-13T18:00:00.000Z", // EXPIRADA - 13/01/2026 18:00
    url_iframe: "https://example.com/basico",
  },
  {
    id: 99903,
    time1_name: "Time 1",
    time2_name: "Time 2",
    time1_logo: "",
    time2_logo: "",
    real_odd_market: "Total de gols",
    odd_Name: "Mais de 1.5",
    odd_Value: 1.85,
    odd_market: "Tip PRO de demonstração",
    is_pro_plan: 1, // PRO
    expiration_date: "2026-01-14T23:59:59.000Z",
    url_iframe: "https://example.com/pro",
  },
  {
    id: 99905,
    time1_name: "Múltipla",
    time2_name: "3 jogos",
    time1_logo: "",
    time2_logo: "",
    real_odd_market: "Múltipla do Dia",
    odd_Name: "3 seleções",
    odd_Value: 4.85,
    odd_market: "Bilhete combinado",
    is_pro_plan: 2, // MÚLTIPLA
    expiration_date: "2026-01-14T20:00:00.000Z",
    url_iframe: "https://example.com/multipla",
    selections_count: 3,
  },
  {
    id: 99904,
    time1_name: "Time 1",
    time2_name: "Time 2",
    time1_logo: "",
    time2_logo: "",
    real_odd_market: "Total de gols",
    odd_Name: "Mais de 1.5",
    odd_Value: 2.45,
    odd_market: "Tip ULTRA de demonstração",
    is_pro_plan: 3, // ULTRA
    expiration_date: "2026-01-14T23:59:59.000Z",
    url_iframe: "https://example.com/ultra",
  },
];

// Mapeia is_pro_plan para tier incluindo novas categorias
const mapMockTipToTier = (tip: MockTip): TierType => {
  // Priorizar special_type se existir
  if (tip.special_type === "ALAVANCAGEM") return "ALAVANCAGEM";
  if (tip.special_type === "ODDS_ALTAS") return "ODDS_ALTAS";
  
  const isPro = tip.is_pro_plan;
  if (isPro === 10) return "ALAVANCAGEM";
  if (isPro === 11) return "ODDS_ALTAS";
  if (isPro === 3) return "ULTRA";
  if (isPro === 2) return "MÚLTIPLA";
  if (isPro === 1) return "PRO";
  if (isPro === 0) return "BÁSICO";
  return "GRÁTIS";
};

// Helpers para verificar expiração
const isExpiredTip = (expirationDate: string): boolean => {
  const now = new Date();
  const expireAt = new Date(expirationDate);
  return now > expireAt;
};

const isSameDayAsToday = (expirationDate: string): boolean => {
  const now = new Date();
  const expireAt = new Date(expirationDate);
  return (
    now.getFullYear() === expireAt.getFullYear() &&
    now.getMonth() === expireAt.getMonth() &&
    now.getDate() === expireAt.getDate()
  );
};

// Filtrar tips que ainda devem aparecer (não expiradas OU expiradas mas do dia atual)
const shouldShowTip = (tip: MockTip): boolean => {
  const expired = isExpiredTip(tip.expiration_date);
  if (!expired) return true;
  return isSameDayAsToday(tip.expiration_date);
};

// Tabs de navegação por tier - NOVA ORDEM: Grátis → Alavancagem → Odds Altas → Básico → Pro → Ultra
const TIER_TABS: { tier: TierType; label: string; color: string }[] = [
  { tier: "GRÁTIS", label: "Grátis", color: "bg-cyan-500" },
  { tier: "ALAVANCAGEM", label: "Alavancagem", color: "bg-teal-600" },
  { tier: "ODDS_ALTAS", label: "Odds Altas", color: "bg-amber-600" },
  { tier: "BÁSICO", label: "Básico", color: "bg-emerald-500" },
  { tier: "PRO", label: "Pro", color: "bg-orange-500" },
  { tier: "ULTRA", label: "Ultra", color: "bg-purple-500" },
];
// ============ FIM MOCK TIPS ============

const Sport = () => {
  const navigate = useNavigate();
  const { sportId } = useParams<{ sportId: string }>();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [sportData, setSportData] = useState<SportType | null>(null);
  const [activeTierHighlight, setActiveTierHighlight] = useState<TierType | null>(null);
  const isMobile = useIsMobile();
  
  // Ref para o container do carrossel (scroll)
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs para cada card (por índice)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Detectar rota especial para scroll automático
  const pathname = window.location.pathname;
  const isAlavancagemRoute = pathname === "/alavancagem";
  const isOddsAltasRoute = pathname === "/odds-altas";

  // Ordenar tips por tier para navegação - SEMPRE TODAS AS TIPS (sem filtro)
  const visibleTips = MOCK_TIPS.filter(shouldShowTip);
  
  // Agrupar tips por tier para saber onde colocar os anchors
  const tipsByTier = visibleTips.reduce((acc, tip) => {
    const tier = mapMockTipToTier(tip);
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(tip);
    return acc;
  }, {} as Record<TierType, MockTip[]>);

  // Encontrar o índice do primeiro card de cada tier
  const getFirstIndexOfTier = (tier: TierType): number => {
    return visibleTips.findIndex(tip => mapMockTipToTier(tip) === tier);
  };

  // Scroll para o primeiro card de uma categoria (SEM FILTRAR)
  const scrollToTier = (tier: TierType) => {
    const firstIndex = getFirstIndexOfTier(tier);
    
    if (firstIndex === -1) {
      toast.info(`Sem entradas de ${tier} hoje`);
      return;
    }
    
    const targetCard = cardRefs.current[firstIndex];
    const container = carouselContainerRef.current;
    
    if (targetCard && container) {
      const containerRect = container.getBoundingClientRect();
      const cardRect = targetCard.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + (cardRect.left - containerRect.left) - 16; // 16px padding
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
      
      // Highlight temporário na tab
      setActiveTierHighlight(tier);
    }
  };

  useEffect(() => {
    // Rola para o topo ao carregar a página
    window.scrollTo(0, 0);

    // Verifica se está autenticado
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    
    // Scroll automático baseado na rota especial (após montagem)
    const scrollTimeout = setTimeout(() => {
      if (isAlavancagemRoute) {
        scrollToTier("ALAVANCAGEM");
      } else if (isOddsAltasRoute) {
        scrollToTier("ODDS_ALTAS");
      }
    }, 300); // Pequeno delay para garantir que os refs estão prontos

    // Carrega dados do esporte (apenas nome/info)
    const loadSportData = async () => {
      try {
        const numericSportId = sportId ? parseInt(sportId, 10) : 1;
        const response = await fetchSportById(numericSportId);
        
        if (response.success && response.response) {
          const sport = response.response.find(s => s.id === numericSportId);
          if (sport) {
            setSportData(sport);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados do esporte:", error);
      }
    };

    loadSportData();

    // Carrega configuração salva (para betSite inicial e user info)
    const storedConfig = getStoredConfig();
    if (storedConfig) {
      setConfig(storedConfig);
      setIframeUrl(storedConfig.betSite || "https://example.com");
    }
    
    return () => clearTimeout(scrollTimeout);
  }, [navigate, sportId, isAlavancagemRoute, isOddsAltasRoute]);

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleAddTip = (tipId: number, urlIframe: string) => {
    setIframeUrl(urlIframe);
    toast.success("Tip adicionada!", {
      description: `Cupom carregado no site de apostas`,
    });
  };

  // Verifica se é um card especial
  const isSpecialTip = (tip: MockTip): boolean => {
    return tip.special_type === "ALAVANCAGEM" || tip.special_type === "ODDS_ALTAS";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826] overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0C0F14]/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-xl font-display font-extrabold text-foreground tracking-tight">
              {sportData?.name || "Esporte"} - Tips do Dia
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {config?.user && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-muted-foreground">Usuário</span>
                <span className="text-sm font-bold text-foreground">{config.user.userMail}</span>
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="bg-muted/20 border-border/50 hover:bg-muted/40"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
        
        {/* Mobile Tier Tabs - Todas as abas com scroll horizontal */}
        {isMobile && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {TIER_TABS.map((tab) => {
              const isActive = activeTierHighlight === tab.tier;
              const hasContent = tipsByTier[tab.tier]?.length > 0;
              
              return (
                <button
                  key={tab.tier}
                  onClick={() => scrollToTier(tab.tier)}
                  disabled={!hasContent}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shadow-lg transition-all active:scale-95 ${
                    isActive 
                      ? `${tab.color} text-white ring-2 ring-white/50` 
                      : hasContent
                        ? `${tab.color} text-white opacity-70 hover:opacity-100`
                        : `bg-gray-600 text-gray-400 opacity-50 cursor-not-allowed`
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Cards de Teste - SOMENTE MOCKS (sempre todas as tips, sem filtro) */}
        <section className="relative w-full overflow-hidden">
          <div 
            ref={carouselContainerRef}
            className="w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth px-4 -mx-4"
          >
            <div className="flex gap-3 md:gap-4 py-2" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
              {visibleTips.map((tip, index) => {
                const expired = isExpiredTip(tip.expiration_date);
                const isSpecial = isSpecialTip(tip);
                
                return (
                  <div 
                    key={tip.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    className="flex-shrink-0 snap-center"
                    style={{ width: 'min(85vw, 360px)' }}
                  >
                    {isSpecial ? (
                      <SpecialBettingCard
                        tipId={tip.id}
                        type={tip.special_type!}
                        market={tip.real_odd_market}
                        betChoice={tip.odd_Name}
                        odds={tip.odd_Value}
                        matchDate="14/01/2026 18:00"
                        expirationDate={tip.expiration_date}
                        isLocked={false}
                        isExpired={expired}
                        onAddTip={() => handleAddTip(tip.id, tip.url_iframe)}
                      />
                    ) : (
                      <PremiumBettingCard
                        tipId={tip.id}
                        tier={mapMockTipToTier(tip) as "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" | "ULTRA"}
                        team1={{
                          name: tip.time1_name,
                          logo: tip.time1_logo || "/placeholder.svg",
                        }}
                        team2={{
                          name: tip.time2_name,
                          logo: tip.time2_logo || "/placeholder.svg",
                        }}
                        market={tip.real_odd_market}
                        betChoice={tip.odd_Name}
                        odds={tip.odd_Value}
                        matchDate="14/01/2026 18:00"
                        expirationDate={tip.expiration_date}
                        selectionsCount={tip.selections_count}
                        isLocked={false}
                        isExpired={expired}
                        onAddTip={() => handleAddTip(tip.id, tip.url_iframe)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Scroll Indicator */}
          <div className="flex justify-center mt-4 gap-1.5">
            {visibleTips.map((_, index) => (
              <div
                key={index}
                className="h-1 w-8 bg-muted/30 rounded-full"
              />
            ))}
          </div>
        </section>

        {/* Iframe Section */}
        <section className="w-full">
          <div className="w-full h-[1000px] bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl overflow-hidden border border-border/30 backdrop-blur-sm">
            {iframeUrl ? (
              <iframe
                key={iframeUrl}
                src={iframeUrl}
                title="Bet Site"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Sport;
