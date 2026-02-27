import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, X, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import QuizOptionCard from "@/components/funnel/QuizOptionCard";
import type { PopupFormState } from "./types";

interface Props {
  form: PopupFormState;
  open: boolean;
  onClose: () => void;
}

export default function TestPopupModal({ form, open, onClose }: Props) {
  const validQuestions = form.questions.filter((q) => q.text && q.options.some(Boolean));
  const benefits = form.final_benefits.filter(Boolean);
  const hasImage = !!form.image_url;
  const [step, setStep] = useState(0);

  const firstQuestionStep = hasImage ? 1 : 0;
  const finalStep = firstQuestionStep + validQuestions.length;

  const isOnImage = hasImage && step === 0;
  const isOnQuestion = step >= firstQuestionStep && step < finalStep;
  const isOnFinal = step >= finalStep;
  const currentQuestionIndex = step - firstQuestionStep;

  const advance = () => setStep((s) => s + 1);
  const reset = () => setStep(0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setStep(0); } }}>
      <DialogContent
        className="p-0 border border-white/10 overflow-hidden w-full max-w-[calc(100vw-2rem)] sm:max-w-md bg-transparent"
        style={{
          background: "linear-gradient(180deg, hsl(0,0%,8%), hsl(0,0%,4%))",
          borderRadius: "20px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
        }}
      >
        {/* Close */}
        <button
          onClick={() => { onClose(); setStep(0); }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 border border-white/10 hover:bg-black/80 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>

        {/* Step 0: Image */}
        {isOnImage && form.image_url && (
          <button
            type="button"
            onClick={advance}
            className="w-full cursor-pointer group focus:outline-none"
          >
            <img src={form.image_url} alt="" className="w-full h-auto max-h-52 object-contain bg-black/30 transition-transform group-hover:scale-[1.02]" />
          </button>
        )}

        {/* Question steps */}
        {isOnQuestion && validQuestions[currentQuestionIndex] && (
          <div>
            <div className="p-4 pb-0">
              <Progress
                value={((currentQuestionIndex + 1) / validQuestions.length) * 100}
                className="h-2 bg-zinc-800 [&>div]:bg-primary"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Etapa {currentQuestionIndex + 1} de {validQuestions.length}
              </p>
            </div>
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-center mb-6">
                {validQuestions[currentQuestionIndex].text}
              </h3>
              <div className="space-y-3">
                {validQuestions[currentQuestionIndex].options.filter(Boolean).map((o, i) => (
                  <QuizOptionCard key={i} index={i} text={o} onClick={advance} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Final screen */}
        {isOnFinal && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-primary/15 border border-primary/30">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground leading-snug">
                {form.final_title || "Título Final"}
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
            {form.checkout_link && (
              <button
                type="button"
                className="w-full py-3 text-center text-sm font-bold text-primary-foreground rounded-xl bg-primary hover:opacity-90 transition-opacity"
                style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" }}
                onClick={() => window.open(form.checkout_link, "_blank")}
              >
                QUERO ACESSAR →
              </button>
            )}
            {validQuestions.length > 0 && (
              <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto">
                <RotateCcw className="w-3 h-3" /> Reiniciar funil
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
