import { ArrowLeft, LogOut, Plane, CircleDot, Gem, Dices } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppConfig } from "@/types/auth";
import { BottomNav } from "@/components/BottomNav";
import { PromoCarousel } from "@/components/PromoCarousel";
import logoImg from "@/assets/premier-logo.svg";
import MatrixRain from "@/components/MatrixRain";

// Configuração dos tiles - estilo Acesso Rápido
const CASINO_TILES = [
  {
    slug: "aviator",
    name: "Aviator",
    subtitle: "Decole antes do crash! Multiplique seus ganhos",
    icon: Plane,
  },
  {
    slug: "roleta",
    name: "Roleta",
    subtitle: "Vermelho ou preto? Aposte e gire a sorte",
    icon: CircleDot,
  },
  {
    slug: "mines",
    name: "Mines",
    subtitle: "Desvie das bombas e acumule prêmios",
    icon: Gem,
  },
  {
    slug: "football-studio",
    name: "Football Studio",
    subtitle: "Casa ou Visitante? Aposte no resultado",
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

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0" style={{ background: "#000000" }}>
      <MatrixRain opacity={0.18} />
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,255,0,0.04)" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.92)", borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-lg transition-colors"
                style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.25)" }}
              >
                <ArrowLeft className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
              <img src={logoImg} alt="Premier Ultra" className="h-8 sm:h-10 w-auto" style={{ filter: "drop-shadow(0 0 6px rgba(0,255,0,0.4))" }} />
              <span className="text-base sm:text-lg font-bold" style={{ color: "#FFFFFF" }}>Cassino</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {config?.user && (
                <span className="hidden md:block text-xs sm:text-sm font-medium truncate max-w-[180px]" style={{ color: "#00AA00" }}>
                  {config.user.userMail}
                </span>
              )}
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.25)", color: "#00FF00" }}
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
        <PromoCarousel context="cassino" />

        <section className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight" style={{ color: "#FFFFFF" }}>
            Jogos Disponíveis
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {CASINO_TILES.map((tile) => {
              const IconComponent = tile.icon;
              return (
                <button
                  key={tile.slug}
                  onClick={() => navigate(`/cassino/jogo/${tile.slug}`)}
                  className="group relative overflow-hidden rounded-xl px-4 pb-4 pt-10 sm:px-5 sm:pb-5 sm:pt-10 text-left transition-all hover:scale-[1.01]"
                  style={{ background: "rgba(0,20,0,0.6)", border: "1px solid rgba(0,255,0,0.2)", boxShadow: "0 0 0px rgba(0,255,0,0)" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 20px rgba(0,255,0,0.15)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 0px rgba(0,255,0,0)")}
                >
                  <div className="relative flex items-center gap-3">
                    {/* Badges no topo do card */}
                    <div className="absolute -top-8 right-0 flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"
                        style={{ background: "#FF8C00", color: "#000000" }}
                      >
                        ⚙️ BETA
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"
                        style={{ background: "#A855F7", color: "#FFFFFF" }}
                      >
                        🤖 IA ATIVADA
                      </span>
                    </div>

                    {/* Ícone */}
                    <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.25)" }}>
                      <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: "#00FF00" }} />
                    </div>

                    {/* Textos */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold mb-1 truncate" style={{ color: "#FFFFFF" }}>
                        {tile.name}
                      </h3>
                      <p className="text-xs sm:text-sm leading-snug" style={{ color: "#AAAAAA" }}>
                        {tile.subtitle}
                      </p>
                    </div>

                    {/* Botão JOGAR AGORA */}
                    <div className="shrink-0 ml-2">
                      <span
                        className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all group-hover:scale-105"
                        style={{
                          background: "#00FF00",
                          color: "#000000",
                          boxShadow: "0 0 12px rgba(0,255,0,0.5)",
                          minWidth: "90px",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Jogar Agora
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Bottom Nav - Mobile only */}
      <BottomNav />
    </div>
  );
};

export default Casino;
