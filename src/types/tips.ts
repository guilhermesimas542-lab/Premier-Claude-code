export interface Tip {
  id: number;
  esporte_id: number;
  created_date: string;
  expiration_date: string;
  odd_market: string;
  real_odd_market: string;
  odd_Name: string;
  odd_Value: number;
  is_super_odd: boolean;
  is_pro_plan: number;
  aff: number;
  time1_name: string;
  time2_name: string;
  time1_logo: string;
  time2_logo: string;
  url_iframe: string;
}

export interface TipsResponse {
  success: boolean;
  message: string[];
  response?: {
    planilha: number;
    telegran: number;
    purchasedPlan: number;
    data: Tip[];
    url: string;
  };
  metric?: any;
  purchasedPlan?: number;
}
