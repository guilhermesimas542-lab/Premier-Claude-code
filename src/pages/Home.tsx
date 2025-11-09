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
import { getStoredConfig, clearAuth, isAuthenticated, updateConfigFromSports } from "@/lib/auth";
import { AppConfig } from "@/types/auth";
import { NewEntriesAlert } from "@/components/NewEntriesAlert";
import { TelegramAlert } from "@/components/TelegramAlert";
import { BasicPlanAlert } from "@/components/BasicPlanAlert";
import { ProPlanAlert } from "@/components/ProPlanAlert";
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

    // Dados mockados com diferentes estados
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
        tipo: 0, // Bloqueado
      },
      {
        id: 6,
        name: "Basquete",
        enabled: true,
        isproplan: false,
        background: "cyberbet_55e38087-eeb7-4031-9a11-a326b50db79f",
        tipo: 0, // Premium ativo
      },
      {
        id: 7,
        name: "Futsal",
        enabled: true,
        isproplan: false,
        background: "futsal-custom",
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
      {
        id: 9,
        name: "Handball",
        enabled: true,
        isproplan: false,
        background: "cyberbet_3ef04120-9b39-44f5-9e4e-0127a76326bb",
        tipo: 1, // Em desenvolvimento
      },
      {
        id: 10,
        name: "Volei",
        enabled: false,
        isproplan: false,
        background: "cyberbet_76a934f8-71c1-41a2-a9fe-93c36359dd7f",
        tipo: 0, // Bloqueado
      },
      {
        id: 11,
        name: "Cassino",
        enabled: true,
        isproplan: false,
        background: "cyberbet_20d5c209-1849-49d0-9475-4eabf2541b07",
        tipo: 0, // Premium ativo
      },
    ];

    // Usar apenas mock (não busca API)
    setSports(mockSports);
    setLoading(false);
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
      route: cardType === 'premium' ? `/sport/${sport.id}` : "#",
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
      <header className="sticky top-0 z-50 bg-[#0C0F14]/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <img src="/logo.png" alt="Premier FC" className="h-10 w-auto" />
          
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

      <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Conditional Alerts based on user plan - Priority: Free → Basic → Pro → Telegram → Default */}
        {config?.user?.purchasedPlan === 0 || config?.user?.purchasedPlan === -1 ? (
          <BasicPlanAlert checkoutUrl={config?.checkout} />
        ) : config?.user?.purchasedPlan === 1 ? (
          <ProPlanAlert proUrl={config?.proUrl} />
        ) : (config?.user?.purchasedPlan === 2 || config?.user?.purchasedPlan === 3) && config?.user?.telegran === 0 ? (
          <TelegramAlert telegramUrl={config?.telegramUrl} />
        ) : (
          <NewEntriesAlert betSiteUrl={config?.betSite} />
        )}

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

        {/* Esportes Disponíveis - Premium */}
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
            ) : mappedSports.filter(sport => sport.isPremium).length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Nenhum esporte disponível</p>
              </div>
            ) : (
              mappedSports.filter(sport => sport.isPremium).map((sport) => (
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
                        <div className="absolute -top-2 -right-2 z-20 animate-fade-in">
                          <div 
                            className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#000636]/95 to-[#0033C6]/95 backdrop-blur-xl border-2 rounded-xl px-3 py-1.5 shadow-2xl"
                            style={{
                              borderColor: (sport as any).colors?.border || '#00FF87',
                              boxShadow: `0 0 20px ${(sport as any).colors?.primary || '#00FF87'}80`
                            }}
                          >
                            <Sparkles 
                              className="w-3.5 h-3.5 animate-pulse" 
                              style={{ 
                                color: (sport as any).colors?.primary || '#00FF87',
                                filter: `drop-shadow(0 0 8px ${(sport as any).colors?.primary || '#00FF87'})`
                              }}
                            />
                            <span 
                              className="text-[10px] font-black tracking-widest whitespace-nowrap"
                              style={{ 
                                color: (sport as any).colors?.primary || '#00FF87',
                                textShadow: `0 0 8px ${(sport as any).colors?.glow || 'rgba(0,255,135,0.8)'}`
                              }}
                            >
                              IA ATIVADA
                            </span>
                            {/* Partículas de luz tecnológicas */}
                            <div className="absolute inset-0 opacity-30 pointer-events-none">
                              <div className="absolute top-0.5 left-1.5 w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
                              <div className="absolute bottom-0.5 right-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                              <div 
                                className="absolute top-1/2 right-1.5 w-0.5 h-0.5 rounded-full animate-pulse" 
                                style={{ 
                                  backgroundColor: (sport as any).colors?.primary || '#00FF87',
                                  animationDelay: '1s' 
                                }}
                              />
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
                    {/* Top Bar - Faixa Colorida por Esporte */}
                    <div 
                      className="px-5 py-4"
                      style={{
                        background: `linear-gradient(90deg, ${(sport as any).colors?.secondary || 'hsl(18, 100%, 56%)'}, ${(sport as any).colors?.primary || 'hsl(27, 96%, 50%)'}, ${(sport as any).colors?.primary || 'hsl(27, 96%, 50%)'}, ${(sport as any).colors?.secondary || 'hsl(18, 100%, 56%)'})`,
                        backgroundSize: '200% 100%',
                        animation: sport.isPremium ? 'liquid-gradient 3s ease-in-out infinite' : 'none',
                        boxShadow: `0 4px 20px ${(sport as any).colors?.primary || 'hsl(18, 100%, 56%)'}40`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="text-3xl filter"
                          style={{
                            filter: `drop-shadow(0 0 15px ${(sport as any).colors?.primary || '#FF6B35'})`
                          }}
                        >
                          {(sport as any).emoji || '🏆'}
                        </span>
                        <h3 
                          className="text-xl font-display font-black tracking-wider text-white"
                          style={{
                            textShadow: `0 0 10px ${(sport as any).colors?.glow || 'rgba(255,107,53,0.6)'}`
                          }}
                        >
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
                              <div 
                                className="absolute inset-0 blur-xl opacity-30"
                                style={{ backgroundColor: (sport as any).colors?.primary || '#00FF87' }}
                              />
                              <h4 
                                className="relative text-lg font-black leading-tight tracking-wide"
                                style={{ 
                                  color: (sport as any).colors?.primary || '#00FF87',
                                  textShadow: `0 0 20px ${(sport as any).colors?.glow || 'rgba(0,255,135,0.9)'}`
                                }}
                              >
                                NOVAS ENTRADAS DISPONÍVEIS
                              </h4>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <div 
                                className="h-px w-8 bg-gradient-to-r from-transparent"
                                style={{ 
                                  ['--tw-gradient-to' as any]: (sport as any).colors?.primary || '#00FF87'
                                }}
                              />
                              <p className="text-base font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-wider whitespace-nowrap">
                                ⚡ APOSTE AGORA ⚡
                              </p>
                              <div 
                                className="h-px w-8 bg-gradient-to-l from-transparent"
                                style={{ 
                                  ['--tw-gradient-to' as any]: (sport as any).colors?.primary || '#00FF87'
                                }}
                              />
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
                        className="w-full relative overflow-hidden bg-[length:200%_100%] hover:bg-[length:100%_100%] shadow-2xl hover:shadow-3xl shimmer-effect text-black font-black py-7 text-base transition-all duration-500 border-0"
                        style={{
                          backgroundImage: `linear-gradient(to right, ${(sport as any).colors?.secondary || '#00C853'}, ${(sport as any).colors?.primary || '#00FF87'}, ${(sport as any).colors?.secondary || '#00C853'})`,
                          boxShadow: `0 0 40px ${(sport as any).colors?.primary || '#00FF87'}60, 0 0 60px ${(sport as any).colors?.primary || '#00FF87'}40`
                        }}
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

        {/* Mais Entradas - Outros esportes */}
        {!loading && mappedSports.filter(sport => !sport.isPremium).length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
                Mais Entradas
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {mappedSports.filter(sport => !sport.isPremium).map((sport) => (
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
                          <div className="absolute -top-2 -right-2 z-20 animate-fade-in">
                            <div 
                              className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#000636]/95 to-[#0033C6]/95 backdrop-blur-xl border-2 rounded-xl px-3 py-1.5 shadow-2xl"
                              style={{
                                borderColor: (sport as any).colors?.border || '#00FF87',
                                boxShadow: `0 0 20px ${(sport as any).colors?.primary || '#00FF87'}80`
                              }}
                            >
                              <Sparkles 
                                className="w-3.5 h-3.5 animate-pulse" 
                                style={{ 
                                  color: (sport as any).colors?.primary || '#00FF87',
                                  filter: `drop-shadow(0 0 8px ${(sport as any).colors?.primary || '#00FF87'})`
                                }}
                              />
                              <span 
                                className="text-[10px] font-black tracking-widest whitespace-nowrap"
                                style={{ 
                                  color: (sport as any).colors?.primary || '#00FF87',
                                  textShadow: `0 0 8px ${(sport as any).colors?.glow || 'rgba(0,255,135,0.8)'}`
                                }}
                              >
                                IA ATIVADA
                              </span>
                              {/* Partículas de luz tecnológicas */}
                              <div className="absolute inset-0 opacity-30 pointer-events-none">
                                <div className="absolute top-0.5 left-1.5 w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
                                <div className="absolute bottom-0.5 right-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                                <div 
                                  className="absolute top-1/2 right-1.5 w-0.5 h-0.5 rounded-full animate-pulse" 
                                  style={{ 
                                    backgroundColor: (sport as any).colors?.primary || '#00FF87',
                                    animationDelay: '1s' 
                                  }}
                                />
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
                      {/* Top Bar - Faixa Colorida por Esporte */}
                      <div 
                        className="px-5 py-4"
                        style={{
                          background: `linear-gradient(90deg, ${(sport as any).colors?.secondary || 'hsl(18, 100%, 56%)'}, ${(sport as any).colors?.primary || 'hsl(27, 96%, 50%)'}, ${(sport as any).colors?.primary || 'hsl(27, 96%, 50%)'}, ${(sport as any).colors?.secondary || 'hsl(18, 100%, 56%)'})`,
                          backgroundSize: '200% 100%',
                          animation: sport.isPremium ? 'liquid-gradient 3s ease-in-out infinite' : 'none',
                          boxShadow: `0 4px 20px ${(sport as any).colors?.primary || 'hsl(18, 100%, 56%)'}40`
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="text-3xl filter"
                            style={{
                              filter: `drop-shadow(0 0 15px ${(sport as any).colors?.primary || '#FF6B35'})`
                            }}
                          >
                            {(sport as any).emoji || '🏆'}
                          </span>
                          <h3 
                            className="text-xl font-display font-black tracking-wider text-white"
                            style={{
                              textShadow: `0 0 10px ${(sport as any).colors?.glow || 'rgba(255,107,53,0.6)'}`
                            }}
                          >
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
                                <div 
                                  className="absolute inset-0 blur-xl opacity-30"
                                  style={{ backgroundColor: (sport as any).colors?.primary || '#00FF87' }}
                                />
                                <h4 
                                  className="relative text-lg font-black leading-tight tracking-wide"
                                  style={{ 
                                    color: (sport as any).colors?.primary || '#00FF87',
                                    textShadow: `0 0 20px ${(sport as any).colors?.glow || 'rgba(0,255,135,0.9)'}`
                                  }}
                                >
                                  NOVAS ENTRADAS DISPONÍVEIS
                                </h4>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <div 
                                  className="h-px w-8 bg-gradient-to-r from-transparent"
                                  style={{ 
                                    ['--tw-gradient-to' as any]: (sport as any).colors?.primary || '#00FF87'
                                  }}
                                />
                                <p className="text-base font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-wider whitespace-nowrap">
                                  ⚡ APOSTE AGORA ⚡
                                </p>
                                <div 
                                  className="h-px w-8 bg-gradient-to-l from-transparent"
                                  style={{ 
                                    ['--tw-gradient-to' as any]: (sport as any).colors?.primary || '#00FF87'
                                  }}
                                />
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
                          className="w-full relative overflow-hidden bg-[length:200%_100%] hover:bg-[length:100%_100%] shadow-2xl hover:shadow-3xl shimmer-effect text-black font-black py-7 text-base transition-all duration-500 border-0"
                          style={{
                            backgroundImage: `linear-gradient(to right, ${(sport as any).colors?.secondary || '#00C853'}, ${(sport as any).colors?.primary || '#00FF87'}, ${(sport as any).colors?.secondary || '#00C853'})`,
                            boxShadow: `0 0 40px ${(sport as any).colors?.primary || '#00FF87'}60, 0 0 60px ${(sport as any).colors?.primary || '#00FF87'}40`
                          }}
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
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Home;
