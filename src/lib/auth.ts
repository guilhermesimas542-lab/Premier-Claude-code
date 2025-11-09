import { AppConfig, LoginResponse } from "@/types/auth";

export function normalizePayload(raw: LoginResponse): AppConfig {
  const base = raw?.response ?? ({} as any);
  return {
    redirect: !!base.redirect,
    betSite: base.betSite || null,
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
  if (cfg.checkout) localStorage.setItem("checkout", cfg.checkout);
  if (cfg.betSite) localStorage.setItem("betSite", cfg.betSite);
  if (cfg.banner1Url) localStorage.setItem("banner1Url", cfg.banner1Url);
  if (cfg.banner1Image) localStorage.setItem("banner1Image", cfg.banner1Image);
  if (cfg.basicImageBanner) localStorage.setItem("basicImageBanner", cfg.basicImageBanner);
  if (cfg.telegramUrl) localStorage.setItem("telegramUrl", cfg.telegramUrl);
  if (cfg.proUrl) localStorage.setItem("proUrl", cfg.proUrl);
  if (cfg.proImageBanner) localStorage.setItem("proImageBanner", cfg.proImageBanner);
  if (cfg.jwt) localStorage.setItem("jwt", cfg.jwt);
  if (cfg.user && cfg.metric) {
    localStorage.setItem("userData", JSON.stringify({ _user: cfg.user, metric: cfg.metric }));
  }
  localStorage.setItem("appConfig", JSON.stringify(cfg));
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
