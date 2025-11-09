import { fetchAuth, getBetSiteType } from "./auth";
import { TipsResponse } from "@/types/tips";

export async function loadTipsForSport(sportId: number = 1): Promise<TipsResponse> {
  try {
    const betSiteType = getBetSiteType();
    const url = `https://apiv1.premierfc.app/api/v1/esportes/GetTipsBySportId?Sportid=${sportId}&betSite=${encodeURIComponent(betSiteType)}`;
    
    const data = await fetchAuth(url);
    
    return {
      success: data.success ?? true,
      message: data.message ?? [],
      response: data.response,
      metric: data.metric,
      purchasedPlan: data.purchasedPlan,
    };
  } catch (error) {
    console.error("Erro ao carregar tips:", error);
    return {
      success: false,
      message: ["Erro ao carregar tips"],
    };
  }
}

export function mapTipToCardTier(isPro: number): "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" {
  // basic=0, pro=1, free1=-1, multipla=2
  if (isPro === 1) return "PRO";
  if (isPro === 2) return "MÚLTIPLA";
  if (isPro === -1) return "GRÁTIS";
  return "BÁSICO";
}
