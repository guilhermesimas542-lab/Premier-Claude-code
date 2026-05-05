// @deprecated — substituído por financial_events e products_catalog. Não consumido em runtime.
/**
 * Estimated monthly prices per plan/add-on.
 * Used for MRR estimation on the admin dashboard.
 *
 * NOTE: This is an ESTIMATE. When a payment webhook is integrated,
 * replace this with real revenue data from the `orders` table.
 */
export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 29.9,
  pro: 49.9,
  ultra: 99.9,
};

export const ADDON_PRICES: Record<string, number> = {
  alavancagem: 19.9,
  multiplas_bingo: 39.9,
};
