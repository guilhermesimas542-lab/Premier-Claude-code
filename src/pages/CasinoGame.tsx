import { ArrowLeft, Plane, CircleDot, Gem, Dices } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import MatrixRain from "@/components/MatrixRain";

const GAME_INFO: Record<string, {
  name: string;
  subtitle: string;
  icon: React.ElementType;
  urlField: keyof import("@/hooks/useUserBettingHouse").BettingHouseData;
}> = {
  aviator: {
    name: "Aviator",
    subtitle: "Decole antes do crash! Multiplique seus ganhos",
    icon: Plane,
    urlField: "aviator_url",
  },
  roleta: {
    name: "Roleta",
    subtitle: "Vermelho ou preto? Aposte e gire a sorte",
    icon: CircleDot,
    urlField: "roleta_url",
  },
  mines: {
    name: "Mines",
    subtitle: "Desvie das bombas e acumule prêmios",
    icon: Gem,
    urlField: "mines_url",
  },
  "football-studio": {
    name: "Football Studio",
    subtitle: "Casa ou Visitante? Aposte no resultado",
    icon: Dices,
    urlField: "football_studio_url",
  },
};

const CasinoGame = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { house, loading } = useUserBettingHouse();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  const game = gameId ? GAME_INFO[gameId] : null;

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "#000000" }}>
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold" style={{ color: "#00FF00" }}>Jogo não encontrado</h1>
          <p style={{ color: "#00AA00" }}>O jogo solicitado não existe ou foi removido.</p>
          <Button
            onClick={() => navigate("/cassino")}
            style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.35)", color: "#00FF00" }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Cassino
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = game.icon;
  const gameUrl = house ? (house[game.urlField] as string | null) : null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#000000" }}>
      <MatrixRain opacity={0.12} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.92)", borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => navigate("/cassino")}
            size="sm"
            style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.3)", color: "#00FF00" }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1
            className="text-xl font-display font-extrabold tracking-tight"
            style={{ color: "#00FF00", textShadow: "0 0 15px rgba(0,255,0,0.4)" }}
          >
            {game.name}
          </h1>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-7xl mx-auto px-4 py-4 space-y-4 relative z-10">
        {/* Badges + Info */}
        <div
          className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ background: "rgba(0,20,0,0.6)", border: "1px solid rgba(0,255,0,0.2)" }}
        >
          {/* Icon */}
          <div
            className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.25)" }}
          >
            <IconComponent className="w-7 h-7" style={{ color: "#00FF00" }} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold mb-0.5" style={{ color: "#FFFFFF" }}>{game.name}</h2>
            <p className="text-sm" style={{ color: "#AAAAAA" }}>{game.subtitle}</p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,140,0,0.7)", boxShadow: "0 0 6px rgba(255,140,0,0.4)" }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF8C00", boxShadow: "0 0 4px rgba(255,140,0,0.9)", display: "inline-block" }} />
              <span className="text-[9px] font-bold tracking-wider" style={{ color: "#FF8C00" }}>BETA</span>
            </div>
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(168,85,247,0.7)", boxShadow: "0 0 6px rgba(168,85,247,0.4)" }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#A855F7", boxShadow: "0 0 4px rgba(168,85,247,0.9)", display: "inline-block" }} />
              <span className="text-[9px] font-bold tracking-wider" style={{ color: "#A855F7" }}>IA ATIVADA</span>
            </div>
          </div>
        </div>

        {/* iFrame */}
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{
            border: "1.5px solid rgba(0,255,0,0.2)",
            boxShadow: "0 0 30px rgba(0,255,0,0.08), inset 0 0 20px rgba(0,0,0,0.3)",
            background: "rgba(0,10,0,0.4)",
            minHeight: "70vh",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm" style={{ color: "#00AA00" }}>Carregando jogo...</p>
              </div>
            </div>
          ) : gameUrl ? (
            <iframe
              src={gameUrl}
              title={game.name}
              className="w-full"
              style={{ minHeight: "70vh", height: "70vh", display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="text-center space-y-3 p-6">
                <IconComponent className="w-12 h-12 mx-auto" style={{ color: "#00FF00", opacity: 0.5 }} />
                <p className="text-sm font-medium" style={{ color: "#FFFFFF" }}>Link não configurado</p>
                <p className="text-xs" style={{ color: "#666" }}>O administrador ainda não configurou o link para {game.name}.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CasinoGame;
