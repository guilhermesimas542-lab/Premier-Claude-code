import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface MarketingPopupProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  title?: string | null;
  subtitle?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
}

export function MarketingPopup({
  open,
  onClose,
  imageUrl,
  title,
  subtitle,
  buttonText,
  buttonUrl,
}: MarketingPopupProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 border-0 overflow-hidden w-full max-w-[380px] sm:max-w-[420px] bg-transparent animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full p-1.5 bg-background/60 hover:bg-background/80 text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Full-bleed image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title ?? ""}
            className="w-full object-cover"
            style={{ maxHeight: "280px" }}
          />
        )}

        {/* Content */}
        {(title || subtitle || buttonText) && (
          <div className="p-5 space-y-3 bg-card">
            {title && (
              <h3 className="text-lg font-bold text-foreground leading-tight text-center">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground text-center">
                {subtitle}
              </p>
            )}
            {buttonText && buttonUrl && (
              <a
                href={buttonUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="block w-full py-3 text-center font-bold text-primary-foreground rounded-xl text-sm tracking-wide bg-primary hover:bg-primary/90 transition-colors"
              >
                {buttonText}
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
