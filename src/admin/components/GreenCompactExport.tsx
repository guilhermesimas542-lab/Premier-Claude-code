import React from "react";
import { PremiumBettingCard, type TeamWithShirt } from "@/components/PremiumBettingCard";
import type { TipForExport } from "@/admin/lib/exportTipPng";

interface Props {
  tip: TipForExport;
  scale?: number;
}

const BG = "#060D1E";

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

// Compact export — width 1080, height = content (no dead space).
// Uses CSS `zoom` so the scaled card properly contributes to layout height.
export const GreenCompactExport = React.forwardRef<HTMLDivElement, Props>(({ tip, scale = 1.85 }, ref) => {
  const team1 = buildTeam(tip.team1_name, tip.team1_logo_url, tip.team1_shirt_variant, tip.team1_primary_color, tip.team1_secondary_color);
  const team2 = buildTeam(tip.team2_name, tip.team2_logo_url, tip.team2_shirt_variant, tip.team2_primary_color, tip.team2_secondary_color);

  const CARD_BASE_W = 380;

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        background: `radial-gradient(circle at 50% 50%, rgba(0,255,127,0.12) 0%, transparent 65%), ${BG}`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxSizing: "border-box",
        padding: "12px 0",
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
    >
      <div style={{ width: CARD_BASE_W, ...( { zoom: scale } as React.CSSProperties) }}>
        <div style={{ width: CARD_BASE_W }}>
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
            showVerifiedBadge
          />
        </div>
      </div>
    </div>
  );
});

GreenCompactExport.displayName = "GreenCompactExport";
