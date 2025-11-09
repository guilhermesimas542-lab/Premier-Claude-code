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
      name: "FUTEBOL",
      emoji: "⚽",
      tagline: "🔥 Entrada quente — Análise premium disponível agora!",
      description: "Resultados com precisão máxima",
      route: "/futebol",
      gradient: "from-[#000636] via-[#0026A3] to-[#0033C6]",
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop&q=80",
      badge: "🔥 Destaque",
      badgeColor: "bg-[#00FF87]/20 text-[#00FF87] border-[#00FF87]/40",
      isPremium: true,
      borderColor: "#00FF87",
    },
    {
      id: "cassino",
      name: "CASSINO",
      emoji: "🎰",
      description: "Novos jogos em desenvolvimento",
      route: "#",
      gradient: "from-primary via-orange-600 to-primary",
      image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=600&fit=crop&q=80",
      badge: "Em breve",
      badgeColor: "bg-muted/30 text-muted-foreground border-border/30",
      isPremium: false,
    },
    {
      id: "basquete",
      name: "BASQUETE",
      emoji: "🏀",
      description: "Análises em preparação",
      route: "#",
      gradient: "from-accent via-cyan-500 to-accent",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop&q=80",
      badge: "Em breve",
      badgeColor: "bg-muted/30 text-muted-foreground border-border/30",
      isPremium: false,
    },
    {
      id: "tenis",
      name: "TÊNIS",
      emoji: "🎾",
      description: "Sistema em desenvolvimento",
      route: "#",
      gradient: "from-vip via-purple-600 to-vip",
      image: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=600&fit=crop&q=80",
      badge: "Em breve",
      badgeColor: "bg-muted/30 text-muted-foreground border-border/30",
      isPremium: false,
    },
    {
      id: "esports",
      name: "E-SPORTS",
      emoji: "🎮",
      description: "Disponível no plano PRO",
      route: "#",
      gradient: "from-vip via-purple-600 to-vip",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop&q=80",
      badge: "Bloqueado",
      badgeColor: "bg-destructive/20 text-destructive border-destructive/30",
      isPremium: false,
      isLocked: true,
    },
    {
      id: "volei",
      name: "VÔLEI",
      emoji: "🏐",
      description: "Garanta com desconto exclusivo!",
      route: "#",
      gradient: "from-accent via-cyan-500 to-accent",
      image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop&q=80",
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
            {sports.map((sport) => (
              <div
                key={sport.id}
                onClick={() => sport.route !== "#" && navigate(sport.route)}
                className={`${
                  sport.isPremium ? 'border-fire-effect' : ''
                } ${
                  sport.route !== "#"
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
                          {(sport as any).emoji || (sport.isPremium ? '⚽' : sport.id === 'cassino' ? '🎰' : sport.id === 'basquete' ? '🏀' : sport.id === 'tenis' ? '🎾' : sport.id === 'esports' ? '🎮' : '🏐')}
                        </span>
                        <h3 className="text-xl font-display font-black tracking-wider text-white drop-shadow-[0_0_10px_rgba(0,212,255,0.6)]">
                          {sport.name}
                        </h3>
                      </div>
                    </div>

                    {/* Main Content - Épico e Cinematográfico */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-center">
                      
                      {/* Card Bloqueado */}
                      {(sport as any).isLocked ? (
                        <div className="space-y-4 py-2">
                          <div className="flex items-center justify-center py-4">
                            <Lock className="w-12 h-12 text-muted-foreground/60" />
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
                              <p className="text-base font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-wider">
                                ⚡ APOSTE AGORA ⚡
                              </p>
                              <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#00FF87]" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Em Breve - Descrição Neutra */
                        <div className="py-2">
                          <p className="text-xs leading-relaxed text-center text-muted-foreground">
                            {sport.description}
                          </p>
                        </div>
                      )
                    }
                  </div>

                  {/* Bottom Section - Botão Dourado */}
                  <div className="mt-auto p-5 pt-0 space-y-3">
                    {/* Botão Verde Metálico com Reflexo Animado */}
                    {(sport as any).isLocked || (sport as any).isPreSale || sport.isPremium ? (
                      <Button 
                        className={`w-full relative overflow-hidden ${
                          sport.isPremium 
                            ? 'bg-gradient-to-r from-[#00C853] via-[#00FF87] to-[#00C853] bg-[length:200%_100%] hover:bg-[length:100%_100%] shadow-2xl shadow-[#00FF87]/60 hover:shadow-[#00FF87]/80 shimmer-effect' 
                            : 'bg-[#00C853] hover:bg-[#00A844] shadow-lg hover:shadow-xl'
                        } text-black font-black py-7 text-base transition-all duration-500 border-0`}
                      >
                        <span className="relative z-10 drop-shadow-md tracking-wide">
                          {(sport as any).isLocked || (sport as any).isPreSale ? "ADQUIRIR AGORA" : "ACESSAR AGORA"}
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
      </main>
    </div>
  );
};

export default Home;
