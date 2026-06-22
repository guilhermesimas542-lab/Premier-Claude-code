// Conta vTurb (ConverteAI) do CL Score. Se um dia trocar de conta, atualize aqui.
export const VTURB_ACCOUNT = "af053167-2542-4323-9c93-d010e7938eb5";

/**
 * Monta a URL do player.js específico de um vídeo do vTurb a partir do videoId.
 * O `videoId` é o id do <vturb-smartplayer> (ex.: "vid-6a3609be39b455f6496f36a8");
 * o player.js usa esse mesmo id sem o prefixo "vid-".
 */
export function vturbPlayerSrc(videoId: string): string {
  const playerId = videoId.replace(/^vid-/, "");
  return `https://scripts.converteai.net/${VTURB_ACCOUNT}/players/${playerId}/v4/player.js`;
}
