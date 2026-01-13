import { ArrowLeft, LogOut, Plane, CircleDot, Gem, Cat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppConfig } from "@/types/auth";
import logoImg from "@/assets/logo.jpg";

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
    borderColor: "rgba(255, 140, 66, 0.5)",
  },
  {
    slug: "roleta",
    name: "Roleta",
    icon: CircleDot,
    glowColor: "#FFD700", // Amarelo
    borderColor: "rgba(255, 215, 0, 0.5)",
  },
  {
    slug: "mines",
    name: "Mines",
    icon: Gem,
    glowColor: "#00D4FF", // Ciano
    borderColor: "rgba(0, 212, 255, 0.5)",
  },
  {
    slug: "fortune-tiger",
    name: "Fortune Tiger",
    icon: Cat,
    glowColor: "#FF4500", // Laranja/vermelho
    borderColor: "rgba(255, 69, 0, 0.5)",
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
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0C0F14]/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="Premier Ultra" className="h-10 w-auto rounded-lg" />
              <span className="text-lg font-bold text-foreground">Cassino</span>
            </div>
          </div>
          
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

      {/* Main Content */}
      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Banner clicável */}
        <div 
          onClick={handleBannerClick}
          className="relative w-full aspect-[2.5/1] rounded-2xl overflow-hidden cursor-pointer group"
        >
          <img 
            src={CASINO_BANNER.imageUrl}
            alt="Casino Banner"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Título da seção */}
        <div>
          <h2 className="text-xl font-bold text-foreground">Jogos Disponíveis</h2>
        </div>

        {/* Grid 2x2 de tiles */}
        <div className="grid grid-cols-2 gap-4">
          {CASINO_TILES.map((tile) => {
            const IconComponent = tile.icon;
            return (
              <button
                key={tile.slug}
                onClick={() => navigate(`/cassino/jogo/${tile.slug}`)}
                className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-[20px] transition-all duration-200 ease-out active:scale-[0.98] hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 100%)',
                  border: `1px solid ${tile.borderColor}`,
                  boxShadow: `0 0 20px ${tile.glowColor}30, inset 0 1px 0 rgba(255,255,255,0.05)`,
                  minHeight: '120px',
                }}
              >
                {/* Glow background */}
                <div 
                  className="absolute inset-0 rounded-[20px] opacity-20 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at center, ${tile.glowColor}40 0%, transparent 70%)`,
                  }}
                />
                
                {/* Ícone */}
                <div 
                  className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full"
                  style={{
                    background: `linear-gradient(145deg, ${tile.glowColor}20 0%, transparent 100%)`,
                    boxShadow: `0 0 15px ${tile.glowColor}40`,
                  }}
                >
                  <IconComponent 
                    className="w-7 h-7"
                    style={{ 
                      color: tile.glowColor,
                      filter: `drop-shadow(0 0 6px ${tile.glowColor}80)`,
                    }}
                  />
                </div>

                {/* Nome */}
                <span 
                  className="relative z-10 text-lg font-semibold text-white text-center leading-tight"
                  style={{
                    textShadow: `0 0 10px ${tile.glowColor}60`,
                  }}
                >
                  {tile.name}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Casino;
