import React from "react";
import { PremiumBettingCard, type TeamWithShirt } from "@/components/PremiumBettingCard";
import { BadgeCheck } from "lucide-react";
import type { TipForExport } from "@/admin/lib/exportTipPng";

interface Props {
  tip: TipForExport;
}

const BG = "#060D1E";
const GREEN = "#00FF7F";
const FONT_HEADING = "'Barlow Condensed', sans-serif";

/** Maps tip tier_required + addon_required → display tier expected by PremiumBettingCard */
function resolveDisplayTier(tip: TipForExport): "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" | "ULTRA" {
  const addon = tip.addon_required;
  if (addon === "multiplas_bingo") return "MÚLTIPLA";
  const tier = tip.tier_required;
  if (tier === "ultra") return "ULTRA";
  if (tier === "pro") return "PRO";
  if (tier === "basic") return "BÁSICO";
  return "GRÁTIS";
}

function buildTeam(
  name: string | null | undefined,
  logo: string | null | undefined,
  variant: string | null | undefined,
  primary: string | null | undefined,
  secondary: string | null | undefined,
): TeamWithShirt {
  const team: TeamWithShirt = { name: name || "" };
  if (logo) team.logo = logo;
  if (variant && primary) {
    team.shirt = {
      variant: variant === "stripes" ? "stripes" : "solid",
      primaryColor: primary,
      secondaryColor: secondary || undefined,
    };
  }
  return team;
}

export const GreenStoryExport = React.forwardRef<HTMLDivElement, Props>(({ tip }, ref) => {
  const team1 = buildTeam(
    tip.team1_name,
    tip.team1_logo_url,
    tip.team1_shirt_variant,
    tip.team1_primary_color,
    tip.team1_secondary_color,
  );
  const team2 = buildTeam(
    tip.team2_name,
    tip.team2_logo_url,
    tip.team2_shirt_variant,
    tip.team2_primary_color,
    tip.team2_secondary_color,
  );

  const oddLabel = tip.odds != null && !isNaN(tip.odds) ? tip.odds.toFixed(2) : "—";

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        background: `radial-gradient(circle at 50% 18%, rgba(0,255,127,0.18) 0%, transparent 55%), linear-gradient(180deg, #050913 0%, ${BG} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 60px",
        boxSizing: "border-box",
        gap: 56,
        fontFamily: FONT_HEADING,
        color: "#FFFFFF",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: FONT_HEADING,
          fontWeight: 900,
          fontSize: 64,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: GREEN,
          textShadow: `0 0 28px ${GREEN}55`,
        }}
      >
        Mais um acerto
      </div>

      {/* Card + verified seal */}
      <div style={{ position: "relative", width: 760 }}>
        <div style={{ transform: "scale(1.6)", transformOrigin: "top center" }}>
          <PremiumBettingCard
            tipId={0}
            tier={resolveDisplayTier(tip)}
            team1={team1}
            team2={team2}
            market={tip.market || ""}
            betChoice={tip.bet_choice || ""}
            odds={tip.odds || 0}
            matchDate={tip.match_date || undefined}
            hideTimer
          />
        </div>

        {/* Verified seal — top right of card */}
        <div
          style={{
            position: "absolute",
            top: -22,
            right: -22,
            width: 92,
            height: 92,
            borderRadius: "50%",
            background: BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 30px ${GREEN}88`,
            zIndex: 5,
          }}
        >
          <BadgeCheck style={{ width: 84, height: 84, color: GREEN, fill: GREEN, stroke: BG, strokeWidth: 2 }} />
        </div>
      </div>

      {/* GREEN badge with odd */}
      <div
        style={{
          marginTop: 220,
          display: "inline-flex",
          alignItems: "center",
          gap: 18,
          background: GREEN,
          color: "#000000",
          padding: "20px 44px",
          borderRadius: 999,
          fontFamily: FONT_HEADING,
          fontWeight: 900,
          boxShadow: `0 0 48px ${GREEN}66`,
        }}
      >
        <span style={{ fontSize: 44, lineHeight: 1 }}>✓</span>
        <span style={{ fontSize: 52, letterSpacing: 3 }}>GREEN</span>
        <span style={{ fontSize: 40, opacity: 0.85 }}>@{oddLabel}</span>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          fontFamily: FONT_HEADING,
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: GREEN,
        }}
      >
        PREMIERFCAPP.COM
      </div>
    </div>
  );
});

GreenStoryExport.displayName = "GreenStoryExport";
