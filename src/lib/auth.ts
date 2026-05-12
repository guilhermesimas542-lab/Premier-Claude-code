// Auth - 100% localStorage, sem backend
import { AppConfig } from "@/types/auth";
import { isMockAuthenticated, mockGetUser, mockLogout } from "@/mocks/user";

export function isAuthenticated(): boolean {
  return isMockAuthenticated();
}

export function clearAuth(): void {
  mockLogout();
}

export function getStoredConfig(): AppConfig | null {
  const user = mockGetUser();
  if (!user) return null;

  return {
    redirect: false,
    betSite: "https://example.com",
    telegramUrl: null,
    checkout: null,
    basicImageBanner: null,
    proUrl: null,
    proImageBanner: null,
    banner1Url: null,
    banner1Image: null,
    betSiteType: 0,
    user: {
      afl: '',
      hasAfiliate: false,
      cpf: '',
      userMail: user.email,
      accountType: 0,
      status: 1,
      purchasedPlan: 3, // ULTRA
      id: 1,
      aff: 0,
      telegran: 0,
      planilha: 0,
    },
    jwt: null,
    metric: null,
  };
}

// Imagem de background (mantido sem rede)
export function getBackgroundImageUrl(backgroundId: string): string {
  if (!backgroundId) return "";
  if (backgroundId === "futsal-custom") return "/images/futsal-arena.jpg";
  return `https://imagedelivery.net/uGmh4EK74r0qnuu3lZf-oA/${backgroundId}/public`;
}
