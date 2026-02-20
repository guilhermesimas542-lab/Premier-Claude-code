import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface HousePopupData {
  popup_welcome_image?: string | null;
  popup_welcome_link?: string | null;
  [key: string]: any;
}

export function WelcomePopup({ house }: { house: HousePopupData | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!house?.popup_welcome_image) return;
    const key = "welcome_popup_shown";
    if (!localStorage.getItem(key)) {
      setOpen(true);
      localStorage.setItem(key, "true");
    }
  }, [house]);

  if (!house?.popup_welcome_image) return null;

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
          href={house.popup_welcome_link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          <img src={house.popup_welcome_image} alt="Bem-vindo" className="w-full rounded-xl" />
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
