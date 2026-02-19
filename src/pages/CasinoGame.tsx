import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";

// Mapa de jogos com URLs placeholder (editáveis)
const CASINO_GAMES: Record<string, { name: string; url: string }> = {
  av8: { name: "AV8", url: "https://example.com/av8" },
  roleta: { name: "Roleta", url: "https://example.com/roleta" },
  slots: { name: "Slots", url: "https://example.com/slots" },
  crash: { name: "Crash", url: "https://example.com/crash" },
};

const CasinoGame = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
  }, [navigate]);

  const game = gameId ? CASINO_GAMES[gameId] : null;

  // Jogo não encontrado
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

  return (
    <div className="min-h-screen" style={{ background: "#000000" }}>
      {/* Topbar */}
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

      {/* iFrame Container */}
      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div
          className="w-full min-h-[70vh] md:min-h-[75vh] rounded-xl overflow-hidden"
          style={{
            border: "1.5px solid rgba(0,255,0,0.2)",
            boxShadow: "0 0 30px rgba(0,255,0,0.08), inset 0 0 20px rgba(0,0,0,0.3)",
            background: "rgba(0,10,0,0.4)",
          }}
        >
          <iframe
            src={game.url}
            title={game.name}
            className="w-full h-full min-h-[70vh] md:min-h-[75vh]"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </main>
    </div>
  );
};

export default CasinoGame;
