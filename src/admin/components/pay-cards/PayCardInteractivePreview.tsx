import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Check, RotateCcw, MousePointerClick } from "lucide-react";
import QuizStep from "@/components/funnel/QuizStep";
import { PayCardMiniaturePreview } from "./PayCardMiniaturePreview";
import type { FunnelQuestion } from "@/admin/components/funnel-popup/types";
import { renderFinalTemplate, type FinalTemplateType, type FinalConfig } from "@/components/funnel/FinalTemplates";

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
  associated_plan?: string;
  name?: string;
  button_color?: string;
  checkout_template?: string;
  checkout_final_config?: Record<string, any>;
}

type Step = "trigger" | "intro" | "quiz" | "checkout";

export function PayCardInteractivePreview({ data }: { data: PreviewData }) {
  const hasIntro = data.has_intro_popup && (data.popup_image_url || data.popup_title);
  const questions = data.questions.filter(q => q.text);
  const hasQuiz = questions.length > 0;
  const benefits = data.checkout_benefits ? data.checkout_benefits.split("\n").filter(Boolean) : [];
  const hasDualCheckout = !!data.checkout_url && !!data.checkout_url_2;
  const buttonColor = data.button_color || null;
  const checkoutTemplate = (data.checkout_template || "default") as FinalTemplateType;
  const checkoutFinalConfig = (data.checkout_final_config || {}) as FinalConfig;

  const [step, setStep] = useState<Step>("trigger");
  const [quizIndex, setQuizIndex] = useState(0);

  useEffect(() => {
    setStep("trigger");
    setQuizIndex(0);
  }, [data.associated_plan, data.has_intro_popup, questions.length]);

  const reset = () => {
    setStep("trigger");
    setQuizIndex(0);
  };

  const advanceFromTrigger = () => {
    if (hasIntro) setStep("intro");
    else if (hasQuiz) setStep("quiz");
    else setStep("checkout");
  };

  const advanceFromIntro = () => {
    if (hasQuiz) setStep("quiz");
    else setStep("checkout");
  };

  const advanceFromQuiz = () => {
    if (quizIndex < questions.length - 1) setQuizIndex(i => i + 1);
    else setStep("checkout");
  };

  const stepLabels: { key: Step; label: string }[] = [
    { key: "trigger", label: "Gatilho" },
    ...(hasIntro ? [{ key: "intro" as Step, label: "Intro" }] : []),
    ...(hasQuiz ? [{ key: "quiz" as Step, label: "Quiz" }] : []),
    { key: "checkout", label: "Checkout" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 font-medium">Simulação da Experiência</span>
        <button onClick={reset} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Reiniciar
        </button>
      </div>

      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 rounded-xl overflow-hidden" style={{ maxWidth: 380 }}>

        {/* TRIGGER */}
        {step === "trigger" && (
          <div className="p-6 flex flex-col items-center gap-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Visão do usuário</p>
            <div onClick={advanceFromTrigger} className="cursor-pointer hover:scale-105 transition-transform">
              <PayCardMiniaturePreview
                payCard={{ associated_plan: data.associated_plan || "basic", name: data.name }}
              />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 animate-pulse">
              <MousePointerClick className="w-3 h-3" /> Clique para simular
            </div>
          </div>
        )}

        {/* INTRO */}
        {step === "intro" && (
          <div className="flex flex-col items-center">
            {data.popup_image_url && (
              <img src={data.popup_image_url} alt="Intro" className="w-full max-h-48 object-cover cursor-pointer" onClick={advanceFromIntro} />
            )}
            <div className="p-4 text-center space-y-2">
              {data.popup_title && <h3 className="text-sm font-bold text-white">{data.popup_title}</h3>}
              {data.popup_text && <p className="text-xs text-zinc-300">{data.popup_text}</p>}
              <Button onClick={advanceFromIntro} size="sm" className="w-full mt-1" style={buttonColor ? { backgroundColor: buttonColor } : undefined}>
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
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= quizIndex ? "bg-primary" : "bg-white/10"}`}
                  style={i <= quizIndex && buttonColor ? { backgroundColor: buttonColor } : undefined}
                />
              ))}
            </div>
            <QuizStep
              currentStep={quizIndex + 1}
              totalSteps={questions.length}
              questionText={questions[quizIndex].text}
              options={questions[quizIndex].options}
              onAnswer={advanceFromQuiz}
              buttonColor={buttonColor}
            />
          </div>
        )}

        {/* CHECKOUT */}
        {step === "checkout" && (() => {
          if (checkoutTemplate !== "default") {
            return renderFinalTemplate(checkoutTemplate, {
              title: data.checkout_title || "Perfeito para você!",
              benefits,
              checkoutLink: data.checkout_url || null,
              onCheckout: () => {},
              onClose: () => {},
              config: checkoutFinalConfig,
              buttonColor,
            });
          }

          return (
            <div className="p-4 text-center space-y-3">
              {data.checkout_title && <h3 className="text-sm font-bold text-white">{data.checkout_title}</h3>}
              {benefits.length > 0 && (
                <ul className="text-left space-y-1.5">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-200">
                      <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {hasDualCheckout ? (
                <div className="space-y-2">
                  <Button size="sm" className="w-full animate-[cta-pulse_2s_ease-in-out_infinite]" disabled style={buttonColor ? { backgroundColor: buttonColor } : undefined}>
                    {data.checkout_label_1 || "Assinar Agora"} <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                  <Button size="sm" className="w-full" variant="outline" disabled>
                    {data.checkout_label_2 || "Pacote Completo"} <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="w-full animate-[cta-pulse_2s_ease-in-out_infinite]" disabled style={buttonColor ? { backgroundColor: buttonColor } : undefined}>
                  {data.checkout_label_1 || "Assinar Agora"} <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
              {(!data.checkout_title && benefits.length === 0) && (
                <p className="text-xs text-zinc-500 italic">Configure o checkout para ver o preview</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Step breadcrumb */}
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
        {stepLabels.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1.5">
            {i > 0 && <span>→</span>}
            <span className={step === s.key ? "text-blue-400 font-bold" : ""}>{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
