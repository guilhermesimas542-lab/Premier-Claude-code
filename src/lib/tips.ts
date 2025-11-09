import { fetchAuth, getBetSiteType, getStoredConfig, updateConfigFromSports } from "./auth";
import { TipsResponse } from "@/types/tips";

export async function loadTipsForSport(sportId: number = 1): Promise<TipsResponse> {
  try {
    // Usar affCasa do user (salvo durante GetSports)
    const storedConfig = getStoredConfig();
    const betSite = storedConfig?.user?.aff ?? 0;
    const url = `https://apiv1.premierfc.app/api/v1/esportes/GetTipsBySportId?Sportid=${sportId}&betSite=${betSite}`;
    
    const data = await fetchAuth(url);
    
    // Atualizar localStorage com dados do response
    if (data.response) {
      const storedConfig = getStoredConfig();
      
      if (storedConfig) {
        // Atualizar betSite com response.url
        if (data.response.url !== undefined) {
          storedConfig.betSite = data.response.url;
          localStorage.setItem("betSite", data.response.url);
        }
        
        // Atualizar telegramUrl com response.telegran
        if (data.response.telegran !== undefined) {
          // Assumindo que telegran é uma URL ou string
          const telegramValue = String(data.response.telegran);
          storedConfig.telegramUrl = telegramValue;
          localStorage.setItem("telegramUrl", telegramValue);
        }
        
        // Atualizar purchasedPlan do usuário
        if (data.response.purchasedPlan !== undefined && storedConfig.user) {
          storedConfig.user.purchasedPlan = data.response.purchasedPlan;
          localStorage.setItem("_user", JSON.stringify(storedConfig.user));
          
          // Atualizar userData também
          if (storedConfig.metric) {
            localStorage.setItem("userData", JSON.stringify({ _user: storedConfig.user, metric: storedConfig.metric }));
          }
        }
        
        // Salvar appConfig atualizado
        localStorage.setItem("appConfig", JSON.stringify(storedConfig));
      }
    }
    
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
