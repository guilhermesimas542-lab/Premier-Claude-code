import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpCircle, Info, Link2, Clock, Layers, BarChart3, Lock, BadgeCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ShirtIcon } from "./ShirtIcon";
import { getTeamLogo } from "@/lib/teamLogos";
import { TipHowItWorksModal } from "./TipHowItWorksModal";
import { useActivationLock } from "@/components/onboarding/ActivationGateProvider";

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
  hideTimer?: boolean;
  showVerifiedBadge?: boolean;
  onAddTip?: () => void;
  onViewAnalysis?: () => void;
  onOpenJustificativa?: (texto: string) => void;
  onLockedClick?: () => void;
}


const TIER_COLORS: Record<string, string> = {
  "GRÁTIS": "#94A3B8",
  "BÁSICO": "#60A5FA",
  "PRO": "#e9b949",
  "ULTRA": "#7C3AED",
  "MÚLTIPLA": "#7C3AED",
};

const TIER_GRADIENTS: Record<string, string> = {
  "GRÁTIS": "none",
  "BÁSICO": "linear-gradient(135deg, rgba(96,165,250,0.08) 0%, transparent 60%)",
  "PRO": "linear-gradient(135deg, rgba(233,185,73,0.08) 0%, transparent 60%)",
  "ULTRA": "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 60%)",
  "MÚLTIPLA": "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 60%)",
};

// Helper function to generate bet explanation
const getBetExplanation = (betChoice: string): string => {
  const betLower = betChoice.toLowerCase();
  const masDeMatch = betLower.match(/(?:m[aá]s de|mais de)\s*(\d+[.,]?\d*)/);
  if (masDeMatch) {
    const value = parseFloat(masDeMatch[1].replace(",", "."));
    return `Necesita salir ${Math.ceil(value)} o más para ganar.`;
  }
  const menosDeMatch = betLower.match(/menos de\s*(\d+[.,]?\d*)/);
  if (menosDeMatch) {
    const value = parseFloat(menosDeMatch[1].replace(",", "."));
    return `Necesita tener máximo ${Math.floor(value)} para ganar.`;
  }
  if (betLower === "sí" || betLower === "si" || betLower === "sim") return "La condición del mercado tiene que ocurrir.";
  if (betLower === "no" || betLower === "não") return "La condición del mercado NO puede ocurrir.";
  return "El partido tiene que seguir exactamente esa condición.";
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

/**
 * Escudo do time: usa a logo explícita se vier; senão busca no bucket
 * compartilhado team_logos pelo nome; senão cai no ShirtIcon (camisa).
 */
function TeamCrest({ team, isExpired }: { team: TeamWithShirt; isExpired: boolean }) {
  const [bucketLogo, setBucketLogo] = useState<string | null>(null);
  useEffect(() => {
    if (team.logo) return;
    let alive = true;
    getTeamLogo(team.name).then((u) => { if (alive) setBucketLogo(u); });
    return () => { alive = false; };
  }, [team.logo, team.name]);

  const logo = team.logo || bucketLogo;
  return (
    <div style={{ width: 62, height: 62, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)" }}>
      {logo ? (
        <img src={logo} alt={team.name} className={isExpired ? "opacity-50" : ""} style={{ width: 48, height: 48, objectFit: "contain" }} />
      ) : team.shirt ? (
        <ShirtIcon variant={team.shirt.variant} primaryColor={team.shirt.primaryColor} secondaryColor={team.shirt.secondaryColor} size={50} />
      ) : (
        <ShirtIcon variant="solid" primaryColor="#6B7280" size={50} />
      )}
    </div>
  );
}

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
  hideTimer = false,
  showVerifiedBadge = false,
  onAddTip,
  onOpenJustificativa,
  onLockedClick,
}: PremiumBettingCardProps) => {

  const [showBetHelp, setShowBetHelp] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const betHelpRef = useRef<HTMLDivElement>(null);
  const { isLocked: gateLocked, requestActivation } = useActivationLock();

  const handleAddTip = () => {
    if (gateLocked) { requestActivation(); return; }
    onAddTip?.();
  };

  const handleLockedClick = () => {
    if (gateLocked) { requestActivation(); return; }
    onLockedClick?.();
  };

  const displayTier = getDisplayTier(tier);
  const tierColor = TIER_COLORS[displayTier] || TIER_COLORS["BÁSICO"];
  const tierGradient = TIER_GRADIENTS[displayTier] || "none";
  const betExplanation = getBetExplanation(betChoice);
  const isExpired = isExpiredProp || isExpiredLocal;
  const isMultiple = tier === "MÚLTIPLA" || tier === "ULTRA" || (selectionsCount && selectionsCount > 1);
  const displaySelectionsCount = selectionsCount || (tier === "ULTRA" ? 3 : 2);

  useEffect(() => {
    if (hideTimer) { setCountdown(""); return; }
    if (!startsAt || isExpiredProp) { setCountdown(""); return; }
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(startsAt).getTime();
      const remaining = Math.floor((target - now) / 1000);
      setCountdown(remaining > 0 ? formatCountdown(remaining) : "EN VIVO");
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startsAt, isExpiredProp, hideTimer]);


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
        background: isExpired ? "#0A0F1A" : `${tierGradient}, #0c0d11`,
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

      {/* Locked Overlay */}
      {isLocked && !isExpired && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ zIndex: 20, borderRadius: 16 }}>
          {lockedLabel && (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, background: "rgba(0,0,0,0.8)", padding: "4px 10px", borderRadius: 6 }}>
              Exclusivo del {lockedLabel}
            </span>
          )}
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(255,255,255,0.15)" }}>
            <Lock className="w-6 h-6 text-black" />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleLockedClick(); }}
            className="animate-pulse-glow-green"
            style={{ padding: "10px 24px", borderRadius: 999, background: "#e9b949", color: "#000", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", letterSpacing: "0.5px" }}
          >
            Adquiere ya
          </button>
        </div>
      )}

      {isLocked && !isExpired && odds > 0 && (
        <div
          className="animate-pulse-glow-green"
          style={{
            position: "absolute",
            bottom: 12,
            right: 14,
            zIndex: 25,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 28,
            color: "#e9b949",
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {(odds * 2).toFixed(2)}
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
            {hideTimer ? (
              <span style={{ fontSize: 12, color: "transparent" }}>—</span>
            ) : isLocked ? (
              <span style={{ fontSize: 12, color: "transparent" }}>—</span>
            ) : countdown === "EN VIVO" ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: "#EF4444" }}>EN VIVO</span>
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
          padding: "6px 10px 8px 10px",
          minHeight: "100px",
          position: "relative",
        }}>
          {/* Team 1 */}
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
            <TeamCrest team={team1} isExpired={isExpired} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isExpired ? "#6B7280" : "#FFFFFF", textAlign: "center" as const, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 2 }}>
              {team1.name}
            </span>
          </div>

          {/* VS */}
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#94A3B8", marginTop: 28 }}>VS</span>

          {/* Team 2 */}
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
            <TeamCrest team={team2} isExpired={isExpired} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isExpired ? "#6B7280" : "#FFFFFF", textAlign: "center" as const, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 2 }}>
              {team2.name}
            </span>
          </div>
        </div>


        {/* Line 3: market + recommendation + odd (descriptive block — lead copia manualmente) */}
        {!isLocked ? (
          <div style={{
            margin: "0 10px 6px 10px",
            padding: "6px 10px 8px 10px",
            background: isExpired ? "rgba(255,255,255,0.02)" : `${tierColor}0D`,
            border: `1px solid ${isExpired ? "rgba(255,255,255,0.06)" : `${tierColor}33`}`,
            borderRadius: 10,
          }}>
            {market && (
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#94A3B8", letterSpacing: "0.8px", textTransform: "uppercase" as const }}>
                  Mercado
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: isExpired ? "#6B7280" : "rgba(255,255,255,0.85)", textAlign: "right" as const, lineHeight: 1.2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {market}
                </span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" as const }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#94A3B8", letterSpacing: "0.8px", textTransform: "uppercase" as const }}>
                  Selección
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: isExpired ? "#6B7280" : "#FFFFFF", lineHeight: 1.2, paddingRight: 8 }}>
                  {betChoice}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#94A3B8", letterSpacing: "0.8px", textTransform: "uppercase" as const }}>
                  Cuota
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: isExpired ? "#6B7280" : tierColor, lineHeight: 1 }}>
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
              onClick={isExpired ? undefined : handleAddTip}
              disabled={isExpired}
              style={{
                flex: 1,
                background: isExpired ? "#374151" : "rgba(255,255,255,0.9)",
                color: isExpired ? "#6B7280" : "#14151a",
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
              {isExpired ? "EXPIRADA" : "AÑADIR"}
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
                    <strong className="text-[#e9b949]">{betChoice}:</strong> {betExplanation}
                  </p>
                </div>
              )}
            </div>

            {showVerifiedBadge ? (
              <div
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(233,185,73,0.12)", border: "1px solid rgba(233,185,73,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label="Verificado"
              >
                <BadgeCheck className="w-5 h-5" style={{ color: "#e9b949" }} />
              </div>
            ) : (
              <button
                onClick={() => onOpenJustificativa?.(justificativa || "Próximamente: dados e percentuais do confronto.")}
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <BarChart3 className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
              </button>
            )}
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
              <Info className="w-3 h-3" style={{ color: tierColor }} />
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
