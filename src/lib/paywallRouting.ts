// Paywall routing: (user tier) × (locked feature) → which popup to show
export type FeatureKey =
  | "free"
  | "odds_safes"
  | "odds_pro"
  | "alavancagem"
  | "multiplas_bingo"
  | "mercados_secundarios"
  | "esportes_americanos"
  | "odds_ultra";

export type PaywallVariant =
  | "telegram"          // free tab → telegram
  | "premium"           // R$47 — free user, odds_safes/odds_pro/mercados_secundarios
  | "diamante"          // R$147 — free user, diamante-only feature
  | "diamante_upgrade"; // R$127 — premium user upgrading

export const FEATURE_LABELS: Record<Exclude<FeatureKey, "free">, string> = {
  odds_safes: "Cuotas Safes",
  odds_pro: "Cuotas Pro",
  alavancagem: "Apalancamiento",
  multiplas_bingo: "Múltiples / Bingo",
  mercados_secundarios: "Mercados Secundarios",
  esportes_americanos: "Deportes Americanos",
  odds_ultra: "Cuotas Ultra",
};

// Premium-included (cumulativo): odds_safes, odds_pro, odds_ultra
// Diamante-only: alavancagem, multiplas_bingo, esportes_americanos, mercados_secundarios
const DIAMANTE_ONLY: FeatureKey[] = [
  "alavancagem",
  "multiplas_bingo",
  "esportes_americanos",
  "mercados_secundarios",
];

export const DIAMANTE_ONLY_FEATURES = DIAMANTE_ONLY;

/** Helper: features Diamante-only excluindo a passada (pro subtítulo "+ outras N funcionalidades") */
export function getOtherDiamanteFeatures(except: FeatureKey): Exclude<FeatureKey, "free">[] {
  return DIAMANTE_ONLY.filter((f) => f !== except && f !== "free") as Exclude<FeatureKey, "free">[];
}

/** Resolve which paywall variant to show, based on user tier + clicked feature */
export function resolvePaywallVariant(
  feature: FeatureKey,
  userTier: string,
): PaywallVariant {
  if (feature === "free") return "telegram";
  const isDiamanteOnly = DIAMANTE_ONLY.includes(feature);

  if (userTier === "premium" || userTier === "basic" || userTier === "pro") {
    return isDiamanteOnly ? "diamante_upgrade" : "premium";
  }
  // free / unknown tier
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

/** associated_plan slug for the backredirect (per-feature avulso, full price) */
export function featureToBackredirectPlanKey(f: FeatureKey): string | null {
  if (f === "free") return null;
  return f;
}

/** associated_plan slug for the DISCOUNTED avulso pay_card (one-time R$ 10 off) */
export function featureToDiscountPlanKey(f: FeatureKey): string | null {
  if (f === "free") return null;
  return `${f}_discount`;
}

/** Headline copy for step 1 of diamante_upgrade popup */
export const FEATURE_HEADLINES: Record<Exclude<FeatureKey, "free">, string> = {
  odds_safes: "Entiende cómo funcionan las Cuotas Safes",
  odds_pro: "Entiende cómo funcionan las Cuotas Pro",
  alavancagem: "Entiende cómo funciona el Apalancamiento",
  multiplas_bingo: "Entiende cómo funcionan las Múltiples",
  mercados_secundarios: "Entiende cómo funcionan los Mercados Secundarios",
  esportes_americanos: "Entiende cómo funcionan las Ligas Americanas",
  odds_ultra: "Entiende cómo funcionan las Cuotas Ultra",
};

/** Short explanation copy used in step 1 of the paywall popup */
export const FEATURE_EXPLANATIONS: Record<Exclude<FeatureKey, "free">, string> = {
  odds_safes: "Cuotas con alta probabilidad de acierto, generalmente entre 1.5x y 2x. Ideal para construir banca de forma consistente, con riesgo bajo.",
  odds_pro: "Cuotas más agresivas con riesgo moderado, generalmente entre 3x y 6x. Equilibra mayor retorno con probabilidad razonable de acierto.",
  odds_ultra: "Cuotas combinadas y agresivas con retorno de 6x a 12x. No es bingo — son tips calculados con alto potencial.",
  mercados_secundarios: "Apuestas más allá del resultado principal: córners, tarjetas, handicap, ambos marcan. Encuentra valor escondido en mercados menos obvios.",
  multiplas_bingo: "Cuotas combinadas de múltiples eventos con retorno entre 10x y 200x. Apuesta de baja entrada y alto potencial de multiplicación.",
  alavancagem: "Secuencia de 3 cuotas de bajo riesgo en el mismo día. A cada acierto, la ganancia se reinvierte en el siguiente, multiplicando el retorno final.",
  esportes_americanos: "Apuestas en ligas de EE.UU.: NBA, NFL, MLB, NHL. Mercados específicos del calendario americano con análisis dedicado para cada deporte.",
};

export const PRICES = {
  /** 14,90 — Premium in-app (free → premium) */
  premium: "14,90",
  /** 39,90 — Diamante in-app (free → diamante) */
  diamante: "39,90",
  /** 29,90 — Diamante upgrade in-app (premium → diamante) */
  diamante_upgrade: "29,90",
  /** 9,90 — preço cheio do avulso (backredirect / etapa 2 do upgrade) */
  backredirect: "9,90",
  /** 9,90 — preço descontado do avulso (backredirect — uso único por user) */
  backredirect_discount: "9,90",
} as const;

export const TELEGRAM_URL_PLACEHOLDER = "https://t.me/+placeholder_premier_free";
export const TELEGRAM_SUPPORT_URL_PLACEHOLDER = "https://t.me/+placeholder_premier_support";
