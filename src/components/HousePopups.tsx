import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HousePopupData {
  popup_welcome_image?: string | null;
  popup_welcome_link?: string | null;
  [key: string]: any;
}

export function WelcomePopup({ house }: { house: HousePopupData | null }) {
  const [open, setOpen] = useState(false);
  const [welcomeImage, setWelcomeImage] = useState<string | null>(null);
  const [welcomeLink, setWelcomeLink] = useState<string | null>(null);

  useEffect(() => {
    // Fallback: fetch active welcome popup from popups table
    const fetchWelcomePopup = async () => {
      // If house has welcome popup configured, use house popup ID as key
      if (house?.popup_welcome_image) {
        const houseKey = `popup_shown_house_welcome`;
        if (localStorage.getItem(houseKey)) return;
        setWelcomeImage(house.popup_welcome_image);
        setWelcomeLink(house.popup_welcome_link || null);
        setOpen(true);
        localStorage.setItem(houseKey, "true");
        return;
      }

      const { data } = await supabase
        .from("popups")
        .select("id, image_url, button_url, checkout_link")
        .eq("type", "welcome")
        .eq("is_active", true)
        .eq("trigger_type", "on_load")
        .limit(1)
        .maybeSingle();

      if (data?.image_url) {
        const key = `popup_shown_${data.id}`;
        if (localStorage.getItem(key)) return;
        setWelcomeImage(data.image_url);
        setWelcomeLink(data.button_url || data.checkout_link || null);
        setOpen(true);
        localStorage.setItem(key, "true");
      }
    };

    fetchWelcomePopup();
  }, [house]);

  if (!welcomeImage) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 border-0 bg-transparent max-w-sm overflow-hidden">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-2 right-2 z-10 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <a
          href={welcomeLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
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
