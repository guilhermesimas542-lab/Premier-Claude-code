import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const AI_BETA_ALLOWLIST: string[] = [
  "teste@exemplo.com",
  "hugofm350@gmail.com",
].map(e => e.toLowerCase().trim());

const SUGGESTION_LEAGUES = [
  71, 2, 140, 39, 135, 78, 61, 13, 73, 3,
];

const CACHE_TTL_SECONDS = 1800;
const MAX_SUGGESTIONS = 5;
const WINDOW_HOURS = 48;

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
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResp({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResp({ error: "missing_bearer" }, 401);
  let token: TokenPayload;
  try {
    token = JSON.parse(atob(authHeader.replace("Bearer ", "")));
  } catch {
    return jsonResp({ error: "invalid_token" }, 401);
  }
  if (!token?.user_id || token.exp < Date.now()) return jsonResp({ error: "unauthorized" }, 401);

  const tokenEmail = token.email?.toLowerCase()?.trim();
  if (!tokenEmail || !AI_BETA_ALLOWLIST.includes(tokenEmail)) {
    return jsonResp({ error: "beta_access_denied", message: "Beta privado" }, 403);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cacheKey = `upcoming_suggestions:v1`;
  const { data: cached } = await supabase
    .from("ai_tip_cache")
    .select("content, generated_at")
    .eq("match_key", cacheKey)
    .eq("match_type", "live")
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return jsonResp({
      cached: true,
      suggestions: (cached.content as any)?.suggestions ?? [],
    });
  }

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) return jsonResp({ error: "api_football_key_missing" }, 500);

  const now = new Date();
  const future = new Date(now.getTime() + WINDOW_HOURS * 3600 * 1000);
  const SUGGESTION_LEAGUES_SET = new Set(SUGGESTION_LEAGUES);
  // Hoje + amanhã + depois-de-amanhã (cobre janela de 48h com folga)
  const dayOffsets = [0, 1, 2];

  const all: any[] = [];
  await Promise.all(
    dayOffsets.map(async (dayOffset) => {
      const target = new Date(now.getTime() + dayOffset * 86400000);
      const dateStr = target.toISOString().split("T")[0];
      try {
        const url = `https://v3.football.api-sports.io/fixtures?date=${dateStr}`;
        const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
        if (!resp.ok) return;
        const data = await resp.json();
        if (Array.isArray(data.response)) {
          for (const f of data.response) {
            if (!f?.league?.id || !SUGGESTION_LEAGUES_SET.has(f.league.id)) continue;
            const kickoff = new Date(f.fixture.date).getTime();
            if (kickoff > now.getTime() && kickoff <= future.getTime()) {
              all.push(f);
            }
          }
        }
      } catch (err) {
        console.error("[suggestions] date fetch error", dateStr, err);
      }
    })
  );

  all.sort((a, b) =>
    new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  );
  const top = all.slice(0, MAX_SUGGESTIONS);

  const suggestions = top.map((f: any) => ({
    fixture_id: f.fixture.id,
    home: f.teams.home.name,
    away: f.teams.away.name,
    league: f.league.name,
    kickoff_at: f.fixture.date,
    kickoff_label: new Date(f.fixture.date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }),
  }));

  const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString();
  await supabase.from("ai_tip_cache").insert({
    match_key: cacheKey,
    match_type: "live",
    content: { suggestions },
    source_data: { total_fixtures_found: all.length },
    expires_at: expiresAt,
    generated_by_user_id: token.user_id,
    tokens_input: 0,
    tokens_output: 0,
  });

  return jsonResp({
    cached: false,
    suggestions,
  });
});
