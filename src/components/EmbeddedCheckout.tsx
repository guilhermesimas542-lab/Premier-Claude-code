import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EmbeddedCheckoutProps {
  open: boolean;
  onClose: () => void;
  url: string;
}

export function EmbeddedCheckout({ open, onClose, url }: EmbeddedCheckoutProps) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      if (!loaded) setTimedOut(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [open, loaded]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 border border-border/30 overflow-hidden w-[95vw] max-w-2xl h-[90vh] flex flex-col bg-background"
        style={{ borderRadius: "16px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
          <h3 className="text-sm font-semibold text-foreground">Finalizar Compra</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors hover:bg-muted"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative min-h-0">
          {!loaded && !timedOut && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <Skeleton className="w-full h-8" />
              <Skeleton className="w-3/4 h-6" />
              <Skeleton className="w-full h-40" />
              <Skeleton className="w-1/2 h-10" />
              <p className="text-xs text-muted-foreground mt-2">Carregando checkout...</p>
            </div>
          )}

          {timedOut && !loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                O checkout está demorando para carregar.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir em nova aba
              </a>
            </div>
          )}

          <iframe
            src={url}
            title="Checkout"
            className="w-full h-full"
            style={{ opacity: loaded ? 1 : 0 }}
            onLoad={() => setLoaded(true)}
            allow="payment"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
