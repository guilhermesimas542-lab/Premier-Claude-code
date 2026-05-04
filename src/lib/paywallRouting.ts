// Paywall routing: (user tier) × (locked feature) → which popup to show
export type FeatureKey =
  | "free"
  | "odds_safes"
  | "odds_pro"
  | "alavancagem"
  | "multiplas_bingo"
  | "mercados_secundarios"
  | "esportes_americanos";

export type PaywallVariant =
  | "telegram"          // free tab → telegram
  | "premium"           // R$47 — free user, odds_safes/odds_pro
  | "diamante"          // R$147 — free user, diamante-only feature
  | "diamante_upgrade"; // R$127 — premium user upgrading

export const FEATURE_LABELS: Record<Exclude<FeatureKey, "free">, string> = {
  odds_safes: "Odds Safes",
  odds_pro: "Odds Pró",
  alavancagem: "Alavancagem",
  multiplas_bingo: "Múltiplas / Bingo",
  mercados_secundarios: "Mercados Secundários",
  esportes_americanos: "Esportes Americanos",
};

const DIAMANTE_ONLY: FeatureKey[] = [
  "alavancagem",
  "multiplas_bingo",
  "mercados_secundarios",
  "esportes_americanos",
];

/** Resolve which paywall variant to show, based on user tier + clicked feature */
export function resolvePaywallVariant(
  feature: FeatureKey,
  userTier: string,
): PaywallVariant {
  if (feature === "free") return "telegram";
  const isDiamanteOnly = DIAMANTE_ONLY.includes(feature);

  if (userTier === "premium") {
    return isDiamanteOnly ? "diamante_upgrade" : "premium"; // premium fallback shouldn't happen (no lock)
  }
  // free / legacy basic/pro/ultra → treated as needing the main paywall
  return isDiamanteOnly ? "diamante" : "premium";
}

/** associated_plan slug for pay_cards lookup per variant */
export function variantToPlanKey(v: PaywallVariant): string | null {
  switch (v) {
    case "premium": return "premium";
    case "diamante": return "diamante";
    case "diamante_upgrade": return "diamante_upgrade";
    default: return null;
  }
}

/** associated_plan slug for the backredirect (per-feature avulso) */
export function featureToBackredirectPlanKey(f: FeatureKey): string | null {
  if (f === "free") return null;
  return f; // odds_safes, odds_pro, alavancagem, multiplas_bingo, mercados_secundarios, esportes_americanos
}

export const PRICES = {
  premium: 47,
  diamante: 147,
  diamante_upgrade: 127,
  backredirect: 37,
} as const;

export const TELEGRAM_URL_PLACEHOLDER = "https://t.me/+placeholder_premier_free";
