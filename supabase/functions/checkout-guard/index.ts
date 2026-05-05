import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BodySchema = z.object({
  user_email: z.string().email().max(255),
  requested_product_id: z.string().min(1).max(64),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

type GuardResponse = {
  allow: boolean;
  upsell_card_id?: string;
  reason?: string;
  fallback_url?: string;
};

const json = (body: GuardResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function logError(message: string, properties: Record<string, unknown>) {
  try {
    await supabase.from('app_errors').insert({
      error_message: message,
      error_fingerprint: `checkout-guard:${message}`.slice(0, 200),
      component: 'edge:checkout-guard',
      properties,
    });
  } catch (_) {
    // swallow
  }
}

async function findUpsellCardId(slug: string): Promise<string | undefined> {
  const { data } = await supabase
    .from('pay_cards')
    .select('id')
    .eq('associated_plan', slug)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ allow: true, reason: 'method_not_allowed' }, 200);
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { user_email, requested_product_id } = parsed.data;

    // Lookup user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, main_tier')
      .eq('email', user_email.toLowerCase().trim())
      .maybeSingle();

    if (userErr) {
      await logError('user_lookup_failed', { user_email, requested_product_id, err: userErr.message });
      return json({ allow: true, reason: 'guard_degraded' });
    }

    // Lookup product
    const { data: product, error: prodErr } = await supabase
      .from('products_catalog')
      .select('provider_product_id, product_type, tier, entitlement_key, active')
      .eq('provider_product_id', requested_product_id)
      .eq('active', true)
      .maybeSingle();

    if (prodErr) {
      await logError('product_lookup_failed', { requested_product_id, err: prodErr.message });
      return json({ allow: true, reason: 'guard_degraded' });
    }

    if (!product) {
      // Unknown product → allow (don't block unknowns)
      return json({ allow: true, reason: 'unknown_product' });
    }

    // No user → can't make ownership decisions; allow
    if (!user) {
      return json({ allow: true, reason: 'unknown_user' });
    }

    const userTier = user.main_tier as string;

    // Active entitlements
    const { data: ents } = await supabase
      .from('entitlements')
      .select('product_key')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const ownedKeys = new Set((ents ?? []).map((e: any) => e.product_key as string));

    const ptype = product.product_type;
    const ptier = product.tier as string | null;
    const pkey = product.entitlement_key as string | null;

    // Rule (b): plan diamante and user already diamante
    if (ptype === 'plan' && ptier === 'diamante' && userTier === 'diamante') {
      return json({ allow: false, reason: 'already_owned' });
    }

    // Rule (a): plan premium and user is already premium or diamante → block, upsell to diamante
    if (ptype === 'plan' && ptier === 'premium' && (userTier === 'premium' || userTier === 'diamante')) {
      const upsell_card_id = await findUpsellCardId('diamante_upgrade');
      return json({ allow: false, reason: 'tier_already_satisfied', upsell_card_id });
    }

    // Rule (c): addon already owned
    if (ptype === 'addon' && pkey && ownedKeys.has(pkey)) {
      return json({ allow: false, reason: 'already_owned' });
    }

    // Rule (d): avulsos para usuários free → bloqueia, upsell premium
    const AVULSO_IDS = new Set(['RDEVAP', 'LY7ON2', 'R36ONP', '4NG28D']);
    if (AVULSO_IDS.has(requested_product_id) && userTier === 'free') {
      const upsell_card_id = await findUpsellCardId('premium');
      return json({ allow: false, reason: 'free_user_should_upgrade', upsell_card_id });
    }

    return json({ allow: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    await logError('guard_exception', { msg });
    // Graceful degradation
    return json({ allow: true, reason: 'guard_degraded' });
  }
});
