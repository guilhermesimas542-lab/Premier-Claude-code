import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EntryResponse {
  id: string;
  date: string;
  tier_required: string;
  addon_required: string | null;
  locked: boolean;
  display_title: string;
  display_market: string | null;
  display_odd: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Extrair token do header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decodificar token
    let tokenData;
    try {
      tokenData = JSON.parse(atob(token));
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar expiração
    if (tokenData.exp < Date.now()) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, main_tier')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar entitlements ativos
    const { data: entitlements } = await supabase
      .from('entitlements')
      .select('product_key, ends_at')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const activeAddons = (entitlements || [])
      .filter(e => !e.ends_at || new Date(e.ends_at) > new Date())
      .map(e => e.product_key);

    // Parâmetro de data
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const filterDate = dateParam || new Date().toISOString().split('T')[0];

    // Calcular tiers permitidos (para UNLOCK)
    const allowedTiers = getAllowedTiers(user.main_tier);
    const isPaidUser = user.main_tier !== 'free';

    // Buscar TODAS as entradas ativas do dia
    const { data: allEntries, error: entriesError } = await supabase
      .from('content_entries')
      .select('*')
      .eq('active', true)
      .eq('date', filterDate)
      .order('created_at', { ascending: false });

    if (entriesError) {
      console.error('Erro ao buscar entradas:', entriesError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao buscar entradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar cada entrada para determinar locked/unlocked
    // DECISÃO: Usuário pago NÃO vê entries de tier FREE (nem locked nem unlocked)
    // Motivo: Não faz sentido mostrar conteúdo inferior, evita confusão
    const entries: EntryResponse[] = (allEntries || [])
      .filter(entry => {
        // Filtrar entries FREE para usuários pagos
        if (isPaidUser && entry.tier_required === 'free' && !entry.addon_required) {
          return false;
        }
        return true;
      })
      .map(entry => {
        // Calcular se está UNLOCKED
        const isUnlocked = calculateUnlocked(
          entry.tier_required,
          entry.addon_required,
          allowedTiers,
          activeAddons
        );

        return {
          id: entry.id,
          date: entry.date,
          tier_required: entry.tier_required,
          addon_required: entry.addon_required,
          locked: !isUnlocked,
          created_at: entry.created_at,
          // display_title sempre visível
          display_title: entry.title,
          // market e odd só se unlocked
          display_market: isUnlocked ? entry.market : null,
          display_odd: isUnlocked ? entry.odd : null,
          // metadata completo só se unlocked
          metadata: isUnlocked ? entry.metadata : null,
        };
      });

    return new Response(
      JSON.stringify({
        success: true,
        date: filterDate,
        user_tier: user.main_tier,
        allowed_tiers: allowedTiers,
        active_addons: activeAddons,
        entries,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no /entries:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getAllowedTiers(mainTier: string): string[] {
  switch (mainTier) {
    case 'free':
      return ['free'];
    case 'basic':
      return ['basic'];
    case 'pro':
      return ['basic', 'pro'];
    case 'ultra':
      return ['basic', 'pro', 'ultra'];
    default:
      return ['free'];
  }
}

/**
 * Calcula se uma entry está UNLOCKED para o usuário
 * 
 * Regras:
 * 1. Se tier_required está em allowedTiers → UNLOCKED
 * 2. Se addon_required != null E está em activeAddons → UNLOCKED
 * 3. Caso contrário → LOCKED
 */
function calculateUnlocked(
  tierRequired: string,
  addonRequired: string | null,
  allowedTiers: string[],
  activeAddons: string[]
): boolean {
  // Regra 1: Tier está permitido
  if (allowedTiers.includes(tierRequired)) {
    return true;
  }

  // Regra 2: Addon está ativo (independente do tier)
  if (addonRequired && activeAddons.includes(addonRequired)) {
    return true;
  }

  return false;
}
