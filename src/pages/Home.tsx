import { LogOut, ChevronRight, Info, Lock, Clock, Sparkles } from "lucide-react";
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
      description: "💰 Apostas com as maiores taxas de acerto — 97% de greens comprovados!",
      route: "/futebol",
      gradient: "from-success via-emerald-500 to-success",
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=400&fit=crop",
      badge: "🔥 Destaque",
      badgeColor: "bg-success text-white border-success",
      isPremium: true,
      borderColor: "#22C55E", // Verde
    },
    {
      id: "cassino",
      name: "Cassino",
      description: "Em breve",
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
      description: "Em breve",
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
      description: "Em breve",
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
      description: "Apostas em jogos eletrônicos",
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
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url('${sport.image}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F14] via-[#0C0F14]/90 to-[#0C0F14]/70" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${sport.gradient} opacity-20`} />
                  {!sport.isPremium && (
                    <div className="absolute inset-0 border border-border/30 rounded-xl" />
                  )}
                </div>

                {/* Golden/Green Border Glow Animation for Premium */}
                {sport.isPremium && (
                  <div 
                    className="absolute inset-0 rounded-xl border-2 pointer-events-none z-30 animate-border-glow" 
                    style={{
                      borderColor: (sport as any).borderColor || '#DFAC2A',
                      boxShadow: `0 0 24px ${(sport as any).borderColor ? 'rgba(34, 197, 94, 0.487)' : 'rgba(223, 172, 42, 0.487)'}, 0 0 48px ${(sport as any).borderColor ? 'rgba(34, 197, 94, 0.244)' : 'rgba(223, 172, 42, 0.244)'}, inset 0 0 24px ${(sport as any).borderColor ? 'rgba(34, 197, 94, 0.12)' : 'rgba(223, 172, 42, 0.12)'}`
                    }} 
                  />
                )}

                {/* Content Container */}
                <div className="relative z-10 flex flex-col h-full min-h-[280px]">
                  {/* Top Section - Badge and Title */}
                  <div className="p-3 space-y-2">
                    {/* Badge */}
                    <div className="flex justify-between items-center">
                      {/* AI Badge for Premium */}
                      {sport.isPremium && (
                        <div className={`flex items-center gap-1.5 ${
                          (sport as any).borderColor 
                            ? 'bg-gradient-to-r from-success/20 to-success/10 border-success/40' 
                            : 'bg-gradient-to-r from-[#DFAC2A]/20 to-[#DFAC2A]/10 border-[#DFAC2A]/40'
                        } border rounded-full px-2.5 py-1 backdrop-blur-sm`}>
                          <Sparkles className={`w-3 h-3 ${
                            (sport as any).borderColor ? 'text-success' : 'text-[#DFAC2A]'
                          } animate-pulse`} />
                          <span className={`text-[9px] font-bold ${
                            (sport as any).borderColor ? 'text-success' : 'text-[#DFAC2A]'
                          }`}>IA ATIVADA</span>
                        </div>
                      )}
                      <Badge className={`${sport.badgeColor} text-[10px] font-bold backdrop-blur-sm ml-auto`}>
                        {sport.badge}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-display font-extrabold tracking-tight text-white drop-shadow-lg">
                      {sport.name}
                    </h3>
                    
                    {/* Locked Card */}
                    {(sport as any).isLocked ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center py-4">
                          <Lock className="w-12 h-12 text-muted-foreground opacity-50" />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Você ainda não possui acesso a este esporte
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
                      /* Premium Description Badge with AI notification */
                      <>
                        <div className="bg-primary/10 border border-primary/30 rounded-lg p-2 backdrop-blur-sm">
                          <p className="text-[11px] leading-relaxed text-white font-bold text-center">
                            {sport.description}
                          </p>
                        </div>
                        {/* AI New Entries Badge */}
                        <div className={`flex items-center justify-center gap-2 ${
                          (sport as any).borderColor 
                            ? 'bg-success/10 border-success/30' 
                            : 'bg-[#DFAC2A]/10 border-[#DFAC2A]/30'
                        } border rounded-lg p-2 backdrop-blur-sm`}>
                          <Sparkles className={`w-4 h-4 ${
                            (sport as any).borderColor ? 'text-success' : 'text-[#DFAC2A]'
                          }`} />
                          <span className={`text-[10px] font-bold ${
                            (sport as any).borderColor ? 'text-success' : 'text-[#DFAC2A]'
                          }`}>8 novas entradas via IA disponíveis</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {sport.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Section - CTA */}
                  <div className="mt-auto p-3 pt-0">
                    {(sport as any).isLocked || (sport as any).isPreSale || sport.isPremium ? (
                      <Button className={`w-full font-bold py-5 ${
                        (sport as any).borderColor 
                          ? 'bg-success hover:bg-success/90 text-white' 
                          : 'bg-primary hover:bg-primary/90 text-white'
                      }`}>
                        {(sport as any).isLocked || (sport as any).isPreSale ? "Adquirir" : "Acessar agora"}
                      </Button>
                    ) : sport.route !== "#" ? (
                      <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5">
                        Acessar agora
                      </Button>
                    ) : null}
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
