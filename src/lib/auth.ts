import { AppConfig, LoginResponse } from "@/types/auth";

export function normalizePayload(raw: LoginResponse): AppConfig {
  const base = raw?.response ?? ({} as any);
  return {
    redirect: !!base.redirect,
    betSite: base.url || base.betSite || null,
    telegramUrl: base.telegramUrl || null,
    checkout: base.checkout || null,
    basicImageBanner: base.basicImageBanner || null,
    proUrl: base.proUrl || null,
    proImageBanner: base.proImageBanner || null,
    banner1Url: base.banner1Url || null,
    banner1Image: base.banner1Image || null,
    betSiteType: base._betSiteType ?? 0,
    user: base._user || null,
    jwt: base.jwt || null,
    metric: base.metric || null,
  };
}

export function persistConfig(cfg: AppConfig): void {
  // Salvar todos os campos individualmente
  if (cfg.betSite) localStorage.setItem("betSite", cfg.betSite);
  if (cfg.telegramUrl) localStorage.setItem("telegramUrl", cfg.telegramUrl);
  if (cfg.checkout) localStorage.setItem("checkout", cfg.checkout);
  if (cfg.basicImageBanner) localStorage.setItem("basicImageBanner", cfg.basicImageBanner);
  if (cfg.proUrl) localStorage.setItem("proUrl", cfg.proUrl);
  if (cfg.proImageBanner) localStorage.setItem("proImageBanner", cfg.proImageBanner);
  if (cfg.banner1Url) localStorage.setItem("banner1Url", cfg.banner1Url);
  if (cfg.banner1Image) localStorage.setItem("banner1Image", cfg.banner1Image);
  if (cfg.jwt) localStorage.setItem("jwt", cfg.jwt);
  
  // Salvar usuário completo
  if (cfg.user) {
    localStorage.setItem("_user", JSON.stringify(cfg.user));
  }
  
  // Salvar métrica
  if (cfg.metric) {
    localStorage.setItem("metric", JSON.stringify(cfg.metric));
  }
  
  // Salvar userData (compatibilidade)
  if (cfg.user && cfg.metric) {
    localStorage.setItem("userData", JSON.stringify({ _user: cfg.user, metric: cfg.metric }));
  }
  
  localStorage.setItem("betSiteType", String(cfg.betSiteType ?? 0));
  localStorage.setItem("appConfig", JSON.stringify(cfg));
}

export function updateConfigFromSports(sportsResponse: any): void {
  const storedConfig = getStoredConfig();
  if (!storedConfig) return;

  const updatedConfig: AppConfig = { ...storedConfig };

  // Atualizar campos do response do GetSports
  // affCasa mapeia para betSite
  if (sportsResponse.affCasa !== undefined) {
    updatedConfig.betSite = String(sportsResponse.affCasa);
    localStorage.setItem("betSite", String(sportsResponse.affCasa));
  }
  if (sportsResponse.telegramUrl !== undefined) {
    updatedConfig.telegramUrl = sportsResponse.telegramUrl;
    localStorage.setItem("telegramUrl", sportsResponse.telegramUrl);
  }
  if (sportsResponse.checkout !== undefined) {
    updatedConfig.checkout = sportsResponse.checkout;
    localStorage.setItem("checkout", sportsResponse.checkout);
  }
  if (sportsResponse.basicImageBanner !== undefined) {
    updatedConfig.basicImageBanner = sportsResponse.basicImageBanner;
    localStorage.setItem("basicImageBanner", sportsResponse.basicImageBanner);
  }
  if (sportsResponse.proUrl !== undefined) {
    updatedConfig.proUrl = sportsResponse.proUrl;
    localStorage.setItem("proUrl", sportsResponse.proUrl);
  }
  if (sportsResponse.proImageBanner !== undefined) {
    updatedConfig.proImageBanner = sportsResponse.proImageBanner;
    localStorage.setItem("proImageBanner", sportsResponse.proImageBanner);
  }
  if (sportsResponse.banner1Url !== undefined) {
    updatedConfig.banner1Url = sportsResponse.banner1Url;
    localStorage.setItem("banner1Url", sportsResponse.banner1Url);
  }
  if (sportsResponse.banner1Image !== undefined) {
    updatedConfig.banner1Image = sportsResponse.banner1Image;
    localStorage.setItem("banner1Image", sportsResponse.banner1Image);
  }

  // Atualizar purchasedPlan e affCasa no user
  if (updatedConfig.user) {
    if (sportsResponse.purchasedPlan !== undefined) {
      updatedConfig.user.purchasedPlan = sportsResponse.purchasedPlan;
    }
    if (sportsResponse.affCasa !== undefined) {
      updatedConfig.user.aff = sportsResponse.affCasa;
    }
    localStorage.setItem("_user", JSON.stringify(updatedConfig.user));
    
    // Atualizar userData também
    if (updatedConfig.metric) {
      localStorage.setItem("userData", JSON.stringify({ _user: updatedConfig.user, metric: updatedConfig.metric }));
    }
  }

  // Salvar appConfig atualizado
  localStorage.setItem("appConfig", JSON.stringify(updatedConfig));
}

export function getStoredConfig(): AppConfig | null {
  const stored = localStorage.getItem("appConfig");
  return stored ? JSON.parse(stored) : null;
}

export function clearAuth(): void {
  localStorage.clear();
}

export async function fetchAuth(url: string, options: RequestInit = {}): Promise<any> {
  const jwt = localStorage.getItem("jwt");
  const headers: HeadersInit = { ...(options.headers || {}) };
  
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401) {
    clearAuth();
    window.location.replace("https://premierfc.app");
    return;
  }
  
  return res.json();
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("jwt");
}

export function getBetSiteType(): number {
  const fromLS = localStorage.getItem("betSiteType");
  if (fromLS !== null && fromLS !== undefined && fromLS !== "null") {
    const n = Number(fromLS);
    if (!Number.isNaN(n)) return n;
  }
  
  try {
    const userData = localStorage.getItem("userData");
    if (userData) {
      const parsed = JSON.parse(userData);
      const n = parsed?.betSiteType ?? parsed?._user?._betSiteType ?? parsed?.user?._betSiteType ?? 0;
      return Number(n) || 0;
    }
  } catch {
    return 0;
  }
  
  return 0;
}
