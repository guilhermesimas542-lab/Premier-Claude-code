// O produto novo de assinatura ainda não existe. Quando existir, preencha aqui (ID e/ou nome exato).
// Enquanto estiver vazio, o painel mostra zero de propósito (não usa fallback por nome,
// pra não confundir com os produtos "Premier" de compra única que já existem).
export const PREMIER_PRODUCT_IDS: string[] = [];
export const PREMIER_PRODUCT_NAMES: string[] = [];

export const PREMIER_NAME_FALLBACK = '';

// Nomes de evento REAIS do financial_events (auditados em 2026-06-03):
export const SALE_EVENTS = ['Purchase_Order_Confirmed', 'Recurrent_Payment']; // venda + renovação

export const REFUND_EVENTS = ['Payment_Refund'];

export const CHARGEBACK_EVENTS: string[] = []; // não existe evento de chargeback ainda; preencher quando surgir

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
  'Refund_Period_Over',
  'Reembolso_Solicitado', 'Fatura_Criada',
  'Liberacao_e_remocao_de_acesso', 'Inicio_liberacao_de_acesso',
  'Fim_liberacao_de_acesso', 'Notificar_Membro_Ativo',
  'Periodo_de_Reembolso_Terminado',
];

export const EVENT_DISPLAY: Record<string, string> = {
  'Purchase_Order_Confirmed': 'Compra Completa',
  'Product_Access_Started': 'Acesso ao Produto Iniciado',
  'Subscription_Product_Access': 'Acesso a Assinatura',
  'Subscription_Renewed': 'Renovação Efetuada',
  'Subscription_Reactivated': 'Assinatura Reativada',
  'Purchase_Refunded': 'Reembolso',
  'Subscription_Cancelled': 'Suscripción Cancelada',
  'Chargeback': 'Chargeback',
  'Payment_Chargeback': 'Chargeback',
  'purchase': 'Compra',
  'approved': 'Aprobado',
  'refund': 'Reembolso',
  'cancel': 'Cancelación',
  'Compra_Completa': 'Compra Completa',
  'Pagamento_de_Renovacao_Efetuado': 'Renovación Efectuada',
  'Pagamento_Estornado': 'Pago Revertido',
  'Pagamento_Reembolsado': 'Reembolso',
  'Payment_Refund': 'Reembolso',
  'Refund_Requested': 'Reembolso Solicitado',
  'Reembolso_Solicitado': 'Reembolso Solicitado',
  'Assinatura_Cancelada': 'Assinatura Cancelada',
  'Assinatura_Expirada': 'Assinatura Expirada',
  'Assinatura_Pendente_de_Renovacao': 'Pendente de Renovação',
  'Abandoned_Cart': 'Carrinho Abandonado',
  'Carrinho_Abandonado': 'Carrinho Abandonado',
  'Pedido_de_Compra_Cancelado': 'Pedido Cancelado',
  'Pedido_de_Compra_Expirado': 'Pedido Expirado',
  'Fatura_Criada': 'Fatura Criada',
  'Liberacao_e_remocao_de_acesso': 'Liberação de Acesso',
  'Inicio_liberacao_de_acesso': 'Início Acesso',
  'Fim_liberacao_de_acesso': 'Fim Acesso',
  'Notificar_Membro_Ativo': 'Notificação Membro',
  'Refund_Period_Over': 'Período Reembolso Encerrado',
  'Periodo_de_Reembolso_Terminado': 'Período Reembolso Terminado',
};

export function getEventDisplay(eventName: string): string {
  return EVENT_DISPLAY[eventName] || eventName.replace(/_/g, ' ');
}

export function getEventCategory(eventName: string): { label: string; color: string } {
  if (REVENUE_EVENTS.includes(eventName)) return { label: 'Ingresos', color: 'green' };
  if (LOSS_EVENTS.includes(eventName)) return { label: 'Pérdida', color: 'red' };
  if (RECOVERY_EVENTS.includes(eventName)) return { label: 'Recuperación', color: 'orange' };
  return { label: 'Info', color: 'gray' };
}

export function formatCLP(value: number): string {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
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
  // General
  { label: '── Todas las Oportunidades', tier: 'all', missingKey: '_any' },
  // Global
  { label: 'Qualquer plano sem Vitalício', tier: 'any_paid', missingKey: 'acesso_vitalicio', checkVitalicio: true },
  { label: 'Qualquer plano sem Live Telegram', tier: 'any_paid', missingKey: 'live_telegram' },
  { label: 'Qualquer plano sem Merc. Secundário', tier: 'any_paid', missingKey: 'mercados_secundarios' },
  { label: 'Qualquer plano sem Ligas Americanas', tier: 'any_paid', missingKey: 'esportes_americanos' },
  // Free
  { label: 'Free sin Apalancamiento', tier: 'free', missingKey: 'alavancagem' },
  { label: 'Free sin Múltiples / Bingo', tier: 'free', missingKey: 'multiplas_bingo' },
  { label: 'Free sin Live Telegram', tier: 'free', missingKey: 'live_telegram' },
  // Básico
  { label: 'Básico sin Apalancamiento', tier: 'basic', missingKey: 'alavancagem' },
  { label: 'Básico sin Múltiples / Bingo', tier: 'basic', missingKey: 'multiplas_bingo' },
  { label: 'Básico sin Live Telegram', tier: 'basic', missingKey: 'live_telegram' },
  // Pro
  { label: 'Pro sin Apalancamiento', tier: 'pro', missingKey: 'alavancagem' },
  { label: 'Pro sin Múltiples / Bingo', tier: 'pro', missingKey: 'multiplas_bingo' },
  { label: 'Pro sin Live Telegram', tier: 'pro', missingKey: 'live_telegram' },
  // Ultra
  { label: 'Ultra sin Apalancamiento', tier: 'ultra', missingKey: 'alavancagem' },
  { label: 'Ultra sin Múltiples / Bingo', tier: 'ultra', missingKey: 'multiplas_bingo' },
  { label: 'Ultra sin Live Telegram', tier: 'ultra', missingKey: 'live_telegram' },
];

export const TIER_DISPLAY: Record<string, string> = {
  free: 'Gratis',
  basic: 'Básico',
  pro: 'Pro',
  ultra: 'Ultra',
  premium: 'Premium',
  diamante: 'Diamante',
};

export const ADDON_DISPLAY: Record<string, string> = {
  alavancagem: 'Apalancamiento',
  multiplas_bingo: 'Múltiples / Bingo',
  live_telegram: 'Live Telegram',
  acesso_vitalicio: 'Acesso Vitalício',
  mercados_secundarios: 'Merc. Secundário',
  esportes_americanos: 'Ligas Americanas',
};
