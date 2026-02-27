import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import { FunnelPopup, FunnelPopupData } from "@/components/FunnelPopup";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";

interface HousePopupData {
  popup_welcome_image?: string | null;
  popup_welcome_link?: string | null;
  [key: string]: any;
}

async function getUserId(): Promise<string | null> {
  const mockUser = mockGetUser();
  if (!mockUser?.email) return null;
  if (mockUser.dbId) return mockUser.dbId;
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", mockUser.email.toLowerCase().trim())
    .maybeSingle();
  return data?.id || null;
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
 * AutoPopup — unified component for ALL on_load popups.
 * Fetches all active on_load popups, finds the first one
 * the user hasn't seen yet, and displays it.
 * Tracks views in user_popup_views (DB), not localStorage.
 */
export function WelcomePopup({ house }: { house: HousePopupData | null }) {
  const [open, setOpen] = useState(false);
  const [popupData, setPopupData] = useState<FunnelPopupData | null>(null);
  const [currentPopupId, setCurrentPopupId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

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
    const fetchFirstUnseenPopup = async () => {
      const userId = await getUserId();
      if (!userId) return;
      setCurrentUserId(userId);

      // Fetch ALL active on_load popups, ordered by newest first
      const { data: popups } = await supabase
        .from("popups")
        .select("id, type, image_url, button_url, checkout_link, question_1_text, question_1_options, question_2_text, question_2_options, question_3_text, question_3_options, final_title, final_benefits")
        .eq("is_active", true)
        .eq("trigger_type", "on_load")
        .order("created_at", { ascending: false });

      if (!popups || popups.length === 0) return;

      // Find the FIRST popup this user hasn't seen yet
      for (const popup of popups) {
        if (!popup.image_url) continue;
        const alreadyViewed = await hasViewedPopup(userId, popup.id);
        if (!alreadyViewed) {
          setCurrentPopupId(popup.id);
          setPopupData(popup as unknown as FunnelPopupData);
          setOpen(true);
          return; // Show only ONE popup
        }
      }
    };

    fetchFirstUnseenPopup();
  }, [house]);

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
