import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToSubscription } from "../_shared/webpush.ts";

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

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;

    const body = await req.json();
    const { notification_id, title, message } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ success: false, message: 'title e message são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription_object');

    if (subError) {
      return new Response(
        JSON.stringify({ success: false, message: subError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = { sent: 0, failed: 0, invalid: 0 };

    for (const row of subscriptions ?? []) {
      const sub = row.subscription_object as any;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        results.invalid++;
        continue;
      }
      try {
        const result = await sendPushToSubscription(
          sub,
          { title, body: message },
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );
        if (result.ok || result.status === 201) {
          results.sent++;
        } else if (result.status === 410 || result.status === 404) {
          // Subscription expired – remove it
          await supabase.from('push_subscriptions').delete().eq('user_id', row.user_id);
          results.failed++;
        } else {
          results.failed++;
        }
      } catch (e) {
        console.error('Erro ao enviar para', row.user_id, e);
        results.failed++;
      }
    }

    // Mark notification as sent
    if (notification_id) {
      await supabase
        .from('notifications')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', notification_id);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
