import { ArrowLeft, LogOut, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { SpecialBettingCard } from "@/components/SpecialBettingCard";
import { JustificativaModal } from "@/components/JustificativaModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isAuthenticated, clearAuth, getStoredConfig } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNav } from "@/components/BottomNav";
import { MOCK_TIPS, MockDisplayEntry } from "@/mocks/tips";

// ============ TIPOS DE TIER ============
type TierType = "GRÁTIS" | "ALAVANCAGEM" | "ODDS_ALTAS" | "BÁSICO" | "PRO" | "ULTRA" | "MÚLTIPLA";

const TIER_TABS: { tier: TierType; label: string; labelShort: string }[] = [
  { tier: "GRÁTIS", label: "Grátis", labelShort: "Grátis" },
  { tier: "ALAVANCAGEM", label: "Alavancagem", labelShort: "Alav." },
  { tier: "ODDS_ALTAS", label: "Odds Altas", labelShort: "Odds Alt." },
  { tier: "BÁSICO", label: "Básico", labelShort: "Basic" },
  { tier: "PRO", label: "Pro", labelShort: "Pro" },
  { tier: "ULTRA", label: "Ultra", labelShort: "Ultra" },
];

const Sport = () => {
  const navigate = useNavigate();
  const { sportId } = useParams<{ sportId: string }>();
  const [iframeUrl, setIframeUrl] = useState<string>("https://example.com");
  const [activeTierHighlight, setActiveTierHighlight] = useState<TierType | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
  const isMobile = useIsMobile();
  
  const [justificativaModalOpen, setJustificativaModalOpen] = useState(false);
  const [justificativaTexto, setJustificativaTexto] = useState("");
  
  const activeCarouselRef = useRef<HTMLDivElement>(null);
  const expiredCarouselRef = useRef<HTMLDivElement>(null);
  const activeCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const pathname = window.location.pathname;
  const isAlavancagemRoute = pathname === "/alavancagem";
  const isOddsAltasRoute = pathname === "/odds-altas";

  // ========== DADOS MOCK ==========
  const activeEntries = MOCK_TIPS.filter(e => !e.isExpired);
  const expiredEntries = MOCK_TIPS.filter(e => e.isExpired);
  const isLoading = false;
  const error: string | null = null;

  const tipsByTier = activeEntries.reduce((acc, entry) => {
    const tier = entry.tier as TierType;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(entry);
    return acc;
  }, {} as Record<TierType, MockDisplayEntry[]>);

  const getFirstIndexOfTier = (tier: TierType): number => {
    return activeEntries.findIndex(entry => entry.tier === tier);
  };

  const scrollToTier = (tier: TierType) => {
    const firstIndex = getFirstIndexOfTier(tier);
    if (firstIndex === -1) {
      toast.info(`Sem entradas de ${tier} hoje`);
      return;
    }
    const targetCard = activeCardRefs.current[firstIndex];
    const container = activeCarouselRef.current;
    if (targetCard && container) {
      const containerRect = container.getBoundingClientRect();
      const cardRect = targetCard.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + (cardRect.left - containerRect.left) - 16;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      setActiveTierHighlight(tier);
    }
  };

  const updateScrollButtons = useCallback(() => {
    const container = activeCarouselRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  }, []);

  const scrollByArrow = (direction: 'left' | 'right') => {
    const container = activeCarouselRef.current;
    if (!container) return;
    const cardWidth = Math.min(420, window.innerWidth * 0.92) + 16;
    container.scrollBy({ left: direction === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = activeCarouselRef.current;
    if (!container) return;
    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeftStart(container.scrollLeft);
    container.style.cursor = 'grabbing';
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const container = activeCarouselRef.current;
    if (!container) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    container.scrollLeft = scrollLeftStart - (x - startX) * 1.5;
  };
  const handleMouseUp = () => { setIsDragging(false); if (activeCarouselRef.current) activeCarouselRef.current.style.cursor = 'grab'; };
  const handleMouseLeave = () => { if (isDragging) { setIsDragging(false); if (activeCarouselRef.current) activeCarouselRef.current.style.cursor = 'grab'; } };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated()) { navigate("/login"); return; }
    const scrollTimeout = setTimeout(() => {
      if (isAlavancagemRoute) scrollToTier("ALAVANCAGEM");
      else if (isOddsAltasRoute) scrollToTier("ODDS_ALTAS");
    }, 500);
    return () => clearTimeout(scrollTimeout);
  }, [navigate, sportId, isAlavancagemRoute, isOddsAltasRoute]);

  useEffect(() => {
    const container = activeCarouselRef.current;
    if (!container) return;
    updateScrollButtons();
    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, activeEntries]);

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleAddTip = (entry: MockDisplayEntry) => {
    if (entry.urlIframe) setIframeUrl(entry.urlIframe);
    toast.success("Tip adicionada!", { description: "Cupom carregado no site de apostas" });
  };

  const handleOpenJustificativa = useCallback((texto: string) => {
    setJustificativaTexto(texto);
    setJustificativaModalOpen(true);
  }, []);

  const handleCloseJustificativa = useCallback(() => {
    setJustificativaModalOpen(false);
  }, []);

  const isSpecialEntry = (entry: MockDisplayEntry): boolean => {
    return entry.tier === "ALAVANCAGEM" || entry.tier === "ODDS_ALTAS";
  };

  const renderEntryCard = (entry: MockDisplayEntry, index: number, isExpiredSection: boolean = false) => {
    const isSpecial = isSpecialEntry(entry);
    return (
      <div 
        key={entry.id}
        ref={isExpiredSection ? undefined : (el) => { activeCardRefs.current[index] = el; }}
        className="flex-shrink-0 snap-center"
        style={{ width: 'min(420px, 92vw)', height: 'calc(min(420px, 92vw) * 213 / 332)', minWidth: '280px', overflow: 'visible' }}
      >
        {isSpecial ? (
          <SpecialBettingCard
            tipId={parseInt(entry.id) || 0}
            type={entry.specialType || "ALAVANCAGEM"}
            market={entry.market}
            betChoice={entry.betChoice}
            odds={entry.odds}
            matchDate={entry.matchDate}
            expirationDate={entry.expirationDate}
            isLocked={entry.locked}
            isExpired={entry.isExpired}
            justificativa={entry.justificativa}
            onAddTip={() => handleAddTip(entry)}
            onOpenJustificativa={handleOpenJustificativa}
          />
        ) : (
          <PremiumBettingCard
            tipId={parseInt(entry.id) || 0}
            tier={entry.tier as "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" | "ULTRA"}
            team1={entry.team1}
            team2={entry.team2}
            market={entry.market}
            betChoice={entry.betChoice}
            odds={entry.odds}
            matchDate={entry.matchDate}
            expirationDate={entry.expirationDate}
            selectionsCount={entry.selectionsCount}
            justificativa={entry.justificativa}
            isLocked={entry.locked}
            isExpired={entry.isExpired}
            onAddTip={() => handleAddTip(entry)}
            onOpenJustificativa={handleOpenJustificativa}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826] overflow-x-hidden w-full max-w-full pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0C0F14]/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-muted/50 rounded-lg transition-colors" onClick={() => navigate("/")}>
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-xl font-display font-extrabold text-foreground tracking-tight">
              Futebol - Tips do Dia
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleLogout} variant="outline" size="sm" className="bg-muted/20 border-border/50 hover:bg-muted/40">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
        {/* Tier Tabs */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 px-1 sm:justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          {TIER_TABS.map((tab) => {
            const isActive = activeTierHighlight === tab.tier;
            const hasContent = tipsByTier[tab.tier]?.length > 0;
            return (
              <button
                key={tab.tier}
                onClick={() => scrollToTier(tab.tier)}
                disabled={!hasContent}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border focus:outline-none focus:ring-2 focus:ring-white/20 flex-shrink-0 min-h-[32px] sm:min-h-[36px] ${
                  !hasContent ? 'bg-transparent text-white/30 border-white/10 cursor-not-allowed'
                    : isActive ? 'bg-white/10 text-white border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.15)]'
                    : 'bg-transparent text-white/80 border-white/20 hover:bg-white/5 hover:border-white/40 hover:text-white'
                }`}
              >
                <span className="sm:hidden">{tab.labelShort}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Carregando tips...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* SEÇÃO: TIPS ATIVAS */}
        {!isLoading && !error && activeEntries.length > 0 && (
          <section className="relative w-full">
            <h2 className="text-lg font-bold text-foreground mb-3 px-2">
              🔥 Tips Ativas ({activeEntries.length})
            </h2>
            
            {canScrollLeft && (
              <button onClick={() => scrollByArrow('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary hover:bg-primary/80 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 -ml-2 md:-ml-4" aria-label="Anterior">
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
            {canScrollRight && (
              <button onClick={() => scrollByArrow('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary hover:bg-primary/80 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 -mr-2 md:-mr-4" aria-label="Próximo">
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}

            <div 
              ref={activeCarouselRef}
              className="w-full overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 md:px-8 select-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: isDragging ? 'grabbing' : 'grab', overflow: 'visible', overflowX: 'auto' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex gap-4 md:gap-5 py-4" style={{ paddingTop: '18px' }}>
                {activeEntries.map((entry, index) => renderEntryCard(entry, index, false))}
              </div>
            </div>
          </section>
        )}

        {/* SEÇÃO: TIPS EXPIRADAS */}
        {!isLoading && !error && expiredEntries.length > 0 && (
          <section className="relative w-full mt-8">
            <h2 className="text-lg font-bold text-muted-foreground mb-3 px-2">
              ⏱️ Expiradas Hoje ({expiredEntries.length})
            </h2>
            <div ref={expiredCarouselRef} className="w-full overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 md:px-8 select-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}>
              <div className="flex gap-4 md:gap-5 py-4" style={{ paddingTop: '18px' }}>
                {expiredEntries.map((entry, index) => renderEntryCard(entry, index, true))}
              </div>
            </div>
          </section>
        )}

        {!isLoading && !error && activeEntries.length === 0 && expiredEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-muted-foreground text-lg">Nenhuma tip disponível hoje</p>
          </div>
        )}

        {/* Iframe Section */}
        <section className="w-full">
          <div className="w-full h-[1000px] bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl overflow-hidden border border-border/30 backdrop-blur-sm">
            {iframeUrl ? (
              <iframe key={iframeUrl} src={iframeUrl} title="Bet Site" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <JustificativaModal isOpen={justificativaModalOpen} onClose={handleCloseJustificativa} texto={justificativaTexto} />
      <BottomNav />
    </div>
  );
};

export default Sport;
