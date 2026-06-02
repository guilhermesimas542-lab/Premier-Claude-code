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

  // Card is rendered at mobile width (380px) and scaled 2.4x to feel pixel-perfect
  // with what users see on /sport. Scale doesn't reserve layout space, so the
  // wrapper hard-codes the post-scale footprint (912x ~ matches a tall card).
  const CARD_BASE_W = 380;
  const CARD_SCALE = 2.4;
  const CARD_W = CARD_BASE_W * CARD_SCALE; // 912
  const CARD_RESERVED_H = 900; // visual reserve for the scaled card

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
        padding: "80px 60px",
        boxSizing: "border-box",
        fontFamily: FONT_HEADING,
        color: "#FFFFFF",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: FONT_HEADING,
          fontWeight: 900,
          fontSize: 72,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: GREEN,
          textShadow: `0 0 28px ${GREEN}55`,
          textAlign: "center",
        }}
      >
        Mais um acerto
      </div>

      {/* Card area — reserves space for the scaled card */}
      <div
        style={{
          marginTop: 60,
          width: CARD_W,
          height: CARD_RESERVED_H,
          position: "relative",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: CARD_BASE_W,
            transform: `scale(${CARD_SCALE})`,
            transformOrigin: "top center",
          }}
        >
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

        {/* Verified seal — top right of the card footprint */}
        <div
          style={{
            position: "absolute",
            top: -28,
            right: -28,
            width: 104,
            height: 104,
            borderRadius: "50%",
            background: BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 30px ${GREEN}88`,
            zIndex: 5,
          }}
        >
          <BadgeCheck style={{ width: 96, height: 96, color: GREEN, fill: GREEN, stroke: BG, strokeWidth: 2 }} />
        </div>
      </div>

      {/* GREEN badge */}
      <div
        style={{
          marginTop: 80,
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          background: GREEN,
          color: "#000000",
          padding: "24px 56px",
          borderRadius: 999,
          fontFamily: FONT_HEADING,
          fontWeight: 900,
          boxShadow: `0 0 48px ${GREEN}66`,
        }}
      >
        <span style={{ fontSize: 52, lineHeight: 1 }}>✓</span>
        <span style={{ fontSize: 60, letterSpacing: 3 }}>GREEN</span>
        <span style={{ fontSize: 46, opacity: 0.85 }}>@{oddLabel}</span>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          fontFamily: FONT_HEADING,
          fontWeight: 900,
          fontSize: 48,
          letterSpacing: 8,
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
