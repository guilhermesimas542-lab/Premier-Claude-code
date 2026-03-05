/** Shared audience segmentation utilities used by Pay Cards and Card blocking logic */

export interface AudienceSegment {
  value: string;
  label: string;
  group: string;
}

export const AUDIENCE_SEGMENTS: AudienceSegment[] = [
  // Gerais
  { value: "all", label: "Todos os Usuários", group: "Gerais" },
  { value: "all_paid", label: "Todos os Usuários Pagantes", group: "Gerais" },
  { value: "all_free", label: "Todos os Usuários Gratuitos", group: "Gerais" },
  // Planos Base
  { value: "has_basic", label: "Possui Plano Básico", group: "Planos Base" },
  { value: "no_basic", label: "Não Possui Plano Básico", group: "Planos Base" },
  { value: "has_pro", label: "Possui Plano Pro", group: "Planos Base" },
  { value: "no_pro", label: "Não Possui Plano Pro", group: "Planos Base" },
  { value: "has_ultra", label: "Possui Plano Ultra", group: "Planos Base" },
  { value: "no_ultra", label: "Não Possui Plano Ultra", group: "Planos Base" },
  // Add-ons
  { value: "has_vitalicio", label: "Possui Plano Vitalício", group: "Add-ons" },
  { value: "no_vitalicio", label: "Não Possui Plano Vitalício", group: "Add-ons" },
  { value: "has_alavancagem", label: "Possui Add-on Alavancagem", group: "Add-ons" },
  { value: "no_alavancagem", label: "Não Possui Add-on Alavancagem", group: "Add-ons" },
  { value: "has_desaltas", label: "Possui Add-on Odds Altas", group: "Add-ons" },
  { value: "no_desaltas", label: "Não Possui Add-on Odds Altas", group: "Add-ons" },
  { value: "has_live_telegram", label: "Possui Add-on Live Telegram", group: "Add-ons" },
  { value: "no_live_telegram", label: "Não Possui Add-on Live Telegram", group: "Add-ons" },
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

  for (const c of criteria) {
    switch (c) {
      case "all": break;
      case "all_paid": if (userTier === "free") return false; break;
      case "all_free": if (userTier !== "free") return false; break;
      case "has_basic": if (userTier !== "basic") return false; break;
      case "no_basic": if (userTier === "basic") return false; break;
      case "has_pro": if (userTier !== "pro") return false; break;
      case "no_pro": if (userTier === "pro") return false; break;
      case "has_ultra": if (userTier !== "ultra") return false; break;
      case "no_ultra": if (userTier === "ultra") return false; break;
      case "has_vitalicio": if (!isVitalicio) return false; break;
      case "no_vitalicio": if (isVitalicio) return false; break;
      case "has_alavancagem": if (!activeAddons.includes("alavancagem")) return false; break;
      case "no_alavancagem": if (activeAddons.includes("alavancagem")) return false; break;
      case "has_desaltas": if (!activeAddons.includes("desaltas")) return false; break;
      case "no_desaltas": if (activeAddons.includes("desaltas")) return false; break;
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
