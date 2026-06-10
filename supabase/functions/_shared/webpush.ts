// ============================================================
// _shared/webpush — helpers de Web Push (RFC 8291 + VAPID RFC 8292).
//
// Extraído de supabase/functions/send-push-notification/index.ts pra ser
// reaproveitado também pelo crm-process-schedule (canal push real).
//
// Implementa criptografia manualmente via WebCrypto (Deno nativo), sem libs.
// ============================================================

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface WebPushPayload {
  title: string;
  body: string;
}

// Decodifica base64url (ou base64 padrão) com padding tolerante.
// Lança erro descritivo (com label) se a entrada for inválida.
function b64urlDecode(input: string, label: string): Uint8Array {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error(`webpush:${label}: vazio ou não-string`);
  }
  const cleaned = input.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const pad = cleaned.length % 4;
  const padded = pad === 0 ? cleaned : cleaned + "=".repeat(4 - pad);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch (e: any) {
    throw new Error(`webpush:${label}: base64 inválido (${e?.message ?? e?.name ?? "erro"}) len=${input.length}`);
  }
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function generateVapidToken(
  audience: string,
  subject: string,
  privateKeyB64: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${b64url(header)}.${b64url(payload)}`;

  const rawPriv = b64urlDecode(privateKeyB64, "VAPID_PRIVATE_KEY");
  if (rawPriv.length !== 32) {
    throw new Error(`webpush:VAPID_PRIVATE_KEY: tamanho inválido ${rawPriv.length} (esperado 32)`);
  }

  const pkcs8Header = new Uint8Array([
    0x30, 0x41,
    0x02, 0x01, 0x00,
    0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27,
      0x30, 0x25,
        0x02, 0x01, 0x01,
        0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(pkcs8Header.length + rawPriv.length);
  pkcs8.set(pkcs8Header);
  pkcs8.set(rawPriv, pkcs8Header.length);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    enc.encode(signingInput)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${signingInput}.${sigB64}`;
}

export async function sendPushToSubscription(
  subscription: WebPushSubscription,
  payload: WebPushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const token = await generateVapidToken(audience, vapidSubject, vapidPrivateKey);
  const authHeader = `vapid t=${token},k=${vapidPublicKey}`;

  const payloadStr = JSON.stringify(payload);
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payloadStr);

  const p256dhBytes = b64urlDecode(subscription.keys.p256dh, "p256dh");
  if (p256dhBytes.length !== 65 || p256dhBytes[0] !== 0x04) {
    throw new Error(`webpush:p256dh: chave inválida (len=${p256dhBytes.length}, prefix=0x${p256dhBytes[0]?.toString(16)})`);
  }
  const authBytes = b64urlDecode(subscription.keys.auth, "auth");
  if (authBytes.length !== 16) {
    throw new Error(`webpush:auth: tamanho inválido ${authBytes.length} (esperado 16)`);
  }

  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const ephemeralPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeral.publicKey)
  );

  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dhBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: subscriberPublicKey },
      ephemeral.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prk = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const authInfo = enc.encode('Content-Encoding: auth\0');
  const authPrk = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: authInfo },
      prk,
      256
    )
  );

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    authPrk,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const cekInfo = new Uint8Array([
    ...enc.encode('Content-Encoding: aesgcm\0'),
    ...enc.encode('P-256\0'),
    ...new Uint8Array([0x00, p256dhBytes.length >> 8, p256dhBytes.length & 0xff]),
    ...p256dhBytes,
    0x00,
    ...new Uint8Array([ephemeralPublicKeyRaw.length >> 8, ephemeralPublicKeyRaw.length & 0xff]),
    ...ephemeralPublicKeyRaw,
  ]);
  const nonceInfo = new Uint8Array([
    ...enc.encode('Content-Encoding: nonce\0'),
    ...enc.encode('P-256\0'),
    ...new Uint8Array([0x00, p256dhBytes.length >> 8, p256dhBytes.length & 0xff]),
    ...p256dhBytes,
    0x00,
    ...new Uint8Array([ephemeralPublicKeyRaw.length >> 8, ephemeralPublicKeyRaw.length & 0xff]),
    ...ephemeralPublicKeyRaw,
  ]);

  const cekBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
      keyMaterial,
      128
    )
  );
  const nonceBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
      keyMaterial,
      96
    )
  );

  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);

  const padded = new Uint8Array(payloadBytes.length + 2);
  padded[0] = 0;
  padded[1] = 0;
  padded.set(payloadBytes, 2);

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, padded)
  );

  const rs = new Uint8Array([0x00, 0x10, 0x00, 0x00]);
  const keylen = new Uint8Array([ephemeralPublicKeyRaw.length]);
  const body = new Uint8Array(16 + 4 + 1 + ephemeralPublicKeyRaw.length + encrypted.length);
  let offset = 0;
  body.set(salt, offset); offset += 16;
  body.set(rs, offset); offset += 4;
  body.set(keylen, offset); offset += 1;
  body.set(ephemeralPublicKeyRaw, offset); offset += ephemeralPublicKeyRaw.length;
  body.set(encrypted, offset);

  const saltB64 = btoa(String.fromCharCode(...salt))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const ephemeralB64 = btoa(String.fromCharCode(...ephemeralPublicKeyRaw))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

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
