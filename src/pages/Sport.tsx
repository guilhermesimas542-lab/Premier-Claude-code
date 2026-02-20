import { ArrowLeft, LogOut, ChevronLeft, ChevronRight, Loader2, Lock, Menu, X, Gift, Headphones, Crown, ShoppingCart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { SpecialBettingCard } from "@/components/SpecialBettingCard";
import { JustificativaModal } from "@/components/JustificativaModal";
import { LockedTipModal } from "@/components/LockedTipModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isAuthenticated, clearAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import MatrixRain from "@/components/MatrixRain";
import logoImg from "@/assets/premier-logo-custom.png";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { WelcomePopup, UpgradePopup } from "@/components/HousePopups";


// ============ TIPOS ============
type TierType = "GRÁTIS" | "ALAVANCAGEM" | "ODDS_ALTAS" | "BÁSICO" | "PRO" | "ULTRA" | "MÚLTIPLA";

interface ContentEntry {
  id: string;
  date: string;
  title: string;
  category: string | null;
  category_explanation: string | null;
  condition_to_win: string | null;
  classification: string | null;
  justification: string | null;
  odd: number | null;
  tier_required: string;
  addon_required: string | null;
  starts_at: string | null;
  expires_at: string | null;
  link: string | null;
  link_house_1: string | null;
  link_house_2: string | null;
  link_house_3: string | null;
  team1_name: string | null;
  team1_shirt_variant: string | null;
  team1_primary_color: string | null;
  team1_secondary_color: string | null;
  team2_name: string | null;
  team2_shirt_variant: string | null;
  team2_primary_color: string | null;
  team2_secondary_color: string | null;
  metadata: any;
  created_at: string;
  active: boolean;
}


interface DisplayTip extends ContentEntry {
  display_status: "unlocked" | "locked" | "expired";
}

// Map DB tier to display tier
function mapTierToDisplay(tierRequired: string, addonRequired: string | null): TierType {
  if (addonRequired === "alavancagem") return "ALAVANCAGEM";
  if (addonRequired === "desaltas") return "ODDS_ALTAS";
  switch (tierRequired) {
    case "free": return "GRÁTIS";
    case "basic": return "BÁSICO";
    case "pro": return "PRO";
    case "ultra": return "ULTRA";
    default: return "BÁSICO";
  }
}

function getTierLabel(tierRequired: string, addonRequired: string | null): string {
  if (addonRequired === "alavancagem") return "Alavancagem";
  if (addonRequired === "desaltas") return "Odds Altas";
  switch (tierRequired) {
    case "basic": return "Básico";
    case "pro": return "Pro";
    case "ultra": return "Ultra";
    default: return "Premium";
  }
}

function getAllowedTiers(mainTier: string): string[] {
  switch (mainTier) {
    case "free": return ["free"];
    case "basic": return ["basic"];
    case "pro": return ["basic", "pro"];
    case "ultra": return ["basic", "pro", "ultra"];
    default: return ["free"];
  }
}

function calculateDisplayStatus(
  entry: ContentEntry,
  allowedTiers: string[],
  activeAddons: string[],
): "unlocked" | "locked" | "expired" {
  const now = new Date();

  // Expiration check: prefer expires_at; fallback to starts_at + 1 hour
  if (entry.expires_at) {
    if (now > new Date(entry.expires_at)) return "expired";
  } else if (entry.starts_at) {
    const startsAt = new Date(entry.starts_at);
    if (now > new Date(startsAt.getTime() + 60 * 60 * 1000)) return "expired";
  }

  // Addon access
  if (entry.addon_required && activeAddons.includes(entry.addon_required)) return "unlocked";
  // Tier access (only for non-addon entries)
  if (!entry.addon_required && allowedTiers.includes(entry.tier_required)) return "unlocked";
  return "locked";
}

const TIER_DISPLAY_ORDER: Record<TierType, number> = {
  "GRÁTIS": 0,
  "ALAVANCAGEM": 1,
  "ODDS_ALTAS": 2,
  "BÁSICO": 3,
  "PRO": 4,
  "ULTRA": 5,
  "MÚLTIPLA": 6,
};

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
  const { house: userHouse } = useUserBettingHouse();
  const [iframeUrl, setIframeUrl] = useState<string>("");

  const [activeTierHighlight, setActiveTierHighlight] = useState<TierType | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [justificativaModalOpen, setJustificativaModalOpen] = useState(false);
  const [justificativaTexto, setJustificativaTexto] = useState("");
  
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [lockedTierLabel, setLockedTierLabel] = useState("");
  const [lockedTierRequired, setLockedTierRequired] = useState("");
  const [lockedAddonRequired, setLockedAddonRequired] = useState<string | null>(null);

  const [tips, setTips] = useState<DisplayTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Countdown to midnight
  const getTimeUntilMidnight = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  };
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight);
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeUntilMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);
  const timerString = [timeLeft.hours, timeLeft.minutes, timeLeft.seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
  const [error, setError] = useState<string | null>(null);
  const hasLifetimeAccess = true;
  const mockUser = mockGetUser();
  
  const activeCarouselRef = useRef<HTMLDivElement>(null);
  const activeCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const pathname = window.location.pathname;
  const isAlavancagemRoute = pathname === "/alavancagem";
  const isOddsAltasRoute = pathname === "/odds-altas";

  // Fetch tips directly from content_entries + user tier
  const fetchTips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mockUser = mockGetUser();
      if (!mockUser) {
        setError("Usuário não autenticado");
        setIsLoading(false);
        return;
      }

      // Get user tier from DB
      const { data: userData } = await supabase
        .from("users")
        .select("id, main_tier")
        .eq("email", mockUser.email.toLowerCase().trim())
        .single();

      const userTier = userData?.main_tier || "free";
      const userId = userData?.id;

      // Get active addons
      let activeAddons: string[] = [];
      if (userId) {
        const { data: entitlements } = await supabase
          .from("entitlements")
          .select("product_key")
          .eq("user_id", userId)
          .eq("status", "active");
        activeAddons = (entitlements || []).map(e => e.product_key);
      }

      const allowedTiers = getAllowedTiers(userTier);
      const isPaidUser = userTier !== "free";
      const today = new Date().toISOString().split("T")[0];

      // Fetch today's active entries
      const { data: entries, error: fetchError } = await supabase
        .from("content_entries")
        .select("*")
        .eq("active", true)
        .eq("date", today)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Erro ao buscar entries:", fetchError);
        setError("Erro ao carregar tips");
        return;
      }

      // Process entries: filter + calculate display_status
      const processed: DisplayTip[] = (entries || [])
        .filter((e: ContentEntry) => {
          // Paid users don't see free-tier entries (unless addon)
          if (isPaidUser && e.tier_required === "free" && !e.addon_required) return false;
          return true;
        })
        .map((e: ContentEntry) => ({
          ...e,
          display_status: calculateDisplayStatus(e, allowedTiers, activeAddons),
        }))
        // Remove expired tips completely — they don't appear at all
        .filter((e) => e.display_status !== "expired")
        // Sort by fixed tier order: Grátis → Alavancagem → Odds Altas → Básico → Pro → Ultra
        .sort((a, b) => {
          const tierA = TIER_DISPLAY_ORDER[mapTierToDisplay(a.tier_required, a.addon_required)] ?? 99;
          const tierB = TIER_DISPLAY_ORDER[mapTierToDisplay(b.tier_required, b.addon_required)] ?? 99;
          return tierA - tierB;
        });

      setTips(processed);
    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Erro inesperado ao carregar tips");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Derived data — expired tips are already removed; tips array contains only active ones
  const activeEntries = tips;

  const tipsByTier = activeEntries.reduce((acc, entry) => {
    const tier = mapTierToDisplay(entry.tier_required, entry.addon_required);
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(entry);
    return acc;
  }, {} as Record<TierType, DisplayTip[]>);

  const getFirstIndexOfTier = (tier: TierType): number => {
    return activeEntries.findIndex(entry => mapTierToDisplay(entry.tier_required, entry.addon_required) === tier);
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
    fetchTips();
  }, [navigate, sportId, fetchTips]);

  // Set iframe URL from user's house when house is loaded
  useEffect(() => {
    if (userHouse?.iframe_url) {
      setIframeUrl(userHouse.iframe_url);
    }
  }, [userHouse]);


  useEffect(() => {
    if (isLoading || activeEntries.length === 0) return;
    const scrollTimeout = setTimeout(() => {
      if (isAlavancagemRoute) scrollToTier("ALAVANCAGEM");
      else if (isOddsAltasRoute) scrollToTier("ODDS_ALTAS");
      else scrollToTier("BÁSICO");
    }, 500);
    return () => clearTimeout(scrollTimeout);
  }, [isLoading, activeEntries.length, isAlavancagemRoute, isOddsAltasRoute]);

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

  const handleAddTip = (entry: DisplayTip) => {
    // Pick link specific to user's house, fallback to generic link
    const houseLink = userHouse?.slug === "esportiva-bet" ? entry.link_house_1
      : userHouse?.slug === "vamo-de-bet" ? entry.link_house_2
      : entry.link_house_3;
    const url = houseLink || entry.link_house_1 || entry.link_house_2 || entry.link_house_3 || null;
    if (url) setIframeUrl(url);
    toast.success("Tip adicionada!", { description: "Cupom carregado no site de apostas" });
  };


  const handleLockedClick = (entry: DisplayTip) => {
    setLockedTierLabel(getTierLabel(entry.tier_required, entry.addon_required));
    setLockedTierRequired(entry.tier_required);
    setLockedAddonRequired(entry.addon_required);
    setLockedModalOpen(true);
  };

  const handleOpenJustificativa = useCallback((texto: string) => {
    setJustificativaTexto(texto);
    setJustificativaModalOpen(true);
  }, []);

  const handleCloseJustificativa = useCallback(() => {
    setJustificativaModalOpen(false);
  }, []);

  const isSpecialEntry = (entry: DisplayTip): boolean => {
    return entry.addon_required === "alavancagem" || entry.addon_required === "desaltas";
  };

  const renderEntryCard = (entry: DisplayTip, index: number, isExpiredSection: boolean = false) => {
    const isSpecial = isSpecialEntry(entry);
    const displayTier = mapTierToDisplay(entry.tier_required, entry.addon_required);
    const isLocked = entry.display_status === "locked";
    const isExpired = entry.display_status === "expired";
    const lockedLabel = isLocked
      ? entry.addon_required
        ? `add-on ${getTierLabel(entry.tier_required, entry.addon_required)}`
        : `plano ${getTierLabel(entry.tier_required, null)}`
      : undefined;

    const team1 = {
      name: entry.team1_name || "Time 1",
      shirt: entry.team1_shirt_variant ? {
        variant: entry.team1_shirt_variant as "solid" | "stripes",
        primaryColor: entry.team1_primary_color || "#6B7280",
        secondaryColor: entry.team1_secondary_color || undefined,
      } : undefined,
    };
    const team2 = {
      name: entry.team2_name || "Time 2",
      shirt: entry.team2_shirt_variant ? {
        variant: entry.team2_shirt_variant as "solid" | "stripes",
        primaryColor: entry.team2_primary_color || "#6B7280",
        secondaryColor: entry.team2_secondary_color || undefined,
      } : undefined,
    };

    const market = entry.category || entry.title;
    const betChoice = entry.condition_to_win || entry.title;
    const matchDate = entry.starts_at
      ? new Date(entry.starts_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
      : undefined;
    const expirationDate = entry.expires_at || undefined;
    const startsAt = entry.starts_at || undefined;

    return (
      <div 
        key={entry.id}
        ref={isExpiredSection ? undefined : (el) => { activeCardRefs.current[index] = el; }}
        className={`flex-shrink-0 snap-center ${isLocked ? "cursor-pointer" : ""} ${isExpired ? "pointer-events-none" : ""}`}
        style={{ width: 'min(420px, 92vw)', height: 'calc(min(420px, 92vw) * 213 / 332)', minWidth: '280px', overflow: 'visible' }}
        onClick={isLocked ? () => handleLockedClick(entry) : undefined}
      >
        {isSpecial ? (
          <SpecialBettingCard
            tipId={0}
            type={entry.addon_required === "alavancagem" ? "ALAVANCAGEM" : "ODDS_ALTAS"}
            market={market}
            betChoice={betChoice}
            odds={entry.odd || 0}
            matchDate={matchDate}
            startsAt={startsAt}
            expirationDate={expirationDate}
            isLocked={isLocked}
            lockedLabel={lockedLabel}
            isExpired={isExpired}
            justificativa={entry.justification || undefined}
            onAddTip={() => handleAddTip(entry)}
            onOpenJustificativa={handleOpenJustificativa}
          />
        ) : (
          <PremiumBettingCard
            tipId={0}
            tier={displayTier as "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" | "ULTRA"}
            team1={team1}
            team2={team2}
            market={market}
            betChoice={betChoice}
            odds={entry.odd || 0}
            matchDate={matchDate}
            startsAt={startsAt}
            expirationDate={expirationDate}
            selectionsCount={displayTier === "ULTRA" ? 3 : undefined}
            justificativa={entry.justification || undefined}
            isLocked={isLocked}
            lockedLabel={lockedLabel}
            isExpired={isExpired}
            onAddTip={() => handleAddTip(entry)}
            onOpenJustificativa={handleOpenJustificativa}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden w-full max-w-full pb-20 md:pb-0 relative" style={{ background: "#000000" }}>
      <MatrixRain opacity={0.22} />
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(0,0,0,0.92)", borderColor: "rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: "#00FF00" }} />
              </button>
              <img src={logoImg} alt="Premier" className="h-10 sm:h-12 w-auto" style={{ filter: "drop-shadow(0 0 10px rgba(0,255,0,0.5))" }} />
              <span className="text-2xl sm:text-4xl font-bold" style={{ color: "#FFFFFF", textShadow: "0 0 14px rgba(0,255,0,0.3)" }}>Futebol</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {hasLifetimeAccess ? (
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold" style={{ background: "rgba(0,255,0,0.1)", color: "#FFFFFF", border: "1px solid rgba(0,255,0,0.4)", boxShadow: "0 0 10px rgba(0,255,0,0.2)" }}>
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Acesso</span> vitalício
                </span>
              ) : (
                <button className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer"
                  style={{ background: "rgba(255,0,0,0.1)", color: "#FF4444", border: "1px solid rgba(255,0,0,0.3)" }}>
                  <span className="hidden sm:inline">Sem</span> vitalício
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 pt-2 pb-6 space-y-2 overflow-x-hidden">
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
            <Button onClick={fetchTips} variant="outline" size="sm">Tentar novamente</Button>
          </div>
        )}

        {!isLoading && !error && activeEntries.length > 0 && (
          <section className="relative w-full">
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

        {!isLoading && !error && activeEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
            <span className="text-6xl">🕐</span>
            <p className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
              As entradas de hoje expiraram.
            </p>
            <p className="text-lg" style={{ color: "#00FF00" }}>
              Amanhã teremos novas entradas!
            </p>
            <div className="mt-4 flex flex-col items-center gap-1">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Próximas entradas em</p>
              <span
                className="text-4xl font-mono font-bold tabular-nums"
                style={{ color: "#00FF00", textShadow: "0 0 18px rgba(0,255,0,0.5)" }}
              >
                {timerString}
              </span>
            </div>
          </div>
        )}

        <section className="w-full mt-2">
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
      <LockedTipModal 
        isOpen={lockedModalOpen} 
        onClose={() => setLockedModalOpen(false)} 
        tierLabel={lockedTierLabel}
        tierRequired={lockedTierRequired}
        addonRequired={lockedAddonRequired}
      />
      <WelcomePopup house={userHouse as any} />
      <BottomNav />
    </div>
  );
};

export default Sport;
