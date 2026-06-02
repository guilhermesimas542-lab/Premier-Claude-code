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

  let body: { query?: string; fixture_ids?: number[]; team_id?: number; league_ids?: number[] };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "invalid_body" }, 400);
  }
  const query = (body.query || "").trim();
  if (!query) return jsonResp({ error: "query_required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const queryNorm = normalize(query);

  // Caso A: rejeição do time inteiro
  if (body.team_id && Number.isFinite(body.team_id)) {
    const { error } = await supabase.from("ai_user_rejected_fixtures").insert({
      user_id: userId,
      query_normalized: queryNorm,
      fixture_id: null,
      rejected_team_id: body.team_id,
    });
    if (error) {
      console.error("reject team insert error", error);
      return jsonResp({ error: "insert_failed" }, 500);
    }
    return jsonResp({ ok: true, scope: "team" });
  }

  // Caso B: rejeição da(s) liga(s) inteira(s)
  if (Array.isArray(body.league_ids) && body.league_ids.length > 0) {
    const ids = body.league_ids.filter((n) => Number.isFinite(n));
    const { error } = await supabase.from("ai_user_rejected_fixtures").insert({
      user_id: userId,
      query_normalized: queryNorm,
      fixture_id: null,
      rejected_league_ids: ids,
    });
    if (error) {
      console.error("reject league insert error", error);
      return jsonResp({ error: "insert_failed" }, 500);
    }
    return jsonResp({ ok: true, scope: "league" });
  }

  // Caso C (legado): fixture_ids específicos
  if (Array.isArray(body.fixture_ids) && body.fixture_ids.length > 0) {
    const ids = body.fixture_ids.filter((n) => Number.isFinite(n));
    const rows = ids.map((fid) => ({
      user_id: userId,
      query_normalized: queryNorm,
      fixture_id: fid,
    }));
    const { error } = await supabase.from("ai_user_rejected_fixtures").insert(rows);
    if (error) {
      console.error("reject fixtures insert error", error);
      return jsonResp({ error: "insert_failed" }, 500);
    }
    return jsonResp({ ok: true, scope: "fixtures", rejected: rows.length });
  }

  return jsonResp({ error: "need_fixture_ids_team_id_or_league_ids" }, 400);
});
