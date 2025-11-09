import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { AppConfig } from "@/types/auth";
import { Tip } from "@/types/tips";

const Index = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verifica se está autenticado
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    // Carrega configuração salva
    const storedConfig = getStoredConfig();
    if (storedConfig) {
      setConfig(storedConfig);
      loadTips();
    } else {
      setIsLoading(false);
    }
  }, [navigate]);

  const loadTips = async () => {
    setIsLoading(true);
    try {
      const response = await loadTipsForSport(1);
      if (response.success && response.data) {
        setTips(response.data);
      } else {
        toast.error(response.message || "Erro ao carregar tips");
      }
    } catch (error) {
      console.error("Erro ao carregar tips:", error);
      toast.error("Erro ao carregar tips");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleAddTip = (tipId: string) => {
    toast.success("Tip adicionada!", {
      description: `Entrada ID: ${tipId} adicionada ao seu cupom`,
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
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-xl font-display font-extrabold text-foreground tracking-tight">
              Tips do Dia
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {config?.user && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-muted-foreground">Usuário</span>
                <span className="text-sm font-bold text-foreground">{config.user.userMail}</span>
              </div>
            )}
            {config?.metric && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-muted-foreground">Saldo</span>
                <span className="text-sm font-bold text-success">
                  R$ {config.metric.totalLiberado?.valor || 0}
                </span>
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
                  {tips.map((tip) => (
                    <CarouselItem key={tip.id} className="pl-2 basis-[90%] min-[480px]:basis-[85%] sm:basis-[75%] md:basis-[60%] lg:basis-[45%] xl:basis-[35%]">
                      <PremiumBettingCard
                        tier={mapTipToCardTier(tip.tipo)}
                        team1={{
                          name: tip.nomeMandante,
                          logo: tip.logoMandante || "https://via.placeholder.com/100",
                        }}
                        team2={{
                          name: tip.nomeVisitante,
                          logo: tip.logoVisitante || "https://via.placeholder.com/100",
                        }}
                        market={tip.mercado}
                        betChoice={tip.entrada}
                        odds={tip.odd}
                        confidence={tip.confianca}
                        insights={tip.insights}
                        footer={tip.observacao}
                        onAddTip={() => handleAddTip(String(tip.id))}
                      />
                    </CarouselItem>
                  ))}
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
            <iframe
              src="https://futnacional.bet/"
              title="Futnacional Bet"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
