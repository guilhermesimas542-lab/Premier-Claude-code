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
      <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Jogo não encontrado</h1>
          <p className="text-muted-foreground">O jogo solicitado não existe ou foi removido.</p>
          <Button
            onClick={() => navigate("/cassino")}
            className="bg-vip hover:bg-vip/90 text-white font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Cassino
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826]">
      {/* Topbar */}
      <header className="sticky top-0 z-50 bg-[#0C0F14]/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => navigate("/cassino")}
            variant="outline"
            size="sm"
            className="bg-muted/20 border-vip/50 hover:bg-vip/20 hover:border-vip"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 
            className="text-xl font-display font-extrabold tracking-tight"
            style={{ 
              color: 'hsl(280 100% 60%)',
              textShadow: '0 0 20px hsl(280 100% 60% / 0.4)'
            }}
          >
            {game.name}
          </h1>
        </div>
      </header>

      {/* iFrame Container */}
      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div 
          className="w-full min-h-[70vh] md:min-h-[75vh] bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl overflow-hidden backdrop-blur-sm"
          style={{
            border: '1.5px solid hsl(280 100% 60% / 0.3)',
            boxShadow: '0 0 30px hsl(280 100% 60% / 0.1), inset 0 0 20px rgba(0,0,0,0.3)'
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
