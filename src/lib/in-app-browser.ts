/**
 * Detecção de "in-app browser" (IAB) — o navegador embarcado dos apps de
 * rede social (Instagram, Facebook, TikTok…). Aqui são WebViews limitadas:
 *
 *  - `beforeinstallprompt` **não dispara** → PWA install bloqueado
 *  - Service worker pode não registrar → web push fica fora
 *  - Menu "Adicionar à Tela de Início" some no iOS
 *
 * Estratégia do funil: ao detectar IAB, paramos o fluxo de instalação e
 * pedimos o lead pra abrir o site num navegador de verdade. No Android dá
 * pra tentar `intent://...;package=com.android.chrome;end` pra forçar o
 * Chrome. No iOS, só dá pra mostrar instruções (Apple bloqueia o redirect).
 */

export type IabType =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "linkedin"
  | "snapchat"
  | "messenger"
  | null;

export function detectInAppBrowser(): IabType {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";

  // Facebook app + IAB do Facebook (compartilha tokens)
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) {
    if (/Messenger/i.test(ua)) return "messenger";
    return "facebook";
  }
  if (/Instagram/i.test(ua)) return "instagram";
  if (/TikTok|musical_ly|Bytedance/i.test(ua)) return "tiktok";
  if (/Twitter/i.test(ua) || /\bX\.com\b/i.test(ua)) return "twitter";
  if (/LinkedInApp/i.test(ua)) return "linkedin";
  if (/Snapchat/i.test(ua)) return "snapchat";

  return null;
}

export function isInAppBrowser(): boolean {
  return detectInAppBrowser() !== null;
}

/**
 * Tenta abrir a URL atual no Chrome via `intent://` (Android).
 * Funciona em parte dos IABs — alguns interceptam e ignoram. Mesmo assim,
 * é a melhor chance programática que temos.
 */
export function tryRedirectToChromeAndroid(targetUrl?: string) {
  if (typeof window === "undefined") return;
  const url = new URL(targetUrl ?? window.location.href);
  const host = url.host;
  const path = url.pathname + url.search + url.hash;
  const scheme = url.protocol.replace(":", "");
  // Sintaxe `intent://...;package=com.android.chrome;end` sai do IAB pro Chrome.
  window.location.href = `intent://${host}${path}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

/** Nomes amigáveis pra exibição na UI. */
export const IAB_LABELS: Record<NonNullable<IabType>, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  messenger: "Messenger",
};
