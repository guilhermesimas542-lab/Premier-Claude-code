import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useCtaOverride } from "./cta-context";

interface Props {
  step: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  /** Chamado quando o lead clica o CTA do último step. */
  onComplete: () => void;
  /** Label do CTA "Continuar" desse step (definido em `data/steps.tsx`). */
  nextLabel?: string;
  /** Label do CTA final. */
  finalLabel?: string;
}

/**
 * Barra inferior do onboarding (prev | CTA primário).
 *
 * O CTA primário aceita override por step (via `cta-context`):
 *  - label, disabled e progress (0..1)
 *
 * Quando `progress` está definido, o botão vira "barra que enche": fundo navy
 * escuro com fill gradiente verde→gold crescendo da esquerda, e o texto se
 * inverte do branco (no fundo escuro) pro navy (no fundo colorido) via clip-path.
 */
export function NavBar({
  step,
  total,
  onPrev,
  onNext,
  onComplete,
  nextLabel,
  finalLabel,
}: Props) {
  const isFirst = step === 1;
  const isLast = step === total;

  const { override } = useCtaOverride();
  const label = override.label ?? (isLast ? (finalLabel ?? "Concluir") : (nextLabel ?? "Continuar"));
  // (Continuar/Concluir são iguais em PT-BR e ES; mantidos.)
  const progress = override.progress;
  const disabled = override.disabled ?? false;
  const handleClick = override.onClick ?? (isLast ? onComplete : onNext);
  const showPrev = !isFirst && !override.hidePrev;

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-white/[0.06] bg-[#0c1a2d] px-5 py-3",
        // Sem botão Voltar (step 1 ou hidePrev) → CTA ocupa a linha inteira.
        showPrev ? "justify-between" : "justify-end",
      )}
    >
      {showPrev && (
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
      )}

      <PrimaryCta
        onClick={handleClick}
        label={label}
        trailingIcon={!isLast}
        disabled={disabled}
        progress={progress}
      />
    </div>
  );
}

/**
 * CTA primário em gradiente verde→gold. Quando recebe `progress` (0..1), vira
 * "barra que enche" — usado em steps com gating (ex.: vídeo obrigatório).
 *
 * Implementação do efeito de texto:
 *  - 1 camada de texto branco no fundo (sempre visível)
 *  - 1 camada de texto navy escuro por cima, clipada pra mostrar SÓ a porção
 *    sobre o fill colorido (clip-path: inset(0 X% 0 0))
 *  - As duas camadas têm exatamente a mesma posição/tipografia.
 */
function PrimaryCta({
  onClick,
  label,
  trailingIcon,
  disabled,
  progress,
}: {
  onClick: () => void;
  label: string;
  trailingIcon: boolean;
  disabled: boolean;
  progress: number | undefined;
}) {
  const hasProgress = typeof progress === "number";
  const pct = hasProgress ? Math.max(0, Math.min(1, progress!)) : 1;
  const isFilled = pct >= 0.999;

  // Texto fica menor no modo progress pra caber "Assista o vídeo para continuar".
  const baseClasses = cn(
    "group relative h-11 overflow-hidden rounded-full border-0 px-6 font-display font-extrabold uppercase tracking-wider transition-transform",
    hasProgress ? "text-[12px] sm:text-[13px]" : "text-sm",
    isFilled && !disabled ? "hover:scale-[1.02] active:scale-[0.98]" : "",
    disabled || !isFilled ? "cursor-not-allowed" : "",
  );

  const baseStyle = hasProgress
    ? {
        background: "#0a1626",
        boxShadow:
          "inset 0 0 0 1px rgba(0,255,135,0.18), 0 4px 14px rgba(0,0,0,0.35)",
      }
    : {
        background: "linear-gradient(135deg, #00FF87 0%, #0c8a4f 100%)",
        boxShadow:
          "0 0 24px rgba(0,255,135,0.28), 0 4px 14px rgba(0,0,0,0.35)",
      };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || !isFilled}
      className={baseClasses}
      style={baseStyle}
    >
      {/* Fill colorido crescendo da esquerda (só no modo progress).
          Sem CSS transition — o rAF do useVideoGating ja emite em 60fps,
          adicionar transition aqui criava "lag" visivel entre updates. */}
      {hasProgress && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{
            width: `${pct * 100}%`,
            background: "linear-gradient(135deg, #00FF87 0%, #0c8a4f 100%)",
          }}
        />
      )}

      {/* Brilho passando no hover (só quando totalmente habilitado). */}
      {isFilled && !disabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
      )}

      {/* Texto branco (camada de baixo — visível sobre o fundo navy). */}
      <span
        className={cn(
          "relative z-10 inline-flex items-center gap-1.5",
          hasProgress ? "text-white/85" : "text-[#0c1a2d]",
        )}
      >
        {label}
        {trailingIcon && isFilled && <ArrowRight className="h-4 w-4" />}
      </span>

      {/* Texto navy escuro clipado — só aparece sobre o fill colorido.
          Sem transition (mesma razão do fill). */}
      {hasProgress && (
        <span
          aria-hidden
          className="absolute inset-0 z-20 grid place-items-center px-6"
          style={{
            clipPath: `inset(0 ${(1 - pct) * 100}% 0 0)`,
            color: "#0c1a2d",
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            {label}
            {trailingIcon && isFilled && <ArrowRight className="h-4 w-4" />}
          </span>
        </span>
      )}
    </Button>
  );
}
