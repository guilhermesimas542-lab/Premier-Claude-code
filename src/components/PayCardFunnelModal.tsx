import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";
import QuizStep from "@/components/funnel/QuizStep";
import { ChevronRight, X, Check } from "lucide-react";
import type { PayCardData } from "@/hooks/usePayCards";
import { trackEvent } from "@/lib/events";
import { trackFunnel } from "@/lib/funnelTracker";

interface Props {
  payCard: PayCardData;
  open: boolean;
  onClose: () => void;
}

type Step = "intro" | "quiz" | "checkout";

export function PayCardFunnelModal({ payCard, open, onClose }: Props) {
  const hasIntro = payCard.has_intro_popup && payCard.popup_config?.image_url;
  const questions = Array.isArray(payCard.quiz_questions) ? payCard.quiz_questions.filter((q: any) => q.text) : [];
  const hasQuiz = questions.length > 0;
  const checkout = payCard.checkout_config;
  const checkoutUrl = checkout?.checkout_url;
  const checkoutUrl2 = checkout?.checkout_url_2;
  const label1 = checkout?.checkout_label_1 || "Assinar Agora";
  const label2 = checkout?.checkout_label_2 || "Comprar Pacote Completo";
  const hasDualCheckout = !!checkoutUrl && !!checkoutUrl2;
  const houseId = payCard.betting_house_id ?? undefined;

  const getInitialStep = (): Step => {
    if (hasIntro) return "intro";
    if (hasQuiz) return "quiz";
    return "checkout";
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [quizIndex, setQuizIndex] = useState(0);
  const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Legacy events (keep for backward compat)
      trackEvent("funnel_entry", { funnel_name: payCard.name, plan: payCard.associated_plan });
      trackEvent("funnel_view", { funnel_name: payCard.name, plan: payCard.associated_plan });
      // New funnel analytics
      trackFunnel({ entityType: 'paycard', entityId: payCard.id, eventType: 'view', houseId });
    }
  }, [open]);

  // Track final_view when reaching checkout step
  useEffect(() => {
    if (step === "checkout") {
      trackFunnel({ entityType: 'paycard', entityId: payCard.id, eventType: 'final_view', houseId });
    }
  }, [step]);

  if (!open) return null;

  if (embeddedUrl) {
    return <EmbeddedCheckout open={true} onClose={onClose} url={embeddedUrl} />;
  }

  const handleClose = () => {
    trackFunnel({ entityType: 'paycard', entityId: payCard.id, eventType: 'exit', houseId });
    onClose();
  };

  const advanceFromIntro = () => {
    if (hasQuiz) { setStep("quiz"); }
    else { setStep("checkout"); }
  };

  const advanceFromQuiz = (option: string) => {
    trackFunnel({
      entityType: 'paycard',
      entityId: payCard.id,
      eventType: 'step',
      stepIndex: quizIndex,
      stepOption: option,
      houseId,
    });
    if (quizIndex < questions.length - 1) {
      setQuizIndex(i => i + 1);
    } else {
      setStep("checkout");
    }
  };

  const goToCheckout = (url: string) => {
    // Legacy event
    trackEvent("click_buy_from_popup", {
      funnel_name: payCard.name,
      plan: payCard.associated_plan,
    });
    // New funnel analytics
    trackFunnel({ entityType: 'paycard', entityId: payCard.id, eventType: 'checkout_click', houseId });
    setEmbeddedUrl(url);
  };

  const popup = payCard.popup_config;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-white/10 text-white max-w-md p-0 overflow-hidden">
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {step === "intro" && popup && (
          <div className="flex flex-col items-center">
            {popup.image_url && (
              <img
                src={popup.image_url}
                alt="Intro"
                className="w-full max-h-60 object-cover cursor-pointer"
                onClick={advanceFromIntro}
              />
            )}
            <div className="p-6 text-center space-y-3">
              {popup.title && <h3 className="text-lg font-bold">{popup.title}</h3>}
              {popup.text && <p className="text-sm text-gray-300">{popup.text}</p>}
              <Button onClick={advanceFromIntro} className="w-full mt-2">
                {popup.cta_text || "Continuar"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "quiz" && questions.length > 0 && (
          <div className="p-6">
            <div className="flex gap-1 mb-4">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= quizIndex ? "bg-primary" : "bg-white/10"}`}
                />
              ))}
            </div>
            <QuizStep
              currentStep={quizIndex + 1}
              totalSteps={questions.length}
              questionText={questions[quizIndex].text}
              options={questions[quizIndex].options}
              onAnswer={advanceFromQuiz}
            />
          </div>
        )}

        {step === "checkout" && (
          <div className="p-6 text-center space-y-4">
            {checkout?.title && <h3 className="text-lg font-bold">{checkout.title}</h3>}
            {checkout?.benefits && checkout.benefits.length > 0 && (
              <ul className="text-left space-y-2">
                {checkout.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {hasDualCheckout ? (
              <div className="space-y-3">
                <Button onClick={() => goToCheckout(checkoutUrl!)} className="w-full" size="lg">
                  {label1} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button onClick={() => goToCheckout(checkoutUrl2!)} className="w-full" size="lg" variant="outline">
                  {label2} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : checkoutUrl ? (
              <Button onClick={() => goToCheckout(checkoutUrl)} className="w-full" size="lg">
                {label1} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
