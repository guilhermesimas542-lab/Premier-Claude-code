import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  email: string;
}

interface UserResponse {
  id: string;
  email: string;
  main_tier: string;
  is_vitalicio: boolean;
  vitalicio_since: string | null;
  created_at: string;
  last_seen_at: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, message: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email }: LoginRequest = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Buscar ou criar usuário usando a função do banco
    const { data: user, error: userError } = await supabase
      .rpc('get_or_create_user', { p_email: normalizedEmail });

    if (userError) {
      console.error('Erro ao buscar/criar usuário:', userError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erro interno do servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se usuário é free (não tem compra), redireciona para checkout
    if (user.main_tier === 'free') {
      return new Response(
        JSON.stringify({
          success: true,
          redirect: true,
          checkout: 'https://checkout.premierfc.app', // URL de checkout configurável
          message: 'Usuário não possui plano ativo'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar entitlements ativos do usuário
    const { data: entitlements, error: entError } = await supabase
      .from('entitlements')
      .select('product_key, starts_at, ends_at, status')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (entError) {
      console.error('Erro ao buscar entitlements:', entError);
    }

    // Calcular allowed_access baseado no tier
    const allowedTiers = getAllowedTiers(user.main_tier);
    const activeAddons = (entitlements || [])
      .filter(e => e.status === 'active' && (!e.ends_at || new Date(e.ends_at) > new Date()))
      .map(e => e.product_key);

    // Gerar token simples (em produção, usar JWT real)
    const token = btoa(JSON.stringify({
      user_id: user.id,
      email: user.email,
      tier: user.main_tier,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
    }));

    const response = {
      success: true,
      redirect: false,
      user: {
        id: user.id,
        email: user.email,
        main_tier: user.main_tier,
        is_vitalicio: user.is_vitalicio,
        vitalicio_since: user.vitalicio_since,
        created_at: user.created_at,
        last_seen_at: user.last_seen_at,
      },
      entitlements: entitlements || [],
      allowed_access: {
        tiers: allowedTiers,
        addons: activeAddons,
      },
      token,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no login:', error);
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
