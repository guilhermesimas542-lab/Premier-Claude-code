import { LogOut, Menu, Headphones, X, Gift, Sparkles, ShoppingCart, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isAuthenticated, clearAuth, getStoredConfig, getBackgroundImageUrl } from "@/lib/auth";
import { mockGetUser } from "@/mocks/user";
import { MOCK_SPORTS } from "@/mocks/sports";
import { PremiumSportCard } from "@/components/PremiumSportCard";
import BasicPlanModal from "@/components/BasicPlanModal";
import { PromoCarousel } from "@/components/PromoCarousel";
import { QuickAccessCards } from "@/components/QuickAccessCards";
import { BottomNav } from "@/components/BottomNav";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";


const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const mockUser = mockGetUser();
  const config = getStoredConfig();
  const hasLifetimeAccess = true; // Mock: always ULTRA

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    setLoading(false);
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    const targetDate = new Date("2025-12-17T20:00:00").getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      if (difference <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleSupport = () => {
    navigate("/support");
    setMenuOpen(false);
  };

  const handlePromotions = () => {
    setShowPromotionsModal(true);
    setMenuOpen(false);
  };

  const handleBuyLifetime = () => {
    window.open(CHECKOUT_LINKS.vitalicio, '_blank');
    setShowLifetimeModal(false);
  };

  const sportEmojiMap: Record<number, string> = {
    1: "⚽", 2: "🥊", 3: "⚾", 4: "🏈", 5: "🎾", 6: "🏀",
    7: "⚽", 8: "🏒", 9: "🤾", 10: "🏐", 11: "🎰", 12: "✈️",
  };

  const sportColorSchemes: Record<number, { primary: string; secondary: string; glow: string }> = {
    1: { primary: "#00FF7F", secondary: "#00CC66", glow: "rgba(0, 255, 127, 0.35)" },
    2: { primary: "#FF4E4E", secondary: "#CC3E3E", glow: "rgba(255, 78, 78, 0.35)" },
    3: { primary: "#4A90FF", secondary: "#3A70CC", glow: "rgba(74, 144, 255, 0.35)" },
    4: { primary: "#2ECC71", secondary: "#27AE60", glow: "rgba(46, 204, 113, 0.35)" },
    5: { primary: "#FFD700", secondary: "#CCAC00", glow: "rgba(255, 215, 0, 0.35)" },
    6: { primary: "#FF8C42", secondary: "#CC7035", glow: "rgba(255, 140, 66, 0.35)" },
    7: { primary: "#00D4FF", secondary: "#00A8CC", glow: "rgba(0, 212, 255, 0.35)" },
    8: { primary: "#5BC0EB", secondary: "#4899BC", glow: "rgba(91, 192, 235, 0.35)" },
    9: { primary: "#FF6B9D", secondary: "#CC567E", glow: "rgba(255, 107, 157, 0.35)" },
    10: { primary: "#FFEA00", secondary: "#CCBB00", glow: "rgba(255, 234, 0, 0.35)" },
    11: { primary: "#A855F7", secondary: "#8644C5", glow: "rgba(168, 85, 247, 0.35)" },
    12: { primary: "#FF6B35", secondary: "#E85D2D", glow: "rgba(255, 107, 53, 0.35)" },
  };

  const mappedSports = MOCK_SPORTS.map((sport) => {
    const tipo = sport.tipo ?? 0;
    const colors = sportColorSchemes[sport.id] || sportColorSchemes[1];
    
    let cardType: 'premium' | 'locked' | 'development' | 'presale' = 'development';
    if (tipo === 0) cardType = sport.enabled ? 'premium' : 'locked';
    else if (tipo === 1) cardType = 'development';
    else if (tipo === 2) cardType = 'presale';

    let route = "#";
    if (cardType === 'premium') {
      route = sport.id === 11 ? '/cassino' : `/sport/${sport.id}`;
    }

    return {
      ...sport,
      emoji: sportEmojiMap[sport.id] || "🏆",
      route,
      image: getBackgroundImageUrl(sport.background),
      gradient: "from-[#000636] via-[#0026A3] to-[#0033C6]",
      isPremium: cardType === 'premium',
      isLocked: cardType === 'locked',
      isDevelopment: cardType === 'development',
      isPreSale: cardType === 'presale',
      colors,
      badgeColor: cardType === 'premium'
        ? `bg-[${colors.primary}]/20 text-[${colors.primary}] border-[${colors.primary}]/40`
        : "bg-muted/30 text-muted-foreground border-border/30",
    };
  });

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0" style={{
      background: "linear-gradient(135deg, rgba(0,255,0,0.04) 0%, #000000 35%, #000000 65%, rgba(0,255,0,0.03) 100%)",
    }}>
      {/* Subtle matrix glow orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none" style={{ background: "rgba(0,255,0,0.035)" }} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,200,0,0.025)" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(0,0,0,0.92)", borderColor: "rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <video
                src="/images/logo_premier_video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-10 sm:h-12 w-auto"
                style={{ filter: "drop-shadow(0 0 10px rgba(0,255,0,0.5))" }}
              />
              <span className="text-2xl sm:text-4xl font-bold" style={{ color: "#FFFFFF", textShadow: "0 0 14px rgba(0,255,0,0.3)" }}>Premier Ultra</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {mockUser && (
                <span className="hidden md:block text-xs sm:text-sm font-medium truncate max-w-[180px]" style={{ color: "#CCCCCC" }}>
                  {mockUser.email}
                </span>
              )}
              
              {hasLifetimeAccess ? (
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold" style={{ background: "rgba(0,255,0,0.1)", color: "#FFFFFF", border: "1px solid rgba(0,255,0,0.4)", boxShadow: "0 0 10px rgba(0,255,0,0.2)" }}>
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Acesso</span> vitalício
                </span>
              ) : (
                <button
                  onClick={() => setShowLifetimeModal(true)}
                  className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer"
                  style={{ background: "rgba(255,0,0,0.1)", color: "#FF4444", border: "1px solid rgba(255,0,0,0.3)" }}
                >
                  <span className="hidden sm:inline">Sem</span> vitalício
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.25)" }}
                >
                  {menuOpen ? <X className="w-5 h-5" style={{ color: "#00FF00" }} /> : <Menu className="w-5 h-5" style={{ color: "#00FF00" }} />}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 sm:w-56 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden z-50" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.2)", boxShadow: "0 0 30px rgba(0,255,0,0.1)" }}>
                    <div className="py-2">
                      <button onClick={handlePromotions} className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-[rgba(0,255,0,0.07)]">
                      <Gift className="w-4 h-4" style={{ color: "#00FF00" }} />
                        <span className="text-sm font-medium" style={{ color: "#FFFFFF" }}>Promoções</span>
                      </button>
                      <button onClick={handleSupport} className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-[rgba(0,255,0,0.07)]">
                        <Headphones className="w-4 h-4" style={{ color: "#00FF00" }} />
                        <span className="text-sm font-medium" style={{ color: "#FFFFFF" }}>Suporte</span>
                      </button>
                      <div className="my-2 border-t" style={{ borderColor: "rgba(0,255,0,0.15)" }} />
                      <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="w-full px-4 py-3 flex items-center gap-3 text-left text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Sair</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">
        <PromoCarousel />

        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight" style={{ color: "#FFFFFF" }}>
              Entradas Disponíveis
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-purple-300/60">Carregando esportes...</p>
              </div>
            ) : (
              mappedSports.filter(sport => sport.isPremium || sport.isPreSale).map((sport) => (
                <PremiumSportCard
                  key={sport.id}
                  id={sport.id}
                  name={sport.name}
                  emoji={sport.emoji}
                  isPremium={sport.isPremium}
                  isLocked={sport.isLocked}
                  isDevelopment={sport.isDevelopment}
                  isPreSale={sport.isPreSale}
                  colors={sport.colors}
                  countdown={sport.isPreSale ? countdown : undefined}
                  sportSubheadline={sport.id === 1 ? "Entradas Ativas no Premier Ultra" : undefined}
                  casinoTitle={sport.id === 11 ? "Painel de Apostas IA" : undefined}
                  casinoSubheadline={sport.id === 11 ? "Recomendações em tempo real" : undefined}
                  onClick={() => {
                    if (sport.isPremium && sport.route !== "#") {
                      navigate(sport.route);
                    }
                  }}
                />
              ))
            )}
          </div>
        </section>

        <QuickAccessCards />
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="pt-6 text-center space-y-2" style={{ borderTop: "1px solid rgba(0,255,0,0.1)" }}>
            <p className="text-sm font-medium" style={{ color: "#FFFFFF" }}>Premier Ultra ©</p>
            <p className="text-xs" style={{ color: "#AAAAAA" }}>Análises processadas continuamente</p>
            <p className="text-[11px] pt-2" style={{ color: "#888888" }}>
              Dados protegidos • 18+ • Jogue com responsabilidade
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px]" style={{ color: "#AAAAAA" }}>
              <button
                onClick={() => setShowTermsModal(true)}
                className="transition-colors hover:underline"
                style={{ color: "#CCCCCC" }}
              >
                Termos & Privacidade
              </button>
              <span style={{ color: "#555555" }}>|</span>
              <a
                href="https://wa.link/1p68qg"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:underline"
                style={{ color: "#CCCCCC" }}
              >
                Suporte
              </a>
            </div>
          </div>
        </div>
      </footer>

      <BasicPlanModal open={showBasicModal} onClose={() => setShowBasicModal(false)} />

      {/* Modal Promoções */}
      {showPromotionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPromotionsModal(false)}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.25)", boxShadow: "0 0 40px rgba(0,255,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.1)", border: "1px solid rgba(0,255,0,0.3)" }}>
                  <Gift className="w-5 h-5" style={{ color: "#00FF00" }} />
                </div>
                <div><h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Promoções do Premier Ultra</h2></div>
              </div>
              <button onClick={() => setShowPromotionsModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]">
                <X className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
            </div>
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.2)" }}>
                <Sparkles className="w-8 h-8" style={{ color: "#00FF00" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#FFFFFF" }}>Em breve!</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
                Bônus, condições especiais e liberações exclusivas para membros do Premier Ultra.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowPromotionsModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compra Vitalício */}
      {showLifetimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLifetimeModal(false)}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.25)", boxShadow: "0 0 40px rgba(0,255,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.1)", border: "1px solid rgba(0,255,0,0.3)" }}>
                  <Crown className="w-5 h-5" style={{ color: "#00FF00" }} />
                </div>
                <div><h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Acesso vitalício</h2></div>
              </div>
              <button onClick={() => setShowLifetimeModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]">
                <X className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
            </div>
            <div className="px-6 py-6 text-center">
              <p className="text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
                Desbloqueie acesso total e continue usando sem limitações.
              </p>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <button onClick={handleBuyLifetime} className="w-full py-3 rounded-xl font-semibold transition-all" style={{ background: "#003300", border: "1px solid rgba(0,255,0,0.6)", color: "#FFFFFF", boxShadow: "0 0 20px rgba(0,255,0,0.2)" }}>
                Adquirir vitalício
              </button>
              <button onClick={() => setShowLifetimeModal(false)} className="w-full py-2.5 rounded-xl font-medium transition-colors" style={{ background: "transparent", border: "1px solid rgba(0,255,0,0.2)", color: "#CCCCCC" }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />

      {/* Modal Termos & Privacidade */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent
          className="max-w-sm"
          style={{
            background: "rgba(0, 8, 0, 0.97)",
            border: "1px solid rgba(0, 255, 0, 0.3)",
            backdropFilter: "blur(20px)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold" style={{ color: "#FFFFFF" }}>
              Termos e Privacidade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="text-sm space-y-4 leading-relaxed" style={{ color: "#CCCCCC" }}>
              <p className="font-bold" style={{ color: "#FFFFFF" }}>TERMOS E CONDIÇÕES DE USO — PREMIER ULTRA</p>
              <p>Estes Termos e Condições ("Termos") regulam o acesso e o uso do aplicativo e/ou plataforma Premier Ultra ("Premier", "Aplicativo", "Plataforma").</p>
              <p>Ao acessar, cadastrar-se ou utilizar o Premier, você declara que leu, compreendeu e concorda integralmente com estes Termos e com a nossa Política de Privacidade.</p>
              <p className="font-bold" style={{ color: "#FFFFFF" }}>1. Elegibilidade e Jogo Responsável</p>
              <p>1.1. O Premier é destinado exclusivamente a maiores de 18 (dezoito) anos.</p>
              <p>1.2. O Premier apoia e incentiva o jogo responsável. Apostas envolvem risco e podem causar perdas financeiras.</p>
              <p>1.3. O usuário é o único responsável por decidir se irá apostar e por qualquer consequência decorrente de apostas realizadas.</p>
              <p className="font-bold" style={{ color: "#FFFFFF" }}>2. O que o Premier é (e o que NÃO é)</p>
              <p>2.1. O Premier é uma plataforma que fornece conteúdo informativo e/ou sugestões estatísticas com base em dados, modelos e critérios próprios.</p>
              <p>2.2. O Premier não é: uma casa de apostas; uma instituição financeira; um gestor de investimentos; um serviço de consultoria financeira.</p>
              <p>2.3. O Premier não realiza apostas em nome do usuário e não garante resultados, lucros ou qualquer desempenho.</p>
              <p className="font-bold" style={{ color: "#FFFFFF" }}>3. Ausência de Vínculo com Casas de Apostas</p>
              <p>3.1. O Premier não possui controle sobre sites, políticas, odds, mercados ou qualquer decisão tomada por casas de apostas.</p>
              <p>3.2. O Premier não tem responsabilidade por saldo, bloqueios, restrições, falhas de pagamento ou problemas de KYC.</p>
              <p className="font-bold" style={{ color: "#FFFFFF" }}>4. Cadastro, Acesso e Segurança</p>
              <p>4.1. Você se compromete a fornecer informações verdadeiras e atualizadas.</p>
              <p>4.2. Você é responsável por manter a segurança do seu acesso e por todas as atividades realizadas em sua conta.</p>
              <p className="font-bold" style={{ color: "#FFFFFF" }}>5. Limitação de Responsabilidade (Cláusula "Blindagem")</p>
              <p>5.1. Na máxima extensão permitida pela lei, o Premier e seus sócios não serão responsáveis por quaisquer danos diretos, indiretos ou consequenciais, incluindo perdas financeiras ou decisões do usuário em casas de apostas.</p>
              <p className="font-bold" style={{ color: "#FFFFFF" }}>6. LGPD e Privacidade</p>
              <p>6.1. Tratamos dados pessoais conforme a legislação aplicável, incluindo a LGPD (Lei nº 13.709/2018).</p>
              <p>6.2. Dados podem ser tratados para: autenticação e segurança; prevenção à fraude; suporte; melhoria do produto.</p>
              <p className="font-bold" style={{ color: "#FFFFFF" }}>7. Contato e Suporte</p>
              <p>Dúvidas, solicitações e suporte: equipepremierfc@gmail.com</p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 rounded-xl text-sm transition-colors duration-200"
              style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.25)", color: "#FFFFFF" }}
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
