import { BarChart3, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface JustificativaModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo?: string;
  texto?: string;
}

export const JustificativaModal = ({
  isOpen,
  onClose,
  titulo = "Justificativa",
  texto = "Em breve: dados e percentuais do confronto.",
}: JustificativaModalProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Scroll lock on body when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Focus the "Entendi" button when modal opens
      buttonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
        isOpen
          ? "opacity-100 visible pointer-events-auto"
          : "opacity-0 invisible pointer-events-none"
      }`}
      style={{
        transform: "translateZ(0)",
        willChange: "opacity",
      }}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transform: "translateZ(0)",
          willChange: "opacity",
        }}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-sm bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden transition-all duration-200 ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{
          transform: isOpen ? "translateZ(0) scale(1)" : "translateZ(0) scale(0.95)",
          willChange: "transform, opacity",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-purple-500/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{titulo}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-purple-300" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-sm text-purple-200/80 leading-relaxed">{texto}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            ref={buttonRef}
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 font-medium hover:bg-purple-500/30 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
