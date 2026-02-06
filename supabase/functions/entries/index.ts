import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Calcular tiers permitidos
    const allowedTiers = getAllowedTiers(user.main_tier);

    // AJUSTE 3: Buscar entradas por TIER + entradas por ADD-ON (independente do tier)
    
    // 1. Entradas pelo tier (sem addon_required)
    const { data: tierEntries, error: tierError } = await supabase
      .from('content_entries')
      .select('*')
      .eq('active', true)
      .eq('date', filterDate)
      .in('tier_required', allowedTiers)
      .is('addon_required', null);

    if (tierError) {
      console.error('Erro ao buscar entradas por tier:', tierError);
    }

    // 2. Entradas por add-on (independente do tier, basta ter o addon ativo)
    let addonEntries: any[] = [];
    if (activeAddons.length > 0) {
      const { data: addons, error: addonError } = await supabase
        .from('content_entries')
        .select('*')
        .eq('active', true)
        .eq('date', filterDate)
        .in('addon_required', activeAddons);

      if (addonError) {
        console.error('Erro ao buscar entradas por addon:', addonError);
      } else {
        addonEntries = addons || [];
      }
    }

    // 3. Unir e remover duplicados (por id)
    const allEntries = [...(tierEntries || []), ...addonEntries];
    const uniqueEntries = allEntries.filter(
      (entry, index, self) => index === self.findIndex(e => e.id === entry.id)
    );

    // Ordenar por created_at desc
    uniqueEntries.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return new Response(
      JSON.stringify({
        success: true,
        date: filterDate,
        user_tier: user.main_tier,
        allowed_tiers: allowedTiers,
        active_addons: activeAddons,
        entries: uniqueEntries,
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
