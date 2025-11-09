import { LogOut, ChevronRight, Info } from "lucide-react";
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
      gradient: "from-primary via-orange-600 to-primary",
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=400&fit=crop",
      badge: "🔥 Destaque",
      badgeColor: "bg-primary text-white border-primary",
      isPremium: true,
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
                } transition-all duration-300 group ${
                  sport.isPremium 
                    ? "bg-gradient-to-br from-[#DFAC2A]/20 to-[#DFAC2A]/5" 
                    : "bg-gradient-to-br from-[#121826] to-[#0C0F14] border-border/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                }`}
              >
                {/* Golden Border Glow Animation for Premium */}
                {sport.isPremium && (
                  <div className="absolute inset-0 rounded-xl border-2 border-[#DFAC2A] pointer-events-none animate-border-glow" style={{
                    boxShadow: '0 0 24px rgba(223, 172, 42, 0.487), 0 0 48px rgba(223, 172, 42, 0.244), inset 0 0 24px rgba(223, 172, 42, 0.12)'
                  }} />
                )}

                {/* Background Image */}
                <div className="relative h-48 overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 ${
                      sport.isPremium ? "group-hover:scale-110" : "group-hover:scale-110"
                    }`}
                    style={{ backgroundImage: `url('${sport.image}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F14] via-[#0C0F14]/80 to-[#0C0F14]/40" />
                  
                  {/* Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge className={`${sport.badgeColor} text-[10px] font-bold backdrop-blur-sm`}>
                      {sport.badge}
                    </Badge>
                  </div>

                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${sport.gradient} opacity-20`} />
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 relative">
                  <h3 className={`text-xl font-display font-extrabold tracking-tight ${
                    sport.isPremium 
                      ? "text-white" 
                      : "text-foreground"
                  }`}>
                    {sport.name}
                  </h3>
                  
                  {sport.isPremium ? (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 backdrop-blur-sm">
                      <p className="text-[11px] leading-relaxed text-white font-bold text-center">
                        {sport.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {sport.description}
                    </p>
                  )}
                  
                  {sport.route !== "#" && (
                    <div className={`flex items-center text-xs font-bold pt-1 ${
                      sport.isPremium ? "text-primary" : "text-primary"
                    }`}>
                      Acessar agora
                      <ChevronRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
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
