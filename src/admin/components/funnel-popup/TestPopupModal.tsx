import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, ChevronRight, X, RotateCcw } from "lucide-react";
import type { PopupFormState } from "./types";

interface Props {
  form: PopupFormState;
  open: boolean;
  onClose: () => void;
}

export default function TestPopupModal({ form, open, onClose }: Props) {
  const validQuestions = form.questions.filter((q) => q.text && q.options.some(Boolean));
  const benefits = form.final_benefits.filter(Boolean);
  const [step, setStep] = useState(0);

  const showFinal = step >= validQuestions.length;
  const currentQ = !showFinal ? validQuestions[step] : null;

  const handleOptionClick = () => {
    setStep((s) => s + 1);
  };

  const reset = () => setStep(0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setStep(0); } }}>
      <DialogContent
        className="p-0 border-0 overflow-hidden w-full max-w-[400px] bg-transparent"
        style={{ boxShadow: "none" }}
      >
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(145deg, #0a1a0a, #0f2410)",
            border: "1px solid rgba(0,255,0,0.25)",
            boxShadow: "0 0 40px rgba(0,255,0,0.1)",
          }}
        >
          {/* Close */}
          <button
            onClick={() => { onClose(); setStep(0); }}
            className="absolute top-3 right-3 z-10 p-1 rounded-full bg-black/50 hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>

          {form.image_url && (
            <img src={form.image_url} alt="" className="w-full h-auto max-h-52 object-contain bg-black/30" />
          )}

          <div className="p-5 space-y-4">
            {currentQ && !showFinal ? (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#00FF00" }}>
                  Pergunta {step + 1} de {validQuestions.length}
                </p>
                <p className="text-base font-bold text-white">{currentQ.text}</p>
                <div className="space-y-2">
                  {currentQ.options.filter(Boolean).map((o, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={handleOptionClick}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-white/80 w-full text-left hover:bg-green-500/15 transition-all cursor-pointer"
                      style={{ background: "rgba(0,255,0,0.06)", border: "1px solid rgba(0,255,0,0.15)" }}
                    >
                      {o} <ChevronRight className="w-4 h-4 text-white/30" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-white text-center">{form.final_title || "Título Final"}</p>
                <div className="space-y-2">
                  {benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="w-4 h-4 shrink-0" style={{ color: "#00FF00" }} />{b}
                    </div>
                  ))}
                </div>
                {form.checkout_link && (
                  <button
                    type="button"
                    className="w-full py-3 text-center text-sm font-bold text-black rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #00FF00, #00CC00)" }}
                    onClick={() => window.open(form.checkout_link, "_blank")}
                  >
                    QUERO ACESSAR →
                  </button>
                )}
                {validQuestions.length > 0 && (
                  <button type="button" onClick={reset} className="text-xs text-gray-500 hover:text-white flex items-center gap-1 mx-auto">
                    <RotateCcw className="w-3 h-3" /> Reiniciar funil
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
