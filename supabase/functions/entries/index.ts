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
      .select('product_key')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const activeAddons = (entitlements || []).map(e => e.product_key);

    // Parâmetro de data
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const filterDate = dateParam || new Date().toISOString().split('T')[0];

    // Calcular tiers permitidos
    const allowedTiers = getAllowedTiers(user.main_tier);

    // Buscar entradas ativas
    const { data: entries, error: entriesError } = await supabase
      .from('content_entries')
      .select('*')
      .eq('active', true)
      .eq('date', filterDate)
      .in('tier_required', allowedTiers);

    if (entriesError) {
      console.error('Erro ao buscar entradas:', entriesError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao buscar entradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrar por addon_required
    const filteredEntries = (entries || []).filter(entry => {
      // Se não exige addon, passa
      if (!entry.addon_required) return true;
      // Se exige addon, verificar se o usuário tem
      return activeAddons.includes(entry.addon_required);
    });

    return new Response(
      JSON.stringify({
        success: true,
        date: filterDate,
        user_tier: user.main_tier,
        allowed_tiers: allowedTiers,
        active_addons: activeAddons,
        entries: filteredEntries,
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
