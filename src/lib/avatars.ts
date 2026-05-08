export interface Avatar {
  id: string;
  emoji: string;
  label: string;
  requiredLevel: number;
}

export const AVATARS: Avatar[] = [
  { id: 'avatar_default_1', emoji: '⚽', label: 'Bola', requiredLevel: 1 },
  { id: 'avatar_fire', emoji: '🔥', label: 'Fogo', requiredLevel: 1 },
  { id: 'avatar_star', emoji: '⭐', label: 'Estrela', requiredLevel: 1 },
  { id: 'avatar_trophy', emoji: '🏆', label: 'Troféu', requiredLevel: 2 },
  { id: 'avatar_crown', emoji: '👑', label: 'Coroa', requiredLevel: 3 },
  { id: 'avatar_lion', emoji: '🦁', label: 'Leão', requiredLevel: 3 },
  { id: 'avatar_eagle', emoji: '🦅', label: 'Águia', requiredLevel: 4 },
  { id: 'avatar_rocket', emoji: '🚀', label: 'Foguete', requiredLevel: 5 },
  { id: 'avatar_diamond', emoji: '💎', label: 'Diamante', requiredLevel: 6 },
  { id: 'avatar_robot', emoji: '🤖', label: 'Robô', requiredLevel: 7 },
  { id: 'avatar_alien', emoji: '👽', label: 'Alien', requiredLevel: 8 },
  { id: 'avatar_dragon', emoji: '🐉', label: 'Dragão', requiredLevel: 9 },
  { id: 'avatar_goat', emoji: '🐐', label: 'GOAT', requiredLevel: 10 },
];

export function getAvatarById(id: string): Avatar {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
}

export function getAvailableAvatars(level: number): Avatar[] {
  return AVATARS.filter(a => a.requiredLevel <= level);
}

export function getLockedAvatars(level: number): Avatar[] {
  return AVATARS.filter(a => a.requiredLevel > level);
}

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Novato',
  2: 'Principiante',
  3: 'Aprendiz',
  4: 'Jugador',
  5: 'Veterano',
  6: 'Experto',
  7: 'Maestro',
  8: 'Gran Maestro',
  9: 'Leyenda',
  10: 'GOAT',
};
