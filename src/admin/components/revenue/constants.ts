export const PREMIER_PRODUCT_IDS: string[] = [
  '037d5e50-ab28-47dd-a916-b4f9916dcd8a',
  'LXGO9W',
  '43b9295e-caed-41e0-b85c-7fca52df03a5',
  'e95d935c-96ca-413d-b883-7d7b257b25d0',
  '1f3839a7-535d-433f-900e-63cd81c7d01e',
  'f1c30b6d-48eb-473d-b705-092b8566b2ed',
  '0010b879-8df0-4376-a177-36b5b9d9ffed',
  'd6813992-e1bd-41c6-8ceb-914eae410358',
  '4ED9BZ',
  'LGBG7O',
  'LY7ON2',
  '4ZJAZ3',
  '4EDZYO',
  'R36ONP',
  'RAZ23D',
  'RW2O9W',
  'RDEVAP',
  'LGAOMY',
  'RVEMKE',
  'LXMDYB',
  'LQ8XWG',
  '45WM3G',
  '4NG28D',
];

export const PREMIER_PRODUCT_NAMES: string[] = [
  'Premier',
  'Premier FC',
  'Premier FC - Plano Premium',
  'Acesso Vitalício',
  'Premier FC [TK]',
  'Premier FC — Odds Altas',
  'Premier FC — Plano Pro',
  'Premier FC — Plano Ultra',
  'Premier FC — Alavancagem',
  'Premier FC — Live Telegram',
  'Premier FC — Odds Altas / Múltiplas',
  'PLANO DIAMANTE',
  'Premier FC - Plano Premium [Back Redirect]',
  'PREMIER FC - MERCADOS SECUNDÁRIOS',
  'Premier 6 Creditos IA',
  'Premier Crédito IA ilimitado por 1 mês',
  'Premier Crédito ilimitado por 3 meses',
  'Alavancagem + Odds Altas',
  'Premier 9 Creditos IA',
  'PREMIER FC - LIGAS AMERICANAS',
];

export const PREMIER_NAME_FALLBACK = 'premier';

export const SALE_EVENTS = [
  'Purchase_Order_Confirmed',
  'purchase',
  'Product_Access_Started',
  'Subscription_Product_Access',
];

export const REFUND_EVENTS = ['Payment_Refund', 'Refund_Requested'];

export const CHARGEBACK_EVENTS = ['Payment_Chargeback'];

export const REVENUE_EVENTS = [
  ...SALE_EVENTS,
  'Subscription_Renewed',
  'Subscription_Reactivated',
  'approved',
  'Compra_Completa',
  'Pagamento_de_Renovacao_Efetuado',
];


export const LOSS_EVENTS = [
  ...REFUND_EVENTS,
  ...CHARGEBACK_EVENTS,
  'Purchase_Refunded', 'Subscription_Cancelled',
  'refund', 'cancel',
  'Assinatura_Expirada', 'Pedido_de_Compra_Cancelado',
];

export const RECOVERY_EVENTS = [
  'Abandoned_Cart',
  'Carrinho_Abandonado', 'Assinatura_Pendente_de_Renovacao',
  'Pedido_de_Compra_Expirado',
];

export const ALL_EVENTS = [
  ...REVENUE_EVENTS, ...LOSS_EVENTS, ...RECOVERY_EVENTS,
  'Reembolso_Solicitado', 'Fatura_Criada',
  'Liberacao_e_remocao_de_acesso', 'Inicio_liberacao_de_acesso',
  'Fim_liberacao_de_acesso', 'Notificar_Membro_Ativo',
  'Periodo_de_Reembolso_Terminado',
];

export const EVENT_DISPLAY: Record<string, string> = {
  'Purchase_Order_Confirmed': 'Compra Completa',
  'Subscription_Renewed': 'Renovação Efetuada',
  'Subscription_Reactivated': 'Assinatura Reativada',
  'Purchase_Refunded': 'Reembolso',
  'Subscription_Cancelled': 'Assinatura Cancelada',
  'Chargeback': 'Chargeback',
  'purchase': 'Compra',
  'approved': 'Aprovado',
  'refund': 'Reembolso',
  'cancel': 'Cancelamento',
  'Compra_Completa': 'Compra Completa',
  'Pagamento_de_Renovacao_Efetuado': 'Renovação Efetuada',
  'Pagamento_Estornado': 'Pagamento Estornado',
  'Pagamento_Reembolsado': 'Reembolso',
  'Reembolso_Solicitado': 'Reembolso Solicitado',
  'Assinatura_Cancelada': 'Assinatura Cancelada',
  'Assinatura_Expirada': 'Assinatura Expirada',
  'Assinatura_Pendente_de_Renovacao': 'Pendente de Renovação',
  'Carrinho_Abandonado': 'Carrinho Abandonado',
  'Pedido_de_Compra_Cancelado': 'Pedido Cancelado',
  'Pedido_de_Compra_Expirado': 'Pedido Expirado',
  'Fatura_Criada': 'Fatura Criada',
  'Liberacao_e_remocao_de_acesso': 'Liberação de Acesso',
  'Inicio_liberacao_de_acesso': 'Início Acesso',
  'Fim_liberacao_de_acesso': 'Fim Acesso',
  'Notificar_Membro_Ativo': 'Notificação Membro',
  'Periodo_de_Reembolso_Terminado': 'Período Reembolso Terminado',
};

export function getEventDisplay(eventName: string): string {
  return EVENT_DISPLAY[eventName] || eventName.replace(/_/g, ' ');
}

export function getEventCategory(eventName: string): { label: string; color: string } {
  if (REVENUE_EVENTS.includes(eventName)) return { label: 'Receita', color: 'green' };
  if (LOSS_EVENTS.includes(eventName)) return { label: 'Perda', color: 'red' };
  if (RECOVERY_EVENTS.includes(eventName)) return { label: 'Recuperação', color: 'orange' };
  return { label: 'Info', color: 'gray' };
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface FinancialEvent {
  id: number;
  created_at: string;
  event_name: string;
  email: string | null;
  product_name: string | null;
  product_id: string | null;
  value_cents: number;
  currency: string;
  order_id: string | null;
  subscription_id: string | null;
  is_recurring: boolean;
  is_test: boolean;
  raw_payload: any;
}

export const UPSELL_FILTERS = [
  // Geral
  { label: '── Todas as Oportunidades', tier: 'all', missingKey: '_any' },
  // Global
  { label: 'Qualquer plano sem Vitalício', tier: 'any_paid', missingKey: 'acesso_vitalicio', checkVitalicio: true },
  { label: 'Qualquer plano sem Live Telegram', tier: 'any_paid', missingKey: 'live_telegram' },
  { label: 'Qualquer plano sem Merc. Secundário', tier: 'any_paid', missingKey: 'mercados_secundarios' },
  { label: 'Qualquer plano sem Ligas Americanas', tier: 'any_paid', missingKey: 'esportes_americanos' },
  // Free
  { label: 'Free sem Alavancagem', tier: 'free', missingKey: 'alavancagem' },
  { label: 'Free sem Múltiplas / Bingo', tier: 'free', missingKey: 'multiplas_bingo' },
  { label: 'Free sem Live Telegram', tier: 'free', missingKey: 'live_telegram' },
  // Básico
  { label: 'Básico sem Alavancagem', tier: 'basic', missingKey: 'alavancagem' },
  { label: 'Básico sem Múltiplas / Bingo', tier: 'basic', missingKey: 'multiplas_bingo' },
  { label: 'Básico sem Live Telegram', tier: 'basic', missingKey: 'live_telegram' },
  // Pro
  { label: 'Pro sem Alavancagem', tier: 'pro', missingKey: 'alavancagem' },
  { label: 'Pro sem Múltiplas / Bingo', tier: 'pro', missingKey: 'multiplas_bingo' },
  { label: 'Pro sem Live Telegram', tier: 'pro', missingKey: 'live_telegram' },
  // Ultra
  { label: 'Ultra sem Alavancagem', tier: 'ultra', missingKey: 'alavancagem' },
  { label: 'Ultra sem Múltiplas / Bingo', tier: 'ultra', missingKey: 'multiplas_bingo' },
  { label: 'Ultra sem Live Telegram', tier: 'ultra', missingKey: 'live_telegram' },
];

export const TIER_DISPLAY: Record<string, string> = {
  free: 'Grátis',
  basic: 'Básico',
  pro: 'Pro',
  ultra: 'Ultra',
  premium: 'Premium',
  diamante: 'Diamante',
};

export const ADDON_DISPLAY: Record<string, string> = {
  alavancagem: 'Alavancagem',
  multiplas_bingo: 'Múltiplas / Bingo',
  live_telegram: 'Live Telegram',
  acesso_vitalicio: 'Acesso Vitalício',
  mercados_secundarios: 'Merc. Secundário',
  esportes_americanos: 'Ligas Americanas',
};
