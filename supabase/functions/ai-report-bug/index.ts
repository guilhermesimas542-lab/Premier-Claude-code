import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_BETA_ALLOWLIST: string[] = [
  "teste@exemplo.com",
  "hugofm350@gmail.com",
  "gabriel.fedds@icloud.com",
].map((e) => e.toLowerCase().trim());

interface TokenPayload {
  user_id?: string;
  email?: string;
  exp: number;
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResp({ error: "missing_bearer" }, 401);
  }

  let token: TokenPayload;
  try {
    token = JSON.parse(atob(authHeader.replace("Bearer ", "")));
  } catch {
    return jsonResp({ error: "invalid_token" }, 401);
  }
  if (!token?.user_id || token.exp < Date.now()) {
    return jsonResp({ error: "unauthorized" }, 401);
  }

  const tokenEmail = token.email?.toLowerCase()?.trim();
  if (!tokenEmail || !AI_BETA_ALLOWLIST.includes(tokenEmail)) {
    return jsonResp({ error: "beta_access_denied", message: "Beta privado" }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "invalid_body" }, 400);
  }

  const tipCacheId = body?.tip_cache_id;
  const message = (body?.message ?? "").toString().trim();

  if (!tipCacheId) return jsonResp({ error: "missing_tip_cache_id" }, 400);
  if (!message) return jsonResp({ error: "missing_message" }, 400);
  if (message.length > 1000) return jsonResp({ error: "message_too_long" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase.from("user_feedback").insert({
    user_id: token.user_id,
    email: tokenEmail,
    category: "bug",
    message,
    status: "novo",
    source: "ia-tipster",
    tip_cache_id: tipCacheId,
  });

  if (error) {
    console.error("ai-report-bug insert error", error);
    return jsonResp({ error: "insert_failed" }, 500);
  }

  return jsonResp({ ok: true });
});
