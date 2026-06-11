import { ArrowLeft, LogOut, Loader2, Lock, Menu, X, Gift, Headphones, Crown, ChevronRight } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSportOutletContext } from "@/pages/SportLayout";
import { PremiumBettingCard } from "@/components/PremiumBettingCard";
import { SpecialBettingCard } from "@/components/SpecialBettingCard";
import { JustificativaModal } from "@/components/JustificativaModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isAuthenticated, clearAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTodayInChile, formatDateTimeCL, CHILE_TZ } from "@/lib/timezone";
import { toZonedTime } from "date-fns-tz";

import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

import { trackEvent } from "@/lib/events";
import { useGamification } from "@/contexts/GamificationContext";
import logoImg from "@/assets/premier-logo-custom.png";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { UpgradePopup } from "@/components/HousePopups";
import { usePayCardByPlan, type PayCardData } from "@/hooks/usePayCards";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import { PaywallPopup } from "@/components/PaywallPopup";
import AppHeader from "@/components/AppHeader";
import { usePendingTip } from "@/contexts/PendingTipContext";

// ============ TIPOS (feature-based) ============
type FeatureKey =
  | "free"
  | "odds_safes"
  | "odds_pro"
  | "alavancagem"
  | "multiplas_bingo"
  | "mercados_secundarios"
  | "esportes_americanos"
  | "odds_ultra";

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
  feature_required: string | null;
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

/** Resolve a tip's effective FeatureKey from feature_required (with legacy fallback) */
function getEntryFeature(entry: { feature_required: string | null; tier_required: string; addon_required: string | null }): FeatureKey {
  const f = entry.feature_required;
  if (f === "odds_safes" || f === "odds_pro" || f === "alavancagem"
      || f === "multiplas_bingo" || f === "mercados_secundarios" || f === "esportes_americanos"
      || f === "odds_ultra") {
    return f;
  }
  // Legacy fallback (defensive — backfill should have populated everything)
  if (entry.addon_required === "alavancagem") return "alavancagem";
  if (entry.addon_required === "multiplas_bingo") return "multiplas_bingo";
  if (entry.tier_required === "basic") return "odds_safes";
  if (entry.tier_required === "pro" || entry.tier_required === "ultra") return "odds_pro";
  return "free";
}

/** Visual tier mapping for PremiumBettingCard / SpecialBettingCard */
function featureToDisplayTier(f: FeatureKey): TierType {
  switch (f) {
    case "free": return "GRÁTIS";
    case "alavancagem": return "ALAVANCAGEM";
    case "odds_safes": return "BÁSICO";
    case "odds_pro": return "PRO";
    case "multiplas_bingo": return "MÚLTIPLA";
    case "mercados_secundarios": return "ULTRA";
    case "esportes_americanos": return "ULTRA";
    case "odds_ultra": return "ULTRA";
  }
}

/** Map feature → pay_cards.associated_plan key (for locked-click funnel lookup) */
function featureToPlanKey(f: FeatureKey): string | null {
  switch (f) {
    case "alavancagem": return "alavancagem";
    case "multiplas_bingo": return "multiplas_bingo";
    case "mercados_secundarios": return "mercados_secundarios";
    case "esportes_americanos": return "esportes_americanos";
    case "odds_safes":
    case "odds_pro":
    case "odds_ultra": return "premium";
    default: return null;
  }
}

function getFeatureLabel(f: FeatureKey): string {
  switch (f) {
    case "odds_safes": return "Cuotas Safes";
    case "odds_pro": return "Cuotas Pro";
    case "alavancagem": return "Apalancamiento";
    case "multiplas_bingo": return "Múltiples Bingo";
    case "mercados_secundarios": return "Mercados Secundarios";
    case "esportes_americanos": return "Deportes Americanos";
    case "odds_ultra": return "Cuotas Ultra";
    default: return "Premium";
  }
}

function calculateDisplayStatus(
  entry: ContentEntry,
  userFeatures: Set<string>,
): "unlocked" | "locked" | "expired" {
  const now = toZonedTime(new Date(), CHILE_TZ);
  if (entry.expires_at) {
    if (now > toZonedTime(new Date(entry.expires_at), CHILE_TZ)) return "expired";
  } else if (entry.starts_at) {
    const startsAt = new Date(entry.starts_at);
    if (now > toZonedTime(new Date(startsAt.getTime() + 60 * 60 * 1000), CHILE_TZ)) return "expired";
  }
  const feat = getEntryFeature(entry);
  if (feat === "free") return "unlocked";
  if (userFeatures.has(feat)) return "unlocked";
  return "locked";
}

// 8 tabs in fixed order: Grátis, Odds Safes, Odds Pró, Alavancagem, Múltiplas Bingo, Mercados Sec., Esp. Americanos, Odds Ultra
const TAB_ORDER: FeatureKey[] = [
  "free",
  "odds_safes",
  "odds_pro",
  "odds_ultra",
  "multiplas_bingo",
  "mercados_secundarios",
  "esportes_americanos",
  "alavancagem",
];

const FEATURE_DISPLAY_ORDER: Record<FeatureKey, number> = {
  free: 0,
  odds_safes: 1,
  odds_pro: 2,
  odds_ultra: 3,
  multiplas_bingo: 4,
  mercados_secundarios: 5,
  esportes_americanos: 6,
  alavancagem: 7,
};

const TAB_META: Record<FeatureKey, { label: string; labelShort: string; color: string }> = {
  free:                 { label: "Odd Grátis",        labelShort: "Odd Grátis",        color: "#94A3B8" },
  odds_safes:           { label: "Odds Safes",        labelShort: "Odds Safes",        color: "#60A5FA" },
  odds_pro:             { label: "Odds Pró",          labelShort: "Odds Pró",          color: "#eac064" },
  alavancagem:          { label: "Alavancagem",       labelShort: "Alavancagem",       color: "#F0B429" },
  multiplas_bingo:      { label: "Múltiplas",         labelShort: "Múltiplas",         color: "#FF6B9D" },
  mercados_secundarios: { label: "Merc. Secundário",  labelShort: "Merc. Secundário",  color: "#A78BFA" },
  esportes_americanos:  { label: "Ligas Americanas",  labelShort: "Ligas Americanas",  color: "#EF4444" },
  odds_ultra:           { label: "Cuotas Ultra",      labelShort: "Cuotas Ultra",      color: "#22D3EE" },
};

const Sport = () => {
  const navigate = useNavigate();
  const { sportId } = useParams<{ sportId: string }>();
  const { house: userHouse } = useUserBettingHouse();
  const { sendXpEvent } = useGamification();
  // iframeRef, iframeUrl e setIframeUrl vêm do SportLayout (pai persistente).
  // Não criar useState/useRef locais para iframe — isso quebraria a persistência.
  const { iframeRef, iframeUrl, setIframeUrl } = useSportOutletContext();
  const { setPendingTip } = usePendingTip();

  const [activeFeatureHighlight, setActiveFeatureHighlight] = useState<FeatureKey | null>(null);
  const [searchParams] = useSearchParams();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  
  const [justificativaModalOpen, setJustificativaModalOpen] = useState(false);
  const [justificativaTexto, setJustificativaTexto] = useState("");
  
  const [upgradePopupOpen, setUpgradePopupOpen] = useState(false);
  const [upgradePopupImage, setUpgradePopupImage] = useState<string | null>(null);
  const [upgradePopupLink, setUpgradePopupLink] = useState<string | null>(null);

  const [showLifetimeInfoModal, setShowLifetimeInfoModal] = useState(false);

  // New paywall popup state
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallVariant, setPaywallVariant] = useState<import("@/lib/paywallRouting").PaywallVariant>("premium");
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey>("free");

  const [tips, setTips] = useState<DisplayTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [userTier, setUserTier] = useState<string>("free");

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
  
  const initialTabParam = searchParams.get("tab"); // e.g. "alavancagem"
  const fallbackParam = searchParams.get("fallback"); // "auto" | null


  // Fetch tips directly from content_entries + user features
  const [userFeatures, setUserFeatures] = useState<Set<string>>(new Set());

  const fetchTips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mockUser = mockGetUser();
      if (!mockUser) {
        setError("Usuario no autenticado");
        setIsLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("id, main_tier")
        .eq("email", mockUser.email.toLowerCase().trim())
        .single();

      const userTier = userData?.main_tier || "free";
      const userId = userData?.id;

      // Resolve feature flags via DB (uses user_has_feature with LEGACY UNIVERSAL fallback)
      const features = new Set<string>();
      if (userId) {
        const featureKeys = [
          "odds_safes", "odds_pro", "alavancagem",
          "multiplas_bingo", "mercados_secundarios", "esportes_americanos",
          "odds_ultra",
        ];
        const results = await Promise.all(
          featureKeys.map(k => supabase.rpc("user_has_feature", { p_user: userId, p_feature: k })),
        );
        featureKeys.forEach((k, i) => { if (results[i].data === true) features.add(k); });
      }
      setUserFeatures(features);

      const _isPaidUser = userTier !== "free";
      setIsPaidUser(_isPaidUser);
      setUserTier(userTier);
      const today = getTodayInChile();
      console.log("[Sport] getTodayInChile() =", today, "| UTC now =", new Date().toISOString());

      const { data: entries, error: fetchError } = await supabase
        .from("content_entries")
        .select("*")
        .eq("active", true)
        .eq("date", today)
        .order("created_at", { ascending: false });

      console.log("[Sport] Query result:", { count: entries?.length, error: fetchError, today });

      if (fetchError) {
        console.error("Erro ao buscar entries:", fetchError);
        setError("Error al cargar tips");
        return;
      }

      const rawEntries = (entries || []) as unknown as ContentEntry[];
      const processed: DisplayTip[] = rawEntries
        .map((e: ContentEntry) => ({
          ...e,
          display_status: calculateDisplayStatus(e, features),
        }))
        .filter((e) => e.display_status !== "expired")
        .sort((a, b) => {
          const fa = FEATURE_DISPLAY_ORDER[getEntryFeature(a)] ?? 99;
          const fb = FEATURE_DISPLAY_ORDER[getEntryFeature(b)] ?? 99;
          return fa - fb;
        });

      setTips(processed);
    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Error inesperado al cargar tips");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Derived data — re-filter on every tick so expired tips disappear in real-time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeEntries = useMemo(() => {
    const filtered = tips.filter(entry => {
      const now = toZonedTime(new Date(), CHILE_TZ);
      if (entry.starts_at) {
        const expiryFromStart = new Date(new Date(entry.starts_at).getTime() + 60 * 60 * 1000);
        if (now > toZonedTime(expiryFromStart, CHILE_TZ)) return false;
      }
      if (entry.expires_at && now > toZonedTime(new Date(entry.expires_at), CHILE_TZ)) return false;
      return true;
    });
    const getSortTime = (entry: DisplayTip): number => {
      if (entry.starts_at) return new Date(entry.starts_at).getTime();
      if (entry.expires_at) return new Date(entry.expires_at).getTime();
      return Number.MAX_SAFE_INTEGER;
    };
    return filtered.sort((a, b) => {
      const fa = FEATURE_DISPLAY_ORDER[getEntryFeature(a)] ?? 99;
      const fb = FEATURE_DISPLAY_ORDER[getEntryFeature(b)] ?? 99;
      if (fa !== fb) return fa - fb;
      return getSortTime(a) - getSortTime(b);
    });
  }, [tips, tick]);

  const tipsByFeature = useMemo(() => {
    const getSortTime = (entry: DisplayTip): number => {
      if (entry.starts_at) return new Date(entry.starts_at).getTime();
      if (entry.expires_at) return new Date(entry.expires_at).getTime();
      return Number.MAX_SAFE_INTEGER;
    };
    const grouped = activeEntries.reduce((acc, entry) => {
      const f = getEntryFeature(entry);
      if (!acc[f]) acc[f] = [];
      acc[f].push(entry);
      return acc;
    }, {} as Record<FeatureKey, DisplayTip[]>);
    for (const f in grouped) {
      grouped[f as FeatureKey].sort((a, b) => getSortTime(a) - getSortTime(b));
    }
    return grouped;
  }, [activeEntries]);

  const getFirstIndexOfFeature = (f: FeatureKey): number => {
    return activeEntries.findIndex(entry => getEntryFeature(entry) === f);
  };

  const scrollToFeature = (f: FeatureKey) => {
    const firstIndex = getFirstIndexOfFeature(f);
    if (firstIndex === -1) {
      toast.info(`Sin tips de ${TAB_META[f].label} hoy`);
      return;
    }
    const targetCard = activeCardRefs.current[firstIndex];
    const container = activeCarouselRef.current;
    if (targetCard && container) {
      const containerRect = container.getBoundingClientRect();
      const cardRect = targetCard.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + (cardRect.left - containerRect.left) - 16;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      setActiveFeatureHighlight(f);
    }
  };

  const updateActiveCardIndex = useCallback(() => {
    const container = activeCarouselRef.current;
    if (!container) return;
    const cardWidth = Math.min(420, window.innerWidth * 0.88) + 12;
    const idx = Math.round(container.scrollLeft / cardWidth);
    setActiveCardIndex(idx);
  }, []);

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

  // NOTA: a inicialização do iframeUrl com userHouse.iframe_url agora vive no SportLayout (pai).




  useEffect(() => {
    if (isLoading || activeEntries.length === 0) return;
    const scrollTimeout = setTimeout(() => {
      const isValidFeature = (k: string | null): k is FeatureKey =>
        !!k && (TAB_ORDER as string[]).includes(k);

      if (isValidFeature(initialTabParam)) {
        const targetHasContent = getFirstIndexOfFeature(initialTabParam) !== -1;
        if (targetHasContent) {
          scrollToFeature(initialTabParam);
          return;
        }
        if (fallbackParam === "auto") {
          const firstNonEmpty = TAB_ORDER.find(
            (f) => getFirstIndexOfFeature(f) !== -1,
          );
          if (firstNonEmpty) {
            scrollToFeature(firstNonEmpty);
            return;
          }
        }
        // sem fallback: deixa highlight no alvo mesmo vazio
        scrollToFeature(initialTabParam);
        return;
      }
      scrollToFeature(isPaidUser ? "odds_safes" : "free");
    }, 500);
    return () => clearTimeout(scrollTimeout);
  }, [isLoading, activeEntries.length, initialTabParam, fallbackParam, isPaidUser]);


  useEffect(() => {
    const container = activeCarouselRef.current;
    if (!container) return;
    updateActiveCardIndex();
    container.addEventListener('scroll', updateActiveCardIndex);
    window.addEventListener('resize', updateActiveCardIndex);
    return () => {
      container.removeEventListener('scroll', updateActiveCardIndex);
      window.removeEventListener('resize', updateActiveCardIndex);
    };
  }, [updateActiveCardIndex, activeEntries.length]);

  const handleLogout = () => {
    clearAuth();
    toast.success("Sesión cerrada exitosamente");
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
    if (entry.addon_required === 'alavancagem') {
      sendXpEvent('VIEW_ALAV_TIP');
    } else if (entry.addon_required === 'multiplas_bingo') {
      sendXpEvent('VIEW_ODDS_TIP');
    } else if (entry.tier_required === 'free') {
      sendXpEvent('VIEW_FREE_TIP');
    } else if (entry.tier_required === 'basic') {
      sendXpEvent('VIEW_BASIC_TIP');
    } else if (entry.tier_required === 'ultra') {
      sendXpEvent('VIEW_ULTRA_TIP');
    }

    // Verificar se a entry tem payload WSDK para postMessage
    const wsdkSelections = (entry as any).metadata?.wsdk?.selections;
    if (wsdkSelections && wsdkSelections.length > 0) {
      console.log("=== WSDK DEBUG ===");
      console.log("SELECTIONS:", JSON.stringify(wsdkSelections, null, 2));
      console.log("=== END WSDK DEBUG ===");
      // targetOrigin "*" é seguro: app controla iframe (URL do banco),
      // mensagem não contém dado sensível, resiliente a redirects internos.
      const target = iframeRef.current?.contentWindow;
      const currentIframeSrc = iframeRef.current?.src ?? "(none)";
      if (target) {
        const message = { type: "wsdk-toggle-selections", data: { selections: wsdkSelections } };
        console.log("[WSDK SEND] iframe.src:", currentIframeSrc, "| sending", wsdkSelections.length, "selections");
        [0, 200, 500, 1000, 2000].forEach((delay) => {
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage(message, "*");
          }, delay);
        });
        toast.success("¡Tip añadido al ticket!", {
          description: "Selección enviada al cupón de apuestas",
        });
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }, 100);
      } else {
        // Fallback: iframe ainda não montado (caso defensivo). Enfileira e navega.
        setPendingTip({ tipId: entry.id, selections: wsdkSelections });
        toast("Abriendo ticket...");
        navigate("/sport/futebol");
      }
    } else {
      // Fallback: comportamento antigo via URL (para tips sem payload WSDK)
      const url = resolveBetUrl(entry);
      if (url) {
        if (userHouse?.force_sports_link_new_tab) {
          window.open(url, '_blank', 'noopener,noreferrer');
          toast.success("¡Tip añadida!", { description: "Enlace abierto en nueva pestaña" });
        } else {
          setIframeUrl(url);
          toast.success("¡Tip añadida!", { description: "Cupón cargado en el sitio de apuestas abajo" });
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          }, 100);
        }
      } else {
        toast.info("No hay enlace de ticket configurado para este tip.");
      }
    }
  };


  const handleLockedClick = async (entry: { tier_required: string; addon_required: string | null; feature_required: string | null; title?: string }) => {
    trackEvent("click_locked_entry", { tier: entry.tier_required, addon: entry.addon_required, title: (entry as any).title });
    const feat = getEntryFeature(entry as any);
    const { resolvePaywallVariant } = await import("@/lib/paywallRouting");
    const variant = resolvePaywallVariant(feat, userTier);
    setPaywallFeature(feat);
    setPaywallVariant(variant);
    setPaywallOpen(true);
  };

  const handleOpenJustificativa = useCallback((texto: string) => {
    setJustificativaTexto(texto);
    setJustificativaModalOpen(true);
  }, []);

  const handleCloseJustificativa = useCallback(() => {
    setJustificativaModalOpen(false);
  }, []);

  const isSpecialEntry = (entry: DisplayTip): boolean => {
    const feature = getEntryFeature(entry);
    return feature === "alavancagem" || feature === "multiplas_bingo";
  };

  const renderEntryCard = (entry: DisplayTip, index: number, isExpiredSection: boolean = false) => {
    const isSpecial = isSpecialEntry(entry);
    const feat = getEntryFeature(entry);
    const displayTier = featureToDisplayTier(feat);
    const isLocked = entry.display_status === "locked";
    const isExpired = entry.display_status === "expired";
    const lockedLabel = isLocked ? getFeatureLabel(feat) : undefined;

    const team1 = {
      name: entry.team1_name || "Equipo 1",
      logo: entry.team1_logo_url || undefined,
      shirt: (!entry.team1_logo_url && entry.team1_shirt_variant) ? {
        variant: entry.team1_shirt_variant as "solid" | "stripes",
        primaryColor: entry.team1_primary_color || "#6B7280",
        secondaryColor: entry.team1_secondary_color || undefined,
      } : undefined,
    };
    const team2 = {
      name: entry.team2_name || "Equipo 2",
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
      ? formatDateTimeCL(entry.starts_at, 'HH:mm')
      : undefined;
    const expirationDate = entry.expires_at || undefined;
    const startsAt = entry.starts_at || undefined;


    return (
      <div
        key={entry.id}
        ref={isExpiredSection ? undefined : (el) => { activeCardRefs.current[index] = el; }}
        className={`flex-shrink-0 ${isLocked ? "cursor-pointer" : ""} ${isExpired ? "pointer-events-none" : ""}`}
        style={{ width: '82vw', minWidth: 280, maxWidth: 400, flexShrink: 0, scrollSnapAlign: 'start' as const }}
        onClick={isLocked ? () => handleLockedClick(entry) : undefined}
      >
        {isSpecial ? (
          <SpecialBettingCard
            tipId={0}
            type={getEntryFeature(entry) === "multiplas_bingo" ? "ODDS_ALTAS" : "ALAVANCAGEM"}
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
    );
  };

  return (
    <>
      <AppHeader
        onShowLifetimeInfoModal={() => setShowLifetimeInfoModal(true)}
        leftContent={
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(234,192,100,0.08)]" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: "#eac064" }} />
            </button>
            <img src="/images/Copa/Logo/header-logo.png" alt="Premier FC" className="h-10 sm:h-12 w-auto" onClick={() => navigate("/")} style={{ cursor: "pointer", filter: "drop-shadow(0 0 10px rgba(234, 192, 100,0.5))" }} />
            
          </div>
        }
      />

      <main className="w-full max-w-7xl mx-auto px-4 pt-2 pb-6 space-y-2 overflow-x-hidden">
        {/* Section header above feature tabs */}
        <button
          type="button"
          onClick={() => tabsScrollRef.current?.scrollBy({ left: tabsScrollRef.current.clientWidth * 0.8, behavior: 'smooth' })}
          className="relative flex items-center justify-center pt-4 pb-3 px-1 w-full cursor-pointer"
          aria-label="Ver más mercados"
        >
          <h2
            className="text-white font-bold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15 }}
          >
            Mercados disponibles
          </h2>
          <ChevronRight className="w-5 h-5 text-white/60 absolute right-1" />
        </button>
        {/* Feature Tabs */}
        <div className="relative">
        <div ref={tabsScrollRef} className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          {TAB_ORDER
            .map((f) => {
              const meta = TAB_META[f];
              const isActive = activeFeatureHighlight === f;
              const count = tipsByFeature[f]?.length || 0;
              const hasContent = count > 0;
              const tabColor = meta.color;
              const isPaidTab = f !== "free";
              const userHasAccess = f === "free" || userFeatures.has(f);

              const handleClick = () => {
                if (f === "free" && !hasContent) {
                  // Aba Cuota Gratis sem conteúdo: apenas seleciona (sem popup).
                  scrollToFeature(f);
                  return;
                }
                if (hasContent && userHasAccess) {
                  scrollToFeature(f);
                } else if (hasContent && !userHasAccess) {
                  const lockedEntry = tipsByFeature[f]?.find(t => t.display_status === "locked");
                  if (lockedEntry) handleLockedClick(lockedEntry);
                } else if (!hasContent && isPaidTab && !userHasAccess) {
                  const synthetic = { tier_required: "ultra", addon_required: null, feature_required: f, title: meta.label } as any;
                  handleLockedClick(synthetic);
                }
              };

              const baseStyle = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 24, whiteSpace: "nowrap" as const, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 };

              const style =
                (!hasContent && !isPaidTab)
                  ? { ...baseStyle, background: "transparent", border: "1.5px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }
                  : (!hasContent && isPaidTab)
                    ? { ...baseStyle, background: "transparent", border: "1.5px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", cursor: "pointer", opacity: 0.7 }
                  : isActive
                    ? { ...baseStyle, background: `${tabColor}26`, border: `1.5px solid ${tabColor}`, color: tabColor, cursor: "pointer" }
                    : !userHasAccess
                      ? { ...baseStyle, background: "transparent", border: "1.5px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", cursor: "pointer", opacity: 0.7 }
                      : { ...baseStyle, background: "transparent", border: "1.5px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", cursor: "pointer" };

              return (
                <button key={f} onClick={handleClick} style={style}>
                  <span>{meta.label}</span>
                  {((hasContent && !userHasAccess) || (!hasContent && isPaidTab && !userHasAccess)) && <Lock className="w-3 h-3" style={{ opacity: 0.7 }} />}
                  {hasContent && <span style={{ fontSize: 13, opacity: 0.7 }}>({count})</span>}
                </button>
              );
            })}
        </div>
        {/* Right-edge fade hint indicating horizontal scroll */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-10" style={{ background: "linear-gradient(to left, #060D1E, rgba(6,13,30,0))" }} />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Cargando tips...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchTips} variant="outline" size="sm">Inténtalo de nuevo</Button>
          </div>
        )}

        {!isLoading && !error && activeEntries.length > 0 && (
          <section className="relative w-full">
            <div 
              ref={activeCarouselRef}
              className="w-full select-none"
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 12,
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                scrollBehavior: "smooth",
                paddingLeft: 16,
                paddingRight: 16,
                paddingBottom: 4,
                paddingTop: 4,
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {activeEntries.map((entry, index) => renderEntryCard(entry, index, false))}
            </div>

            {/* Dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6 }}>
              {activeEntries.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: activeCardIndex === i ? 16 : 4,
                    height: 4,
                    borderRadius: 2,
                    background: activeCardIndex === i ? (activeFeatureHighlight ? TAB_META[activeFeatureHighlight].color : "#60A5FA") : "rgba(255,255,255,0.2)",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
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
                Los tips de hoy expiraron.
              </p>
              <p className="text-lg font-bold mb-2" style={{ color: "#eac064" }}>
                Amanhã teremos novas entradas!
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Próximos tips en</p>
              <span
                className="text-3xl font-mono font-bold tabular-nums"
                style={{ color: "#FFFFFF", textShadow: "0 0 14px rgba(234, 192, 100,0.4)" }}
              >
                {timerString}
              </span>
            </div>
          </div>
        )}

      </main>

      <JustificativaModal isOpen={justificativaModalOpen} onClose={handleCloseJustificativa} texto={justificativaTexto} />
      <PaywallPopup
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        variant={paywallVariant}
        feature={paywallFeature}
      />
      {/* Modal Info Vitalício */}
      {showLifetimeInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLifetimeInfoModal(false)}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(234, 192, 100,0.25)", boxShadow: "0 0 40px rgba(234, 192, 100,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(234, 192, 100,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(234, 192, 100,0.1)", border: "1px solid rgba(234, 192, 100,0.3)" }}>
                  <Crown className="w-5 h-5" style={{ color: "#eac064" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>¡Felicitaciones! 🎉</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>Miembro Vitalicio</p>
                </div>
              </div>
              <button onClick={() => setShowLifetimeInfoModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(234,192,100,0.08)]">
                <X className="w-5 h-5" style={{ color: "#eac064" }} />
              </button>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
                Você tem <span style={{ color: "#eac064", fontWeight: 600 }}>acesso vitalício e ilimitado</span> a todas as funcionalidades e futuras atualizações do Premier Ultra. Aproveite!
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowLifetimeInfoModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(234, 192, 100,0.08)", border: "1px solid rgba(234, 192, 100,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>

  );
};

export default Sport;
