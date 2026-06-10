import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import type { CrmPopupContent } from "@/hooks/useCrmPopupQueue";

interface CrmPopupModalProps {
  content: CrmPopupContent;
  onClose: () => void;
  onCtaClick?: (url: string) => void;
}

export function CrmPopupModal({ content, onClose, onCtaClick }: CrmPopupModalProps) {
  const [imageOk, setImageOk] = useState(true);

  const ctaUrl = content?.cta?.url ?? content?.link_url ?? null;
  const ctaText = content?.cta?.text ?? (ctaUrl ? "Acessar" : null);
  const title = (content?.title ?? "").toString().trim();
  const body = (content?.body ?? "").toString().trim();

  const handleCta = () => {
    if (!ctaUrl) return;
    onCtaClick?.(ctaUrl);
    window.open(ctaUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 overflow-hidden max-w-[calc(100vw-2rem)] sm:max-w-md [&>button]:hidden"
        style={{
          background: "#112236",
          border: "1px solid #00FF7F",
          borderRadius: "16px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.6), 0 0 24px rgba(0,255,127,0.15)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full p-1.5 transition-colors bg-black/60 border border-white/10 hover:bg-black/80"
        >
          <X className="w-3.5 h-3.5 text-white/80" />
        </button>

        {content?.image_url && imageOk && (
          <img
            src={content.image_url}
            alt=""
            onError={() => setImageOk(false)}
            className="w-full h-auto object-cover"
          />
        )}

        <div className="p-5 space-y-3">
          {title && (
            <h2
              className="text-2xl font-bold leading-tight text-white"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.5px" }}
            >
              {title}
            </h2>
          )}
          {body && (
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
              {body}
            </p>
          )}
          {!title && !body && (
            <p className="text-sm text-white/80">Você tem uma novidade no Premier.</p>
          )}

          {ctaUrl && ctaText && (
            <button
              onClick={handleCta}
              className="block w-full py-3.5 text-center font-bold rounded-xl text-sm tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "#00FF7F",
                color: "#060D1E",
                boxShadow: "0 0 20px rgba(0,255,127,0.4)",
              }}
            >
              {ctaText}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
