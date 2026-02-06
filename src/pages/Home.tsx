import { LogOut, Menu, Headphones, X, Gift, Sparkles, ShoppingCart, Crown, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { clearAuth, isAuthenticated, getStoredUser, getStoredAccess, getMe, persistAuth, shouldShowPaywall, trackEvent } from "@/lib/api";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { useSession } from "@/hooks/useSession";
import { useEntries } from "@/hooks/useEntries";
import { EntryCard } from "@/components/EntryCard";
import { PaywallPopup } from "@/components/PaywallPopup";
import { PromoCarousel } from "@/components/PromoCarousel";
import { BottomNav } from "@/components/BottomNav";
import logoImg from "@/assets/premier-logo.png";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [access, setAccess] = useState(getStoredAccess());
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Session tracking
  useSession();

  // Fetch entries for today
  const today = format(new Date(), 'yyyy-MM-dd');
  const { entries, isLoading: entriesLoading, error: entriesError, refetch } = useEntries(today);

  // Check if user is vitalício
  const hasLifetimeAccess = user?.is_vitalicio ?? false;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth check and /me refresh
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    const refreshAuth = async () => {
      try {
        const response = await getMe();
        
        if (response.success && response.user && response.allowed_access) {
          const token = localStorage.getItem('premier_token') || '';
          persistAuth(
            token,
            response.user,
            response.allowed_access,
            response.show_paywall_popup ?? false,
            response.checkout ?? null
          );
          
          setUser(response.user);
          setAccess(response.allowed_access);
          
          // Show paywall for free users if flagged
          if (shouldShowPaywall()) {
            setShowPaywall(true);
            await trackEvent('open_paywall_popup');
          }
        }
      } catch (error) {
        console.error('Error refreshing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    refreshAuth();
  }, [navigate]);

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

  const handlePaywallBuy = async () => {
    await trackEvent('click_buy_from_popup');
    window.open(CHECKOUT_LINKS.paywall_default, '_blank');
  };

  const handleContinueFree = async () => {
    await trackEvent('click_continue_free');
    setShowPaywall(false);
    localStorage.setItem('premier_show_paywall', 'false');
  };

  // Tier display name
  const tierDisplayName: Record<string, string> = {
    free: 'Gratuito',
    basic: 'Basic',
    pro: 'Pro',
    ultra: 'Ultra',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] relative overflow-hidden pb-20 md:pb-0">
      {/* Purple glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0A1A]/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo + Nome */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <img src={logoImg} alt="Premier Ultra" className="h-8 sm:h-10 w-auto" />
              <span className="text-base sm:text-lg font-bold text-white">Premier Ultra</span>
            </div>
            
            {/* Right side: Email (desktop only) + Badge + Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Email - HIDDEN no mobile */}
              {user && (
                <span className="hidden md:block text-xs sm:text-sm font-medium text-white/80 truncate max-w-[180px]">
                  {user.email}
                </span>
              )}
              
              {/* Tier Badge */}
              <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                user?.main_tier === 'ultra' 
                  ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-500/50'
                  : user?.main_tier === 'pro'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : user?.main_tier === 'basic'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
              }`}>
                {tierDisplayName[user?.main_tier || 'free']}
              </span>
              
              {/* Vitalício Badge */}
              {hasLifetimeAccess ? (
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Acesso</span> vitalício
                </span>
              ) : (
                <button
                  onClick={() => setShowLifetimeModal(true)}
                  className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-colors cursor-pointer"
                  title="Adquirir acesso vitalício"
                >
                  <span className="hidden sm:inline">Sem</span> vitalício
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              {/* Menu Hamburger */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
                >
                  {menuOpen ? (
                    <X className="w-5 h-5 text-purple-300" />
                  ) : (
                    <Menu className="w-5 h-5 text-purple-300" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 sm:w-56 bg-[#0D0A1A]/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-xl shadow-purple-900/30 overflow-hidden z-50">
                    <div className="py-2">
                      {/* Promoções */}
                      <button
                        onClick={handlePromotions}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-purple-200 hover:bg-purple-500/15 transition-colors"
                      >
                        <Gift className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Promoções</span>
                      </button>

                      {/* Suporte */}
                      <button
                        onClick={handleSupport}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-purple-200 hover:bg-purple-500/15 transition-colors"
                      >
                        <Headphones className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Suporte</span>
                      </button>

                      {/* Divider */}
                      <div className="my-2 border-t border-purple-500/20" />

                      {/* Sair */}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left text-red-400 hover:bg-red-500/10 transition-colors"
                      >
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
        {/* Carrossel de Promoções */}
        <PromoCarousel />

        {/* Entradas do Dia */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
              Entradas do Dia
            </h2>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
              title="Atualizar entradas"
            >
              <RefreshCw className={`w-4 h-4 text-purple-300 ${entriesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading || entriesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : entriesError ? (
            <div className="text-center py-12">
              <p className="text-red-300/60">{entriesError}</p>
              <button 
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-purple-300/60">Nenhuma entrada disponível para hoje</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  id={entry.id}
                  display_title={entry.display_title}
                  display_market={entry.display_market}
                  display_odd={entry.display_odd}
                  locked={entry.locked}
                  tier_required={entry.tier_required}
                  addon_required={entry.addon_required}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="border-t border-purple-500/20 pt-6 text-center space-y-2">
            <p className="text-sm text-purple-300/60 font-medium">Premier Ultra ©</p>
            <p className="text-xs text-purple-300/50">Análises processadas continuamente</p>
            <p className="text-[11px] text-purple-300/40 pt-2">
              Dados protegidos • 18+ • Jogue com responsabilidade
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-purple-300/50">
              <a href="/termos" className="hover:text-purple-400 transition-colors">
                Termos & Privacidade
              </a>
              <span className="text-purple-500/30">|</span>
              <a href="/support" className="hover:text-purple-400 transition-colors">
                Suporte
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Paywall Popup */}
      {showPaywall && (
        <PaywallPopup
          open={showPaywall}
          onOpenChange={setShowPaywall}
          onBuy={handlePaywallBuy}
          onContinueFree={handleContinueFree}
        />
      )}

      {/* Modal Promoções */}
      {showPromotionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPromotionsModal(false)}>
          <div 
            className="w-full max-w-md bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-6 py-5 border-b border-purple-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Promoções do Premier Ultra</h2>
                </div>
              </div>
              <button
                onClick={() => setShowPromotionsModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Em breve!</h3>
              <p className="text-sm text-purple-300/70 leading-relaxed">
                Bônus, condições especiais e liberações exclusivas para membros do Premier Ultra.
              </p>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setShowPromotionsModal(false)}
                className="w-full py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 font-medium hover:bg-purple-500/30 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compra Vitalício */}
      {showLifetimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowLifetimeModal(false)}>
          <div 
            className="w-full max-w-sm bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-6 py-5 border-b border-purple-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border border-amber-500/50 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Acesso vitalício</h2>
                </div>
              </div>
              <button
                onClick={() => setShowLifetimeModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            <div className="px-6 py-6 text-center">
              <p className="text-sm text-purple-200/80 leading-relaxed">
                Desbloqueie acesso total e continue usando sem limitações.
              </p>
            </div>

            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={handleBuyLifetime}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-900/40"
              >
                Adquirir vitalício
              </button>
              <button
                onClick={() => setShowLifetimeModal(false)}
                className="w-full py-2.5 rounded-xl bg-transparent border border-purple-500/30 text-purple-300 font-medium hover:bg-purple-500/10 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav - Mobile only */}
      <BottomNav />
    </div>
  );
};

export default Home;
