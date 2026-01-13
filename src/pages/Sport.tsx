import { ArrowLeft, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
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
  justificativa?: string;
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
    justificativa: "Esta entrada foi selecionada com base na média de gols dos últimos 10 jogos entre esses times.",
  },
  // Nova entrada BÁSICO NÃO EXPIRADA para testes
  {
    id: 99906,
    time1_name: "Flamengo",
    time2_name: "Palmeiras",
    time1_logo: "",
    time2_logo: "",
    real_odd_market: "Escanteios",
    odd_Name: "Mais de 8.5",
    odd_Value: 1.40,
    odd_market: "Tip básica ativa",
    is_pro_plan: 0, // BÁSICO
    expiration_date: "2026-01-15T22:00:00.000Z", // NÃO EXPIRADA
    url_iframe: "https://example.com/basico-ativo",
    justificativa: "Nos últimos 5 confrontos diretos entre Flamengo e Palmeiras, a média de escanteios foi de 11.2 por jogo. Ambos os times têm alto volume de finalizações de fora da área, gerando cobranças de canto. Além disso, o histórico recente em jogos de grande rivalidade indica tendência de mais de 9 escanteios em 80% das partidas.",
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

// Tabs de navegação por tier - P&B (preto e branco) para todos os breakpoints
const TIER_TABS: { tier: TierType; label: string }[] = [
  { tier: "GRÁTIS", label: "Grátis" },
  { tier: "ALAVANCAGEM", label: "Alavancagem" },
  { tier: "ODDS_ALTAS", label: "Odds Altas" },
  { tier: "BÁSICO", label: "Básico" },
  { tier: "PRO", label: "Pro" },
  { tier: "ULTRA", label: "Ultra" },
];
// ============ FIM MOCK TIPS ============

const Sport = () => {
  const navigate = useNavigate();
  const { sportId } = useParams<{ sportId: string }>();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [sportData, setSportData] = useState<SportType | null>(null);
  const [activeTierHighlight, setActiveTierHighlight] = useState<TierType | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
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

  // Atualizar estado das setas baseado no scroll
  const updateScrollButtons = useCallback(() => {
    const container = carouselContainerRef.current;
    if (!container) return;
    
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  }, []);

  // Scroll por setas (avança 1 card)
  const scrollByArrow = (direction: 'left' | 'right') => {
    const container = carouselContainerRef.current;
    if (!container) return;
    
    const cardWidth = Math.min(332, window.innerWidth * 0.92) + 16; // card width + gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  // Drag handlers para desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = carouselContainerRef.current;
    if (!container) return;
    
    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeftStart(container.scrollLeft);
    container.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const container = carouselContainerRef.current;
    if (!container) return;
    
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Multiplier for faster drag
    container.scrollLeft = scrollLeftStart - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    const container = carouselContainerRef.current;
    if (container) {
      container.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      const container = carouselContainerRef.current;
      if (container) {
        container.style.cursor = 'grab';
      }
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

  // Listener para atualizar botões de scroll
  useEffect(() => {
    const container = carouselContainerRef.current;
    if (!container) return;
    
    updateScrollButtons();
    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);
    
    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, visibleTips]);

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
        
        {/* Tier Tabs - P&B para TODOS os breakpoints (mobile, tablet, PC) */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide justify-center flex-wrap md:flex-nowrap">
          {TIER_TABS.map((tab) => {
            const isActive = activeTierHighlight === tab.tier;
            const hasContent = tipsByTier[tab.tier]?.length > 0;
            
            return (
              <button
                key={tab.tier}
                onClick={() => scrollToTier(tab.tier)}
                disabled={!hasContent}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 border ${
                  isActive 
                    ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]' 
                    : hasContent
                      ? 'bg-transparent text-white/80 border-white/30 hover:border-white/60 hover:text-white'
                      : 'bg-transparent text-white/30 border-white/10 cursor-not-allowed'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Cards de Teste - SOMENTE MOCKS (sempre todas as tips, sem filtro) */}
        <section className="relative w-full">
          {/* Seta Esquerda */}
          {canScrollLeft && (
            <button
              onClick={() => scrollByArrow('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#FF1F5A] hover:bg-[#FF3369] text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 -ml-2 md:-ml-4"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          )}

          {/* Seta Direita */}
          {canScrollRight && (
            <button
              onClick={() => scrollByArrow('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#FF1F5A] hover:bg-[#FF3369] text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 -mr-2 md:-mr-4"
              aria-label="Próximo"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          )}

          {/* Carousel Container com drag */}
          <div 
            ref={carouselContainerRef}
            className="w-full overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 md:px-8 select-none"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <style>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="flex gap-4 md:gap-5 py-2">
              {visibleTips.map((tip, index) => {
                const expired = isExpiredTip(tip.expiration_date);
                const isSpecial = isSpecialTip(tip);
                
                return (
                  <div 
                    key={tip.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    className="flex-shrink-0 snap-center"
                    style={{ 
                      width: 'min(332px, 92vw)',
                      height: 'calc(min(332px, 92vw) * 213 / 332)',
                      minWidth: '280px'
                    }}
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
                        justificativa={tip.justificativa}
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
