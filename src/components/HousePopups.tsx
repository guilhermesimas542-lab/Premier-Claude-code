import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

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
  await supabase.from("user_popup_views" as any).insert({
    user_id: userId,
    popup_id: popupId,
  });
}

export function WelcomePopup({ house }: { house: HousePopupData | null }) {
  const [open, setOpen] = useState(false);
  const [welcomeImage, setWelcomeImage] = useState<string | null>(null);
  const [welcomeLink, setWelcomeLink] = useState<string | null>(null);
  const [currentPopupId, setCurrentPopupId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const handleClose = useCallback(async () => {
    setOpen(false);
    // Registra visualização ao fechar
    if (currentUserId && currentPopupId) {
      await markPopupViewed(currentUserId, currentPopupId);
    }
  }, [currentUserId, currentPopupId]);

  useEffect(() => {
    const fetchWelcomePopup = async () => {
      const userId = await getUserId();
      if (!userId) return;
      setCurrentUserId(userId);

      // Buscar popup welcome ativo do banco
      const { data } = await supabase
        .from("popups")
        .select("id, image_url, button_url, checkout_link")
        .eq("type", "welcome")
        .eq("is_active", true)
        .eq("trigger_type", "on_load")
        .limit(1)
        .maybeSingle();

      if (data?.image_url) {
        const alreadyViewed = await hasViewedPopup(userId, data.id);
        if (alreadyViewed) return;
        setCurrentPopupId(data.id);
        setWelcomeImage(data.image_url);
        setWelcomeLink(data.button_url || data.checkout_link || null);
        setOpen(true);
      }
    };

    fetchWelcomePopup();
  }, [house]);

  if (!welcomeImage) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="p-0 border-0 bg-transparent max-w-sm overflow-hidden">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <a
          href={welcomeLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClose}
        >
          <img src={welcomeImage} alt="Bem-vindo" className="w-full rounded-xl" />
        </a>
      </DialogContent>
    </Dialog>
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
