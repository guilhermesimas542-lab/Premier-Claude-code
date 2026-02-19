import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID helper – implements RFC 8292 manually using WebCrypto (no external lib needed in Deno)
async function generateVapidToken(audience: string, subject: string, privateKeyB64: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${b64url(header)}.${b64url(payload)}`;

  // Import ECDSA private key (raw base64url → DER PKCS8 for P-256)
  const rawPriv = Uint8Array.from(atob(privateKeyB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

  // Build PKCS8 wrapper for P-256 private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x41,
    0x02, 0x01, 0x00,
    0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID prime256v1
    0x04, 0x27,
      0x30, 0x25,
        0x02, 0x01, 0x01,
        0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(pkcs8Header.length + rawPriv.length);
  pkcs8.set(pkcs8Header);
  pkcs8.set(rawPriv, pkcs8Header.length);

  const cryptoKey = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, enc.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${signingInput}.${sigB64}`;
}

async function sendPushToSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const token = await generateVapidToken(audience, vapidSubject, vapidPrivateKey);
  const authHeader = `vapid t=${token},k=${vapidPublicKey}`;

  // Encrypt payload using Web Push encryption (RFC 8291)
  const payloadStr = JSON.stringify(payload);
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payloadStr);

  // Decode subscriber keys
  const p256dhBytes = Uint8Array.from(atob(subscription.keys.p256dh.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const authBytes = Uint8Array.from(atob(subscription.keys.auth.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

  // Generate ephemeral key pair
  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const ephemeralPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));

  // Import subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey('raw', p256dhBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  // Derive shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: subscriberPublicKey }, ephemeral.privateKey, 256));

  // HKDF to derive content encryption key and nonce
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prk = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']);

  // Auth secret HKDF
  const authInfo = enc.encode('Content-Encoding: auth\0');
  const authPrk = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: authInfo },
    prk, 256
  ));

  const keyMaterial = await crypto.subtle.importKey('raw', authPrk, { name: 'HKDF' }, false, ['deriveBits']);

  // Build context
  const receiverKeyInfo = new Uint8Array([...enc.encode('P-256\0'), 0x00, p256dhBytes.length >> 8, p256dhBytes.length & 0xff, ...p256dhBytes]);
  const senderKeyInfo = new Uint8Array([...enc.encode('P-256\0'), 0x00, ephemeralPublicKeyRaw.length >> 8, ephemeralPublicKeyRaw.length & 0xff, ...ephemeralPublicKeyRaw]);
  const context = new Uint8Array([...enc.encode('P-256\0'), 0x00, p256dhBytes.length >> 8, p256dhBytes.length & 0xff, ...p256dhBytes, 0x00, ephemeralPublicKeyRaw.length >> 8, ephemeralPublicKeyRaw.length & 0xff, ...ephemeralPublicKeyRaw]);

  const cekInfo = new Uint8Array([...enc.encode('Content-Encoding: aesgcm\0'), ...enc.encode('P-256\0'), ...new Uint8Array([0x00, p256dhBytes.length >> 8, p256dhBytes.length & 0xff]), ...p256dhBytes, 0x00, ...new Uint8Array([ephemeralPublicKeyRaw.length >> 8, ephemeralPublicKeyRaw.length & 0xff]), ...ephemeralPublicKeyRaw]);
  const nonceInfo = new Uint8Array([...enc.encode('Content-Encoding: nonce\0'), ...enc.encode('P-256\0'), ...new Uint8Array([0x00, p256dhBytes.length >> 8, p256dhBytes.length & 0xff]), ...p256dhBytes, 0x00, ...new Uint8Array([ephemeralPublicKeyRaw.length >> 8, ephemeralPublicKeyRaw.length & 0xff]), ...ephemeralPublicKeyRaw]);

  const cekBits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo }, keyMaterial, 128));
  const nonceBits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, keyMaterial, 96));

  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);

  // Pad payload
  const padded = new Uint8Array(payloadBytes.length + 2);
  padded[0] = 0;
  padded[1] = 0;
  padded.set(payloadBytes, 2);

  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, padded));

  // Build body: salt (16) + rs (4) + keylen (1) + ephemeral public key (65) + encrypted
  const rs = new Uint8Array([0x00, 0x10, 0x00, 0x00]); // 4096
  const keylen = new Uint8Array([ephemeralPublicKeyRaw.length]);
  const body = new Uint8Array(16 + 4 + 1 + ephemeralPublicKeyRaw.length + encrypted.length);
  let offset = 0;
  body.set(salt, offset); offset += 16;
  body.set(rs, offset); offset += 4;
  body.set(keylen, offset); offset += 1;
  body.set(ephemeralPublicKeyRaw, offset); offset += ephemeralPublicKeyRaw.length;
  body.set(encrypted, offset);

  const saltB64 = btoa(String.fromCharCode(...salt)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const ephemeralB64 = btoa(String.fromCharCode(...ephemeralPublicKeyRaw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${saltB64}`,
      'Crypto-Key': `dh=${ephemeralB64}`,
      'TTL': '86400',
    },
    body,
  });

  return { ok: response.ok, status: response.status };
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
