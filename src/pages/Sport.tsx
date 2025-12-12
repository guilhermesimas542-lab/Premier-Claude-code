import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { toast } from "sonner";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { loadTipsForSport, mapTipToCardTier } from "@/lib/tips";
import { fetchSportById } from "@/lib/sports";
import { AppConfig } from "@/types/auth";
import { Tip } from "@/types/tips";
import { Sport as SportType } from "@/types/sports";

const Sport = () => {
  const navigate = useNavigate();
  const { sportId } = useParams<{ sportId: string }>();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [sportData, setSportData] = useState<SportType | null>(null);

  useEffect(() => {
    // Rola para o topo ao carregar a página
    window.scrollTo(0, 0);

    // Verifica se está autenticado
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    // Carrega dados do esporte e tips
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

    // Carrega configuração salva
    const storedConfig = getStoredConfig();
    if (storedConfig) {
      setConfig(storedConfig);
      setIframeUrl(storedConfig.betSite || "");
      loadTips();
    } else {
      setIsLoading(false);
    }
  }, [navigate, sportId]);

  const loadTips = async () => {
    setIsLoading(true);
    try {
      const numericSportId = sportId ? parseInt(sportId, 10) : 1;
      const response = await loadTipsForSport(numericSportId);
      if (response.success && response.response?.data) {
        setTips(response.response.data);
        
        // Recarrega config do localStorage APÓS loadTipsForSport atualizar os valores
        const updatedConfig = getStoredConfig();
        if (updatedConfig) {
          setConfig(updatedConfig);
        }
        
        // Atualiza a URL do betSite se vier da resposta
        if (response.response.url) {
          setIframeUrl(response.response.url);
        }
      } else {
        toast.error(response.message?.[0] || "Erro ao carregar tips");
      }
    } catch (error) {
      console.error("Erro ao carregar tips:", error);
      toast.error("Erro ao carregar tips");
    } finally {
      setIsLoading(false);
    }
  };

  const isTipLocked = (tipProPlan: number, userPlan: number): boolean => {
    // Free user (plan -1, 0): vê apenas is_pro_plan = -1
    if (userPlan <= 0) {
      return tipProPlan !== -1;
    }
    
    // Básico user (plan 1): vê is_pro_plan = -1, 0, 1 (2 bloqueado)
    if (userPlan === 1) {
      return tipProPlan === 2;
    }
    
    // Pro user (plan 2+): vê tudo
    return false;
  };

  const handleUnlock = (tipProPlan: number) => {
    const checkout = localStorage.getItem('checkout');
    const proUrl = localStorage.getItem('proUrl');
    
    console.log('handleUnlock chamado:', { tipProPlan, checkout, proUrl });
    
    // Se é básico bloqueado (is_pro_plan = 0 ou 1), abre checkout
    if ((tipProPlan === 0 || tipProPlan === 1) && checkout) {
      console.log('Abrindo checkout:', checkout);
      window.open(checkout, '_blank');
      return;
    }
    // Se é pro bloqueado (is_pro_plan = 2), abre proUrl
    if (tipProPlan === 2 && proUrl) {
      console.log('Abrindo proUrl:', proUrl);
      window.open(proUrl, '_blank');
      return;
    }
    
    // Se não tem URL configurada
    console.warn('Nenhuma URL disponível para desbloquear');
    toast.error('Link de desbloqueio não configurado');
  };

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleAddTip = (tipId: string, urlIframe: string) => {
    setIframeUrl(urlIframe);
    toast.success("Tip adicionada!", {
      description: `Cupom carregado no site de apostas`,
    });
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
        {/* Premium Cards Carousel */}
        <section className="relative">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : tips.length > 0 ? (
            <>
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2">
                  {tips.map((tip) => {
                    const userPlan = config?.user?.purchasedPlan ?? 0;
                    const isLocked = isTipLocked(tip.is_pro_plan, userPlan);
                    
                    // Debug log para verificar planos
                    console.log(`Tip ${tip.id}: is_pro_plan=${tip.is_pro_plan}, userPlan=${userPlan}, isLocked=${isLocked}`);
                    
                    return (
                      <CarouselItem key={tip.id} className="pl-2 basis-[90%] min-[480px]:basis-[85%] sm:basis-[75%] md:basis-[60%] lg:basis-[45%] xl:basis-[35%]">
                        <PremiumBettingCard
                          tipId={tip.id}
                          tier={mapTipToCardTier(tip.is_pro_plan)}
                          team1={{
                            name: tip.time1_name,
                            logo: `https://imagedelivery.net/uGmh4EK74r0qnuu3lZf-oA/${tip.time1_logo}/public`,
                          }}
                          team2={{
                            name: tip.time2_name,
                            logo: `https://imagedelivery.net/uGmh4EK74r0qnuu3lZf-oA/${tip.time2_logo}/public`,
                          }}
                          market={tip.real_odd_market}
                          betChoice={tip.odd_Name}
                          odds={tip.odd_Value}
                          insights={tip.odd_market}
                          footer={`Expira em: ${new Date(tip.expiration_date).toLocaleDateString()}`}
                          isLocked={isLocked}
                          onAddTip={() => isLocked ? handleUnlock(tip.is_pro_plan) : handleAddTip(String(tip.id), tip.url_iframe)}
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>
              
              {/* Scroll Indicator */}
              <div className="flex justify-center mt-4 gap-1.5">
                {tips.slice(0, 5).map((_, index) => (
                  <div
                    key={index}
                    className="h-1 w-8 bg-muted/30 rounded-full"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Nenhuma tip disponível no momento</p>
            </div>
          )}
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
