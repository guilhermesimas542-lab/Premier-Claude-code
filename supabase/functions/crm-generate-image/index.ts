// crm-generate-image — gera banner por IA via Lovable AI Gateway
// (modelo google/gemini-2.5-flash-image) e sobe no bucket crm-creatives.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CHANNEL_ASPECT: Record<string, string> = {
  email: "16:9",
  push: "16:9",
  popup: "4:5",
  telegram_group: "1:1",
  telegram_x1: "1:1",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) return json({ error: "lovable_key_missing" }, 500);

    // Auth + admin check
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "unauthorized" }, 401);

    const { data: isAdmin, error: adminErr } = await userClient.rpc("is_admin");
    if (adminErr || !isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt ?? "").trim();
    const channel = String(body?.channel ?? "telegram_group");
    if (!prompt) return json({ error: "prompt_required" }, 400);

    const aspect = CHANNEL_ASPECT[channel] ?? "1:1";
    const fullPrompt =
      `Banner de marketing para app de apostas esportivas "Premier FC". ` +
      `Texto em português brasileiro, legível, sem erros de ortografia, alto contraste, ` +
      `visual moderno e vibrante, estilo app de apostas esportivas. ` +
      `Proporção da imagem: ${aspect}. ` +
      `Pedido do operador: ${prompt}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      if (aiRes.status === 429) return json({ error: "rate_limited", detail }, 429);
      if (aiRes.status === 402) return json({ error: "payment_required", detail }, 402);
      return json({ error: "ai_gateway_error", status: aiRes.status, detail }, 502);
    }

    const aiJson = await aiRes.json();
    const b64 = aiJson?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "no_image", detail: aiJson }, 502);

    const bytes = b64ToBytes(b64);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const path = `ai/${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage
      .from("crm-creatives")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) return json({ error: "upload_failed", detail: upErr.message }, 500);

    const { data: pub } = admin.storage.from("crm-creatives").getPublicUrl(path);
    if (!pub?.publicUrl) return json({ error: "no_public_url" }, 500);

    return json({ url: pub.publicUrl });
  } catch (e: any) {
    console.error("[crm-generate-image]", e);
    return json({ error: "internal_error", detail: String(e?.message ?? e) }, 500);
  }
});
