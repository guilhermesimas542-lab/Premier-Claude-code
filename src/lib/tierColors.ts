/**
 * Paleta oficial de cores por tier/addon do Premier.
 *
 * GRÁTIS  — #94A3B8 cinza
 * BÁSICO  — #60A5FA azul claro
 * PRO     — #00FF7F verde
 * ULTRA   — #7C3AED roxo
 * ALAVANCAGEM — #F0B429 gold
 * ODDS ALTAS  — #F97316 laranja
 */

export interface TierColorStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
}

const STYLES: Record<string, TierColorStyle> = {
  free: {
    label: 'GRÁTIS',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.15)',
    border: 'rgba(148,163,184,0.5)',
    glow: '0 0 15px rgba(148,163,184,0.15)',
  },
  basic: {
    label: 'BÁSICO',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.15)',
    border: 'rgba(96,165,250,0.5)',
    glow: '0 0 15px rgba(96,165,250,0.15)',
  },
  pro: {
    label: 'PRO',
    color: '#00FF7F',
    bg: 'rgba(0,255,127,0.15)',
    border: 'rgba(0,255,127,0.5)',
    glow: '0 0 15px rgba(0,255,127,0.15)',
  },
  ultra: {
    label: 'ULTRA',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.15)',
    border: 'rgba(124,58,237,0.5)',
    glow: '0 0 15px rgba(124,58,237,0.15)',
  },
  alavancagem: {
    label: 'ALAVANCAGEM',
    color: '#F0B429',
    bg: 'rgba(240,180,41,0.15)',
    border: 'rgba(240,180,41,0.5)',
    glow: '0 0 15px rgba(240,180,41,0.15)',
  },
  desaltas: {
    label: 'ODDS ALTAS',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.15)',
    border: 'rgba(249,115,22,0.5)',
    glow: '0 0 15px rgba(249,115,22,0.15)',
  },
};

/**
 * Retorna o estilo de cor para um tier + addon.
 * Addon tem prioridade sobre tier (alavancagem, desaltas).
 */
export function getTierStyle(tier: string, addon?: string | null): TierColorStyle {
  if (addon && STYLES[addon]) return STYLES[addon];
  return STYLES[(tier || '').toLowerCase()] || STYLES.free;
}

/**
 * Versão para badges do carrossel (opacidades mais fortes).
 */
export function getTierBadgeStyle(tier: string, addon?: string | null): {
  bg: string; border: string; text: string; label: string;
} {
  const s = getTierStyle(tier, addon);
  return {
    bg: s.bg.replace(/0\.15\)/, '0.25)'),
    border: s.border.replace(/0\.5\)/, '0.6)'),
    text: s.color,
    label: s.label,
  };
}
