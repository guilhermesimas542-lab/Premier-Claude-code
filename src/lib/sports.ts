import { SportsResponse } from "@/types/sports";
import { fetchAuth } from "./auth";

const API_BASE_URL = "https://apiv1.premierfc.app/api/v1";

export async function fetchSports(): Promise<SportsResponse> {
  const data = await fetchAuth(`${API_BASE_URL}/esportes/GetSports`);
  return data;
}

export async function fetchSportById(sportId: number): Promise<SportsResponse> {
  const data = await fetchSports();
  return data;
}

export function getBackgroundImageUrl(backgroundId: string): string {
  if (!backgroundId) return "";
  // Para imagens customizadas locais
  if (backgroundId === "futsal-custom") {
    return "/images/futsal-arena.jpg";
  }
  return `https://imagedelivery.net/uGmh4EK74r0qnuu3lZf-oA/${backgroundId}/public`;
}
