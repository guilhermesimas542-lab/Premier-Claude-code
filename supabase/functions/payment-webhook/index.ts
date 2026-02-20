import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Payment Webhook Handler
 *
 * Receives payment events from Hotmart/Stripe/etc and updates user access in the database.
 *
 * Expected payload (POST body):
 * {
 *   "email": "user@example.com",
 *   "product_key": "basic" | "pro" | "ultra" | "alavancagem" | "desaltas" | "live_telegram" | "acesso_vitalicio",
 *   "action": "purchase" | "cancel" | "refund",
 *   "secret": "<WEBHOOK_SECRET>",   // optional security token
 *   "ends_at": "2026-12-31T23:59:59Z"  // optional expiry, null = lifetime
 * }
 *
 * Hotmart integration note:
 * Configure the webhook URL in Hotmart → Ferramentas → Webhooks:
 *   https://<project-ref>.supabase.co/functions/v1/payment-webhook
 * And send a secret header or body field to authenticate.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // ─── Security check ─────────────────────────────────────────────────────
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = body.secret || req.headers.get('x-webhook-secret');
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { email, product_key, action = 'purchase', ends_at = null } = body;

    if (!email || !product_key) {
      return new Response(JSON.stringify({ error: 'email and product_key are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const normalizedEmail = email.toLowerCase().trim();

    // ─── Find or create user ─────────────────────────────────────────────────
    const { data: user, error: userError } = await supabase
      .rpc('get_or_create_user', { p_email: normalizedEmail });

    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(JSON.stringify({ error: 'Failed to find/create user' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const TIER_KEYS = ['free', 'basic', 'pro', 'ultra'];
    const isTierUpgrade = TIER_KEYS.includes(product_key);

    if (action === 'purchase') {
      if (isTierUpgrade) {
        // ─── Update main tier ──────────────────────────────────────────────
        const { error: updateError } = await supabase
          .from('users')
          .update({ main_tier: product_key })
          .eq('id', user.id);

        if (updateError) throw updateError;

        console.log(`✅ Tier updated for ${normalizedEmail}: ${product_key}`);
      } else {
        // ─── Grant add-on entitlement ──────────────────────────────────────
        // Revoke any existing entitlement for same product first
        await supabase
          .from('entitlements')
          .update({ status: 'revoked' })
          .eq('user_id', user.id)
          .eq('product_key', product_key);

        const { error: entError } = await supabase
          .from('entitlements')
          .insert({
            user_id: user.id,
            product_key,
            status: 'active',
            source: 'purchase',
            starts_at: new Date().toISOString(),
            ends_at: ends_at || null,
          });

        if (entError) throw entError;

        console.log(`✅ Entitlement granted for ${normalizedEmail}: ${product_key}`);
      }
    } else if (action === 'refund' || action === 'cancel') {
      if (isTierUpgrade) {
        // Downgrade to free on refund
        await supabase
          .from('users')
          .update({ main_tier: 'free' })
          .eq('id', user.id);
      } else {
        // Revoke entitlement
        await supabase
          .from('entitlements')
          .update({ status: 'revoked' })
          .eq('user_id', user.id)
          .eq('product_key', product_key)
          .eq('status', 'active');
      }
      console.log(`🔒 Access revoked for ${normalizedEmail}: ${product_key}`);
    }

    // ─── Log the event ───────────────────────────────────────────────────────
    await supabase.from('events').insert({
      user_id: user.id,
      event_name: `payment_${action}`,
      metadata: { product_key, email: normalizedEmail, ends_at },
    });

    return new Response(JSON.stringify({ received: true, user_id: user.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
