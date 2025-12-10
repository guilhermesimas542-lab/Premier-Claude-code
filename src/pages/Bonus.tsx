import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, X, Flame, Shield, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredConfig } from "@/lib/auth";

const expiredBonuses = [
  {
    id: 1,
    title: "Bônus 150%",
    status: "EXPIRADO",
    reason: "Removido por uso inesperado.",
  },
  {
    id: 2,
    title: "Cashback Turbo",
    status: "EXPIRADO",
    reason: "Cupom descontinuado.",
  },
  {
    id: 3,
    title: "Saldo Estendido",
    status: "EXPIRADO",
    reason: "Acesso cancelado pelo sistema.",
  },
  {
    id: 4,
    title: "Dobro Instantâneo",
    status: "EXPIRADO",
    reason: "Limite de uso atingido.",
  },
];

const STORAGE_KEY_CLAIMED = "bonus_claimed_count";
const STORAGE_KEY_ONLINE = "bonus_online_count";

const Bonus = () => {
  const navigate = useNavigate();
  const config = getStoredConfig();
  
  const [claimedCount, setClaimedCount] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_CLAIMED);
    if (stored) return parseInt(stored, 10);
    const initial = Math.floor(Math.random() * (170 - 80 + 1)) + 80;
    localStorage.setItem(STORAGE_KEY_CLAIMED, String(initial));
    return initial;
  });
  
  const [onlineCount, setOnlineCount] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_ONLINE);
    if (stored) return parseInt(stored, 10);
    const initial = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
    localStorage.setItem(STORAGE_KEY_ONLINE, String(initial));
    return initial;
  });

  // Simular variação de usuários online
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newValue = Math.max(10, Math.min(60, prev + change));
        localStorage.setItem(STORAGE_KEY_ONLINE, String(newValue));
        return newValue;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleActivateBonus = () => {
    // Incrementar contador
    const newCount = claimedCount + 1;
    setClaimedCount(newCount);
    localStorage.setItem(STORAGE_KEY_CLAIMED, String(newCount));
    
    if (config?.betSite) {
      window.open(config.betSite, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] via-[#0D0D0D] to-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-sm text-white/60">Voltar</span>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
            Seu Bônus Exclusivo Está Aqui —{" "}
            <span className="text-[#00FF7F]">Antes Que Sumam com Ele</span>
          </h1>
          <p className="text-sm md:text-base text-white/60 max-w-2xl mx-auto leading-relaxed">
            "Este acesso não aparece para todos. Se o sistema detectar uso acima do esperado, 
            o cupom é removido automaticamente."
          </p>
        </section>

        {/* Active Bonus Section - FIRST */}
        <section className="space-y-6">
          {/* Live Counters */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-[#00FF7F]/10 border border-[#00FF7F]/30 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-[#00FF7F] rounded-full animate-pulse" />
              <Users className="w-4 h-4 text-[#00FF7F]" />
              <span className="text-sm font-bold text-[#00FF7F]">{onlineCount}</span>
              <span className="text-xs text-white/60">online agora</span>
            </div>
            <div className="flex items-center gap-2 bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-full px-4 py-2">
              <TrendingUp className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-sm font-bold text-[#FF6B35]">{claimedCount}</span>
              <span className="text-xs text-white/60">pegaram hoje</span>
            </div>
          </div>

          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00FF7F]/30 via-[#00FF7F]/10 to-[#00FF7F]/30 blur-xl rounded-2xl animate-pulse" />
            
            {/* Main Card */}
            <div className="relative bg-gradient-to-br from-[#0D1A0F] via-[#0A0F0A] to-[#0D1A0F] border-2 border-[#00FF7F]/50 rounded-2xl p-6 md:p-8 overflow-hidden">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-[#00FF7F]/20 to-transparent" />
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-[#00FF7F]/20 to-transparent" />
              
              {/* Restricted badge */}
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-1.5 bg-black/50 border border-[#00FF7F]/30 rounded-full px-3 py-1">
                  <Lock className="w-3 h-3 text-[#00FF7F]" />
                  <span className="text-[10px] font-bold text-[#00FF7F]">ACESSO RESTRITO</span>
                </div>
              </div>
              
              <div className="relative z-10 space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-6 h-6 text-[#FF6B35]" />
                    <h2 className="text-xl md:text-2xl font-black text-white">
                      Cupom Oculto: 200% de saldo
                    </h2>
                  </div>
                </div>
                
                {/* Description */}
                <div className="space-y-4">
                  <p className="text-sm md:text-base text-white/80 leading-relaxed">
                    Esse cupom não está listado na casa, nossa IA encontrou testando várias combinações até encontrar, 
                    faça seu depósito enquanto fica online, a casa pode remover ou alterar as regras a qualquer momento.
                  </p>
                  <p className="text-sm text-[#00FF7F]/80 leading-relaxed">
                    Quanto maior seu depósito melhor performará nossa alavancagem, indicamos pelo menos 200 para você já começar com 400.
                  </p>
                  
                  {/* Micro text */}
                  <div className="bg-[#00FF7F]/5 border border-[#00FF7F]/20 rounded-lg p-3">
                    <p className="text-xs text-white/60 italic">
                      "Quanto maior o valor inicial, mais forte fica o ciclo de consistência do algoritmo."
                    </p>
                  </div>
                </div>
                
                {/* Alert tag */}
                <div className="flex items-center gap-2 text-yellow-500/80">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-bold">
                    🔒 Acesso restrito — use antes que detectem.
                  </span>
                </div>
                
                {/* CTA Button */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleActivateBonus}
                    className="w-full h-14 md:h-16 bg-gradient-to-r from-[#00FF7F] via-[#00E070] to-[#00FF7F] hover:from-[#00E070] hover:via-[#00FF7F] hover:to-[#00E070] text-black font-black text-base md:text-lg rounded-xl shadow-[0_0_20px_rgba(0,255,127,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,255,127,0.6)]"
                  >
                    DOBRAR BANCA AGORA
                  </Button>
                  
                  <p className="text-center text-xs text-white/50">
                    "Recomendado usar o valor máximo para aproveitar o bônus completo."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Expired Bonuses Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white/60 flex items-center gap-2">
            <X className="w-5 h-5 text-red-500/70" />
            Bônus Expirados
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {expiredBonuses.map((bonus) => (
              <div
                key={bonus.id}
                className="relative bg-[#1A1A1A] border border-red-500/20 rounded-xl p-4"
              >
                {/* Blocked overlay */}
                <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-red-500/30" />
                </div>
                
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-500/70" />
                      <h3 className="font-bold text-white/60 text-sm">
                        {bonus.title}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-red-500/80 bg-red-500/20 px-2 py-0.5 rounded">
                      {bonus.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-white/50 mt-2">"{bonus.reason}"</p>
              </div>
            ))}
          </div>
          
          <p className="text-center text-sm text-white/50 italic">
            "Os bônus mais fortes nunca ficam ativos por muito tempo…"
          </p>
        </section>

        {/* Final Alert */}
        <section className="pb-8">
          <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500/70 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400/80 leading-relaxed">
              Se muitas pessoas abrirem esta tela, o cupom pode ser removido automaticamente 
              pelo sistema de segurança.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Bonus;
