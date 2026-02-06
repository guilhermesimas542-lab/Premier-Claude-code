import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionRequest {
  action: 'start' | 'end' | 'heartbeat';
  session_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
    
    let tokenData;
    try {
      tokenData = JSON.parse(atob(token));
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.exp < Date.now()) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SessionRequest = await req.json();
    const userId = tokenData.user_id;
    const now = new Date();

    if (body.action === 'start') {
      // Criar nova sessão
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          session_start_at: now.toISOString(),
          last_heartbeat_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao iniciar sessão:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao iniciar sessão' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // AJUSTE 2: Atualizar last_seen_at SOMENTE no start da sessão
      await supabase
        .from('users')
        .update({ last_seen_at: now.toISOString() })
        .eq('id', userId);

      return new Response(
        JSON.stringify({
          success: true,
          session_id: session.id,
          started_at: session.session_start_at,
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'end' && body.session_id) {
      // Buscar sessão
      const { data: session, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', body.session_id)
        .eq('user_id', userId)
        .single();

      if (fetchError || !session) {
        return new Response(
          JSON.stringify({ success: false, message: 'Sessão não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calcular duração
      const startTime = new Date(session.session_start_at);
      const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      // Atualizar sessão
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          session_end_at: now.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', body.session_id);

      if (updateError) {
        console.error('Erro ao encerrar sessão:', updateError);
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao encerrar sessão' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          session_id: body.session_id,
          duration_seconds: durationSeconds,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'heartbeat' && body.session_id) {
      // Atualizar heartbeat (NÃO atualiza last_seen_at)
      const { error } = await supabase
        .from('sessions')
        .update({ last_heartbeat_at: now.toISOString() })
        .eq('id', body.session_id)
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao atualizar heartbeat:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao atualizar heartbeat' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no /sessions:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
