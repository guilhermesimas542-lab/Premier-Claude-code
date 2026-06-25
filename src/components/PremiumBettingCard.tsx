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


// Claude Design: acento de marca dourado. A cor da ODD agora é o verde do design (#6fb58c)
// independente do tier; o tier vira só um selo discreto cinza/dourado.
const ODD_GREEN = "#6fb58c";

const TIER_COLORS: Record<string, string> = {
  "GRÁTIS": "#9a9ca4",
  "BÁSICO": "#9a9ca4",
  "PRO": "#e9b949",
  "ULTRA": "#c9a56b",
  "MÚLTIPLA": "#c9a56b",
};

// Fundo glass do design: leve azul → quase-preto → leve vermelho.
const GLASS_BG =
  "linear-gradient(100deg, rgba(47,107,214,0.5) -10%, rgba(11,12,16,0.93) 38%, rgba(11,12,16,0.95) 62%, rgba(196,48,46,0.5) 110%), #0c0d11";

const TIER_GRADIENTS: Record<string, string> = {
  "GRÁTIS": GLASS_BG,
  "BÁSICO": GLASS_BG,
  "PRO": GLASS_BG,
  "ULTRA": GLASS_BG,
  "MÚLTIPLA": GLASS_BG,
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
        background: isExpired ? "#0A0F1A" : tierGradient,
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
              onClick={(e) => { e.stopPropagation(); handleLockedClick(); }}
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

          {/* Badge — center */}
          {isExpired ? (
            <div style={{ background: "rgba(75,85,99,0.25)", border: "1px solid rgba(75,85,99,0.5)", color: expiredColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: 6 }}>
              EXPIRADA
            </div>
          ) : (
            <div style={{ background: displayTier === "PRO" || displayTier === "ULTRA" ? `${tierColor}14` : "transparent", border: `1px solid ${displayTier === "PRO" || displayTier === "ULTRA" ? `${tierColor}55` : "rgba(235,235,245,0.14)"}`, color: displayTier === "PRO" || displayTier === "ULTRA" ? tierColor : "#8c8e96", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: 6 }}>
              {displayTier}
            </div>
          )}

          {/* Match time */}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 11, color: isExpired ? "#6B7280" : "#9a9ca4", width: 70, flexShrink: 0, textAlign: "right" as const }}>
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
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isExpired ? "#6B7280" : "#ECEAE4", textAlign: "center" as const, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 2 }}>
              {team1.name}
            </span>
          </div>

          {/* VS */}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 11, color: "#6a6c74", marginTop: 30 }}>VS</span>

          {/* Team 2 */}
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
            <TeamCrest team={team2} isExpired={isExpired} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isExpired ? "#6B7280" : "#ECEAE4", textAlign: "center" as const, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 2 }}>
              {team2.name}
            </span>
          </div>
        </div>

        {/* Divisor gradiente (design) */}
        {!isLocked && !isExpired && (
          <div style={{ height: 1, margin: "0 14px 8px 14px", background: "linear-gradient(90deg, transparent, rgba(235,235,245,0.16), transparent)" }} />
        )}


        {/* Line 3: market + recommendation + odd (descriptive block — lead copia manualmente) */}
        {!isLocked ? (
          <div style={{
            margin: "0 14px 8px 14px",
            padding: 0,
          }}>
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
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: isExpired ? "#6B7280" : "#ECEAE4", lineHeight: 1.2, paddingRight: 8 }}>
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
              onClick={isExpired ? undefined : handleAddTip}
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

            <div className="relative" ref={betHelpRef}>
              <button
                onClick={() => setShowBetHelp(!showBetHelp)}
                style={{ width: 38, height: 38, borderRadius: 12, background: "transparent", border: "1px solid rgba(235,235,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
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
                style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(233,185,73,0.12)", border: "1px solid rgba(233,185,73,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label="Verificado"
              >
                <BadgeCheck className="w-5 h-5" style={{ color: "#e9b949" }} />
              </div>
            ) : (
              <button
                onClick={() => onOpenJustificativa?.(justificativa || "Próximamente: dados e percentuais do confronto.")}
                style={{ width: 38, height: 38, borderRadius: 12, background: "transparent", border: "1px solid rgba(235,235,245,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
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
