// crm-generate-image — gera banner por IA via Google Gemini API
// (modelo gemini-2.5-flash-image) e sobe no bucket crm-creatives.
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

async function callGemini(
  apiKey: string,
  model: string,
  fullPrompt: string,
  aspect: string,
  includeImageConfig = true
): Promise<any> {
  const generationConfig: any = {
    responseModalities: ["IMAGE"],
  };
  if (includeImageConfig) {
    generationConfig.imageConfig = { aspectRatio: aspect };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, status: res.status, errorText: errText };
  }

  return { ok: true, status: res.status, json: await res.json() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) return json({ error: "gemini_key_missing" }, 500);

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

    // Tenta gemini-2.5-flash-image; se reclamar de imageConfig, retenta sem imageConfig
    let gemini = await callGemini(GEMINI_API_KEY, "gemini-2.5-flash-image", fullPrompt, aspect, true);
    if (!gemini.ok) {
      const errLower = String(gemini.errorText).toLowerCase();
      if (errLower.includes("imageconfig") || errLower.includes("aspectratio")) {
        gemini = await callGemini(GEMINI_API_KEY, "gemini-2.5-flash-image", fullPrompt, aspect, false);
      }
    }

    // Fallback para gemini-2.5-flash-image-preview
    if (!gemini.ok && gemini.status === 404) {
      gemini = await callGemini(GEMINI_API_KEY, "gemini-2.5-flash-image-preview", fullPrompt, aspect, true);
      if (!gemini.ok) {
        const errLower = String(gemini.errorText).toLowerCase();
        if (errLower.includes("imageconfig") || errLower.includes("aspectratio")) {
          gemini = await callGemini(GEMINI_API_KEY, "gemini-2.5-flash-image-preview", fullPrompt, aspect, false);
        }
      }
    }

    if (!gemini.ok) {
      console.error("[crm-generate-image] Gemini error:", gemini.status, gemini.errorText);
      return json(
        { error: "gemini_failed", status: gemini.status, detail: gemini.errorText },
        500
      );
    }

    const parts = gemini.json?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find((p: any) => p?.inlineData?.data);
    const b64 = inline?.inlineData?.data;
    if (!b64) return json({ error: "no_image", detail: gemini.json }, 502);

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