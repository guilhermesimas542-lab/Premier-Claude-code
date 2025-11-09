import { fetchAuth, getBetSiteType } from "./auth";
import { TipsResponse } from "@/types/tips";

export async function loadTipsForSport(sportId: number = 1): Promise<TipsResponse> {
  try {
    const betSiteType = getBetSiteType();
    const url = `https://apiv1.premierfc.app/api/v1/esportes/GetTipsBySportId?Sportid=${sportId}&betSite=${encodeURIComponent(betSiteType)}`;
    
    const data = await fetchAuth(url);
    
    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error("Erro ao carregar tips:", error);
    return {
      success: false,
      data: [],
      message: "Erro ao carregar tips",
    };
  }
}

export function mapTipToCardTier(tipo: number): "BÁSICO" | "PRO" | "GRÁTIS" | "MÚLTIPLA" {
  switch (tipo) {
    case 1:
      return "PRO";
    case 2:
      return "GRÁTIS";
    case 3:
      return "MÚLTIPLA";
    default:
      return "BÁSICO";
  }
}
