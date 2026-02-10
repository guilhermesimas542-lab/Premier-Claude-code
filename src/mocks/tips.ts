// Mock Tips Data - Dados locais sem backend

export interface MockShirtConfig {
  variant: "solid" | "stripes";
  primaryColor: string;
  secondaryColor?: string;
}

export interface MockTeam {
  name: string;
  logo?: string;
  shirt?: MockShirtConfig;
}

export interface MockDisplayEntry {
  id: string;
  date: string;
  tier: 'GRÁTIS' | 'BÁSICO' | 'PRO' | 'ULTRA' | 'ALAVANCAGEM' | 'ODDS_ALTAS' | 'MÚLTIPLA';
  locked: boolean;
  isExpired: boolean;
  team1: MockTeam;
  team2: MockTeam;
  market: string;
  betChoice: string;
  odds: number;
  matchDate: string;
  expirationDate: string;
  justificativa?: string;
  urlIframe?: string;
  selectionsCount?: number;
  specialType?: 'ALAVANCAGEM' | 'ODDS_ALTAS';
}

const today = new Date().toISOString().split('T')[0];
const endOfDay = `${today}T23:59:00.000Z`;

export const MOCK_TIPS: MockDisplayEntry[] = [
  {
    id: "mock-1",
    date: today,
    tier: "GRÁTIS",
    locked: false,
    isExpired: false,
    team1: { name: "Flamengo", shirt: { variant: "stripes", primaryColor: "#EF4444", secondaryColor: "#000000" } },
    team2: { name: "Palmeiras", shirt: { variant: "solid", primaryColor: "#22C55E" } },
    market: "Total de gols",
    betChoice: "Mais de 1.5",
    odds: 1.45,
    matchDate: "Hoje 19:00",
    expirationDate: endOfDay,
    justificativa: "Ambos os times têm médias altas de gols nos últimos 5 jogos.",
  },
  {
    id: "mock-2",
    date: today,
    tier: "GRÁTIS",
    locked: false,
    isExpired: false,
    team1: { name: "Santos", shirt: { variant: "solid", primaryColor: "#FFFFFF" } },
    team2: { name: "São Paulo", shirt: { variant: "stripes", primaryColor: "#EF4444", secondaryColor: "#FFFFFF" } },
    market: "Ambas marcam",
    betChoice: "Sim",
    odds: 1.72,
    matchDate: "Hoje 21:00",
    expirationDate: endOfDay,
    justificativa: "Clássico com alto índice de ambas marcam nos últimos encontros.",
  },
  {
    id: "mock-3",
    date: today,
    tier: "BÁSICO",
    locked: false,
    isExpired: false,
    team1: { name: "Real Madrid", shirt: { variant: "solid", primaryColor: "#FFFFFF" } },
    team2: { name: "Barcelona", shirt: { variant: "stripes", primaryColor: "#3B82F6", secondaryColor: "#B91C1C" } },
    market: "Resultado final",
    betChoice: "Real Madrid",
    odds: 2.10,
    matchDate: "Hoje 16:00",
    expirationDate: endOfDay,
    justificativa: "Real Madrid em ótima fase e jogando em casa.",
  },
  {
    id: "mock-4",
    date: today,
    tier: "BÁSICO",
    locked: false,
    isExpired: false,
    team1: { name: "Liverpool", shirt: { variant: "solid", primaryColor: "#EF4444" } },
    team2: { name: "Man City", shirt: { variant: "solid", primaryColor: "#38BDF8" } },
    market: "Total de gols",
    betChoice: "Mais de 2.5",
    odds: 1.55,
    matchDate: "Hoje 17:00",
    expirationDate: endOfDay,
    justificativa: "Confronto direto com média de 3.2 gols por jogo.",
  },
  {
    id: "mock-5",
    date: today,
    tier: "PRO",
    locked: false,
    isExpired: false,
    team1: { name: "PSG", shirt: { variant: "solid", primaryColor: "#1E3A8A" } },
    team2: { name: "Lyon", shirt: { variant: "solid", primaryColor: "#FFFFFF" } },
    market: "Handicap",
    betChoice: "PSG -1",
    odds: 1.85,
    matchDate: "Hoje 16:45",
    expirationDate: endOfDay,
    justificativa: "PSG tem domínio absoluto neste confronto nos últimos 3 anos.",
  },
  {
    id: "mock-6",
    date: today,
    tier: "PRO",
    locked: false,
    isExpired: false,
    team1: { name: "Bayern", shirt: { variant: "solid", primaryColor: "#EF4444" } },
    team2: { name: "Dortmund", shirt: { variant: "solid", primaryColor: "#FACC15" } },
    market: "Ambas marcam",
    betChoice: "Sim",
    odds: 1.62,
    matchDate: "Hoje 15:30",
    expirationDate: endOfDay,
    justificativa: "Der Klassiker sempre entrega gols dos dois lados.",
  },
  {
    id: "mock-7",
    date: today,
    tier: "ULTRA",
    locked: false,
    isExpired: false,
    team1: { name: "Juventus", shirt: { variant: "stripes", primaryColor: "#000000", secondaryColor: "#FFFFFF" } },
    team2: { name: "Inter", shirt: { variant: "stripes", primaryColor: "#3B82F6", secondaryColor: "#000000" } },
    market: "Resultado final",
    betChoice: "Empate",
    odds: 3.20,
    matchDate: "Hoje 15:45",
    expirationDate: endOfDay,
    justificativa: "Derby com equilíbrio extremo - 4 empates nos últimos 6 jogos.",
    selectionsCount: 3,
  },
  {
    id: "mock-8",
    date: today,
    tier: "ULTRA",
    locked: false,
    isExpired: false,
    team1: { name: "Chelsea", shirt: { variant: "solid", primaryColor: "#3B82F6" } },
    team2: { name: "Arsenal", shirt: { variant: "solid", primaryColor: "#EF4444" } },
    market: "Total de gols",
    betChoice: "Mais de 2.5",
    odds: 1.48,
    matchDate: "Hoje 12:30",
    expirationDate: endOfDay,
    justificativa: "London Derby com histórico de jogos abertos.",
    selectionsCount: 4,
  },
  {
    id: "mock-9",
    date: today,
    tier: "ALAVANCAGEM",
    locked: false,
    isExpired: false,
    team1: { name: "Alavancagem", shirt: { variant: "solid", primaryColor: "#14B8A6" } },
    team2: { name: "Sequência", shirt: { variant: "solid", primaryColor: "#14B8A6" } },
    market: "Alavancagem do dia",
    betChoice: "Etapa 1 - Mais de 0.5",
    odds: 1.20,
    matchDate: "Hoje",
    expirationDate: endOfDay,
    specialType: "ALAVANCAGEM",
    justificativa: "Sequência progressiva de entradas para crescimento controlado da banca.",
  },
  {
    id: "mock-10",
    date: today,
    tier: "ALAVANCAGEM",
    locked: false,
    isExpired: false,
    team1: { name: "Alavancagem", shirt: { variant: "solid", primaryColor: "#14B8A6" } },
    team2: { name: "Sequência", shirt: { variant: "solid", primaryColor: "#14B8A6" } },
    market: "Alavancagem do dia",
    betChoice: "Etapa 2 - Ambas marcam",
    odds: 1.35,
    matchDate: "Hoje",
    expirationDate: endOfDay,
    specialType: "ALAVANCAGEM",
    justificativa: "Segunda etapa da sequência progressiva.",
  },
  {
    id: "mock-11",
    date: today,
    tier: "ODDS_ALTAS",
    locked: false,
    isExpired: false,
    team1: { name: "Odds Altas", shirt: { variant: "solid", primaryColor: "#F97316" } },
    team2: { name: "Seleção", shirt: { variant: "solid", primaryColor: "#F97316" } },
    market: "Odds valorizada",
    betChoice: "Corinthians vence",
    odds: 4.50,
    matchDate: "Hoje 19:00",
    expirationDate: endOfDay,
    specialType: "ODDS_ALTAS",
    justificativa: "Odd com valor acima do esperado pela análise estatística.",
  },
  {
    id: "mock-12",
    date: today,
    tier: "ODDS_ALTAS",
    locked: false,
    isExpired: false,
    team1: { name: "Odds Altas", shirt: { variant: "solid", primaryColor: "#F97316" } },
    team2: { name: "Seleção", shirt: { variant: "solid", primaryColor: "#F97316" } },
    market: "Odds valorizada",
    betChoice: "Mais de 3.5 gols",
    odds: 3.80,
    matchDate: "Hoje 21:00",
    expirationDate: endOfDay,
    specialType: "ODDS_ALTAS",
    justificativa: "Jogo com alto potencial de gols baseado em dados recentes.",
  },
];
