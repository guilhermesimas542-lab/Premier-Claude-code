import { LogOut, ChevronRight, Info, Lock, Clock, Sparkles, CheckCircle2, LockOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { NewEntriesAlert } from "@/components/NewEntriesAlert";
import { fetchSports, getBackgroundImageUrl } from "@/lib/sports";
import { Sport } from "@/types/sports";

const Home = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({
    hours: 23,
    minutes: 59,
    seconds: 45,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    const storedConfig = getStoredConfig();
    if (storedConfig) {
      setConfig(storedConfig);
    }

    // Dados mockados para desenvolvimento (até servidor retornar tipo e expDate)
    const mockSports: Sport[] = [
      {
        id: 1,
        name: "Futebol",
        enabled: true,
        isproplan: false,
        background: "cyberbet_3ef04120-9b39-44f5-9e4e-0127a76326bb",
        tipo: 0, // Premium ativo
      },
      {
        id: 2,
        name: "MMA",
        enabled: false,
        isproplan: true,
        background: "cyberbet_76a934f8-71c1-41a2-a9fe-93c36359dd7f",
        tipo: 0, // Bloqueado
      },
      {
        id: 3,
        name: "Baseball",
        enabled: true,
        isproplan: false,
        background: "cyberbet_20d5c209-1849-49d0-9475-4eabf2541b07",
        tipo: 1, // Em desenvolvimento
      },
      {
        id: 4,
        name: "Rugby",
        enabled: true,
        isproplan: false,
        background: "cyberbet_75203e34-3699-4203-9063-24bb8b805083",
        tipo: 2, // Pré-venda
        expDate: "2025-12-31T23:59:59",
      },
      {
        id: 5,
        name: "Tenis",
        enabled: false,
        isproplan: false,
        background: "cyberbet_3164bd85-f9f8-4113-b776-fb37acf872a3",
        tipo: 0, // Bloqueado (enabled false)
      },
      {
        id: 6,
        name: "Basquete",
        enabled: true,
        isproplan: false,
        background: "cyberbet_55e38087-eeb7-4031-9a11-a326b50db79f",
        tipo: 1, // Em desenvolvimento
      },
      {
        id: 7,
        name: "Futsal",
        enabled: true,
        isproplan: false,
        background: "cyberbet_65a951a1-ea4a-4022-84af-d7c674d51d87",
        tipo: 0, // Premium ativo
      },
      {
        id: 8,
        name: "Hoquei",
        enabled: true,
        isproplan: false,
        background: "cyberbet_255695b8-2046-4b5b-b6c5-17e7bb5e3df2",
        tipo: 2, // Pré-venda
        expDate: "2025-11-15T23:59:59",
      },
    ];

    // Buscar esportes da API (ou usar mock)
    const loadSports = async () => {
      try {
        setLoading(true);
        // Comentado temporariamente até API retornar tipo e expDate
        // const data = await fetchSports();
        // if (data.success && data.response) {
        //   setSports(data.response);
        // }
        
        // Usando dados mockados
        setSports(mockSports);
      } catch (error) {
        console.error("Erro ao carregar esportes:", error);
        toast.error("Erro ao carregar esportes");
        // Fallback para mock em caso de erro
        setSports(mockSports);
      } finally {
        setLoading(false);
      }
    };

    loadSports();
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  // Mapear esportes da API para o formato do componente
  const sportEmojiMap: Record<string, string> = {
    "Futebol": "⚽",
    "Futsal": "⚽",
    "MMA": "🥊",
    "Baseball": "⚾",
    "Rugby": "🏈",
    "Tenis": "🎾",
    "Basquete": "🏀",
    "Hoquei": "🏒",
    "Handball": "🤾",
    "Volei": "🏐",
  };

  const mappedSports = sports.map((sport) => {
    const tipo = sport.tipo ?? 0;
    
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

    return {
      ...sport,
      emoji: sportEmojiMap[sport.name] || "🏆",
      route: cardType === 'premium' ? `/${sport.name.toLowerCase()}` : "#",
      image: getBackgroundImageUrl(sport.background),
      gradient: "from-[#000636] via-[#0026A3] to-[#0033C6]",
      isPremium: cardType === 'premium',
      isLocked: cardType === 'locked',
      isDevelopment: cardType === 'development',
      isPreSale: cardType === 'presale',
      badgeColor: cardType === 'premium'
        ? "bg-[#00FF87]/20 text-[#00FF87] border-[#00FF87]/40"
        : "bg-muted/30 text-muted-foreground border-border/30",
      priceFrom: cardType === 'presale' ? "R$ 299,00" : undefined,
      priceTo: cardType === 'presale' ? "R$ 149,00" : undefined,
    };
  });

  const announcements = [
    {
      id: 1,
      type: "info",
      title: "Bem-vindo ao Premier FC!",
      message: "Acesse as melhores análises e tips para suas apostas esportivas.",
    },
    {
      id: 2,
      type: "success",
      title: "Sistema atualizado",
      message: "Nova interface com melhorias de performance e design moderno.",
    },
  ];

  const banners = [
    {
      id: 1,
      image: config?.basicImageBanner || "https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aae?w=1200&h=400&fit=crop",
      title: "Plano Básico",
      description: "Acesse tips exclusivas todos os dias",
      ctaText: "Conhecer",
      ctaUrl: config?.checkout || "#",
    },
    {
      id: 2,
      image: config?.proImageBanner || "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=400&fit=crop",
      title: "Plano PRO",
      description: "Tips premium com análise avançada",
      ctaText: "Assinar PRO",
      ctaUrl: config?.proUrl || "#",
    },
    {
      id: 3,
      image: config?.banner1Image || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=400&fit=crop",
      title: "Bônus Especial",
      description: "Aproveite ofertas exclusivas",
      ctaText: "Ver Oferta",
      ctaUrl: config?.banner1Url || "#",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0C0F14]/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
            Premier FC
          </h1>
          
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

      <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* New Entries Alert */}
        <NewEntriesAlert />

        {/* Featured Banners */}
        <section className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {banners.map((banner) => (
                <CarouselItem key={banner.id}>
                  <div className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden group cursor-pointer">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url('${banner.image}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F14] via-[#0C0F14]/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
                      <h2 className="text-3xl md:text-4xl font-display font-extrabold text-white tracking-tight">
                        {banner.title}
                      </h2>
                      <p className="text-lg text-white/80 max-w-2xl">
                        {banner.description}
                      </p>
                      <Button
                        onClick={() => banner.ctaUrl !== "#" && window.open(banner.ctaUrl, "_blank")}
                        className="bg-primary hover:bg-primary/90 text-white font-bold"
                      >
                        {banner.ctaText}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </section>

        {/* Announcements */}
        <section className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in"
            >
              <Info className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-sm mb-1">
                  {announcement.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {announcement.message}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Sports Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
              Esportes Disponíveis
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Carregando esportes...</p>
              </div>
            ) : mappedSports.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Nenhum esporte disponível</p>
              </div>
            ) : (
              mappedSports.map((sport) => (
              <div
                key={sport.id}
                onClick={() => sport.route !== "#" && navigate(sport.route)}
                className={`${
                  sport.isPremium ? 'border-fire-effect' : ''
                } ${
                  sport.route !== "#"
                    ? "cursor-pointer"
                    : (sport as any).isLocked || (sport as any).isPreSale
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-60"
                } group`}
              >
                <Card
                  className={`relative overflow-hidden ${
                    sport.route !== "#"
                      ? "hover:scale-[1.02]"
                      : ""
                  } transition-all duration-500 border-0 p-0 h-full ${sport.isPremium ? 'rounded-xl' : 'rounded-lg'}`}
                >
                  {/* Badge IA ATIVADA - Flutuante no topo direito */}
                  {sport.isPremium && (
                    <div className="absolute -top-2 -right-2 z-20 animate-fade-in">
                      <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#000636]/95 to-[#0033C6]/95 backdrop-blur-xl border-2 border-[#00FF87] rounded-xl px-3 py-1.5 shadow-2xl shadow-[#00FF87]/50">
                        <Sparkles className="w-3.5 h-3.5 text-[#00FF87] animate-pulse drop-shadow-[0_0_8px_rgba(0,255,135,1)]" />
                        <span className="text-[10px] font-black text-[#00FF87] tracking-widest drop-shadow-[0_0_8px_rgba(0,255,135,0.8)] whitespace-nowrap">IA ATIVADA</span>
                        {/* Partículas de luz tecnológicas */}
                        <div className="absolute inset-0 opacity-30 pointer-events-none">
                          <div className="absolute top-0.5 left-1.5 w-0.5 h-0.5 bg-[#00FFFF] rounded-full animate-pulse" />
                          <div className="absolute bottom-0.5 right-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                          <div className="absolute top-1/2 right-1.5 w-0.5 h-0.5 bg-[#00FF87] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Background Image - Cinematográfico Arena Noturna */}
                  <div className="absolute inset-0 z-0">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                      style={{ 
                        backgroundImage: `url('${sport.image}')`,
                        filter: 'brightness(0.7) contrast(1.2) saturate(1.1)'
                      }}
                    />
                    {/* Overlay Azul Escuro para Arena Noturna */}
                    <div className="absolute inset-0 bg-[#000636]/85" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-[#000636]/70 to-[#000636]/50" />
                    {sport.isPremium && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/15 via-transparent to-[#0099FF]/15" />
                        {/* Reflexos de Refletores de Estádio */}
                        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/5 to-transparent" />
                      </>
                    )}
                  </div>

                  {/* Content Container */}
                  <div className="relative z-10 flex flex-col h-full min-h-[320px]">
                    {/* Top Bar - Faixa Azul Royal Energética */}
                    <div className={`${
                      sport.isPremium 
                        ? 'liquid-gold-bar' 
                        : 'bg-gradient-to-r from-primary via-orange-600 to-primary'
                    } px-5 py-4`}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl filter drop-shadow-[0_0_15px_rgba(0,212,255,0.8)]">
                          {(sport as any).emoji || '🏆'}
                        </span>
                        <h3 className="text-xl font-display font-black tracking-wider text-white drop-shadow-[0_0_10px_rgba(0,212,255,0.6)]">
                          {sport.name}
                        </h3>
                      </div>
                    </div>

                    {/* Main Content - Épico e Cinematográfico */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-center">
                      {/* Conteúdo baseado no tipo de card */}
                      {(sport as any).isLocked ? (
                        /* Card Bloqueado */
                        <div className="space-y-4 py-2">
                          <div className="text-center animate-fade-in space-y-3">
                            <div className="flex items-center justify-center py-2">
                              <div className="relative w-20 h-20">
                                <div className="absolute inset-0 bg-destructive blur-2xl opacity-50 animate-pulse" />
                                <Lock className="relative w-full h-full text-destructive drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" strokeWidth={2.5} />
                              </div>
                            </div>
                            <div className="relative inline-block">
                              <h4 className="text-base font-black text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] leading-tight tracking-wide">
                                CONTEÚDO BLOQUEADO
                              </h4>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-px w-8 bg-gradient-to-r from-transparent to-destructive/30" />
                              <p className="text-sm font-bold text-foreground/90 tracking-wide whitespace-nowrap">
                                🔒 VOCÊ NÃO POSSUI ESSE ITEM 🔒
                              </p>
                              <div className="h-px w-8 bg-gradient-to-l from-transparent to-destructive/30" />
                            </div>
                          </div>
                        </div>
                      ) : (sport as any).isPreSale ? (
                      /* Card Pré-venda */
                      <div className="space-y-4">
                        {/* Título Lançamento */}
                        <div className="text-center animate-fade-in">
                          <div className="relative inline-block mb-3">
                            <div className="absolute inset-0 bg-accent blur-xl opacity-30" />
                            <h4 className="relative text-lg font-black text-accent drop-shadow-[0_0_20px_rgba(0,212,255,0.7)] leading-tight tracking-wide">
                              LANÇAMENTO EM
                            </h4>
                          </div>
                        </div>

                        {/* Countdown */}
                        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 backdrop-blur-sm">
                          <div className="flex justify-center gap-2">
                            <div className="text-center">
                              <div className="bg-accent/20 rounded px-2 py-1 min-w-[40px]">
                                <span className="text-lg font-bold text-white">{String(countdown.hours).padStart(2, '0')}</span>
                              </div>
                              <span className="text-[8px] text-muted-foreground">horas</span>
                            </div>
                            <span className="text-lg text-white">:</span>
                            <div className="text-center">
                              <div className="bg-accent/20 rounded px-2 py-1 min-w-[40px]">
                                <span className="text-lg font-bold text-white">{String(countdown.minutes).padStart(2, '0')}</span>
                              </div>
                              <span className="text-[8px] text-muted-foreground">min</span>
                            </div>
                            <span className="text-lg text-white">:</span>
                            <div className="text-center">
                              <div className="bg-accent/20 rounded px-2 py-1 min-w-[40px]">
                                <span className="text-lg font-bold text-white">{String(countdown.seconds).padStart(2, '0')}</span>
                              </div>
                              <span className="text-[8px] text-muted-foreground">seg</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground line-through">{(sport as any).priceFrom}</p>
                          <p className="text-2xl font-bold text-accent">{(sport as any).priceTo}</p>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <div className="h-px w-6 bg-gradient-to-r from-transparent to-accent/30" />
                            <p className="text-[10px] text-accent/90 font-bold tracking-wide whitespace-nowrap">
                              💎 OFERTA ESPECIAL 💎
                            </p>
                            <div className="h-px w-6 bg-gradient-to-l from-transparent to-accent/30" />
                          </div>
                        </div>
                      </div>
                      ) : (sport as any).isDevelopment ? (
                        /* Card Em Desenvolvimento */
                        <div className="space-y-4">
                          <div className="text-center animate-fade-in space-y-2">
                            <div className="relative inline-block">
                              <div className="absolute inset-0 bg-accent blur-xl opacity-20" />
                              <h4 className="relative text-lg font-black text-accent drop-shadow-[0_0_20px_rgba(0,212,255,0.6)] leading-tight tracking-wide">
                                EM DESENVOLVIMENTO
                              </h4>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-px w-8 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                              <p className="text-sm font-bold text-muted-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] tracking-wide whitespace-nowrap">
                                🚀 EM BREVE 🚀
                              </p>
                              <div className="h-px w-8 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                            </div>
                          </div>
                        </div>
                      ) : sport.isPremium ? (
                        /* Premium - Card Épico Arena Azul */
                        <div className="space-y-4">
                          {/* Texto Principal Impactante */}
                          <div className="text-center animate-fade-in space-y-2">
                            <div className="relative inline-block">
                              <div className="absolute inset-0 bg-[#00FF87] blur-xl opacity-30" />
                              <h4 className="relative text-lg font-black text-[#00FF87] drop-shadow-[0_0_20px_rgba(0,255,135,0.9)] leading-tight tracking-wide">
                                NOVAS ENTRADAS DISPONÍVEIS
                              </h4>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#00FF87]" />
                              <p className="text-base font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-wider whitespace-nowrap">
                                ⚡ APOSTE AGORA ⚡
                              </p>
                              <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#00FF87]" />
                            </div>
                          </div>
                        </div>
                      ) : null}
                  </div>

                  {/* Bottom Section - Botão Dourado */}
                  <div className="mt-auto p-5 pt-0 space-y-3">
                    {/* Botões Destacados */}
                    {(sport as any).isLocked ? (
                      <Button 
                        className="w-full relative overflow-hidden bg-gradient-to-r from-destructive via-red-500 to-destructive bg-[length:200%_100%] hover:bg-[length:100%_100%] shadow-2xl shadow-destructive/60 hover:shadow-destructive/80 shimmer-effect text-white font-black py-7 text-base transition-all duration-500 border-0"
                      >
                        <span className="relative z-10 drop-shadow-md tracking-wide">
                          ADQUIRIR AGORA
                        </span>
                      </Button>
                    ) : (sport as any).isPreSale ? (
                      <Button 
                        className="w-full relative overflow-hidden bg-gradient-to-r from-accent via-cyan-400 to-accent bg-[length:200%_100%] hover:bg-[length:100%_100%] shadow-2xl shadow-accent/60 hover:shadow-accent/80 shimmer-effect text-black font-black py-7 text-base transition-all duration-500 border-0"
                      >
                        <span className="relative z-10 drop-shadow-md tracking-wide">
                          ADQUIRIR AGORA
                        </span>
                      </Button>
                    ) : sport.isPremium ? (
                      <Button 
                        className="w-full relative overflow-hidden bg-gradient-to-r from-[#00C853] via-[#00FF87] to-[#00C853] bg-[length:200%_100%] hover:bg-[length:100%_100%] shadow-2xl shadow-[#00FF87]/60 hover:shadow-[#00FF87]/80 shimmer-effect text-black font-black py-7 text-base transition-all duration-500 border-0"
                      >
                        <span className="relative z-10 drop-shadow-md tracking-wide">
                          ACESSAR AGORA
                        </span>
                      </Button>
                    ) : sport.route !== "#" ? (
                      <Button className="w-full bg-[#00C853] hover:bg-[#00A844] text-black font-black py-7 text-base transition-all duration-200 shadow-lg hover:shadow-xl">
                        ACESSAR AGORA
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
