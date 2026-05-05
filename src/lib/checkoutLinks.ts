// TODO: arquitetura legacy — migrar consumidores pra pay_cards/products_catalog em fase futura.
// Premier Ultra - Checkout Links Configuration
// Centralized map of all checkout/upgrade links

export const CHECKOUT_LINKS = {
  // Tier upgrade links
  upgrade_basic: 'https://checkout.premierfc.app/basic',
  upgrade_pro: 'https://checkout.premierfc.app/pro',
  upgrade_ultra: 'https://checkout.premierfc.app/ultra',
  
  // Add-on purchase links
  addon_alavancagem: 'https://checkout.premierfc.app/alavancagem',
  addon_multiplas_bingo: 'https://checkout.premierfc.app/multiplas_bingo',
  
  // Lifetime/Vitalício
  vitalicio: 'https://checkout.premierfc.app/vitalicio',
  
  // Default paywall (for free users)
  paywall_default: 'https://checkout.premierfc.app',
} as const;

export type CheckoutLinkKey = keyof typeof CHECKOUT_LINKS;

/**
 * Get the upgrade link for a specific tier
 */
export function getUpgradeLinkForTier(tier: string): string {
  switch (tier) {
    case 'basic':
      return CHECKOUT_LINKS.upgrade_basic;
    case 'pro':
      return CHECKOUT_LINKS.upgrade_pro;
    case 'ultra':
      return CHECKOUT_LINKS.upgrade_ultra;
    default:
      return CHECKOUT_LINKS.paywall_default;
  }
}

/**
 * Get the purchase link for a specific add-on
 */
export function getAddonLink(addon: string): string {
  switch (addon) {
    case 'alavancagem':
      return CHECKOUT_LINKS.addon_alavancagem;
    case 'multiplas_bingo':
      return CHECKOUT_LINKS.addon_multiplas_bingo;
    default:
      return CHECKOUT_LINKS.paywall_default;
  }
}

/**
 * Get the appropriate unlock link for an entry
 * If addon_required exists, return addon link
 * Otherwise return tier upgrade link
 */
export function getUnlockLink(tierRequired: string, addonRequired: string | null): string {
  if (addonRequired) {
    return getAddonLink(addonRequired);
  }
  return getUpgradeLinkForTier(tierRequired);
}
