import { LogOut, ChevronRight, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { NewEntriesAlert } from "@/components/NewEntriesAlert";
import { TelegramAlert } from "@/components/TelegramAlert";
import { BasicPlanAlert } from "@/components/BasicPlanAlert";
import { ProPlanAlert } from "@/components/ProPlanAlert";
import { getBackgroundImageUrl } from "@/lib/sports";
import { Sport } from "@/types/sports";
import { PremiumSportCard } from "@/components/PremiumSportCard";
import BasicPlanModal from "@/components/BasicPlanModal";
import { InstallAppButton } from "@/components/InstallAppButton";
import logoImg from "@/assets/logo.jpg";

const Home = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
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
        tipo: 0, // Premium ativo - único liberado
      },
      {
        id: 2,
        name: "MMA",
        enabled: true,
        isproplan: false,
        background: "cyberbet_76a934f8-71c1-41a2-a9fe-93c36359dd7f",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 3,
        name: "Basquete",
        enabled: true,
        isproplan: false,
        background: "cyberbet_20d5c209-1849-49d0-9475-4eabf2541b07",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 4,
        name: "Tenis",
        enabled: true,
        isproplan: false,
        background: "cyberbet_75203e34-3699-4203-9063-24bb8b805083",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 5,
        name: "Futsal",
        enabled: true,
        isproplan: false,
        background: "cyberbet_3164bd85-f9f8-4113-b776-fb37acf872a3",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 6,
        name: "Volei",
        enabled: true,
        isproplan: false,
        background: "cyberbet_55e38087-eeb7-4031-9a11-a326b50db79f",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 8,
        name: "Hoquei",
        enabled: true,
        isproplan: false,
        background: "cyberbet_255695b8-2046-4b5b-b6c5-17e7bb5e3df2",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 9,
        name: "E-Sports",
        enabled: true,
        isproplan: false,
        background: "cyberbet_3ef04120-9b39-44f5-9e4e-0127a76326bb",
        tipo: 1, // Em breve (bloqueado)
      },
      {
        id: 12,
        name: "Olheiro - IA",
        enabled: true,
        isproplan: false,
        background: "futsal-custom",
        tipo: 2, // Pré-venda / Lançamento
        expDate: "2025-12-17T20:00:00", // 17 de dezembro de 2025 às 20:00
        priceFrom: "R$ 87,90",
        priceTo: "R$ 37,90",
      },
    ];

    // Usar apenas mock (não busca API)
    setSports(mockSports);
    setLoading(false);
  }, [navigate]);

  // Countdown timer for Aviator launch (Dec 17, 2024 at 20:00)
  useEffect(() => {
    const targetDate = new Date("2025-12-17T20:00:00").getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      
      if (difference <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show modal for free plan users
  useEffect(() => {
    const storedConfig = getStoredConfig();
    const purchasedPlan = storedConfig?.user?.purchasedPlan ?? 0;
    const isFreeUser = purchasedPlan === 0 || purchasedPlan === -1;
    
    console.log('[Home] purchasedPlan:', purchasedPlan, 'isFreeUser:', isFreeUser);
    
    if (isFreeUser) {
      // Reset counter for testing (remove this line in production)
      localStorage.removeItem('basicPlanModalViews');
      localStorage.removeItem('basicPlanModalExpiration');
      setShowBasicModal(true);
    }
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
    12: "✈️", // Aviator - IA
  };

  // Cores premium tecnológicas por esporte (paleta dark + neon sutil)
  const sportColorSchemes: Record<number, {
    primary: string;
    secondary: string;
    glow: string;
  }> = {
    1: { // Futebol - Verde neon
      primary: "#00FF7F",
      secondary: "#00CC66",
      glow: "rgba(0, 255, 127, 0.35)",
    },
    2: { // MMA - Vermelho intenso
      primary: "#FF4E4E",
      secondary: "#CC3E3E",
      glow: "rgba(255, 78, 78, 0.35)",
    },
    3: { // Baseball - Azul royal
      primary: "#4A90FF",
      secondary: "#3A70CC",
      glow: "rgba(74, 144, 255, 0.35)",
    },
    4: { // Rugby - Verde escuro
      primary: "#2ECC71",
      secondary: "#27AE60",
      glow: "rgba(46, 204, 113, 0.35)",
    },
    5: { // Tenis - Amarelo dourado
      primary: "#FFD700",
      secondary: "#CCAC00",
      glow: "rgba(255, 215, 0, 0.35)",
    },
    6: { // Basquete - Laranja queimado
      primary: "#FF8C42",
      secondary: "#CC7035",
      glow: "rgba(255, 140, 66, 0.35)",
    },
    7: { // Futsal - Azul água / Cyan
      primary: "#00D4FF",
      secondary: "#00A8CC",
      glow: "rgba(0, 212, 255, 0.35)",
    },
    8: { // Hoquei - Azul gelo
      primary: "#5BC0EB",
      secondary: "#4899BC",
      glow: "rgba(91, 192, 235, 0.35)",
    },
    9: { // Handball - Rosa magenta
      primary: "#FF6B9D",
      secondary: "#CC567E",
      glow: "rgba(255, 107, 157, 0.35)",
    },
    10: { // Volei - Amarelo vibrante
      primary: "#FFEA00",
      secondary: "#CCBB00",
      glow: "rgba(255, 234, 0, 0.35)",
    },
    11: { // Cassino - Roxo neon
      primary: "#A855F7",
      secondary: "#8644C5",
      glow: "rgba(168, 85, 247, 0.35)",
    },
    12: { // Aviator - IA - Vermelho/Laranja vibrante
      primary: "#FF6B35",
      secondary: "#E85D2D",
      glow: "rgba(255, 107, 53, 0.35)",
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
      priceFrom: cardType === 'presale' ? (sport.priceFrom || "R$ 299,00") : undefined,
      priceTo: cardType === 'presale' ? (sport.priceTo || "R$ 149,00") : undefined,
    };
  });

  const announcements = [
    {
      id: 1,
      type: "info",
      title: "Bem-vindo ao Olheiro!",
      message: "Acesse as melhores análises e tips para suas apostas esportivas.",
    },
    {
      id: 2,
      type: "success",
      title: "Sistema atualizado",
      message: "Nova interface com melhorias de performance e design moderno.",
    },
  ];

  const purchasedPlan = config?.user?.purchasedPlan ?? 0;
  
  // Filtra banners baseado no plano do usuário:
  // Free (0, -1): banner básico + destaque
  // Básico (1): banner PRO + destaque  
  // PRO (2, 3): só destaque
  const allBanners = [
    {
      id: 1,
      image: config?.basicImageBanner || "https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aae?w=1200&h=400&fit=crop",
      title: "Plano Básico",
      description: "Acesse tips exclusivas todos os dias",
      ctaText: "Conhecer",
      ctaUrl: config?.checkout || "#",
      showFor: [0, -1], // Apenas Free vê
    },
    {
      id: 2,
      image: config?.proImageBanner || "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=400&fit=crop",
      title: "Plano PRO",
      description: "Tips premium com análise avançada",
      ctaText: "Assinar PRO",
      ctaUrl: config?.proUrl || "#",
      showFor: [1], // Apenas Básico vê
    },
    {
      id: 3,
      image: config?.banner1Image || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=400&fit=crop",
      title: "Bônus Especial",
      description: "Aproveite ofertas exclusivas",
      ctaText: "Ver Oferta",
      ctaUrl: config?.banner1Url || "#",
      showFor: [0, -1, 1, 2, 3], // Todos veem (destaque)
    },
  ];

  // Filtra banners que o usuário pode ver
  const banners = allBanners.filter(banner => banner.showFor.includes(purchasedPlan));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0C0F14]/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <img src={logoImg} alt="Olheiro" className="h-10 w-auto rounded-lg" />
          
          <div className="flex items-center gap-3">
            {config?.user && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-muted-foreground">Usuário</span>
                <span className="text-sm font-bold text-foreground">{config.user.userMail}</span>
              </div>
            )}
            <div className="hidden sm:block">
              <InstallAppButton variant="header" />
            </div>
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
        {/* Mobile Install App CTA */}
        <div className="sm:hidden">
          <InstallAppButton variant="mobile-menu" />
        </div>

        {/* Announcements - First items */}
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
            <CarouselContent className="-ml-2 md:-ml-4">
              {banners.map((banner) => (
                <CarouselItem key={banner.id} className="pl-2 md:pl-4">
                  <div className="relative rounded-xl md:rounded-2xl overflow-hidden group cursor-pointer h-48 sm:h-56 md:h-64 lg:h-72">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F14] via-[#0C0F14]/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 space-y-2 sm:space-y-3 md:space-y-4">
                      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
                        {banner.title}
                      </h2>
                      <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl line-clamp-2">
                        {banner.description}
                      </p>
                      <Button
                        onClick={() => banner.ctaUrl !== "#" && window.open(banner.ctaUrl, "_blank")}
                        className="bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm"
                        size="sm"
                      >
                        {banner.ctaText}
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                      </Button>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 md:left-4 h-7 w-7 md:h-8 md:w-8" />
            <CarouselNext className="right-2 md:right-4 h-7 w-7 md:h-8 md:w-8" />
          </Carousel>
        </section>

        {/* Entradas Disponíveis - Premium */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
              Entradas Disponíveis
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Carregando esportes...</p>
              </div>
            ) : mappedSports.filter(sport => sport.isPremium || (sport as any).isPreSale).length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Nenhum esporte disponível</p>
              </div>
            ) : (
              mappedSports.filter(sport => sport.isPremium || (sport as any).isPreSale).map((sport) => (
                <PremiumSportCard
                  key={sport.id}
                  id={sport.id}
                  name={sport.name}
                  emoji={(sport as any).emoji}
                  isPremium={sport.isPremium}
                  isLocked={(sport as any).isLocked}
                  isDevelopment={(sport as any).isDevelopment}
                  isPreSale={(sport as any).isPreSale}
                  colors={(sport as any).colors}
                  priceFrom={(sport as any).priceFrom}
                  priceTo={(sport as any).priceTo}
                  countdown={(sport as any).isPreSale ? countdown : undefined}
                  onClick={() => {
                    if (sport.isPremium && sport.route !== "#") {
                      navigate(sport.route);
                    }
                  }}
                />
              ))
            )}
          </div>
        </section>

        {/* Mais Entradas - Outros esportes */}
        {!loading && mappedSports.filter(sport => !sport.isPremium && !(sport as any).isPreSale).length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
                Mais Entradas
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {mappedSports.filter(sport => !sport.isPremium && !(sport as any).isPreSale).map((sport) => (
                <PremiumSportCard
                  key={sport.id}
                  id={sport.id}
                  name={sport.name}
                  emoji={(sport as any).emoji}
                  isPremium={sport.isPremium}
                  isLocked={(sport as any).isLocked}
                  isDevelopment={(sport as any).isDevelopment}
                  isPreSale={(sport as any).isPreSale}
                  colors={(sport as any).colors}
                  priceFrom={(sport as any).priceFrom}
                  priceTo={(sport as any).priceTo}
                  countdown={(sport as any).isPreSale ? countdown : undefined}
                  onClick={() => {
                    if ((sport as any).isLocked || (sport as any).isPreSale) {
                      // Pode adicionar ação de compra aqui
                    }
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Basic Plan Conversion Modal for Free Users */}
      <BasicPlanModal 
        open={showBasicModal} 
        onClose={() => setShowBasicModal(false)} 
      />
    </div>
  );
};

export default Home;
