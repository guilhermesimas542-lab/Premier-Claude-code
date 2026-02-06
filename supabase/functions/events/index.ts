import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventRequest {
  event_name: string;
  metadata?: Record<string, unknown>;
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

    // Extrair token do header (opcional para eventos)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const tokenData = JSON.parse(atob(token));
        if (tokenData.exp > Date.now()) {
          userId = tokenData.user_id;
        }
      } catch {
        // Token inválido, continua sem user_id
      }
    }

    const body: EventRequest = await req.json();

    if (!body.event_name) {
      return new Response(
        JSON.stringify({ success: false, message: 'event_name é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inserir evento
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        user_id: userId,
        event_name: body.event_name,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir evento:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao registrar evento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AJUSTE 2: Atualizar APENAS last_event_at do usuário (não last_seen_at)
    if (userId) {
      const updateData: Record<string, string> = {
        last_event_at: new Date().toISOString()
      };
      
      // Se for evento app_open, atualiza TAMBÉM last_seen_at
      if (body.event_name === 'app_open') {
        updateData.last_seen_at = new Date().toISOString();
      }
      
      await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event.id,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no /events:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
