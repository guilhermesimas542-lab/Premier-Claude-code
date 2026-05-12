// CL Ultra — Checkout Links Configuration
// Mapa centralizado dos links de checkout (CenterPag).
// Estrutura nova: funil externo (lead frio) vs in-app (usuário logado) + add-ons avulsos.
//
// TODO: arquitetura legacy (`paywall_default`, `vitalicio`, `upgrade_basic/pro/ultra`)
// vai ser migrada conforme consumidores forem refatorados pra usar as chaves explícitas
// (`funil_premium_full`, `funil_premium_offer`, `inapp_premium`, `inapp_diamante`,
// `inapp_diamante_upgrade`).

export const CHECKOUT_LINKS = {
  // === Funil externo (lead frio, antes de logar) ===
  /** 14,90 — Premium funil cheio (Login "Adquirir acceso", landings de pré-login) */
  funil_premium_full: 'https://go.centerpag.com/PPU38CQBPB2',
  /** 9,90 — Premium oferta com desconto (página /bd) */
  funil_premium_offer: 'https://go.centerpag.com/PPU38CQBPB3',

  // === In-app (usuário já logado — preços mais altos que o funil externo) ===
  /** 14,90 — Free → Premium dentro do app (PaywallPopup variant "premium") */
  inapp_premium: 'https://go.centerpag.com/PPU38CQBQS8',
  /** 39,90 — Free → Diamante dentro do app (PaywallPopup variant "diamante") */
  inapp_diamante: 'https://go.centerpag.com/PPU38CQBQUE',
  /** 29,90 — Premium → Diamante dentro do app (PaywallPopup variant "diamante_upgrade") */
  inapp_diamante_upgrade: 'https://go.centerpag.com/PPU38CQBQUF',

  // === Add-ons avulsos in-app (backredirect / compra isolada de feature) ===
  /** 9,90 — Cuotas de Ligas Americanas */
  addon_esportes_americanos: 'https://go.centerpag.com/PPU38CQBQSA',
  /** 9,90 — Cuotas de Palancado Diario */
  addon_alavancagem: 'https://go.centerpag.com/PPU38CQBQSG',
  /** 9,90 — Cuotas Múltiples/Bingo */
  addon_multiplas_bingo: 'https://go.centerpag.com/PPU38CQBQSI',
  /** 9,90 — Cuotas de Mercados Secundarios */
  addon_mercados_secundarios: 'https://go.centerpag.com/PPU38CQBQSL',

  // === Aliases legados (não usar em código novo) ===
  /** @deprecated Use `funil_premium_full` */
  paywall_default: 'https://go.centerpag.com/PPU38CQBPB2',
  /** @deprecated Use `funil_premium_offer` (oferta /bd) ou `inapp_premium` (in-app) */
  vitalicio: 'https://go.centerpag.com/PPU38CQBPB3',
  /** @deprecated Use `inapp_premium` — basic/pro antigos correspondem a Premium novo */
  upgrade_basic: 'https://go.centerpag.com/PPU38CQBQS8',
  /** @deprecated Use `inapp_premium` */
  upgrade_pro: 'https://go.centerpag.com/PPU38CQBQS8',
  /** @deprecated Use `inapp_diamante` — ultra antigo corresponde a Diamante novo */
  upgrade_ultra: 'https://go.centerpag.com/PPU38CQBQUE',
} as const;

export type CheckoutLinkKey = keyof typeof CHECKOUT_LINKS;

/**
 * Retorna o link de upgrade para um tier legado (basic/pro/ultra).
 * @deprecated Use as chaves explícitas (`inapp_premium`, `inapp_diamante`).
 */
export function getUpgradeLinkForTier(tier: string): string {
  switch (tier) {
    case 'basic':
    case 'pro':
      return CHECKOUT_LINKS.inapp_premium;
    case 'ultra':
      return CHECKOUT_LINKS.inapp_diamante;
    default:
      return CHECKOUT_LINKS.funil_premium_full;
  }
}

/** Retorna o link de checkout do add-on avulso por chave. */
export function getAddonLink(addon: string): string {
  switch (addon) {
    case 'alavancagem':
      return CHECKOUT_LINKS.addon_alavancagem;
    case 'multiplas_bingo':
      return CHECKOUT_LINKS.addon_multiplas_bingo;
    case 'esportes_americanos':
      return CHECKOUT_LINKS.addon_esportes_americanos;
    case 'mercados_secundarios':
      return CHECKOUT_LINKS.addon_mercados_secundarios;
    default:
      return CHECKOUT_LINKS.funil_premium_full;
  }
}

/**
 * Retorna o link de unlock para uma entry bloqueada.
 * Se há add-on específico, retorna o link avulso desse add-on.
 * Senão, retorna o link de upgrade para o tier mínimo necessário.
 */
export function getUnlockLink(tierRequired: string, addonRequired: string | null): string {
  if (addonRequired) {
    return getAddonLink(addonRequired);
  }
  return getUpgradeLinkForTier(tierRequired);
}
