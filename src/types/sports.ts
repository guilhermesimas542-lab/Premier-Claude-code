export interface Sport {
  id: number;
  name: string;
  enabled: boolean;
  isproplan: boolean;
  background: string;
}

export interface SportsResponse {
  metric: {
    userMail: string;
    totalPago: { valor: number; list: any[] };
    totalRetirado: { valor: number; list: any[] };
    totalLiberado: { valor: number; list: any[] };
    totalBloqueado: { valor: number; list: any[] };
    totalNaoPago: { valor: number; list: any[] };
    last: any | null;
  };
  purchasedPlan: number;
  response: Sport[];
  success: boolean;
  message: string[];
  betSite: string;
  telegramUrl: string;
  checkout: string;
  basicImageBanner: string;
  proUrl: string;
  proImageBanner: string;
  banner1Url: string;
  banner1Image: string;
  affCasa: number;
}
