import { useState, useEffect, useCallback } from 'react';
import { getEntriesExternal, trackEventExternal, EntriesResponse } from '@/lib/apiExternal';
import { format } from 'date-fns';
import { ShirtConfig } from '@/components/PremiumBettingCard';

// ======= TIPOS DO BACKEND =======
export interface BackendEntry {
  id: string;
  date: string;
  tier_required: string;
  addon_required: string | null;
  locked: boolean;
  display_title: string;
  display_market: string | null;
  display_odd: number | null;
  metadata: EntryMetadata | null;
  created_at: string;
}

export interface TeamMetadata {
  name?: string;
  logo?: string;
  shirt?: ShirtConfig;
}

export interface EntryMetadata {
  team1?: TeamMetadata;
  team2?: TeamMetadata;
  team1_name?: string;
  team2_name?: string;
  team1_logo?: string;
  team2_logo?: string;
  team1_shirt?: ShirtConfig;
  team2_shirt?: ShirtConfig;
  match_date?: string;
  expiration_date?: string;
  bet_choice?: string;
  justificativa?: string;
  url_iframe?: string;
  selections_count?: number;
  special_type?: 'ALAVANCAGEM' | 'ODDS_ALTAS';
}

// ======= TIPO NORMALIZADO PARA O FRONTEND =======
export interface DisplayEntry {
  id: string;
  date: string;
  tier: 'GRÁTIS' | 'BÁSICO' | 'PRO' | 'ULTRA' | 'ALAVANCAGEM' | 'ODDS_ALTAS' | 'MÚLTIPLA';
  locked: boolean;
  isExpired: boolean;
  
  team1: {
    name: string;
    logo?: string;
    shirt?: ShirtConfig;
  };
  team2: {
    name: string;
    logo?: string;
    shirt?: ShirtConfig;
  };
  
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

// ======= HELPERS =======

function mapBackendTierToFrontend(
  tierRequired: string, 
  addonRequired: string | null,
  specialType?: 'ALAVANCAGEM' | 'ODDS_ALTAS',
  selectionsCount?: number
): DisplayEntry['tier'] {
  if (specialType === 'ALAVANCAGEM' || addonRequired === 'alavancagem') return 'ALAVANCAGEM';
  if (specialType === 'ODDS_ALTAS' || addonRequired === 'desaltas') return 'ODDS_ALTAS';
  
  if (selectionsCount && selectionsCount > 1) return 'MÚLTIPLA';
  
  switch (tierRequired) {
    case 'ultra': return 'ULTRA';
    case 'pro': return 'PRO';
    case 'basic': return 'BÁSICO';
    case 'free': return 'GRÁTIS';
    default: return 'GRÁTIS';
  }
}

function isExpiredTip(expirationDate: string): boolean {
  const now = new Date();
  const expireAt = new Date(expirationDate);
  return now > expireAt;
}

function getDefaultExpiration(entryDate: string): string {
  return `${entryDate}T23:59:00.000Z`;
}

function normalizeEntry(entry: BackendEntry): DisplayEntry {
  const meta = entry.metadata || {};
  const expirationDate = meta.expiration_date || getDefaultExpiration(entry.date);
  
  const team1Name = meta.team1?.name || meta.team1_name || 'Time 1';
  const team1Logo = meta.team1?.logo || meta.team1_logo;
  const team1Shirt = meta.team1?.shirt || meta.team1_shirt || { variant: 'solid' as const, primaryColor: '#6B7280' };
  
  const team2Name = meta.team2?.name || meta.team2_name || 'Time 2';
  const team2Logo = meta.team2?.logo || meta.team2_logo;
  const team2Shirt = meta.team2?.shirt || meta.team2_shirt || { variant: 'solid' as const, primaryColor: '#6B7280' };
  
  let specialType = meta.special_type;
  if (!specialType && entry.display_title) {
    if (entry.display_title.toLowerCase().includes('alavancagem')) {
      specialType = 'ALAVANCAGEM';
    } else if (entry.display_title.toLowerCase().includes('odds altas')) {
      specialType = 'ODDS_ALTAS';
    }
  }
  
  return {
    id: entry.id,
    date: entry.date,
    tier: mapBackendTierToFrontend(
      entry.tier_required, 
      entry.addon_required,
      specialType,
      meta.selections_count
    ),
    locked: entry.locked,
    isExpired: isExpiredTip(expirationDate),
    
    team1: {
      name: team1Name,
      logo: team1Logo,
      shirt: team1Shirt,
    },
    team2: {
      name: team2Name,
      logo: team2Logo,
      shirt: team2Shirt,
    },
    
    market: entry.display_market || 'Mercado',
    betChoice: meta.bet_choice || entry.display_title,
    odds: entry.display_odd || 1.0,
    matchDate: meta.match_date || '',
    expirationDate,
    
    justificativa: meta.justificativa,
    urlIframe: meta.url_iframe,
    selectionsCount: meta.selections_count,
    specialType,
  };
}

// ======= HOOK =======
interface UseEntriesExternalReturn {
  entries: DisplayEntry[];
  activeEntries: DisplayEntry[];
  expiredEntries: DisplayEntry[];
  isLoading: boolean;
  error: string | null;
  userTier: string;
  allowedTiers: string[];
  refetch: () => Promise<void>;
}

export function useEntriesExternal(date?: string): UseEntriesExternalReturn {
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [allowedTiers, setAllowedTiers] = useState<string[]>(['free']);

  const targetDate = date || format(new Date(), 'yyyy-MM-dd');

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 [useEntriesExternal] Buscando entries do Supabase EXTERNO...');
      const response = await getEntriesExternal(targetDate);

      if (response.success && response.entries) {
        const normalized = (response.entries as unknown as BackendEntry[]).map(normalizeEntry);
        setEntries(normalized);
        setUserTier(response.user_tier || 'free');
        setAllowedTiers(response.allowed_tiers || ['free']);
        
        console.log(`✅ [useEntriesExternal] ${normalized.length} entries carregadas do EXTERNO`);
        
        await trackEventExternal('view_entries', { date: targetDate, count: normalized.length });
      } else {
        setError('Erro ao carregar entradas do Supabase externo');
      }
    } catch (err) {
      console.error('❌ [useEntriesExternal] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao conectar com o servidor externo');
    } finally {
      setIsLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const activeEntries = entries.filter(e => !e.isExpired);
  const expiredEntries = entries.filter(e => e.isExpired);

  return {
    entries,
    activeEntries,
    expiredEntries,
    isLoading,
    error,
    userTier,
    allowedTiers,
    refetch: fetchEntries,
  };
}
