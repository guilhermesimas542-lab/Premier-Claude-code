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

const Home = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);
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

  const sports = [
    {
      id: "futebol",
      name: "Futebol",
      description: "Acesso liberado — dados atualizados em tempo real",
      route: "/futebol",
      gradient: "from-[#00FF87] via-[#00E676] to-[#00C853]",
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=400&fit=crop",
      badge: "🔥 Destaque",
      badgeColor: "bg-[#00FF87]/20 text-[#00FF87] border-[#00FF87]/40",
      isPremium: true,
      borderColor: "#00FF87",
    },
    {
      id: "cassino",
      name: "Cassino",
      description: "Novos jogos em desenvolvimento",
      route: "#",
      gradient: "from-primary via-orange-600 to-primary",
      image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=600&h=400&fit=crop",
      badge: "Em breve",
      badgeColor: "bg-muted/30 text-muted-foreground border-border/30",
      isPremium: false,
    },
    {
      id: "basquete",
      name: "Basquete",
      description: "Análises em preparação",
      route: "#",
      gradient: "from-accent via-cyan-500 to-accent",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=400&fit=crop",
      badge: "Em breve",
      badgeColor: "bg-muted/30 text-muted-foreground border-border/30",
      isPremium: false,
    },
    {
      id: "tenis",
      name: "Tênis",
      description: "Sistema em desenvolvimento",
      route: "#",
      gradient: "from-vip via-purple-600 to-vip",
      image: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600&h=400&fit=crop",
      badge: "Em breve",
      badgeColor: "bg-muted/30 text-muted-foreground border-border/30",
      isPremium: false,
    },
    {
      id: "esports",
      name: "E-Sports",
      description: "Disponível no plano PRO",
      route: "#",
      gradient: "from-vip via-purple-600 to-vip",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop",
      badge: "Bloqueado",
      badgeColor: "bg-destructive/20 text-destructive border-destructive/30",
      isPremium: false,
      isLocked: true,
    },
    {
      id: "volei",
      name: "Vôlei",
      description: "Garanta com desconto exclusivo!",
      route: "#",
      gradient: "from-accent via-cyan-500 to-accent",
      image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600&h=400&fit=crop",
      badge: "Pré-venda",
      badgeColor: "bg-accent/20 text-accent border-accent/30",
      isPremium: false,
      isPreSale: true,
      priceFrom: "R$ 299,00",
      priceTo: "R$ 149,00",
    },
  ];

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
            {sports.map((sport) => (
              <Card
                key={sport.id}
                onClick={() => sport.route !== "#" && navigate(sport.route)}
                className={`relative overflow-hidden ${
                  sport.route !== "#"
                    ? "cursor-pointer hover:scale-[1.02]"
                    : "cursor-not-allowed opacity-60"
                } transition-all duration-300 group border-0 p-0`}
              >
                {/* Background Image - Full Card */}
                <div className="absolute inset-0 z-0">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url('${sport.image}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E12] via-[#0A0E12]/96 to-[#0A0E12]/85" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${sport.gradient} ${sport.isPremium ? 'opacity-20' : 'opacity-10'}`} />
                  {!sport.isPremium && (
                    <div className="absolute inset-0 border border-border/20 rounded-xl" />
                  )}
                </div>

                {/* Premium Border Glow - Impactante */}
                {sport.isPremium && (
                  <div 
                    className="absolute inset-0 rounded-xl border-2 pointer-events-none z-30" 
                    style={{
                      borderColor: (sport as any).borderColor || '#00FF87',
                      boxShadow: `0 0 30px rgba(0, 255, 135, 0.6), 0 0 60px rgba(0, 255, 135, 0.3), inset 0 0 30px rgba(0, 255, 135, 0.15)`,
                      animation: 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} 
                  />
                )}

                {/* Content Container */}
                <div className="relative z-10 flex flex-col h-full min-h-[280px]">
                  {/* Top Bar - Barra Impactante */}
                  <div className={`${
                    sport.isPremium 
                      ? 'bg-gradient-to-r from-[#00FF87] via-[#00E676] to-[#00C853] shadow-lg shadow-[#00FF87]/50' 
                      : 'bg-gradient-to-r from-primary via-orange-600 to-primary'
                  } px-4 py-3`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl filter drop-shadow-lg">{sport.isPremium ? '⚽' : sport.id === 'cassino' ? '🎰' : sport.id === 'basquete' ? '🏀' : sport.id === 'tenis' ? '🎾' : sport.id === 'esports' ? '🎮' : '🏐'}</span>
                      <h3 className="text-xl font-display font-black tracking-tight text-black drop-shadow-md">
                        {sport.name}
                      </h3>
                    </div>
                  </div>

                  {/* Main Content - Área de Conteúdo Simples e Direta */}
                  <div className="p-4 space-y-3 flex-1">
                    
                    {/* Card Bloqueado */}
                    {(sport as any).isLocked ? (
                      <div className="space-y-3 py-2">
                        <div className="flex items-center justify-center py-3">
                          <Lock className="w-10 h-10 text-muted-foreground/60" />
                        </div>
                        <p className="text-xs text-center text-muted-foreground leading-relaxed">
                          {sport.description}
                        </p>
                      </div>
                    ) : (sport as any).isPreSale ? (
                      /* Pre-sale Card */
                      <div className="space-y-3">
                        {/* Countdown */}
                        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 backdrop-blur-sm">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-accent" />
                            <span className="text-[10px] text-accent font-bold uppercase">Termina em</span>
                          </div>
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
                          <p className="text-[10px] text-accent/80 font-semibold mt-1">{sport.description}</p>
                        </div>
                      </div>
                    ) : sport.isPremium ? (
                      /* Premium - Esporte Desbloqueado */
                      <div className="space-y-3">
                        {/* Status Badge - Impactante */}
                        <div className="flex flex-col items-center justify-center gap-2 bg-[#00FF87]/15 backdrop-blur-md border-2 border-[#00FF87]/50 rounded-lg p-4 shadow-lg shadow-[#00FF87]/20">
                          <LockOpen className="w-14 h-14 text-[#00FF87] drop-shadow-[0_0_10px_rgba(0,255,135,0.8)]" />
                          <p className="text-base font-black text-[#00FF87] drop-shadow-lg tracking-wide">DESBLOQUEADO</p>
                        </div>
                      </div>
                    ) : (
                      /* Em Breve - Descrição Neutra */
                      <div className="py-2">
                        <p className="text-xs leading-relaxed text-center text-muted-foreground">
                          {sport.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Section - Botão e Badges */}
                  <div className="mt-auto p-4 pt-0 space-y-3">
                    {/* Botão de Ação - Verde Neon para Premium */}
                    {(sport as any).isLocked || (sport as any).isPreSale || sport.isPremium ? (
                      <Button 
                        className={`w-full ${
                          sport.isPremium 
                            ? 'bg-[#00FF87] hover:bg-[#00E676] active:bg-[#00C853] shadow-lg shadow-[#00FF87]/30 hover:shadow-xl hover:shadow-[#00FF87]/40' 
                            : 'bg-[#DFAC2A] hover:bg-[#C89824] active:bg-[#B38820] shadow-lg hover:shadow-xl'
                        } text-black font-black py-6 text-base transition-all duration-200`}
                      >
                        {(sport as any).isLocked || (sport as any).isPreSale ? "Adquirir" : "Acessar agora"}
                      </Button>
                    ) : sport.route !== "#" ? (
                      <Button className="w-full bg-[#DFAC2A] hover:bg-[#C89824] active:bg-[#B38820] text-black font-black py-6 text-base transition-all duration-200 shadow-lg hover:shadow-xl">
                        Acessar agora
                      </Button>
                    ) : null}

                    {/* Badges - Impactantes */}
                    {sport.isPremium && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 bg-[#00FF87]/20 backdrop-blur-md border-2 border-[#00FF87]/50 rounded-full px-3 py-1.5 shadow-md shadow-[#00FF87]/20">
                          <Sparkles className="w-4 h-4 text-[#00FF87] animate-pulse drop-shadow-[0_0_6px_rgba(0,255,135,0.8)]" />
                          <span className="text-[11px] font-black text-[#00FF87] tracking-wide">IA ATIVADA</span>
                        </div>
                        <Badge className={`${sport.badgeColor} text-[10px] font-bold backdrop-blur-md px-3 py-1 border-2`}>
                          {sport.badge}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
