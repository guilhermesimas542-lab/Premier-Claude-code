import { ArrowLeft, LogOut, Plane, CircleDot, Sparkles, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getStoredConfig, clearAuth, isAuthenticated } from "@/lib/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppConfig } from "@/types/auth";
import logoImg from "@/assets/logo.jpg";

const CASINO_GAMES = [
  {
    id: "av8",
    name: "AV8",
    description: "Aposte no multiplicador antes do avião decolar",
    icon: Plane,
  },
  {
    id: "roleta",
    name: "Roleta",
    description: "Gire a roleta e teste sua sorte",
    icon: CircleDot,
  },
  {
    id: "slots",
    name: "Slots",
    description: "Máquinas caça-níqueis com jackpots",
    icon: Sparkles,
  },
  {
    id: "crash",
    name: "Crash",
    description: "Multiplique seus ganhos antes do crash",
    icon: TrendingDown,
  },
];

const Casino = () => {
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
              <span className="text-lg font-bold text-foreground">Premier Ultra</span>
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
      <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground tracking-tight">
            Cassino
          </h1>
          <p className="text-muted-foreground">Escolha um jogo para abrir</p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {CASINO_GAMES.map((game) => {
            const IconComponent = game.icon;
            return (
              <div
                key={game.id}
                onClick={() => navigate(`/cassino/${game.id}`)}
                className="relative group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: '#060606',
                  border: '1.5px solid',
                  borderColor: 'hsl(280 100% 60% / 0.4)',
                  boxShadow: '0 0 20px hsl(280 100% 60% / 0.15), inset 0 0 30px rgba(0,0,0,0.5)'
                }}
              >
                {/* Subtle gradient texture */}
                <div 
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    background: 'linear-gradient(45deg, transparent 0%, hsl(280 100% 60% / 0.08) 50%, transparent 100%)'
                  }}
                />

                <div className="relative p-6 space-y-4">
                  {/* Icon */}
                  <div className="relative">
                    <div 
                      className="absolute inset-0 blur-xl opacity-40"
                      style={{ backgroundColor: 'hsl(280 100% 60%)' }}
                    />
                    <div 
                      className="relative w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, hsl(280 100% 60% / 0.2) 0%, hsl(280 100% 60% / 0.05) 100%)',
                        boxShadow: '0 0 20px hsl(280 100% 60% / 0.3)'
                      }}
                    >
                      <IconComponent 
                        className="w-7 h-7" 
                        style={{ 
                          color: 'hsl(280 100% 60%)',
                          filter: 'drop-shadow(0 0 8px hsl(280 100% 60% / 0.6))'
                        }}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white">{game.name}</h3>
                    <p className="text-sm text-muted-foreground">{game.description}</p>
                  </div>

                  {/* Badge */}
                  <div 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{
                      background: 'linear-gradient(135deg, hsl(280 100% 60%) 0%, hsl(280 80% 50%) 100%)',
                      boxShadow: '0 0 15px hsl(280 100% 60% / 0.4)'
                    }}
                  >
                    <span className="text-white">ABRIR</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Casino;
