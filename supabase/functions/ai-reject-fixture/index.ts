import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|ac|cf|sc|ec|sp|rj|club|clube|de|do|da|the)\b/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  if (!authHeader?.startsWith("Bearer ")) return jsonResp({ error: "missing_bearer" }, 401);

  let userId: string | null = null;
  try {
    const token = JSON.parse(atob(authHeader.replace("Bearer ", "")));
    if (token?.user_id && token.exp >= Date.now()) userId = token.user_id;
  } catch {}
  if (!userId) return jsonResp({ error: "unauthorized" }, 401);

  let body: { query?: string; fixture_ids?: number[] };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "invalid_body" }, 400);
  }
  const query = (body.query || "").trim();
  const fixtureIds = Array.isArray(body.fixture_ids) ? body.fixture_ids.filter((n) => Number.isFinite(n)) : [];
  if (!query || fixtureIds.length === 0) {
    return jsonResp({ error: "query_and_fixture_ids_required" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const queryNorm = normalize(query);
  const rows = fixtureIds.map((fid) => ({
    user_id: userId,
    query_normalized: queryNorm,
    fixture_id: fid,
  }));

  const { error } = await supabase.from("ai_user_rejected_fixtures").insert(rows);
  if (error) {
    console.error("reject insert error", error);
    return jsonResp({ error: "insert_failed" }, 500);
  }

  return jsonResp({ ok: true, rejected: rows.length });
});
