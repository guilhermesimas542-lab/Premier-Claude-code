import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Send } from "lucide-react";
import { TELEGRAM_URL_PLACEHOLDER } from "@/lib/paywallRouting";

interface Props {
  open: boolean;
  onClose: () => void;
  telegramUrl?: string | null;
}

export function TelegramRedeemModal({ open, onClose, telegramUrl }: Props) {
  const url = telegramUrl || TELEGRAM_URL_PLACEHOLDER;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#112236] border-[#0088cc]/30 text-white max-w-sm p-6 rounded-2xl [&>button]:hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-white/10"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4 pt-2">
          <h2
            className="text-2xl font-bold leading-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Reclama tu cuota gratis hoy
          </h2>
          <p className="text-sm text-white/70">
            Haz clic en el botón de abajo y asegura el acceso a las mejores cuotas del día directo en nuestro grupo de Telegram
          </p>

          <button
            onClick={() => {
              window.open(url, "_blank", "noopener,noreferrer");
              onClose();
            }}
            className="w-full inline-flex items-center justify-center gap-2 font-bold text-base py-4 rounded-xl transition-all hover:scale-[1.02]"
            style={{
              background: "#0088cc",
              color: "#FFFFFF",
              boxShadow: "0 0 18px rgba(0,136,204,0.4)",
            }}
          >
            <Send className="w-5 h-5" />
            Reclamar Cuota Gratis
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
