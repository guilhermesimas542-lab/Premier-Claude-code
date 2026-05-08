import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronRight } from "lucide-react";

interface FunnelStep {
  id: string;
  step_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
}

interface SalesFunnelProps {
  open: boolean;
  onClose: () => void;
  steps: FunnelStep[];
  checkoutUrl: string | null;
  cardTitle: string;
}

export function SalesFunnel({ open, onClose, steps, checkoutUrl, cardTitle }: SalesFunnelProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoaded, setCheckoutLoaded] = useState(false);

  const isLastStep = currentStep >= steps.length - 1;

  const handleOptionClick = () => {
    if (isLastStep) {
      if (checkoutUrl) {
        setShowCheckout(true);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setShowCheckout(false);
    setCheckoutLoaded(false);
    onClose();
  };

  const step = steps[currentStep];
  const options = step
    ? [step.option_a, step.option_b, step.option_c, step.option_d].filter(Boolean) as string[]
    : [];

  // Fallback: open in new tab after 8 seconds
  const handleCheckoutLoad = () => setCheckoutLoaded(true);

  if (showCheckout && checkoutUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-foreground">{cardTitle}</span>
          <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Iframe */}
        <div className="flex-1 relative">
          {!checkoutLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-full max-w-sm space-y-3 px-6">
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse w-2/3 mx-auto" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">Cargando checkout...</p>
            </div>
          )}
          <iframe
            src={checkoutUrl}
            className="w-full h-full"
            onLoad={handleCheckoutLoad}
            title="Checkout"
            allow="payment"
          />
        </div>

        {/* Footer with fallback */}
        <div className="h-10 flex items-center justify-center border-t border-border shrink-0">
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            ¿Problemas? Abrir en nueva pestaña ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="p-0 border-0 bg-transparent max-w-sm overflow-hidden [&>button]:hidden">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 bg-background/60 rounded-full p-1.5 text-foreground hover:bg-background/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Progress */}
          <div className="flex gap-1 p-3 pb-0">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Question */}
          {step && (
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">
                Pregunta {currentStep + 1} de {steps.length}
              </p>
              <h3 className="text-lg font-bold text-foreground leading-tight">
                {step.question}
              </h3>

              <div className="space-y-2">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={handleOptionClick}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/40 transition-colors text-sm text-foreground flex items-center justify-between group"
                  >
                    <span>{opt}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
