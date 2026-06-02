import React from "react";
import { PremiumBettingCard, type TeamWithShirt } from "@/components/PremiumBettingCard";
import type { TipForExport } from "@/admin/lib/exportTipPng";

interface Props {
  tip: TipForExport;
}

const BG = "#060D1E";
const GREEN = "#00FF7F";

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

// Horizontal export — 1080x540 (2:1). Just the card + subtle gradient bg.
export const GreenHorizontalExport = React.forwardRef<HTMLDivElement, Props>(({ tip }, ref) => {
  const team1 = buildTeam(tip.team1_name, tip.team1_logo_url, tip.team1_shirt_variant, tip.team1_primary_color, tip.team1_secondary_color);
  const team2 = buildTeam(tip.team2_name, tip.team2_logo_url, tip.team2_shirt_variant, tip.team2_primary_color, tip.team2_secondary_color);

  // Card base 380px, scale to fit ~500px height comfortably.
  const CARD_BASE_W = 380;
  const CARD_SCALE = 1.35;
  const CARD_W = CARD_BASE_W * CARD_SCALE; // 513

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 540,
        background: `radial-gradient(circle at 50% 50%, rgba(0,255,127,0.14) 0%, transparent 60%), linear-gradient(180deg, #050913 0%, ${BG} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
    >
      <div style={{ width: CARD_W, height: 500, position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{ width: CARD_BASE_W, transform: `scale(${CARD_SCALE})`, transformOrigin: "top center" }}>
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

GreenHorizontalExport.displayName = "GreenHorizontalExport";
