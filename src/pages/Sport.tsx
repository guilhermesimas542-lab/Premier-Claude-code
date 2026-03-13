import { ArrowLeft, LogOut, ChevronLeft, ChevronRight, Loader2, Lock, Menu, X, Gift, Headphones, Crown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { SpecialBettingCard } from "@/components/SpecialBettingCard";
import { JustificativaModal } from "@/components/JustificativaModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isAuthenticated, clearAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTodayInBrazil, formatDateTimeBR, BRAZIL_TZ } from "@/lib/timezone";
import { toZonedTime } from "date-fns-tz";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

import { trackEvent } from "@/lib/events";
import { useGamification } from "@/contexts/GamificationContext";
import logoImg from "@/assets/premier-logo-custom.png";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { UpgradePopup } from "@/components/HousePopups";
import { usePayCardByPlan, type PayCardData } from "@/hooks/usePayCards";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import AppHeader from "@/components/AppHeader";

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
  team1_logo_url: string | null;
  team2_name: string | null;
  team2_shirt_variant: string | null;
  team2_primary_color: string | null;
  team2_secondary_color: string | null;
  team2_logo_url: string | null;
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
  const now = toZonedTime(new Date(), BRAZIL_TZ);

  // Expiration check: prefer expires_at; fallback to starts_at + 1 hour
  if (entry.expires_at) {
    if (now > toZonedTime(new Date(entry.expires_at), BRAZIL_TZ)) return "expired";
  } else if (entry.starts_at) {
    const startsAt = new Date(entry.starts_at);
    if (now > toZonedTime(new Date(startsAt.getTime() + 60 * 60 * 1000), BRAZIL_TZ)) return "expired";
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

const TIER_TABS: { tier: TierType; label: string; labelShort: string; colorKey: string }[] = [
  { tier: "GRÁTIS", label: "Grátis", labelShort: "Grátis", colorKey: "free" },
  { tier: "ALAVANCAGEM", label: "Alavancagem", labelShort: "Alav.", colorKey: "alavancagem" },
  { tier: "ODDS_ALTAS", label: "Odds Altas", labelShort: "Odds Alt.", colorKey: "odds_altas" },
  { tier: "BÁSICO", label: "Básico", labelShort: "Basic", colorKey: "basic" },
  { tier: "PRO", label: "Pro", labelShort: "Pro", colorKey: "pro" },
  { tier: "ULTRA", label: "Ultra", labelShort: "Ultra", colorKey: "ultra" },
];

const TIER_TAB_COLORS: Record<string, string> = {
  free: "#94A3B8",
  basic: "#60A5FA",
  pro: "#00E87A",
  ultra: "#7C3AED",
  alavancagem: "#F0B429",
  odds_altas: "#F97316",
};

const Sport = () => {
  const navigate = useNavigate();
  const { sportId } = useParams<{ sportId: string }>();
  const { house: userHouse } = useUserBettingHouse();
  const { sendXpEvent } = useGamification();
  const [iframeUrl, setIframeUrl] = useState<string>("");

  const [activeTierHighlight, setActiveTierHighlight] = useState<TierType | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [justificativaModalOpen, setJustificativaModalOpen] = useState(false);
  const [justificativaTexto, setJustificativaTexto] = useState("");
  
  const [upgradePopupOpen, setUpgradePopupOpen] = useState(false);
  const [upgradePopupImage, setUpgradePopupImage] = useState<string | null>(null);
  const [upgradePopupLink, setUpgradePopupLink] = useState<string | null>(null);

  const [payCardData, setPayCardData] = useState<PayCardData | null>(null);
  const [payCardModalOpen, setPayCardModalOpen] = useState(false);
  const [showLifetimeInfoModal, setShowLifetimeInfoModal] = useState(false);
  const { fetchByPlan } = usePayCardByPlan();

  const [tips, setTips] = useState<DisplayTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tick every second so expired tips disappear in real-time
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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
      const today = getTodayInBrazil();
      console.log("[Sport] getTodayInBrazil() =", today, "| UTC now =", new Date().toISOString());

      // Fetch today's active entries
      const { data: entries, error: fetchError } = await supabase
        .from("content_entries")
        .select("*")
        .eq("active", true)
        .eq("date", today)
        .order("created_at", { ascending: false });

      console.log("[Sport] Query result:", { count: entries?.length, error: fetchError, today });

      if (fetchError) {
        console.error("Erro ao buscar entries:", fetchError);
        setError("Erro ao carregar tips");
        return;
      }

      // Process entries: filter + calculate display_status
      const rawEntries = (entries || []) as unknown as ContentEntry[];
      const processed: DisplayTip[] = rawEntries
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

  // Derived data — re-filter on every tick so expired tips disappear in real-time
  // Uses São Paulo timezone for all comparisons
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeEntries = tips.filter(entry => {
    const now = toZonedTime(new Date(), BRAZIL_TZ);

    // starts_at check: entries expire 1h after match starts
    if (entry.starts_at) {
      const expiryFromStart = new Date(new Date(entry.starts_at).getTime() + 60 * 60 * 1000);
      if (now > toZonedTime(expiryFromStart, BRAZIL_TZ)) return false;
    }

    // explicit expires_at check
    if (entry.expires_at && now > toZonedTime(new Date(entry.expires_at), BRAZIL_TZ)) return false;

    return true;
  });
  void tick; // referenced to force re-evaluation every second

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
    trackEvent("view_entries", { sport: sportId ?? "futebol" });
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

  const resolveBetUrl = (entry: DisplayTip): string | null => {
    // Try to find the house index from the ordered list of houses
    // link_house_1 = first house, link_house_2 = second, link_house_3 = third
    // We determine index by fetching all active houses ordered by creation
    // For now, resolve by user's house ID position; fallback chain covers all links + generic
    const houseLinks = [entry.link_house_1, entry.link_house_2, entry.link_house_3];
    // Try house-specific link first (any populated one for user's house or first available)
    const specificLink = houseLinks.find(l => l && l.trim() !== "") || null;
    // Fallback to generic link field
    return specificLink || entry.link || null;
  };

  const handleAddTip = (entry: DisplayTip) => {
    trackEvent("card_click", { tier: entry.tier_required, addon: entry.addon_required, title: entry.title });

    // Dispatch XP events for achievements
    sendXpEvent('VIEW_ANY_TIP');
    if (entry.addon_required === 'alavancagem') {
      sendXpEvent('VIEW_ALAV_TIP');
    } else if (entry.addon_required === 'desaltas') {
      sendXpEvent('VIEW_ODDS_TIP');
    } else if (entry.tier_required === 'free') {
      sendXpEvent('VIEW_FREE_TIP');
    } else if (entry.tier_required === 'basic') {
      sendXpEvent('VIEW_BASIC_TIP');
    } else if (entry.tier_required === 'ultra') {
      sendXpEvent('VIEW_ULTRA_TIP');
    }

    const url = resolveBetUrl(entry);
    if (url) {
      if (userHouse?.force_sports_link_new_tab) {
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success("Tip adicionada!", { description: "Link aberto em nova aba" });
      } else {
        setIframeUrl(url);
        toast.success("Tip adicionada!", { description: "Cupom carregado no site de apostas abaixo" });
        setTimeout(() => {
          document.getElementById("bet-iframe-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } else {
      toast.info("Nenhum link de bilhete configurado para esta tip.");
    }
  };


  const handleLockedClick = async (entry: DisplayTip) => {
    trackEvent("click_locked_entry", { tier: entry.tier_required, addon: entry.addon_required, title: entry.title });
    // Determine the plan key for pay_cards lookup
    let planKey: string | null = null;
    if (entry.addon_required === "alavancagem") planKey = "alavancagem";
    else if (entry.addon_required === "desaltas") planKey = "desaltas";
    else if (entry.tier_required === "basic") planKey = "basic";
    else if (entry.tier_required === "pro") planKey = "pro";
    else if (entry.tier_required === "ultra") planKey = "ultra";

    // Try house-specific pay card first, then generic
    if (planKey) {
      let pc: PayCardData | null = null;
      if (userHouse?.id) {
        const { data } = await supabase
          .from("pay_cards" as any)
          .select("*")
          .eq("associated_plan", planKey)
          .eq("betting_house_id", userHouse.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        pc = data as any;
      }
      if (!pc) {
        pc = await fetchByPlan(planKey);
      }
      if (pc) {
        setPayCardData(pc);
        setPayCardModalOpen(true);
        return;
      }
    }

    // Fallback to legacy upgrade popup
    const h = userHouse as any;
    let image: string | null = null;
    let link: string | null = null;

    if (entry.addon_required === "alavancagem") {
      image = h?.popup_alavancagem_image ?? null;
      link = h?.popup_alavancagem_link ?? null;
    } else if (entry.addon_required === "desaltas") {
      image = h?.popup_odds_altas_image ?? null;
      link = h?.popup_odds_altas_link ?? null;
    } else if (entry.addon_required === "live_telegram") {
      image = h?.popup_live_telegram_image ?? null;
      link = h?.popup_live_telegram_link ?? null;
    } else if (entry.tier_required === "basic") {
      image = h?.popup_basic_image ?? null;
      link = h?.popup_basic_link ?? null;
    } else if (entry.tier_required === "pro") {
      image = h?.popup_pro_image ?? null;
      link = h?.popup_pro_link ?? null;
    } else if (entry.tier_required === "ultra") {
      image = h?.popup_ultra_image ?? null;
      link = h?.popup_ultra_link ?? null;
    }

    if (image) {
      setUpgradePopupImage(image);
      setUpgradePopupLink(link);
      setUpgradePopupOpen(true);
    }
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
      logo: entry.team1_logo_url || undefined,
      shirt: (!entry.team1_logo_url && entry.team1_shirt_variant) ? {
        variant: entry.team1_shirt_variant as "solid" | "stripes",
        primaryColor: entry.team1_primary_color || "#6B7280",
        secondaryColor: entry.team1_secondary_color || undefined,
      } : undefined,
    };
    const team2 = {
      name: entry.team2_name || "Time 2",
      logo: entry.team2_logo_url || undefined,
      shirt: (!entry.team2_logo_url && entry.team2_shirt_variant) ? {
        variant: entry.team2_shirt_variant as "solid" | "stripes",
        primaryColor: entry.team2_primary_color || "#6B7280",
        secondaryColor: entry.team2_secondary_color || undefined,
      } : undefined,
    };

    const market = entry.category || entry.title;
    const betChoice = entry.condition_to_win || entry.title;
    const matchDate = entry.starts_at
      ? formatDateTimeBR(entry.starts_at, 'HH:mm')
      : undefined;
    const expirationDate = entry.expires_at || undefined;
    const startsAt = entry.starts_at || undefined;


    return (
      <div
        key={entry.id}
        ref={isExpiredSection ? undefined : (el) => { activeCardRefs.current[index] = el; }}
        className={`flex-shrink-0 snap-center ${isLocked ? "cursor-pointer" : ""} ${isExpired ? "pointer-events-none" : ""}`}
        style={{ width: 'min(420px, 92vw)', minWidth: '280px', overflow: 'visible' }}
        onClick={isLocked ? () => handleLockedClick(entry) : undefined}
      >
        <div style={{ height: 'calc(min(420px, 92vw) * 213 / 332)' }}>
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
              onLockedClick={() => handleLockedClick(entry)}
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
              onLockedClick={() => handleLockedClick(entry)}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden w-full max-w-full pb-20 md:pb-0 relative bg-navy-dark">
      <AppHeader
        onShowLifetimeInfoModal={() => setShowLifetimeInfoModal(true)}
        leftContent={
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: "#00FF00" }} />
            </button>
            <img src={logoImg} alt="Premier" className="h-10 sm:h-12 w-auto" style={{ filter: "drop-shadow(0 0 10px rgba(0,255,0,0.5))" }} />
            
          </div>
        }
      />

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
              <button onClick={() => scrollByArrow('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/20 border-2 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] hover:bg-green-500/40 text-green-300 flex items-center justify-center transition-all hover:scale-105 -ml-2 md:-ml-4" aria-label="Anterior">
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
            {canScrollRight && (
              <button onClick={() => scrollByArrow('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/20 border-2 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] hover:bg-green-500/40 text-green-300 flex items-center justify-center transition-all hover:scale-105 -mr-2 md:-mr-4" aria-label="Próximo">
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
          <div className="flex items-center justify-center px-6 py-4">
            <div
              className="w-full max-w-[420px] h-[210px] rounded-xl border border-dashed flex flex-col items-center justify-center text-center p-4 gap-1"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.15)" }}
            >
              <p className="text-base" style={{ color: "rgba(255,255,255,0.6)" }}>
                As entradas de hoje expiraram.
              </p>
              <p className="text-lg font-bold mb-2" style={{ color: "#00FF00" }}>
                Amanhã teremos novas entradas!
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Próximas entradas em</p>
              <span
                className="text-3xl font-mono font-bold tabular-nums"
                style={{ color: "#FFFFFF", textShadow: "0 0 14px rgba(0,255,0,0.4)" }}
              >
                {timerString}
              </span>
            </div>
          </div>
        )}

        <section id="bet-iframe-section" className="w-full mt-2">
          {userHouse?.open_in_new_tab ? (
            <a
              href={iframeUrl || userHouse.iframe_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 text-primary font-semibold hover:from-primary/30 hover:to-primary/20 transition-colors"
            >
              Abrir site de apostas ↗
            </a>
          ) : (
            <div className="w-full h-[1000px] bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl overflow-hidden border border-border/30 backdrop-blur-sm">
              {iframeUrl ? (
                <iframe key={iframeUrl} src={iframeUrl} title="Bet Site" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <JustificativaModal isOpen={justificativaModalOpen} onClose={handleCloseJustificativa} texto={justificativaTexto} />
      <UpgradePopup
        open={upgradePopupOpen}
        onClose={() => setUpgradePopupOpen(false)}
        image={upgradePopupImage}
        link={upgradePopupLink}
      />
      {payCardData && (
        <PayCardFunnelModal
          payCard={payCardData}
          open={payCardModalOpen}
          onClose={() => { setPayCardModalOpen(false); setPayCardData(null); }}
        />
      )}
      {/* Modal Info Vitalício */}
      {showLifetimeInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLifetimeInfoModal(false)}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(0,255,0,0.25)", boxShadow: "0 0 40px rgba(0,255,0,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,0,0.1)", border: "1px solid rgba(0,255,0,0.3)" }}>
                  <Crown className="w-5 h-5" style={{ color: "#00FF00" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Parabéns! 🎉</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>Membro Vitalício</p>
                </div>
              </div>
              <button onClick={() => setShowLifetimeInfoModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,255,0,0.08)]">
                <X className="w-5 h-5" style={{ color: "#00FF00" }} />
              </button>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
                Você tem <span style={{ color: "#00FF00", fontWeight: 600 }}>acesso vitalício e ilimitado</span> a todas as funcionalidades e futuras atualizações do Premier Ultra. Aproveite!
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowLifetimeInfoModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

export default Sport;
