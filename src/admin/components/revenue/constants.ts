export const REVENUE_EVENTS = [
  'Purchase_Order_Confirmed', 'Subscription_Renewed', 'Subscription_Reactivated',
  'purchase', 'approved',
  'Compra_Completa', 'Pagamento_de_Renovacao_Efetuado',
];

export const LOSS_EVENTS = [
  'Purchase_Refunded', 'Subscription_Cancelled', 'Chargeback',
  'refund', 'cancel',
  'Pagamento_Estornado', 'Pagamento_Reembolsado', 'Assinatura_Cancelada',
  'Assinatura_Expirada', 'Pedido_de_Compra_Cancelado',
];

export const RECOVERY_EVENTS = [
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
};

export const ADDON_DISPLAY: Record<string, string> = {
  alavancagem: 'Alavancagem',
  multiplas_bingo: 'Múltiplas / Bingo',
  live_telegram: 'Live Telegram',
  acesso_vitalicio: 'Acesso Vitalício',
};
