import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Trophy, Sparkles, Ticket, Clock, HelpCircle, BarChart3, Info, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { TipHowItWorksModal } from "./TipHowItWorksModal";

type SpecialCardType = "ALAVANCAGEM" | "ODDS_ALTAS";

interface SpecialBettingCardProps {
  tipId: number;
  type: SpecialCardType;
  market: string;
  betChoice: string;
  odds: number;
  matchDate?: string;
  startsAt?: string;
  expirationDate?: string;
  isLocked?: boolean;
  lockedLabel?: string;
  isExpired?: boolean;
  justificativa?: string;
  onAddTip?: () => void;
  onOpenJustificativa?: (texto: string) => void;
  onLockedClick?: () => void;
}

const formatCountdown = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

// Claude Design: verde do design pra ODD, fundo glass comum a todos os cards.
const ODD_GREEN = "#6fb58c";
const GLASS_BG =
  "linear-gradient(100deg, rgba(47,107,214,0.5) -10%, rgba(11,12,16,0.93) 38%, rgba(11,12,16,0.95) 62%, rgba(196,48,46,0.5) 110%), #0c0d11";

const CARD_CONFIG: Record<SpecialCardType, { icon: typeof TrendingUp; label: string; color: string; gradient: string; subtitle: string }> = {
  ALAVANCAGEM: {
    icon: TrendingUp,
    label: "APALANCAMIENTO",
    color: "#e9b949",
    gradient: GLASS_BG,
    subtitle: "Apalancamiento del Día",
  },
  ODDS_ALTAS: {
    icon: Ticket,
    label: "MÚLTIPLAS",
    color: "#c98aa0",
    gradient: GLASS_BG,
    subtitle: "Múltipla do Dia",
  },
};

export const SpecialBettingCard = ({
  tipId,
  type,
  market,
  betChoice,
  odds,
  matchDate,
  startsAt,
  expirationDate,
  isLocked = false,
  lockedLabel,
  isExpired: isExpiredProp = false,
  justificativa,
  onAddTip,
  onOpenJustificativa,
  onLockedClick,
}: SpecialBettingCardProps) => {
  const [countdown, setCountdown] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const config = CARD_CONFIG[type];
  const IconComponent = config.icon;
  const isExpired = isExpiredProp || isExpiredLocal;
  const tierColor = config.color;
  const expiredColor = "#4B5563";

  const getFixedJustificativaTexto = () => {
    if (type === "ALAVANCAGEM") {
      return "Apalancamiento es una secuencia progresiva de tips, hecha en etapas.\n\nSigues el orden del día y avanzas etapa por etapa, sin saltarte ninguna.\n\nEl foco es la progresión controlada: consistencia, disciplina y crecimiento gradual de la banca.";
    }
    return "Múltiples / Bingo son combinaciones de selecciones en un único ticket, con payout potenciado.\n\nLa idea es aprovechar combinaciones estratégicas donde hay lógica y criterio detrás del tip.\n\nRecibes el ticket listo y entras solo cuando la oportunidad esté disponible.";
  };

  const handleOpenJustificativaClick = () => {
    onOpenJustificativa?.(getFixedJustificativaTexto());
  };

  useEffect(() => {
    if (!startsAt || isExpiredProp) { setCountdown(""); return; }
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(startsAt).getTime();
      const remaining = Math.floor((target - now) / 1000);
      setCountdown(remaining > 0 ? formatCountdown(remaining) : "AO VIVO");
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startsAt, isExpiredProp]);

  return (
    <div
      className="select-none relative flex flex-col w-full"
      style={{
        background: isExpired ? "#0A0F1A" : config.gradient,
        border: `1px solid ${isExpired ? expiredColor : "rgba(255,255,255,0.1)"}`,
        borderRadius: 20,
        boxShadow: isExpired ? "none" : "inset 0 1px 0 rgba(255,255,255,0.08)",
        overflow: "hidden",
        position: "relative",
        gap: 0,
      }}
    >
      {/* Saturation overlay for locked */}
      {isLocked && !isExpired && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'black', mixBlendMode: 'saturation', zIndex: 15, borderRadius: 16 }}
        />
      )}

      {/* Dim backdrop for locked (design: rgba(8,9,11,.42)) */}
      {isLocked && !isExpired && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(8,9,11,0.42)", zIndex: 16, borderRadius: 16 }} />
      )}

      {/* Locked Overlay */}
      {isLocked && !isExpired && (
        <>
          {lockedLabel && (
            <div style={{ position: "absolute", top: 30, left: 0, right: 0, textAlign: "center" as const, zIndex: 22, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "#c9a56b" }}>
              Exclusivo de {lockedLabel}
            </div>
          )}
          {/* Cadeado dourado central */}
          <div style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", zIndex: 22, width: 50, height: 50, borderRadius: "50%", background: "rgba(8,9,11,0.92)", border: "1px solid rgba(201,165,107,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px -6px rgba(0,0,0,0.7)" }}>
            <Lock className="w-5 h-5" style={{ color: "#c9a56b" }} />
          </div>
          {/* Linha de ação: botão Desbloquear + ODD verde com glow */}
          <div style={{ position: "absolute", bottom: 18, left: 14, right: 14, zIndex: 22, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onLockedClick?.(); }}
              style={{ flex: 1, padding: "13px", borderRadius: 12, background: "rgba(255,255,255,0.9)", color: "#14151a", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", letterSpacing: "0.3px" }}
            >
              Desbloquear Cuota
            </button>
            {odds > 0 && (
              <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "1.5px", color: "#8a8c94", marginBottom: 2 }}>CUOTA</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 29, color: ODD_GREEN, lineHeight: 1, textShadow: "0 0 18px rgba(111,181,140,0.4)" }}>
                  {(odds * 2).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Content — 4-line compact layout */}
      <div className="relative z-10 flex flex-col">

        {/* Line 1: timer | badge | match time */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 10px 2px 10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, width: 70, flexShrink: 0 }}>
            {isLocked ? (
              <span style={{ fontSize: 12, color: "transparent" }}>—</span>
            ) : countdown === "AO VIVO" ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e5484d", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11, color: "#e5484d", letterSpacing: "0.5px" }}>EN VIVO</span>
              </>
            ) : countdown ? (
              <>
                <Clock className="w-3 h-3" style={{ color: "#9a9ca4" }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 11, color: "#9a9ca4" }}>{countdown}</span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "transparent" }}>—</span>
            )}
          </div>

          {isExpired ? (
            <div style={{ background: "rgba(75,85,99,0.25)", border: "1px solid rgba(75,85,99,0.5)", color: expiredColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: 6 }}>
              EXPIRADA
            </div>
          ) : (
            <div style={{ background: `${tierColor}14`, border: `1px solid ${tierColor}55`, color: tierColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: 6 }}>
              {config.label}
            </div>
          )}

          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 11, color: isExpired ? "#6B7280" : "#9a9ca4", width: 70, flexShrink: 0, textAlign: "right" as const }}>
            {matchDate || "—"}
          </span>
        </div>

        {/* Line 2: central icon */}
        {!isLocked ? (
          <div style={{
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            justifyContent: "center",
            padding: "6px 10px 2px 10px",
            height: "82px",
            position: "relative",
            gap: 4,
          }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${tierColor}1A`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${tierColor}33` }}>
              <IconComponent style={{ width: 28, height: 28, color: isExpired ? "#6B7280" : tierColor }} />
            </div>
          </div>
        ) : (
          <div style={{ height: 82 }} />
        )}

        {/* Line 3: market + recommendation + odd (descriptive block — lead copia manualmente) */}
        {!isLocked ? (
          <div style={{
            margin: "0 14px 8px 14px",
            padding: 0,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color: "#8a8c94", letterSpacing: "1.6px", textTransform: "uppercase" as const }}>
                Tipo
              </span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isExpired ? "#6B7280" : "rgba(236,234,228,0.85)", textAlign: "right" as const, lineHeight: 1.2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {type === "ALAVANCAGEM" ? "Apalancamiento del Día" : "Múltiple del Día"}
              </span>
            </div>
            {market && (
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color: "#8a8c94", letterSpacing: "1.6px", textTransform: "uppercase" as const }}>
                  Mercado
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isExpired ? "#6B7280" : "rgba(236,234,228,0.85)", textAlign: "right" as const, lineHeight: 1.2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {market}
                </span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" as const }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color: "#8a8c94", letterSpacing: "1.6px", textTransform: "uppercase" as const }}>
                  Selección
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: isExpired ? "#6B7280" : "#ECEAE4", lineHeight: 1.2, paddingRight: 8 }}>
                  {betChoice}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color: "#8a8c94", letterSpacing: "1.6px", textTransform: "uppercase" as const }}>
                  Cuota
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color: isExpired ? "#6B7280" : ODD_GREEN, lineHeight: 1 }}>
                  {odds.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: 36 }} />
        )}

        {/* Line 4: buttons */}
        {!isLocked ? (
          <div style={{ display: "flex", gap: 8, padding: "0 10px 4px 10px" }}>
            <button
              onClick={isExpired ? undefined : onAddTip}
              disabled={isExpired}
              style={{
                flex: 1,
                background: isExpired ? "#374151" : "rgba(255,255,255,0.9)",
                color: isExpired ? "#6B7280" : "#14151a",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.3px",
                padding: "9px 0",
                borderRadius: 12,
                border: "none",
                cursor: isExpired ? "not-allowed" : "pointer",
                textTransform: "uppercase" as const,
              }}
            >
              {isExpired ? "EXPIRADA" : "AÑADIR"}
            </button>

            <button
              onClick={handleOpenJustificativaClick}
              style={{ width: 38, height: 38, borderRadius: 12, background: "transparent", border: "1px solid rgba(235,235,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <HelpCircle className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>

            <button
              onClick={handleOpenJustificativaClick}
              style={{ width: 38, height: 38, borderRadius: 12, background: "transparent", border: "1px solid rgba(235,235,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <BarChart3 className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>
          </div>
        ) : (
          <div style={{ height: 42 }} />
        )}

        {/* Trust link — explica que cópia é manual hoje, integração vem no próximo upgrade */}
        {!isLocked && !isExpired && (
          <div style={{ padding: "0 10px 6px 10px", display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "transparent", border: "none", cursor: "pointer",
                padding: "2px 6px",
                fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                color: "rgba(255,255,255,0.55)", textDecoration: "underline",
                textDecorationColor: "rgba(255,255,255,0.25)",
                textUnderlineOffset: 2,
              }}
            >
              <Info className="w-3 h-3" style={{ color: "#c9a56b" }} />
              ¿Cómo añadir este tip?
            </button>
          </div>
        )}
      </div>

      <TipHowItWorksModal
        open={showHowItWorks}
        onOpenChange={setShowHowItWorks}
        market={market}
        betChoice={betChoice}
        odds={odds}
      />
    </div>
  );
};
