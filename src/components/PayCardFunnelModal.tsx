import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";
import QuizStep from "@/components/funnel/QuizStep";
import { ChevronRight, X, Check } from "lucide-react";
import type { PayCardData } from "@/hooks/usePayCards";

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
  const checkoutUrl = payCard.checkout_config?.checkout_url;

  const getInitialStep = (): Step => {
    if (hasIntro) return "intro";
    if (hasQuiz) return "quiz";
    return "checkout";
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [quizIndex, setQuizIndex] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);

  if (!open) return null;

  // If we reached checkout, show embedded checkout
  if (showCheckout && checkoutUrl) {
    return <EmbeddedCheckout open={true} onClose={onClose} url={checkoutUrl} />;
  }

  const advanceFromIntro = () => {
    if (hasQuiz) { setStep("quiz"); }
    else { setShowCheckout(true); }
  };

  const advanceFromQuiz = () => {
    if (quizIndex < questions.length - 1) {
      setQuizIndex(i => i + 1);
    } else {
      // Quiz done → show final offer or checkout
      setStep("checkout");
    }
  };

  const goToCheckout = () => {
    setShowCheckout(true);
  };

  const popup = payCard.popup_config;
  const checkout = payCard.checkout_config;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-white/10 text-white max-w-md p-0 overflow-hidden">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 z-10 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {/* INTRO STEP */}
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

        {/* QUIZ STEP */}
        {step === "quiz" && questions.length > 0 && (
          <div className="p-6">
            {/* Progress */}
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

        {/* CHECKOUT/OFFER STEP */}
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
            <Button onClick={goToCheckout} className="w-full" size="lg">
              Assinar Agora <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
