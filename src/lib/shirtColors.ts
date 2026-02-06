/**
 * Paleta de 30 cores para camisas de times
 * Usado em dropdown/CSV de importação
 */
export const SHIRT_COLORS: Record<string, string> = {
  // Vermelho / Rosa
  vermelho: "#EF4444",
  vermelhoEscuro: "#B91C1C",
  rosa: "#EC4899",
  
  // Laranja / Amarelo
  laranja: "#F97316",
  amarelo: "#FACC15",
  dourado: "#EAB308",
  
  // Verde
  verde: "#22C55E",
  verdeEscuro: "#14532D",
  verdeLima: "#84CC16",
  
  // Azul
  azul: "#3B82F6",
  azulClaro: "#38BDF8",
  azulEscuro: "#1E3A8A",
  azulMarinho: "#1E40AF",
  
  // Roxo
  roxo: "#A855F7",
  roxoEscuro: "#7C3AED",
  violeta: "#8B5CF6",
  
  // Preto / Branco / Cinza
  preto: "#000000",
  branco: "#FFFFFF",
  cinzaClaro: "#D1D5DB",
  cinza: "#6B7280",
  cinzaEscuro: "#374151",
  
  // Marrom / Bege
  marrom: "#92400E",
  bege: "#D4A574",
  
  // Ciano / Teal
  ciano: "#06B6D4",
  teal: "#14B8A6",
  
  // Cores especiais
  bordo: "#881337",
  coral: "#FB7185",
  indigo: "#6366F1",
  esmeralda: "#10B981",
};

/**
 * Lista de nomes de cores para dropdown
 */
export const SHIRT_COLOR_NAMES = Object.keys(SHIRT_COLORS);

/**
 * Retorna hex de uma cor pelo nome
 */
export function getShirtColorHex(name: string): string {
  return SHIRT_COLORS[name] || SHIRT_COLORS.cinza;
}
