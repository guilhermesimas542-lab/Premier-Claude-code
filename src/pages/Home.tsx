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
  };

  // Definir cores únicas para cada esporte (por ID)
  const sportColorSchemes: Record<number, {
    primary: string;
    secondary: string;
    glow: string;
    gradient: string;
    shadow: string;
    border: string;
  }> = {
    1: { // Futebol
      primary: "#00FF87",
      secondary: "#00C853",
      glow: "rgba(0, 255, 135, 0.9)",
      gradient: "from-[#00C853] via-[#00FF87] to-[#00C853]",
      shadow: "shadow-[#00FF87]/60",
      border: "#00FF87",
    },
    2: { // MMA
      primary: "#DC2626",
      secondary: "#991B1B",
      glow: "rgba(220, 38, 38, 0.9)",
      gradient: "from-[#991B1B] via-[#DC2626] to-[#991B1B]",
      shadow: "shadow-[#DC2626]/60",
      border: "#DC2626",
    },
    3: { // Baseball
      primary: "#1E40AF",
      secondary: "#1E3A8A",
      glow: "rgba(30, 64, 175, 0.9)",
      gradient: "from-[#1E3A8A] via-[#1E40AF] to-[#1E3A8A]",
      shadow: "shadow-[#1E40AF]/60",
      border: "#1E40AF",
    },
    4: { // Rugby
      primary: "#15803D",
      secondary: "#166534",
      glow: "rgba(21, 128, 61, 0.9)",
      gradient: "from-[#166534] via-[#15803D] to-[#166534]",
      shadow: "shadow-[#15803D]/60",
      border: "#15803D",
    },
    5: { // Tenis
      primary: "#FACC15",
      secondary: "#CA8A04",
      glow: "rgba(250, 204, 21, 0.9)",
      gradient: "from-[#CA8A04] via-[#FACC15] to-[#CA8A04]",
      shadow: "shadow-[#FACC15]/60",
      border: "#FACC15",
    },
    6: { // Basquete
      primary: "#EA580C",
      secondary: "#C2410C",
      glow: "rgba(234, 88, 12, 0.9)",
      gradient: "from-[#C2410C] via-[#EA580C] to-[#C2410C]",
      shadow: "shadow-[#EA580C]/60",
      border: "#EA580C",
    },
    7: { // Futsal
      primary: "#14B8A6",
      secondary: "#0D9488",
      glow: "rgba(20, 184, 166, 0.9)",
      gradient: "from-[#0D9488] via-[#14B8A6] to-[#0D9488]",
      shadow: "shadow-[#14B8A6]/60",
      border: "#14B8A6",
    },
    8: { // Hoquei
      primary: "#06B6D4",
      secondary: "#0891B2",
      glow: "rgba(6, 182, 212, 0.9)",
      gradient: "from-[#0891B2] via-[#06B6D4] to-[#0891B2]",
      shadow: "shadow-[#06B6D4]/60",
      border: "#06B6D4",
    },
    9: { // Handball
      primary: "#EC4899",
      secondary: "#DB2777",
      glow: "rgba(236, 72, 153, 0.9)",
      gradient: "from-[#DB2777] via-[#EC4899] to-[#DB2777]",
      shadow: "shadow-[#EC4899]/60",
      border: "#EC4899",
    },
    10: { // Volei
      primary: "#F59E0B",
      secondary: "#D97706",
      glow: "rgba(245, 158, 11, 0.9)",
      gradient: "from-[#D97706] via-[#F59E0B] to-[#D97706]",
      shadow: "shadow-[#F59E0B]/60",
      border: "#F59E0B",
    },
    11: { // Cassino
      primary: "#C026D3",
      secondary: "#A21CAF",
      glow: "rgba(192, 38, 211, 0.9)",
      gradient: "from-[#A21CAF] via-[#C026D3] to-[#A21CAF]",
      shadow: "shadow-[#C026D3]/60",
      border: "#C026D3",
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

    return {
      ...sport,
      emoji: sportEmojiMap[sport.id] || "🏆",
      route: cardType === 'premium' ? `/${sport.name.toLowerCase()}` : "#",
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

        {/* Sports Grid - Esportes Disponíveis */}
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
            ) : mappedSports.filter(s => s.isPremium).length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Nenhum esporte disponível</p>
              </div>
            ) : (
              mappedSports.filter(s => s.isPremium).map((sport) => (
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
                style={sport.isPremium ? {
                  ['--border-color' as any]: (sport as any).colors?.border || '#00FF87'
                } : undefined}
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
                        <div className="absolute top-3 right-3 z-20">
                          <Badge
                            variant="secondary"
                            className="bg-gradient-to-r from-[#00FF87]/20 to-[#00C853]/20 text-[#00FF87] border border-[#00FF87]/40 backdrop-blur-sm px-3 py-1 text-xs font-bold shadow-lg shadow-[#00FF87]/30"
                          >
                            <Sparkles className="w-3 h-3 mr-1.5" />
                            IA ATIVADA
                          </Badge>
                        </div>
                      )}

                      {/* Background Image */}
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url('${sport.image}')` }}
                      />
                      
                      {/* Gradient Overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-t ${sport.gradient}`} />
                      
                      {/* Content */}
                      <div className="relative z-10 p-6 h-full flex flex-col justify-between min-h-[200px]">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="text-4xl">{sport.emoji}</div>
                            <h3 className="text-xl font-display font-extrabold text-white tracking-tight">
                              {sport.name}
                            </h3>
                          </div>
                          
                          {(sport as any).isLocked && (
                            <div className="bg-background/10 backdrop-blur-md border border-white/20 rounded-lg p-2">
                              <Lock className="w-5 h-5 text-white" />
                            </div>
                          )}
                          
                          {(sport as any).isDevelopment && (
                            <div className="bg-background/10 backdrop-blur-md border border-white/20 rounded-lg p-2">
                              <Clock className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Footer */}
                        <div className="space-y-3">
                          {sport.isPremium && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#00FF87] to-[#00C853] rounded-full"
                                  style={{ width: '100%' }}
                                />
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-[#00FF87]" />
                            </div>
                          )}
                          
                          {(sport as any).isLocked && (
                            <>
                              <p className="text-sm text-white/80">
                                Faça upgrade para acessar este esporte
                              </p>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(config?.proUrl || "#", "_blank");
                                }}
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Assinar PRO
                              </Button>
                            </>
                          )}
                          
                          {(sport as any).isDevelopment && (
                            <>
                              <p className="text-sm text-white/80">
                                Em breve com tips premium
                              </p>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                                disabled
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Em Desenvolvimento
                              </Button>
                            </>
                          )}
                          
                          {(sport as any).isPreSale && (
                            <>
                              <div className="bg-background/20 backdrop-blur-md border border-white/30 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-white/70">De:</span>
                                  <span className="text-white/50 line-through">{(sport as any).priceFrom}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-white">Por:</span>
                                  <span className="text-2xl font-extrabold text-[#00FF87]">{(sport as any).priceTo}</span>
                                </div>
                                <div className="pt-2 border-t border-white/20">
                                  <div className="flex items-center justify-center gap-2 text-xs text-white/80">
                                    <Clock className="w-3 h-3" />
                                    <span>Termina em</span>
                                    <span className="font-mono font-bold text-white">
                                      {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full bg-[#00FF87] hover:bg-[#00C853] text-background border-0 font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(config?.checkout || "#", "_blank");
                                }}
                              >
                                <LockOpen className="w-4 h-4 mr-2" />
                                Garantir Oferta
                              </Button>
                            </>
                          )}
                          
                          {sport.isPremium && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-white hover:bg-white/10"
                            >
                              Ver Tips
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Sports Grid - Mais Entradas */}
          {!loading && mappedSports.filter(s => !s.isPremium).length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
                  Mais Entradas
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mappedSports.filter(s => !s.isPremium).map((sport) => (
                  <div
                    key={sport.id}
                    onClick={() => sport.route !== "#" && navigate(sport.route)}
                    className={`${
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
                      } transition-all duration-500 border-0 p-0 h-full rounded-lg`}
                    >
                      {/* Background Image */}
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url('${sport.image}')` }}
                      />
                      
                      {/* Gradient Overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-t ${sport.gradient}`} />
                      
                      {/* Content */}
                      <div className="relative z-10 p-6 h-full flex flex-col justify-between min-h-[200px]">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="text-4xl">{sport.emoji}</div>
                            <h3 className="text-xl font-display font-extrabold text-white tracking-tight">
                              {sport.name}
                            </h3>
                          </div>
                          
                          {(sport as any).isLocked && (
                            <div className="bg-background/10 backdrop-blur-md border border-white/20 rounded-lg p-2">
                              <Lock className="w-5 h-5 text-white" />
                            </div>
                          )}
                          
                          {(sport as any).isDevelopment && (
                            <div className="bg-background/10 backdrop-blur-md border border-white/20 rounded-lg p-2">
                              <Clock className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Footer */}
                        <div className="space-y-3">
                          {(sport as any).isLocked && (
                            <>
                              <p className="text-sm text-white/80">
                                Faça upgrade para acessar este esporte
                              </p>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(config?.proUrl || "#", "_blank");
                                }}
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Assinar PRO
                              </Button>
                            </>
                          )}
                          
                          {(sport as any).isDevelopment && (
                            <>
                              <p className="text-sm text-white/80">
                                Em breve com tips premium
                              </p>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                                disabled
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Em Desenvolvimento
                              </Button>
                            </>
                          )}
                          
                          {(sport as any).isPreSale && (
                            <>
                              <div className="bg-background/20 backdrop-blur-md border border-white/30 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-white/70">De:</span>
                                  <span className="text-white/50 line-through">{(sport as any).priceFrom}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-white">Por:</span>
                                  <span className="text-2xl font-extrabold text-[#00FF87]">{(sport as any).priceTo}</span>
                                </div>
                                <div className="pt-2 border-t border-white/20">
                                  <div className="flex items-center justify-center gap-2 text-xs text-white/80">
                                    <Clock className="w-3 h-3" />
                                    <span className="font-mono font-bold text-white">
                                      {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full bg-[#00FF87] hover:bg-[#00C853] text-background border-0 font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(config?.checkout || "#", "_blank");
                                }}
                              >
                                <LockOpen className="w-4 h-4 mr-2" />
                                Garantir Oferta
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Home;
