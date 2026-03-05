import { useState, useEffect } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import QuizOptionCard from "@/components/funnel/QuizOptionCard";
import { renderFinalTemplate, type FinalTemplateType, type FinalConfig } from "@/components/funnel/FinalTemplates";
import type { PopupFormState } from "./types";

interface Props {
  form: PopupFormState;
  previewMode: "mobile" | "desktop";
}

export default function InteractivePreview({ form, previewMode }: Props) {
  const validQuestions = form.questions.filter((q) => q.text && q.options.some(Boolean));
  const benefits = form.final_benefits.filter(Boolean);
  const hasImage = !!form.image_url;

  // Step 0 = image (if exists), 1..N = questions, N+1 = final
  const [step, setStep] = useState(0);
  const [viewMode, setViewMode] = useState<"funnel" | "final">("funnel");

  useEffect(() => { setStep(0); }, [form.questions.length]);

  const firstQuestionStep = hasImage ? 1 : 0;
  const finalStep = firstQuestionStep + validQuestions.length;

  const showFinal = viewMode === "final" || step >= finalStep;
  const isOnImage = hasImage && step === 0 && viewMode === "funnel";
  const isOnQuestion = !showFinal && step >= firstQuestionStep && step < finalStep;
  const currentQuestionIndex = step - firstQuestionStep;

  const advance = () => setStep((s) => s + 1);
  const reset = () => setStep(0);

  return (
    <div className="space-y-2">
      {/* View mode toggle */}
      {(validQuestions.length > 0 || hasImage) && (
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => { setViewMode("funnel"); setStep(0); }}
            className={`flex-1 px-2 py-1 text-[11px] rounded-md transition-colors ${viewMode === "funnel" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            🔄 Funil
          </button>
          <button
            type="button"
            onClick={() => setViewMode("final")}
            className={`flex-1 px-2 py-1 text-[11px] rounded-md transition-colors ${viewMode === "final" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            🏁 Tela Final
          </button>
        </div>
      )}

      {/* Preview card */}
      <div
        className="rounded-2xl overflow-hidden mx-auto transition-all duration-200 border border-white/10"
        style={{
          width: previewMode === "mobile" ? 380 : 420,
          maxWidth: "100%",
          background: "linear-gradient(180deg, hsl(0,0%,8%), hsl(0,0%,4%))",
        }}
      >
        {/* Step 0: Image as button */}
        {isOnImage && form.image_url && (
          <button
            type="button"
            onClick={advance}
            className="w-full cursor-pointer group"
          >
            <img src={form.image_url} alt="" className="w-full h-auto max-h-48 object-contain bg-black/30 transition-transform group-hover:scale-[1.02]" />
            <p className="text-[10px] text-muted-foreground py-2">Clique na imagem para avançar</p>
          </button>
        )}

        {/* Question steps */}
        {isOnQuestion && validQuestions[currentQuestionIndex] && (
          <div>
            <div className="p-3 pb-0">
              <Progress
                value={((currentQuestionIndex + 1) / validQuestions.length) * 100}
                className="h-2 bg-zinc-800 [&>div]:bg-primary"
                style={(form as any).button_color ? { ["--progress-color" as any]: (form as any).button_color } : undefined}
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Etapa {currentQuestionIndex + 1} de {validQuestions.length}
              </p>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-sm font-bold text-foreground text-center">{validQuestions[currentQuestionIndex].text}</p>
              <div className="space-y-1.5">
                {validQuestions[currentQuestionIndex].options.filter(Boolean).map((o, i) => (
                  <QuizOptionCard key={i} index={i} text={o} onClick={advance} buttonColor={(form as any).button_color || null} />
                ))}
              </div>
              {step > 0 && (
                <button type="button" onClick={reset} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto mt-2">
                  <RotateCcw className="w-3 h-3" /> Reiniciar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Final screen */}
        {showFinal && (() => {
          const template = ((form as any).final_template || "default") as FinalTemplateType;
          const config = ((form as any).final_config || {}) as FinalConfig;

          if (template !== "default") {
            return (
              <div>
                {renderFinalTemplate(template, {
                  title: form.final_title || "Título Final",
                  benefits,
                  checkoutLink: form.checkout_link || null,
                  onCheckout: () => {},
                  onClose: () => {},
                  config,
                  buttonColor: (form as any).button_color || null,
                })}
                {validQuestions.length > 0 && viewMode === "funnel" && (
                  <div className="px-4 pb-3">
                    <button type="button" onClick={reset} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto">
                      <RotateCcw className="w-3 h-3" /> Reiniciar funil
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="p-4 space-y-3">
              <p className="text-sm font-bold text-foreground text-center">{form.final_title || "Título Final"}</p>
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-foreground/70">
                  <Check className="w-3 h-3 shrink-0 text-primary" />{b}
                </div>
              ))}
              {form.checkout_link && (
                <div
                  className="w-full py-2 text-center text-xs font-bold text-primary-foreground rounded-lg cursor-pointer hover:opacity-90 transition-opacity animate-[cta-pulse_2s_ease-in-out_infinite]"
                  style={{ backgroundColor: (form as any).button_color || "hsl(var(--primary))" }}
                >
                  QUERO ACESSAR →
                </div>
              )}
              {validQuestions.length > 0 && viewMode === "funnel" && (
                <button type="button" onClick={reset} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto">
                  <RotateCcw className="w-3 h-3" /> Reiniciar funil
                </button>
              )}
            </div>
          );
        })()}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        {isOnImage ? "Clique na imagem para avançar" : isOnQuestion ? "Clique numa opção para avançar" : "Preview da tela final"}
      </p>
    </div>
  );
}
