import { useState, useEffect } from "react";
import { Check, ChevronRight, RotateCcw } from "lucide-react";
import type { PopupFormState } from "./types";

interface Props {
  form: PopupFormState;
  previewMode: "mobile" | "desktop";
}

export default function InteractivePreview({ form, previewMode }: Props) {
  const validQuestions = form.questions.filter((q) => q.text && q.options.some(Boolean));
  const benefits = form.final_benefits.filter(Boolean);
  const [step, setStep] = useState(0); // 0..n-1 = questions, n = final
  const [viewMode, setViewMode] = useState<"funnel" | "final">("funnel");

  // Reset step when questions change
  useEffect(() => { setStep(0); }, [form.questions.length]);

  const showFinal = viewMode === "final" || step >= validQuestions.length;
  const currentQ = !showFinal ? validQuestions[step] : null;

  const handleOptionClick = () => {
    if (step < validQuestions.length - 1) {
      setStep(step + 1);
    } else {
      setStep(validQuestions.length); // go to final
    }
  };

  const reset = () => setStep(0);

  return (
    <div className="space-y-2">
      {/* View mode toggle */}
      {validQuestions.length > 0 && (
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => { setViewMode("funnel"); setStep(0); }}
            className={`flex-1 px-2 py-1 text-[11px] rounded-md transition-colors ${viewMode === "funnel" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            🔄 Funil
          </button>
          <button
            type="button"
            onClick={() => setViewMode("final")}
            className={`flex-1 px-2 py-1 text-[11px] rounded-md transition-colors ${viewMode === "final" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            🏁 Tela Final
          </button>
        </div>
      )}

      {/* Preview card */}
      <div
        className="rounded-2xl overflow-hidden mx-auto transition-all duration-200"
        style={{
          width: previewMode === "mobile" ? 380 : 420,
          maxWidth: "100%",
          background: "linear-gradient(145deg, #0a1a0a, #0f2410)",
          border: "1px solid rgba(0,255,0,0.2)",
          boxShadow: "0 0 20px rgba(0,255,0,0.06)",
        }}
      >
        {form.image_url && (
          <img src={form.image_url} alt="" className="w-full h-auto max-h-48 object-contain bg-black/30" />
        )}

        <div className="p-4 space-y-3">
          {currentQ && !showFinal ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#00FF00" }}>
                  Pergunta {step + 1} de {validQuestions.length}
                </p>
                {step > 0 && (
                  <button type="button" onClick={reset} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Reiniciar
                  </button>
                )}
              </div>
              <p className="text-sm font-bold text-white">{currentQ.text}</p>
              <div className="space-y-1.5">
                {currentQ.options.filter(Boolean).map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={handleOptionClick}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-white/70 w-full text-left hover:bg-green-500/10 transition-colors cursor-pointer"
                    style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.12)" }}
                  >
                    {o} <ChevronRight className="w-3 h-3 text-white/30" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-white text-center">{form.final_title || "Título Final"}</p>
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/70">
                  <Check className="w-3 h-3 shrink-0" style={{ color: "#00FF00" }} />{b}
                </div>
              ))}
              {form.checkout_link && (
                <div
                  className="w-full py-2 text-center text-xs font-bold text-black rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #00FF00, #00CC00)" }}
                >
                  QUERO ACESSAR →
                </div>
              )}
              {validQuestions.length > 0 && viewMode === "funnel" && (
                <button type="button" onClick={reset} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 mx-auto">
                  <RotateCcw className="w-3 h-3" /> Reiniciar funil
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-600 text-center">
        {currentQ && !showFinal ? "Clique numa opção para avançar" : "Preview da tela final"}
      </p>
    </div>
  );
}
