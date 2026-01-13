import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { toast } from "sonner";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { fetchSportById } from "@/lib/sports";
import { AppConfig } from "@/types/auth";
import { Sport as SportType } from "@/types/sports";
import { useIsMobile } from "@/hooks/use-mobile";

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
  selections_count?: number; // Para múltiplas
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

// Mapeia is_pro_plan para tier incluindo ULTRA
type TierType = "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" | "ULTRA";

const mapMockTipToTier = (isPro: number): TierType => {
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
  // Se expirou, mostrar apenas se for do mesmo dia
  return isSameDayAsToday(tip.expiration_date);
};

// Tabs de navegação por tier
const TIER_TABS: { tier: TierType; label: string; color: string }[] = [
  { tier: "GRÁTIS", label: "Grátis", color: "bg-cyan-500" },
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
  const isMobile = useIsMobile();
  
  // Refs para scroll para cada tier
  const tierRefs = useRef<Record<TierType, HTMLDivElement | null>>({
    "GRÁTIS": null,
    "BÁSICO": null,
    "PRO": null,
    "MÚLTIPLA": null,
    "ULTRA": null,
  });

  // Ordenar tips por tier para navegação
  const visibleTips = MOCK_TIPS.filter(shouldShowTip);
  
  // Agrupar tips por tier para saber onde colocar os anchors
  const tipsByTier = visibleTips.reduce((acc, tip) => {
    const tier = mapMockTipToTier(tip.is_pro_plan);
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(tip);
    return acc;
  }, {} as Record<TierType, MockTip[]>);

  // Scroll para tier
  const scrollToTier = (tier: TierType) => {
    const ref = tierRefs.current[tier];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
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
  }, [navigate, sportId]);

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

  // Verifica quais tiers existem nas tips visíveis
  const availableTiers = TIER_TABS.filter(tab => tipsByTier[tab.tier]?.length > 0);

  // Marca o primeiro card de cada tier para colocar o anchor
  const getAnchorForTip = (tip: MockTip, index: number): TierType | null => {
    const tier = mapMockTipToTier(tip.is_pro_plan);
    const tipsOfSameTier = visibleTips.filter(t => mapMockTipToTier(t.is_pro_plan) === tier);
    const firstOfTier = tipsOfSameTier[0];
    return tip.id === firstOfTier?.id ? tier : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826]">
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
      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Mobile Tier Tabs */}
        {isMobile && availableTiers.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {availableTiers.map((tab) => (
              <button
                key={tab.tier}
                onClick={() => scrollToTier(tab.tier)}
                className={`${tab.color} text-white px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shadow-lg transition-transform active:scale-95`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Cards de Teste - SOMENTE MOCKS */}
        <section className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {visibleTips.map((tip, index) => {
                const anchorTier = getAnchorForTip(tip, index);
                const expired = isExpiredTip(tip.expiration_date);
                
                return (
                  <CarouselItem 
                    key={tip.id} 
                    className="pl-2 basis-[90%] min-[480px]:basis-[85%] sm:basis-[75%] md:basis-[60%] lg:basis-[45%] xl:basis-[35%]"
                  >
                    {/* Anchor invisível para scroll */}
                    {anchorTier && (
                      <div 
                        ref={(el) => { tierRefs.current[anchorTier] = el; }}
                        className="absolute -top-20"
                        aria-hidden="true"
                      />
                    )}
                    
                    <PremiumBettingCard
                      tipId={tip.id}
                      tier={mapMockTipToTier(tip.is_pro_plan)}
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
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
          
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
