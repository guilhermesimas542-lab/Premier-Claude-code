import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, X, Check, RotateCcw } from "lucide-react";
import QuizStep from "@/components/funnel/QuizStep";
import type { FunnelQuestion } from "@/admin/components/funnel-popup/types";

interface PreviewData {
  has_intro_popup: boolean;
  popup_title: string;
  popup_text: string;
  popup_image_url: string;
  popup_cta_text: string;
  checkout_title: string;
  checkout_url: string;
  checkout_url_2: string;
  checkout_label_1: string;
  checkout_label_2: string;
  checkout_benefits: string;
  questions: FunnelQuestion[];
}

type Step = "intro" | "quiz" | "checkout";

export function PayCardInteractivePreview({ data }: { data: PreviewData }) {
  const hasIntro = data.has_intro_popup && (data.popup_image_url || data.popup_title);
  const questions = data.questions.filter(q => q.text);
  const hasQuiz = questions.length > 0;
  const benefits = data.checkout_benefits ? data.checkout_benefits.split("\n").filter(Boolean) : [];
  const hasDualCheckout = !!data.checkout_url && !!data.checkout_url_2;

  const getInitialStep = (): Step => {
    if (hasIntro) return "intro";
    if (hasQuiz) return "quiz";
    return "checkout";
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [quizIndex, setQuizIndex] = useState(0);

  // Reset step when form data changes structure
  useEffect(() => {
    setStep(getInitialStep());
    setQuizIndex(0);
  }, [data.has_intro_popup, questions.length]);

  const reset = () => {
    setStep(getInitialStep());
    setQuizIndex(0);
  };

  const advanceFromIntro = () => {
    if (hasQuiz) setStep("quiz");
    else setStep("checkout");
  };

  const advanceFromQuiz = () => {
    if (quizIndex < questions.length - 1) setQuizIndex(i => i + 1);
    else setStep("checkout");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">Preview do Funil</span>
        <button onClick={reset} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Reiniciar
        </button>
      </div>

      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 rounded-xl overflow-hidden" style={{ maxWidth: 380 }}>
        {/* INTRO */}
        {step === "intro" && (
          <div className="flex flex-col items-center">
            {data.popup_image_url && (
              <img src={data.popup_image_url} alt="Intro" className="w-full max-h-48 object-cover cursor-pointer" onClick={advanceFromIntro} />
            )}
            <div className="p-4 text-center space-y-2">
              {data.popup_title && <h3 className="text-sm font-bold text-white">{data.popup_title}</h3>}
              {data.popup_text && <p className="text-xs text-gray-300">{data.popup_text}</p>}
              <Button onClick={advanceFromIntro} size="sm" className="w-full mt-1">
                {data.popup_cta_text || "Continuar"} <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {step === "quiz" && questions.length > 0 && (
          <div className="p-4">
            <div className="flex gap-1 mb-3">
              {questions.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= quizIndex ? "bg-primary" : "bg-white/10"}`} />
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

        {/* CHECKOUT */}
        {step === "checkout" && (
          <div className="p-4 text-center space-y-3">
            {data.checkout_title && <h3 className="text-sm font-bold text-white">{data.checkout_title}</h3>}
            {benefits.length > 0 && (
              <ul className="text-left space-y-1.5">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-200">
                    <Check className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {hasDualCheckout ? (
              <div className="space-y-2">
                <Button size="sm" className="w-full" disabled>
                  {data.checkout_label_1 || "Assinar Agora"} <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
                <Button size="sm" className="w-full" variant="outline" disabled>
                  {data.checkout_label_2 || "Pacote Completo"} <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ) : (
              <Button size="sm" className="w-full" disabled>
                {data.checkout_label_1 || "Assinar Agora"} <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
            {(!data.checkout_title && benefits.length === 0) && (
              <p className="text-xs text-gray-500 italic">Configure o checkout para ver o preview</p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!hasIntro && !hasQuiz && !data.checkout_title && benefits.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-xs text-gray-500 italic">Preencha os campos do formulário para ver o preview</p>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span className={step === "intro" ? "text-blue-400 font-bold" : ""}>Intro</span>
        <span>→</span>
        <span className={step === "quiz" ? "text-blue-400 font-bold" : ""}>Quiz</span>
        <span>→</span>
        <span className={step === "checkout" ? "text-blue-400 font-bold" : ""}>Checkout</span>
      </div>
    </div>
  );
}
