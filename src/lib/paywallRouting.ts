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
  odds_safes: "Odds Safes",
  odds_pro: "Odds Pró",
  alavancagem: "Alavancagem",
  multiplas_bingo: "Múltiplas / Bingo",
  mercados_secundarios: "Mercados Secundários",
  esportes_americanos: "Esportes Americanos",
  odds_ultra: "Odds Ultra",
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

  if (userTier === "premium") {
    return isDiamanteOnly ? "diamante_upgrade" : "premium"; // premium fallback shouldn't happen (no lock)
  }
  // free / legacy basic/pro/ultra → sempre Premium R$47 (qualquer cadeado)
  return "premium";
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
  odds_safes: "Entenda como funciona as Odds Safes",
  odds_pro: "Entenda como funciona as Odds Pró",
  alavancagem: "Entenda como funciona a Alavancagem",
  multiplas_bingo: "Entenda como funciona as Múltiplas",
  mercados_secundarios: "Entenda como funciona os Mercados Secundários",
  esportes_americanos: "Entenda como funciona o mercado de Esportes Americanos",
  odds_ultra: "Entenda como funciona as Odds Ultra",
};

/** Short explanation copy used in step 1 of diamante_upgrade popup (placeholder, will be replaced later) */
export const FEATURE_EXPLANATIONS: Record<Exclude<FeatureKey, "free">, string> = {
  odds_safes: "Placeholder: explicação curta de Odds Safes em 2-3 linhas.",
  odds_pro: "Placeholder: explicação curta de Odds Pró em 2-3 linhas.",
  alavancagem: "Placeholder: a Alavancagem é uma estratégia avançada que permite multiplicar entradas em sequência. Use pra escalar banca de forma controlada.",
  multiplas_bingo: "Placeholder: Múltiplas/Bingo é uma estratégia que combina várias odds em um único bilhete. Use pra maximizar retorno em jogos correlacionados.",
  mercados_secundarios: "Placeholder: Mercados Secundários cobrem apostas além do resultado principal (cantos, cartões, escanteios). Use pra encontrar valor escondido.",
  esportes_americanos: "Placeholder: Esportes Americanos cobrem NBA, NFL, MLB e NHL. Use pra diversificar sua banca em mercados de alta liquidez.",
  odds_ultra: "Placeholder: Odds Ultra são entradas premium com odds elevadas selecionadas pelo time. Use pra maximizar retorno em jogadas de alto valor.",
};

export const PRICES = {
  premium: 47,
  diamante: 147,
  diamante_upgrade: 127,
  /** preço cheio do avulso (backredirect / etapa 2 do upgrade) */
  backredirect: "39,90",
  /** preço descontado do avulso (backredirect — uso único por user) */
  backredirect_discount: "29,90",
} as const;

export const TELEGRAM_URL_PLACEHOLDER = "https://t.me/+placeholder_premier_free";
export const TELEGRAM_SUPPORT_URL_PLACEHOLDER = "https://t.me/+placeholder_premier_support";
