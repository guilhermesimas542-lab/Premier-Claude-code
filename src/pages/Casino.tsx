import { ArrowLeft, LogOut, Plane, CircleDot, Gem, Cat } from "lucide-react";
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

// Configuração dos tiles
const CASINO_TILES = [
  {
    slug: "aviator",
    name: "Aviator",
    icon: Plane,
    glowColor: "#FF8C42", // Laranja
    borderColor: "rgba(255, 140, 66, 0.4)",
  },
  {
    slug: "roleta",
    name: "Roleta",
    icon: CircleDot,
    glowColor: "#FFD700", // Amarelo
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  {
    slug: "mines",
    name: "Mines",
    icon: Gem,
    glowColor: "#00D4FF", // Ciano
    borderColor: "rgba(0, 212, 255, 0.4)",
  },
  {
    slug: "fortune-tiger",
    name: "Fortune Tiger",
    icon: Cat,
    glowColor: "#FF4500", // Laranja/vermelho
    borderColor: "rgba(255, 69, 0, 0.4)",
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

          {/* Grid de tiles - estilo padronizado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {CASINO_TILES.map((tile) => {
              const IconComponent = tile.icon;
              return (
                <button
                  key={tile.slug}
                  onClick={() => navigate(`/cassino/jogo/${tile.slug}`)}
                  className="relative flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-2xl transition-all duration-200 ease-out active:scale-[0.98] hover:scale-[1.02] group overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(13, 10, 26, 0.9) 0%, rgba(26, 16, 48, 0.9) 100%)',
                    border: `1px solid ${tile.borderColor}`,
                    boxShadow: `0 4px 20px ${tile.glowColor}20, inset 0 1px 0 rgba(255,255,255,0.05)`,
                  }}
                >
                  {/* Glow background */}
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${tile.glowColor}40 0%, transparent 70%)`,
                    }}
                  />
                  
                  {/* Ícone */}
                  <div 
                    className="relative z-10 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl"
                    style={{
                      background: `linear-gradient(145deg, ${tile.glowColor}15 0%, transparent 100%)`,
                      boxShadow: `0 0 20px ${tile.glowColor}30`,
                    }}
                  >
                    <IconComponent 
                      className="w-8 h-8 sm:w-9 sm:h-9"
                      style={{ 
                        color: tile.glowColor,
                        filter: `drop-shadow(0 0 8px ${tile.glowColor}80)`,
                      }}
                    />
                  </div>

                  {/* Nome */}
                  <span 
                    className="relative z-10 text-base sm:text-lg font-bold text-white text-center leading-tight"
                    style={{
                      textShadow: `0 0 12px ${tile.glowColor}50`,
                    }}
                  >
                    {tile.name}
                  </span>
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
