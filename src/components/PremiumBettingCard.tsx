import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpCircle, Info, Link2, Clock, Layers, BarChart3, Lock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ShirtIcon } from "./ShirtIcon";

export interface ShirtConfig {
  variant: "solid" | "stripes";
  primaryColor: string;
  secondaryColor?: string;
}

export interface TeamWithShirt {
  name: string;
  logo?: string;
  shirt?: ShirtConfig;
}

interface PremiumBettingCardProps {
  tipId: number;
  tier: "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" | "ULTRA";
  tierSubtitle?: string;
  team1: TeamWithShirt;
  team2: TeamWithShirt;
  market: string;
  betChoice: string;
  odds: number;
  matchDate?: string;
  startsAt?: string;
  expirationDate?: string;
  selectionsCount?: number;
  insights?: string;
  footer?: string;
  lineAlert?: boolean;
  isLocked?: boolean;
  lockedLabel?: string;
  isExpired?: boolean;
  justificativa?: string;
  onAddTip?: () => void;
  onViewAnalysis?: () => void;
  onOpenJustificativa?: (texto: string) => void;
  onLockedClick?: () => void;
}

const TIER_COLORS: Record<string, string> = {
  "GRÁTIS": "#94A3B8",
  "BÁSICO": "#60A5FA",
  "PRO": "#00E87A",
  "ULTRA": "#7C3AED",
  "MÚLTIPLA": "#7C3AED",
};

const TIER_GRADIENTS: Record<string, string> = {
  "GRÁTIS": "none",
  "BÁSICO": "linear-gradient(135deg, rgba(96,165,250,0.08) 0%, transparent 60%)",
  "PRO": "linear-gradient(135deg, rgba(0,232,122,0.08) 0%, transparent 60%)",
  "ULTRA": "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 60%)",
  "MÚLTIPLA": "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 60%)",
};

// Helper function to generate bet explanation
const getBetExplanation = (betChoice: string): string => {
  const betLower = betChoice.toLowerCase();
  const maisDeMatch = betLower.match(/mais de\s*(\d+[.,]?\d*)/);
  if (maisDeMatch) {
    const value = parseFloat(maisDeMatch[1].replace(",", "."));
    return `Precisa sair ${Math.ceil(value)} ou mais para bater.`;
  }
  const menosDeMatch = betLower.match(/menos de\s*(\d+[.,]?\d*)/);
  if (menosDeMatch) {
    const value = parseFloat(menosDeMatch[1].replace(",", "."));
    return `Precisa ter no máximo ${Math.floor(value)} para bater.`;
  }
  if (betLower === "sim") return "A condição do mercado precisa acontecer.";
  if (betLower === "não") return "A condição do mercado NÃO pode acontecer.";
  return "O jogo precisa seguir exatamente essa condição.";
};

const formatCountdown = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const getDisplayTier = (tier: string): "GRÁTIS" | "BÁSICO" | "PRO" | "ULTRA" => {
  if (tier === "MÚLTIPLA") return "PRO";
  if (tier === "ULTRA") return "ULTRA";
  if (tier === "PRO") return "PRO";
  if (tier === "GRÁTIS") return "GRÁTIS";
  return "BÁSICO";
};

export const PremiumBettingCard = ({
  tipId,
  tier,
  team1,
  team2,
  market,
  betChoice,
  odds,
  matchDate,
  startsAt,
  expirationDate,
  selectionsCount,
  isLocked = false,
  lockedLabel,
  isExpired: isExpiredProp = false,
  justificativa,
  onAddTip,
  onOpenJustificativa,
  onLockedClick,
}: PremiumBettingCardProps) => {
  const [showBetHelp, setShowBetHelp] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState(false);
  const betHelpRef = useRef<HTMLDivElement>(null);

  const displayTier = getDisplayTier(tier);
  const tierColor = TIER_COLORS[displayTier] || TIER_COLORS["BÁSICO"];
  const tierGradient = TIER_GRADIENTS[displayTier] || "none";
  const betExplanation = getBetExplanation(betChoice);
  const isExpired = isExpiredProp || isExpiredLocal;
  const isMultiple = tier === "MÚLTIPLA" || tier === "ULTRA" || (selectionsCount && selectionsCount > 1);
  const displaySelectionsCount = selectionsCount || (tier === "ULTRA" ? 3 : 2);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (betHelpRef.current && !betHelpRef.current.contains(event.target as Node)) {
        setShowBetHelp(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const expiredColor = "#4B5563";

  return (
    <div
      className="select-none relative flex flex-col w-full"
      style={{
        background: isExpired ? "#0A0F1A" : `${tierGradient}, #060D1E`,
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

      {/* Expired overlay */}
      {isExpired && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10, borderRadius: 16 }}>
          <Link2 className="w-20 h-20 text-gray-500/20 rotate-45" />
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
          {/* Timer */}
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

          {/* Badge — center */}
          {isExpired ? (
            <div style={{ background: "rgba(75,85,99,0.25)", border: "1px solid rgba(75,85,99,0.5)", color: expiredColor, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase" as const, padding: "2px 10px", borderRadius: 6 }}>
              EXPIRADA
            </div>
          ) : (
            <div style={{ background: `${tierColor}26`, border: `1px solid ${tierColor}66`, color: tierColor, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase" as const, padding: "2px 10px", borderRadius: 6 }}>
              {displayTier}
            </div>
          )}

          {/* Match time */}
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: isExpired ? "#6B7280" : "#FFFFFF", width: 70, flexShrink: 0, textAlign: "right" as const }}>
            {matchDate || "—"}
          </span>
        </div>

        {/* Line 2: shields */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 12,
          padding: "6px 10px 2px 10px",
          height: "82px",
          position: "relative",
        }}>
          {/* Team 1 */}
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
            <div style={{ width: 62, height: 62, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)" }}>
              {team1.logo ? (
                <img src={team1.logo} alt={team1.name} className={isExpired ? "opacity-50" : ""} style={{ width: 48, height: 48, objectFit: "contain" }} />
              ) : team1.shirt ? (
                <ShirtIcon variant={team1.shirt.variant} primaryColor={team1.shirt.primaryColor} secondaryColor={team1.shirt.secondaryColor} size={50} />
              ) : (
                <ShirtIcon variant="solid" primaryColor="#6B7280" size={50} />
              )}
            </div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isExpired ? "#6B7280" : "#FFFFFF", textAlign: "center" as const, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 2 }}>
              {team1.name}
            </span>
          </div>

          {/* VS */}
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#94A3B8", marginTop: 28 }}>VS</span>

          {/* Team 2 */}
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
            <div style={{ width: 62, height: 62, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)" }}>
              {team2.logo ? (
                <img src={team2.logo} alt={team2.name} className={isExpired ? "opacity-50" : ""} style={{ width: 48, height: 48, objectFit: "contain" }} />
              ) : team2.shirt ? (
                <ShirtIcon variant={team2.shirt.variant} primaryColor={team2.shirt.primaryColor} secondaryColor={team2.shirt.secondaryColor} size={50} />
              ) : (
                <ShirtIcon variant="solid" primaryColor="#6B7280" size={50} />
              )}
            </div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isExpired ? "#6B7280" : "#FFFFFF", textAlign: "center" as const, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 2 }}>
              {team2.name}
            </span>
          </div>
        </div>


        {/* Line 3: recommendation + odd */}
        {!isLocked && (
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0px 10px 4px 10px",
          }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: isExpired ? "#6B7280" : "#FFFFFF", flex: 1, paddingRight: 8, lineHeight: 1.2 }}>
              {betChoice}
            </span>
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#94A3B8" }}>Odd</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: isExpired ? "#6B7280" : tierColor, lineHeight: 1 }}>
                {odds.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Line 4: buttons */}
        {!isLocked && (
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

            <div className="relative" ref={betHelpRef}>
              <button
                onClick={() => setShowBetHelp(!showBetHelp)}
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <HelpCircle className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
              </button>
              {showBetHelp && (
                <div className="absolute right-0 bottom-12 w-44 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2 shadow-xl z-50">
                  <p className="text-[11px] text-white/90 leading-relaxed">
                    <strong className="text-emerald-400">{betChoice}:</strong> {betExplanation}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => onOpenJustificativa?.(justificativa || "Em breve: dados e percentuais do confronto.")}
              style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <BarChart3 className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
