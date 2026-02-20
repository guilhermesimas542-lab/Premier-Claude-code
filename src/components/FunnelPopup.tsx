import { useState } from "react";
import { X, ChevronRight, Check, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface FunnelPopupData {
  id: string;
  type: string;
  image_url: string | null;
  question_1_text: string | null;
  question_1_options: string[] | null;
  question_2_text: string | null;
  question_2_options: string[] | null;
  question_3_text: string | null;
  question_3_options: string[] | null;
  final_title: string | null;
  final_benefits: string[] | null;
  checkout_link: string | null;
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

  const [step, setStep] = useState(questions.length === 0 ? 999 : 0);

  const isOnFinal = step >= questions.length;
  const hasProgress = questions.length > 0;

  const handleAnswer = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const benefits = popup.final_benefits ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 border-0 overflow-hidden max-w-sm w-full"
        style={{
          background: "linear-gradient(145deg, #0a1a0a, #0f2410)",
          borderRadius: "20px",
          border: "1px solid rgba(0,255,0,0.15)",
          boxShadow: "0 0 40px rgba(0,255,0,0.08), 0 24px 48px rgba(0,0,0,0.6)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full p-1.5 transition-colors"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>

        {/* Image */}
        {popup.image_url && (
          <div className="relative w-full overflow-hidden" style={{ height: "160px" }}>
            <img
              src={popup.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
          </div>
        )}

        <div className="p-5">
          {/* Progress dots */}
          {hasProgress && !isOnFinal && (
            <div className="flex items-center justify-center gap-1.5 mb-5">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? "24px" : "8px",
                    height: "6px",
                    background: i <= step ? "#00FF00" : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>
          )}

          {/* Question Step */}
          {!isOnFinal && questions[step] && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#00FF00" }}>
                  Pergunta {step + 1} de {questions.length}
                </p>
                <h3 className="text-lg font-bold text-white leading-snug">
                  {questions[step].text}
                </h3>
              </div>

              <div className="space-y-2">
                {(questions[step].options ?? []).map((opt) => (
                  <button
                    key={opt}
                    onClick={handleAnswer}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-between group"
                    style={{
                      background: "rgba(0,255,0,0.05)",
                      border: "1px solid rgba(0,255,0,0.15)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0,255,0,0.12)";
                      e.currentTarget.style.borderColor = "rgba(0,255,0,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(0,255,0,0.05)";
                      e.currentTarget.style.borderColor = "rgba(0,255,0,0.15)";
                    }}
                  >
                    {opt}
                    <ChevronRight className="w-4 h-4 shrink-0 text-white/30 group-hover:text-green-400 transition-colors" />
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar
                </button>
              )}
            </div>
          )}

          {/* Final Screen */}
          {isOnFinal && (
            <div className="space-y-4">
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "rgba(0,255,0,0.15)", border: "1px solid rgba(0,255,0,0.3)" }}
                >
                  <Check className="w-6 h-6" style={{ color: "#00FF00" }} />
                </div>
                <h2 className="text-xl font-bold text-white leading-snug">
                  {popup.final_title || "Perfeito para você!"}
                </h2>
              </div>

              {benefits.length > 0 && (
                <ul className="space-y-2.5">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/80">
                      <span
                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: "rgba(0,255,0,0.15)" }}
                      >
                        <Check className="w-3 h-3" style={{ color: "#00FF00" }} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {popup.checkout_link ? (
                <a
                  href={popup.checkout_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="block w-full py-4 text-center font-bold text-black rounded-xl text-sm tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #00FF00, #00CC00)",
                    boxShadow: "0 0 20px rgba(0,255,0,0.3)",
                  }}
                >
                  QUERO ACESSAR AGORA →
                </a>
              ) : null}

              <button
                onClick={onClose}
                className="w-full text-center text-xs py-1 transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; }}
              >
                Não, obrigado
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
