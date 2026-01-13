import { ArrowLeft, LogOut, Plane, CircleDot, Gem, Dices, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppConfig } from "@/types/auth";
import logoImg from "@/assets/premier-logo.png";

// Configuração do banner (editável)
const CASINO_BANNER = {
  imageUrl: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=300&fit=crop",
  target: "https://example.com/promo", // URL ou rota interna
};

// Configuração dos tiles - estilo Acesso Rápido
const CASINO_TILES = [
  {
    slug: "aviator",
    name: "Aviator",
    subtitle: "Entrar no jogo",
    icon: Plane,
  },
  {
    slug: "roleta",
    name: "Roleta",
    subtitle: "Jogar agora",
    icon: CircleDot,
  },
  {
    slug: "mines",
    name: "Mines",
    subtitle: "Jogar agora",
    icon: Gem,
  },
  {
    slug: "football-studio",
    name: "Football Studio",
    subtitle: "Dice (Casa x Visitante)",
    icon: Dices,
  },
];

const Casino = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);

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

  const handleBannerClick = () => {
    if (CASINO_BANNER.target.startsWith("http")) {
      window.open(CASINO_BANNER.target, "_blank");
    } else {
      navigate(CASINO_BANNER.target);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] relative overflow-hidden">
      {/* Purple glow effects - igual Home */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header - padronizado com Home */}
      <header className="sticky top-0 z-50 bg-[#0D0A1A]/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left side: Back + Logo + Title */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-purple-300" />
              </button>
              <img src={logoImg} alt="Premier Ultra" className="h-8 sm:h-10 w-auto" />
              <span className="text-base sm:text-lg font-bold text-white">Cassino</span>
            </div>
            
            {/* Right side: Email (desktop only) + Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {config?.user && (
                <span className="hidden md:block text-xs sm:text-sm font-medium text-white/80 truncate max-w-[180px]">
                  {config.user.userMail}
                </span>
              )}
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">
        {/* Banner clicável - estilo Home */}
        <div 
          onClick={handleBannerClick}
          className="relative w-full aspect-[2.5/1] rounded-2xl overflow-hidden cursor-pointer group border border-purple-500/20 shadow-lg shadow-purple-900/20"
        >
          <img 
            src={CASINO_BANNER.imageUrl}
            alt="Casino Banner"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Overlay glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0A1A]/60 to-transparent pointer-events-none" />
        </div>

        {/* Título da seção - estilo Home */}
        <section className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
            Jogos Disponíveis
          </h2>

          {/* Lista vertical de jogos - estilo Acesso Rápido */}
          <div className="grid grid-cols-1 gap-3">
            {CASINO_TILES.map((tile) => {
              const IconComponent = tile.icon;
              return (
                <button
                  key={tile.slug}
                  onClick={() => navigate(`/cassino/jogo/${tile.slug}`)}
                  className="group relative overflow-hidden rounded-xl border border-gray-300/20 bg-white/90 backdrop-blur-sm p-4 sm:p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-900/10"
                >
                  {/* Subtle hover glow */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gray-400/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-center gap-3">
                    {/* Icon container */}
                    <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gray-100 border border-gray-200/60 flex items-center justify-center text-gray-600">
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-0.5 truncate">
                        {tile.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {tile.subtitle}
                      </p>
                    </div>
                    
                    {/* Chevron */}
                    <div className="shrink-0 text-gray-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Casino;
