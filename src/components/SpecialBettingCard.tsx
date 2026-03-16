import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Trophy, Clock, HelpCircle, BarChart3, Info, Lock } from "lucide-react";
import { useState, useEffect } from "react";

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

const CARD_CONFIG: Record<SpecialCardType, { icon: typeof TrendingUp; label: string; color: string; gradient: string; subtitle: string }> = {
  ALAVANCAGEM: {
    icon: TrendingUp,
    label: "ALAVANCAGEM",
    color: "#F0B429",
    gradient: "linear-gradient(135deg, rgba(240,180,41,0.08) 0%, transparent 60%)",
    subtitle: "Alavancagem do Dia",
  },
  ODDS_ALTAS: {
    icon: Trophy,
    label: "ODDS ALTAS",
    color: "#F97316",
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, transparent 60%)",
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

  const config = CARD_CONFIG[type];
  const IconComponent = config.icon;
  const isExpired = isExpiredProp || isExpiredLocal;
  const tierColor = config.color;
  const expiredColor = "#4B5563";

  const getFixedJustificativaTexto = () => {
    if (type === "ALAVANCAGEM") {
      return "Alavancagem é uma sequência progressiva de entradas, feita em etapas.\n\nVocê segue a ordem do dia e avança etapa por etapa, sem pular.\n\nO foco é progressão controlada: consistência, disciplina e crescimento gradual da banca.";
    }
    return "Odds Altas são seleções com cotação acima do padrão, escolhidas por oportunidade.\n\nA ideia é aproveitar odds valorizadas quando existe lógica e critério por trás da entrada.\n\nVocê recebe a seleção pronta e entra somente quando a oportunidade estiver disponível.";
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
        background: isExpired ? "#0A0F1A" : `${config.gradient}, #060D1E`,
        border: `1.5px solid ${isExpired ? expiredColor : tierColor}`,
        borderRadius: 16,
        boxShadow: isExpired ? "none" : `0 0 20px ${tierColor}1A`,
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

      {/* Locked Overlay */}
      {isLocked && !isExpired && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ zIndex: 20, borderRadius: 16 }}>
          {lockedLabel && (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, background: "rgba(0,0,0,0.8)", padding: "4px 10px", borderRadius: 6 }}>
              Exclusivo do {lockedLabel}
            </span>
          )}
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(255,255,255,0.15)" }}>
            <Lock className="w-6 h-6 text-black" />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onLockedClick?.(); }}
            className="animate-pulse-glow-green"
            style={{ padding: "10px 24px", borderRadius: 999, background: "#00FF7F", color: "#000", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", letterSpacing: "0.5px" }}
          >
            Adquira já
          </button>
        </div>
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
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: "#EF4444" }}>AO VIVO</span>
              </>
            ) : countdown ? (
              <>
                <Clock className="w-3 h-3" style={{ color: "#94A3B8" }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, color: "#94A3B8" }}>{countdown}</span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "transparent" }}>—</span>
            )}
          </div>

          {isExpired ? (
            <div style={{ background: "rgba(75,85,99,0.25)", border: "1px solid rgba(75,85,99,0.5)", color: expiredColor, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase" as const, padding: "2px 10px", borderRadius: 6 }}>
              EXPIRADA
            </div>
          ) : (
            <div style={{ background: `${tierColor}26`, border: `1px solid ${tierColor}66`, color: tierColor, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase" as const, padding: "2px 10px", borderRadius: 6 }}>
              {config.label}
            </div>
          )}

          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: isExpired ? "#6B7280" : "#FFFFFF", width: 70, flexShrink: 0, textAlign: "right" as const }}>
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
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: 82,
            padding: "6px 10px 2px 10px",
            filter: "saturate(0)",
            opacity: 0.4
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid rgba(255,255,255,0.2)"
            }}>
              {type === "ALAVANCAGEM"
                ? <TrendingUp style={{ width: 28, height: 28, color: "#fff" }} />
                : <Trophy style={{ width: 28, height: 28, color: "#fff" }} />
              }
            </div>
          </div>
        )}

        {/* Line 3: recommendation + odd */}
        {!isLocked ? (
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0px 10px 4px 10px",
          }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: isExpired ? "#6B7280" : "#FFFFFF", flex: 1, paddingRight: 8, lineHeight: 1.2 }}>
              {type === "ALAVANCAGEM" ? "Alavancagem do Dia" : "Múltipla do Dia"}
            </span>
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#94A3B8" }}>Odd</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: isExpired ? "#6B7280" : tierColor, lineHeight: 1 }}>
                {odds.toFixed(2)}
              </span>
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
                background: isExpired ? "#374151" : "#00FF7F",
                color: isExpired ? "#6B7280" : "#000000",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.5px",
                padding: "7px 0",
                borderRadius: 8,
                border: "none",
                cursor: isExpired ? "not-allowed" : "pointer",
                textTransform: "uppercase" as const,
              }}
            >
              {isExpired ? "EXPIRADA" : "ADICIONAR"}
            </button>

            <button
              onClick={handleOpenJustificativaClick}
              style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <HelpCircle className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>

            <button
              onClick={handleOpenJustificativaClick}
              style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <BarChart3 className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>
          </div>
        ) : (
          <div style={{ height: 42 }} />
        )}
      </div>
    </div>
  );
};
