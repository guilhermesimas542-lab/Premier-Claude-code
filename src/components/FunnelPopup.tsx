import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import QuizStep from "@/components/funnel/QuizStep";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";
import { trackFunnel } from "@/lib/funnelTracker";
import { renderFinalTemplate, type FinalTemplateType, type FinalConfig } from "@/components/funnel/FinalTemplates";

export interface FunnelPopupData {
  id: string;
  type: string;
  image_url: string | null;
  button_url: string | null;
  question_1_text: string | null;
  question_1_options: string[] | null;
  question_2_text: string | null;
  question_2_options: string[] | null;
  question_3_text: string | null;
  question_3_options: string[] | null;
  final_title: string | null;
  final_benefits: string[] | null;
  checkout_link: string | null;
  checkout_link_2?: string | null;
  betting_house_id?: string | null;
  final_template?: string | null;
  final_config?: Record<string, any> | null;
  button_color?: string | null;
}

interface FunnelPopupProps {
  popup: FunnelPopupData;
  onClose: () => void;
}

export function FunnelPopup({ popup, onClose }: FunnelPopupProps) {
  const questions = [
    { text: popup.question_1_text, options: popup.question_1_options ?? [] },
    { text: popup.question_2_text, options: popup.question_2_options ?? [] },
    { text: popup.question_3_text, options: popup.question_3_options ?? [] },
  ].filter((q) => q.text && q.options.length > 0);

  const hasFunnel = questions.length > 0;
  const hasImage = !!popup.image_url;
  const [step, setStep] = useState(0);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const firstQuestionStep = hasImage ? 1 : 0;
  const finalStep = firstQuestionStep + questions.length;

  const isOnImage = hasImage && step === 0;
  const isOnQuestion = step >= firstQuestionStep && step < finalStep;
  const isOnFinal = step >= finalStep;
  const currentQuestionIndex = step - firstQuestionStep;

  const benefits = popup.final_benefits ?? [];
  const houseId = popup.betting_house_id ?? undefined;
  const buttonColor = (popup as any).button_color || null;

  useEffect(() => {
    trackFunnel({ entityType: 'popup', entityId: popup.id, eventType: 'view', houseId });
  }, []);

  useEffect(() => {
    if (isOnFinal) {
      trackFunnel({ entityType: 'popup', entityId: popup.id, eventType: 'final_view', houseId });
    }
  }, [isOnFinal]);

  const handleClose = () => {
    trackFunnel({ entityType: 'popup', entityId: popup.id, eventType: 'exit', houseId });
    onClose();
  };

  const handleImageClick = () => {
    if (popup.type === "casino_welcome" || popup.type === "welcome_paid") {
      handleClose();
      return;
    }
    if (hasFunnel) {
      setStep(firstQuestionStep);
    } else if (popup.button_url || popup.checkout_link) {
      setCheckoutUrl(popup.button_url || popup.checkout_link!);
    }
  };

  const handleCheckout = (url: string) => {
    trackFunnel({ entityType: 'popup', entityId: popup.id, eventType: 'checkout_click', houseId });
    setCheckoutUrl(url);
  };

  const handleQuizAnswer = (option: string) => {
    trackFunnel({
      entityType: 'popup',
      entityId: popup.id,
      eventType: 'step',
      stepIndex: currentQuestionIndex,
      stepOption: option,
      houseId,
    });
    setStep((s) => s + 1);
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && handleClose()}>
        <DialogContent
          className="p-0 border border-white/10 overflow-hidden max-w-[calc(100vw-2rem)] sm:max-w-md"
          style={{
            background: "linear-gradient(180deg, hsl(0,0%,8%), hsl(0,0%,4%))",
            borderRadius: "20px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
            cursor: popup.type === "casino_welcome" ? "pointer" : undefined,
          }}
          onClick={popup.type === "casino_welcome" ? handleClose : undefined}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-20 rounded-full p-1.5 transition-colors bg-black/60 border border-white/10 hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>

          {isOnImage && popup.image_url && (
            <button
              onClick={handleImageClick}
              className="w-full cursor-pointer focus:outline-none group"
            >
              <img
                src={popup.image_url}
                alt=""
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
          )}

          {isOnQuestion && questions[currentQuestionIndex] && (
            <QuizStep
              questionText={questions[currentQuestionIndex].text!}
              options={questions[currentQuestionIndex].options}
              currentStep={currentQuestionIndex + 1}
              totalSteps={questions.length}
              onAnswer={handleQuizAnswer}
              buttonColor={buttonColor}
            />
          )}

          {isOnFinal && (() => {
            const template = (popup.final_template || "default") as FinalTemplateType;
            const config = (popup.final_config || {}) as FinalConfig;

            if (template !== "default") {
              return renderFinalTemplate(template, {
                title: popup.final_title || "Perfeito para você!",
                benefits,
                checkoutLink: popup.checkout_link,
                checkoutLink2: popup.checkout_link_2 || null,
                onCheckout: (url) => handleCheckout(url),
                onClose: handleClose,
                config,
                buttonColor,
              });
            }

            // Default template
            return (
              <div className="p-5 space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-primary/15 border border-primary/30">
                    <Check className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground leading-snug">
                    {popup.final_title || "Perfeito para você!"}
                  </h2>
                </div>

                {benefits.length > 0 && (
                  <ul className="space-y-2.5">
                    {benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                        <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-primary/15">
                          <Check className="w-3 h-3 text-primary" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                {popup.checkout_link && (
                  <button
                    onClick={() => handleCheckout(popup.checkout_link!)}
                    className="block w-full py-4 text-center font-bold text-primary-foreground rounded-xl text-sm tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98] animate-[cta-pulse_2s_ease-in-out_infinite]"
                    style={{
                      backgroundColor: buttonColor || "hsl(var(--primary))",
                      boxShadow: `0 0 20px ${buttonColor ? buttonColor + "4d" : "hsl(var(--primary) / 0.3)"}`,
                    }}
                  >
                    QUERO ACESSAR AGORA →
                  </button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {checkoutUrl && (
        <EmbeddedCheckout
          open={!!checkoutUrl}
          onClose={() => setCheckoutUrl(null)}
          url={checkoutUrl}
        />
      )}
    </>
  );
}
