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
import { AppConfig } from "@/types/auth";

const Index = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);

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
    }
  }, [navigate]);

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };
  const premiumTips = [
    {
      id: "1",
      tier: "PRO" as const,
      team1: {
        name: "São Paulo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg",
      },
      team2: {
        name: "Flamengo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Flamengo-RJ_%28BRA%29.png",
      },
      market: "Escanteios 1x2",
      betChoice: "Fora",
      odds: 1.70,
      confidence: 78,
      indicators: [
        { label: "Forma (5j)", value: "WWWDL" },
        { label: "Janela", value: "0'-10'" },
      ],
      insights: "Forma fora superior + volume médio de corners nos últimos 10j",
      footer: "Gestão 1–2% • Pré-jogo • Cancelar se odd <1.60",
    },
    {
      id: "2",
      tier: "BÁSICO" as const,
      team1: {
        name: "São Paulo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg",
      },
      team2: {
        name: "Flamengo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Flamengo-RJ_%28BRA%29.png",
      },
      market: "Total de gols",
      betChoice: "Mais de 1.5",
      odds: 1.44,
      confidence: 84,
      indicators: [
        { label: "Média Gols", value: "2.6" },
        { label: "BTTS", value: "4/6" },
      ],
      insights: "Média 2.6 gols (10j) • BTTS 4/6 • Clima/gramado ok",
      footer: "Entrada simples • Sem múltiplas • Gestão 1%",
    },
    {
      id: "3",
      tier: "PRO" as const,
      team1: {
        name: "Grêmio",
        logo: "https://upload.wikimedia.org/wikipedia/commons/3/32/Gr%C3%AAmio_FBPA_%28logo%29.svg",
      },
      team2: {
        name: "Cruzeiro",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/90/Cruzeiro_Esporte_Clube_%28logo%29.svg",
      },
      market: "Ambas marcam",
      betChoice: "Não",
      odds: 1.92,
      confidence: 76,
      indicators: [
        { label: "H2H", value: "Under" },
        { label: "Forma Casa", value: "Sólida" },
      ],
      insights: "H2H under • Cruzeiro fora pouco efetivo • Grêmio sólido em casa",
      footer: "Pré-jogo • Cancelar se escalação alterar linha",
      lineAlert: false,
    },
    {
      id: "4",
      tier: "GRÁTIS" as const,
      team1: {
        name: "Palmeiras",
        logo: "https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg",
      },
      team2: {
        name: "Corinthians",
        logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Corinthians_simbolo.png",
      },
      market: "Resultado Final",
      betChoice: "Casa",
      odds: 1.85,
      confidence: 75,
      insights: "Derby paulista • Palmeiras favorito jogando em casa",
      footer: "Entrada gratuita • Teste sem risco",
    },
    {
      id: "5",
      tier: "MÚLTIPLA" as const,
      team1: {
        name: "Fluminense",
        logo: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Fluminense_FC_escudo.svg",
      },
      team2: {
        name: "Botafogo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/5/52/Botafogo_de_Futebol_e_Regatas_logo.svg",
      },
      market: "Múltipla Especial",
      betChoice: "Over 1.5 + BTTS",
      odds: 2.35,
      confidence: 82,
      insights: "Combinação de mercados com alto valor • Jogos abertos recentes",
      footer: "Múltipla validada • Gestão 1.5%",
    },
  ];

  const handleAddTip = (tipId: string) => {
    toast.success("Tip adicionada!", {
      description: `Entrada ID: ${tipId} adicionada ao seu cupom`,
    });
  };

  const handleViewAnalysis = (tipId: string) => {
    toast.info("Análise completa", {
      description: `Abrindo análise detalhada do tip ${tipId}`,
    });
  };

  const handleCopy = (tipId: string) => {
    toast.success("Copiado!", {
      description: "Entrada copiada para área de transferência",
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
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {premiumTips.map((tip) => (
                <CarouselItem key={tip.id} className="pl-2 basis-[90%] min-[480px]:basis-[85%] sm:basis-[75%] md:basis-[60%] lg:basis-[45%] xl:basis-[35%]">
                  <PremiumBettingCard
                    tier={tip.tier}
                    team1={tip.team1}
                    team2={tip.team2}
                    market={tip.market}
                    betChoice={tip.betChoice}
                    odds={tip.odds}
                    confidence={tip.confidence}
                    indicators={tip.indicators}
                    insights={tip.insights}
                    footer={tip.footer}
                    lineAlert={tip.lineAlert}
                    onAddTip={() => handleAddTip(tip.id)}
                    onViewAnalysis={() => handleViewAnalysis(tip.id)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          
          {/* Scroll Indicator */}
          <div className="flex justify-center mt-4 gap-1.5">
            {premiumTips.map((_, index) => (
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
