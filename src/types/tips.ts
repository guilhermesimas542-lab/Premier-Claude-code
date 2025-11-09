export interface Tip {
  id: number;
  idJogo: number;
  nomeMandante: string;
  nomeVisitante: string;
  logoMandante: string;
  logoVisitante: string;
  mercado: string;
  entrada: string;
  odd: number;
  confianca: number;
  insights: string;
  observacao: string;
  tipo: number; // 0=BÁSICO, 1=PRO, 2=GRÁTIS, 3=MÚLTIPLA
  dataJogo: string;
  horarioJogo: string;
}

export interface TipsResponse {
  success: boolean;
  data: Tip[];
  message?: string;
}
