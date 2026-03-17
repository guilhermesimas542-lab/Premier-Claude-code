import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import { FunnelPopup, FunnelPopupData } from "@/components/FunnelPopup";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";
import { POPUP_PRIORITY } from "@/admin/components/funnel-popup/types";
import { trackFunnel } from "@/lib/funnelTracker";

interface HousePopupData {
  popup_welcome_image?: string | null;
  popup_welcome_link?: string | null;
  [key: string]: any;
}

async function getUserWithTier(): Promise<{
  id: string;
  mainTier: string;
  houseId: string | null;
  addons: string[];
} | null> {
  const mockUser = mockGetUser();
  if (!mockUser?.email) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("id, main_tier, betting_house_id")
    .eq("email", mockUser.email.toLowerCase().trim())
    .maybeSingle();

  if (!userData) return null;

  // Fetch active addons
  const { data: ents } = await supabase
    .from("entitlements")
    .select("product_key")
    .eq("user_id", userData.id)
    .eq("status", "active");

  const addons = (ents || []).map((e) => e.product_key);

  return {
    id: userData.id,
    mainTier: userData.main_tier || "free",
    houseId: userData.betting_house_id || null,
    addons,
  };
}

async function hasViewedPopup(userId: string, popupId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_popup_views" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("popup_id", popupId)
    .maybeSingle();
  return !!data;
}

async function markPopupViewed(userId: string, popupId: string) {
  try {
    await supabase.from("user_popup_views" as any).insert({
      user_id: userId,
      popup_id: popupId,
    });
  } catch {
    // UNIQUE constraint — already tracked
  }
}

/**
 * Checks if a user is eligible for a given popup type based on their tier and addons.
 */
function isEligibleForType(
  type: string,
  tier: string,
  addons: string[]
): boolean {
  switch (type) {
    case "welcome_free":
      return tier === "free";
    case "welcome_paid":
      return tier !== "free";
    case "upgrade_basic":
      return tier === "free";
    case "upgrade_pro":
      return tier === "free" || tier === "basic";
    case "upgrade_ultra":
      return tier !== "ultra";
    case "addon_alavancagem":
      return !addons.includes("alavancagem");
    case "addon_odds":
      return !addons.includes("desaltas");
    case "addon_telegram":
      return !addons.includes("live_telegram");
    case "promotional":
      return true;
    case "casino_welcome":
      return true; // Any user visiting /cassino for the first time
    // Legacy "welcome" type — treat as welcome_free
    case "welcome":
      return tier === "free";
    default:
      return true;
  }
}

/**
 * AutoPopup — unified component for ALL on_load popups.
 * Fetches all active on_load popups, filters by user eligibility,
 * sorts by priority, and shows the first unseen one per session.
 */
export function WelcomePopup({ house }: { house: HousePopupData | null }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [popupData, setPopupData] = useState<FunnelPopupData | null>(null);
  const [currentPopupId, setCurrentPopupId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [lastLoginEvent, setLastLoginEvent] = useState(0);
  const sessionShownRoutesRef = useRef<Set<string>>(new Set());

  // Listen for login events to re-trigger popup check
  useEffect(() => {
    const handleLogin = () => {
      console.log('[WelcomePopup] Evento premier:login detectado. Re-verificando pop-ups.');
      sessionShownRoutesRef.current.clear();
      setLastLoginEvent(Date.now());
    };
    window.addEventListener('premier:login', handleLogin);
    return () => window.removeEventListener('premier:login', handleLogin);
  }, []);

  const hasQuiz = popupData && [
    popupData.question_1_text,
    popupData.question_2_text,
    popupData.question_3_text,
  ].some((q) => !!q);

  const handleClose = useCallback(async () => {
    setOpen(false);
    if (currentUserId && currentPopupId) {
      await markPopupViewed(currentUserId, currentPopupId);
    }
  }, [currentUserId, currentPopupId]);

  useEffect(() => {
    if (sessionShownRoutesRef.current.has(location.pathname)) return;

    console.log('[WelcomePopup] Iniciando verificação de pop-up...');

    const fetchPriorityPopup = async () => {
      const user = await getUserWithTier();
      console.log('[WelcomePopup] Usuário encontrado:', user);
      if (!user) return;
      setCurrentUserId(user.id);

      // Fetch ALL active on_load popups
      const { data: popups, error } = await supabase
        .from("popups")
        .select("id, type, image_url, button_url, checkout_link, checkout_link_2, question_1_text, question_1_options, question_2_text, question_2_options, question_3_text, question_3_options, final_title, final_benefits, target_audience, betting_house_id, final_template, final_config, button_color")
        .eq("is_active", true)
        .eq("trigger_type", "on_load")
        .order("created_at", { ascending: false });

      console.log('[WelcomePopup] Pop-ups encontrados no banco:', popups, 'Erro:', error);

      if (!popups || popups.length === 0) {
        console.log('[WelcomePopup] Nenhum pop-up on_load ativo encontrado.');
        return;
      }

      // Filter by user eligibility (tier + addons + audience + route)
      const eligible = popups.filter((p: any) => {
        // Route-based filtering
        if (p.type === "casino_welcome" && location.pathname !== "/cassino") return false;
        if (p.type !== "casino_welcome" && location.pathname !== "/") return false;

        const audience = p.target_audience || "all";
        if (audience !== "all" && audience !== user.mainTier) return false;
        if (p.betting_house_id && p.betting_house_id !== user.houseId) return false;
        return isEligibleForType(p.type, user.mainTier, user.addons);
      });

      console.log('[WelcomePopup] Pop-ups elegíveis após filtro:', eligible.length, eligible.map((p: any) => ({ id: p.id, type: p.type })));

      if (eligible.length === 0) {
        console.log('[WelcomePopup] Nenhum pop-up elegível para este usuário.');
        return;
      }

      // Sort by priority
      eligible.sort((a: any, b: any) => {
        const aPri = POPUP_PRIORITY.indexOf(a.type);
        const bPri = POPUP_PRIORITY.indexOf(b.type);
        const aIdx = aPri === -1 ? 999 : aPri;
        const bIdx = bPri === -1 ? 999 : bPri;
        return aIdx - bIdx;
      });

      // Find the first popup the user hasn't seen yet
      for (const popup of eligible) {
        console.log(`[WelcomePopup] Verificando pop-up: ${popup.id} (${popup.type}), image_url: ${popup.image_url ? 'sim' : 'não'}`);
        const alreadyViewed = await hasViewedPopup(user.id, popup.id);
        console.log(`[WelcomePopup] Usuário já viu este pop-up? ${alreadyViewed}`);
        if (!alreadyViewed) {
          sessionShownRoutesRef.current.add(location.pathname);
          setCurrentPopupId(popup.id);
          setPopupData(popup as unknown as FunnelPopupData);
          setOpen(true);
          console.log(`[WelcomePopup] Exibindo pop-up: ${popup.id} (${popup.type})`);
          return;
        }
      }

      console.log('[WelcomePopup] Nenhum pop-up elegível foi exibido nesta sessão (todos já vistos).');
    };

    fetchPriorityPopup();
  }, [house, lastLoginEvent, location.pathname]);

  if (!popupData || !open) return null;

  // If has quiz → delegate to FunnelPopup
  if (hasQuiz) {
    return (
      <FunnelPopup
        popup={popupData}
        onClose={handleClose}
      />
    );
  }

  // No quiz: simple image popup with embedded checkout on click
  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="p-0 border-0 bg-transparent max-w-sm overflow-hidden">
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const link = popupData.button_url || popupData.checkout_link;
              if (link) {
                handleClose();
                setCheckoutUrl(link);
              }
            }}
            className="w-full cursor-pointer focus:outline-none"
          >
            <img src={popupData.image_url!} alt="Popup" className="w-full rounded-xl" />
          </button>
        </DialogContent>
      </Dialog>

      {checkoutUrl && (
        <EmbeddedCheckout
          open={!!checkoutUrl}
          onClose={() => setCheckoutUrl(null)}
          url={checkoutUrl}
        />
      )}
    </>
  );
}

export function UpgradePopup({
  open, onClose, image, link,
}: { open: boolean; onClose: () => void; image: string | null; link: string | null }) {
  if (!image) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 border-0 bg-transparent max-w-sm overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <a href={link || "#"} target="_blank" rel="noopener noreferrer" onClick={onClose}>
          <img src={image} alt="Upgrade" className="w-full rounded-xl" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
