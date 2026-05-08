/** Shared audience segmentation utilities used by Pay Cards and Card blocking logic */

export interface AudienceSegment {
  value: string;
  label: string;
  group: string;
}

export const AUDIENCE_SEGMENTS: AudienceSegment[] = [
  // Generales
  { value: "all", label: "Todos los Usuarios", group: "Generales" },
  { value: "all_paid", label: "Todos los Usuarios Pagantes", group: "Generales" },
  { value: "all_free", label: "Todos los Usuarios Gratuitos", group: "Generales" },
  // Planes Base
  { value: "has_basic", label: "Tiene Plan Básico", group: "Planes Base" },
  { value: "no_basic", label: "No Tiene Plan Básico", group: "Planes Base" },
  { value: "has_pro", label: "Tiene Plan Pro", group: "Planes Base" },
  { value: "no_pro", label: "No Tiene Plan Pro", group: "Planes Base" },
  { value: "has_ultra", label: "Tiene Plan Ultra", group: "Planes Base" },
  { value: "no_ultra", label: "No Tiene Plan Ultra", group: "Planes Base" },
  // Add-ons
  { value: "has_vitalicio", label: "Tiene Plan Vitalicio", group: "Add-ons" },
  { value: "no_vitalicio", label: "No Tiene Plan Vitalicio", group: "Add-ons" },
  { value: "has_alavancagem", label: "Tiene Add-on Apalancamiento", group: "Add-ons" },
  { value: "no_alavancagem", label: "No Tiene Add-on Apalancamiento", group: "Add-ons" },
  { value: "has_multiplas_bingo", label: "Tiene Add-on Múltiples / Bingo", group: "Add-ons" },
  { value: "no_multiplas_bingo", label: "No Tiene Add-on Múltiples / Bingo", group: "Add-ons" },
  { value: "has_live_telegram", label: "Tiene Add-on Live Telegram", group: "Add-ons" },
  { value: "no_live_telegram", label: "No Tiene Add-on Live Telegram", group: "Add-ons" },
];

/** Parse a JSON array string or legacy single string into an array of criteria */
export function parseAudience(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return val ? [val] : [];
}

/** Check if a user matches ALL audience criteria (AND logic) */
export function matchesAudienceCriteria(
  criteria: string[],
  userTier: string,
  isVitalicio: boolean,
  activeAddons: string[],
): boolean {
  if (criteria.length === 0) return true; // No criteria = matches everyone

  // Normalize new tiers (premium/diamante) onto legacy buckets so segments keep
  // working before AND after the cutover migration.
  //   premium  ≡ basic
  //   diamante ≡ ultra (top tier)
  const tierIsBasic = userTier === "basic" || userTier === "premium";
  const tierIsPro = userTier === "pro";
  const tierIsUltra = userTier === "ultra" || userTier === "diamante";

  for (const c of criteria) {
    switch (c) {
      case "all": break;
      case "all_paid": if (userTier === "free") return false; break;
      case "all_free": if (userTier !== "free") return false; break;
      case "has_basic": if (!tierIsBasic) return false; break;
      case "no_basic": if (tierIsBasic) return false; break;
      case "has_pro": if (!tierIsPro) return false; break;
      case "no_pro": if (tierIsPro) return false; break;
      case "has_ultra": if (!tierIsUltra) return false; break;
      case "no_ultra": if (tierIsUltra) return false; break;
      case "has_vitalicio": if (!isVitalicio) return false; break;
      case "no_vitalicio": if (isVitalicio) return false; break;
      case "has_alavancagem": if (!activeAddons.includes("alavancagem")) return false; break;
      case "no_alavancagem": if (activeAddons.includes("alavancagem")) return false; break;
      case "has_multiplas_bingo": if (!activeAddons.includes("multiplas_bingo")) return false; break;
      case "no_multiplas_bingo": if (activeAddons.includes("multiplas_bingo")) return false; break;
      case "has_live_telegram": if (!activeAddons.includes("live_telegram")) return false; break;
      case "no_live_telegram": if (activeAddons.includes("live_telegram")) return false; break;
      default: break;
    }
  }
  return true;
}

/** Get label for a segment value */
export function getSegmentLabel(value: string): string {
  return AUDIENCE_SEGMENTS.find(s => s.value === value)?.label ?? value;
}
