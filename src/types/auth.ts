export interface AuthUser {
  afl: string;
  hasAfiliate: boolean;
  cpf: string;
  userMail: string;
  accountType: number;
  status: number;
  purchasedPlan: number;
  id: number;
  aff: number;
  telegran: number;
  planilha: number;
}

export interface Metric {
  userMail: string | null;
  totalPago: { valor: number; list: any[] };
  totalRetirado: { valor: number; list: any[] };
  totalLiberado: { valor: number; list: any[] };
  totalBloqueado: { valor: number; list: any[] };
  totalNaoPago: { valor: number; list: any[] };
  last: any | null;
}

export interface AuthResponse {
  redirect: boolean;
  betSite: string;
  telegramUrl: string;
  checkout: string;
  basicImageBanner: string;
  proUrl: string;
  proImageBanner: string;
  banner1Url: string;
  banner1Image: string;
  _betSiteType: number;
  _user: AuthUser;
  jwt: string;
  metric: Metric;
  url?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string[];
  response?: AuthResponse;
}

export interface AppConfig {
  redirect: boolean;
  betSite: string | null;
  telegramUrl: string | null;
  checkout: string | null;
  basicImageBanner: string | null;
  proUrl: string | null;
  proImageBanner: string | null;
  banner1Url: string | null;
  banner1Image: string | null;
  betSiteType: number;
  user: AuthUser | null;
  jwt: string | null;
  metric: Metric | null;
}
