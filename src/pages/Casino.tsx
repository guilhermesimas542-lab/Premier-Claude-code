import { ArrowLeft, Plane, CircleDot, Gem, Dices } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppConfig } from "@/types/auth";
import { BottomNav } from "@/components/BottomNav";
import { PromoCarousel } from "@/components/PromoCarousel";
import logoImg from "@/assets/premier-logo-custom.png";
import MatrixRain from "@/components/MatrixRain";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";


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
  const { house: userHouse } = useUserBettingHouse();

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

  const getGameUrl = (slug: string): string | null => {
    if (!userHouse) return null;
    const map: Record<string, string | null> = {
      aviator: userHouse.aviator_url,
      roleta: userHouse.roleta_url,
      mines: userHouse.mines_url,
      "football-studio": userHouse.football_studio_url,
    };
    return map[slug] ?? null;
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
            
            {config?.user && (
              <span className="hidden md:block text-xs sm:text-sm font-medium truncate max-w-[180px]" style={{ color: "#00AA00" }}>
                {config.user.userMail}
              </span>
            )}
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
                <div
                  key={tile.slug}
                  className="group relative overflow-hidden rounded-xl transition-all hover:scale-[1.01]"
                  style={{ background: "rgba(0,20,0,0.6)", border: "1px solid rgba(0,255,0,0.2)", boxShadow: "0 0 0px rgba(0,255,0,0)" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 20px rgba(0,255,0,0.15)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 0px rgba(0,255,0,0)")}
                >
                  {/* Badges no topo direito DENTRO do card — mesmo estilo do badge LIVE */}
                  <div className="flex justify-end gap-1.5 px-4 pt-3 pb-0">
                    {/* Badge BETA — estilo LIVE mas laranja */}
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
                      style={{
                        background: 'rgba(0,0,0,0.65)',
                        border: '1px solid rgba(255,140,0,0.7)',
                        boxShadow: '0 0 6px rgba(255,140,0,0.4)',
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#FF8C00',
                          boxShadow: '0 0 4px rgba(255,140,0,0.9)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span className="text-[9px] font-bold tracking-wider" style={{ color: '#FF8C00' }}>BETA</span>
                    </div>

                    {/* Badge IA ATIVADA — estilo LIVE mas roxo */}
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
                      style={{
                        background: 'rgba(0,0,0,0.65)',
                        border: '1px solid rgba(168,85,247,0.7)',
                        boxShadow: '0 0 6px rgba(168,85,247,0.4)',
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#A855F7',
                          boxShadow: '0 0 4px rgba(168,85,247,0.9)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span className="text-[9px] font-bold tracking-wider" style={{ color: '#A855F7' }}>IA ATIVADA</span>
                    </div>
                  </div>

                  {/* Conteúdo principal */}
                  <button
                    onClick={() => navigate(`/cassino/${tile.slug}`)}
                    className="w-full flex items-center gap-3 px-4 pb-4 pt-2 text-left"
                  >
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
                  </button>
                </div>
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
