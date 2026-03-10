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

    // Buscar usuário atualizado (SEM atualizar last_seen_at - AJUSTE 2)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
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
      .select('product_key, starts_at, ends_at, status')
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Calcular allowed_access
    const allowedTiers = getAllowedTiers(user.main_tier);
    const activeAddons = (entitlements || [])
      .filter(e => e.status === 'active' && (!e.ends_at || new Date(e.ends_at) > new Date()))
      .map(e => e.product_key);

    // Flag de paywall para usuários free
    const isFree = user.main_tier === 'free';

    return new Response(
      JSON.stringify({
        success: true,
        show_paywall_popup: isFree,
        checkout: isFree ? 'https://checkout.premierfc.app' : null,
        user: {
          id: user.id,
          email: user.email,
          main_tier: user.main_tier,
          is_vitalicio: activeAddons.includes('acesso_vitalicio'),
          created_at: user.created_at,
          last_seen_at: user.last_seen_at,
        },
        entitlements: entitlements || [],
        allowed_access: {
          tiers: allowedTiers,
          addons: activeAddons,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no /me:', error);
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
