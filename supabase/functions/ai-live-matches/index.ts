import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_BETA_ALLOWLIST: string[] = [
  "teste@exemplo.com",
].map(e => e.toLowerCase().trim());

// Lista provisória de 22 ligas top (IDs API-Football v3).
// Quando o Fellipe enviar a lista final das 44 do FootyStats, atualizar aqui.
const TOP_LEAGUES = [
  71,  // Brasileirão Série A
  72,  // Brasileirão Série B
  73,  // Copa do Brasil
  13,  // Libertadores
  11,  // Sul-Americana
  39,  // Premier League
  40,  // Championship
  140, // La Liga
  135, // Serie A (Itália)
  78,  // Bundesliga
  61,  // Ligue 1
  88,  // Eredivisie
  94,  // Liga Portugal
  2,   // Champions League
  3,   // Europa League
  848, // Conference League
  253, // MLS
  262, // Liga MX
  128, // Argentina Liga Profesional
  307, // Saudi Pro League
  1,   // World Cup
  4,   // Eurocopa
];

const CACHE_TTL_SECONDS = 60;
const MAX_MATCHES_RETURNED = 6;

interface TokenPayload {
  user_id?: string;
  email?: string;
  tier?: string;
  exp: number;
}

function unauthorized(reason: string) {
  return new Response(
    JSON.stringify({ error: "unauthorized", reason }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function serverError(reason: string, details?: unknown) {
  console.error("[ai-live-matches]", reason, details);
  return new Response(
    JSON.stringify({ error: "internal_error", reason }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ───── AUTH (padrão custom do projeto) ─────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized("missing_bearer");
  }
  const token = authHeader.replace("Bearer ", "");
  let tokenData: TokenPayload;
  try {
    tokenData = JSON.parse(atob(token)) as TokenPayload;
  } catch {
    return unauthorized("invalid_token_format");
  }
  if (!tokenData?.user_id) {
    return unauthorized("no_user_id");
  }
  if (tokenData.exp < Date.now()) {
    return unauthorized("token_expired");
  }

  // ───── BETA ALLOWLIST ─────
  const tokenEmail = tokenData.email?.toLowerCase()?.trim();
  if (!tokenEmail || !AI_BETA_ALLOWLIST.includes(tokenEmail)) {
    return new Response(
      JSON.stringify({ error: "beta_access_denied", message: "Beta privado" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ───── SUPABASE CLIENT (service role para escrever cache) ─────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return serverError("supabase_env_missing");
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ───── CACHE LOOKUP ─────
  const cacheKey = `live_matches_list:v1`;
  const { data: cached, error: cacheErr } = await supabase
    .from("ai_tip_cache")
    .select("content, generated_at, expires_at")
    .eq("match_key", cacheKey)
    .eq("match_type", "live")
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cacheErr) {
    console.error("[ai-live-matches] cache lookup error", cacheErr);
    // segue sem cache, não bloqueia
  }

  if (cached) {
    return new Response(
      JSON.stringify({
        cached: true,
        generated_at: cached.generated_at,
        matches: (cached.content as any)?.matches ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ───── FETCH API-FOOTBALL ─────
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) {
    return serverError("api_football_key_missing");
  }

  let upstreamData: any;
  try {
    const resp = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": apiKey },
    });
    if (!resp.ok) {
      console.error("[ai-live-matches] upstream error", resp.status);
      return new Response(
        JSON.stringify({ error: "upstream_error", status: resp.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    upstreamData = await resp.json();
  } catch (err) {
    return serverError("upstream_fetch_failed", err);
  }

  const allFixtures = Array.isArray(upstreamData?.response) ? upstreamData.response : [];
  const filtered = allFixtures.filter((f: any) =>
    TOP_LEAGUES.includes(f?.league?.id)
  );
  const limited = filtered.slice(0, MAX_MATCHES_RETURNED);

  const matches = limited.map((f: any) => ({
    fixture_id: f.fixture.id,
    league: {
      id: f.league.id,
      name: f.league.name,
      logo: f.league.logo,
      country: f.league.country,
    },
    home: {
      id: f.teams.home.id,
      name: f.teams.home.name,
      logo: f.teams.home.logo,
      score: f.goals.home,
    },
    away: {
      id: f.teams.away.id,
      name: f.teams.away.name,
      logo: f.teams.away.logo,
      score: f.goals.away,
    },
    status: {
      long: f.fixture.status.long,
      short: f.fixture.status.short,
      minute: f.fixture.status.elapsed,
    },
    kickoff_at: f.fixture.date,
    altenar_event_id: null,   // reservado para fase futura
    has_cached_tip: false,    // reservado para checagem futura
  }));

  // ───── SAVE CACHE (best effort) ─────
  const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString();
  const { error: insertErr } = await supabase.from("ai_tip_cache").insert({
    match_key: cacheKey,
    match_type: "live",
    content: { matches },
    source_data: {
      total_live_fixtures: allFixtures.length,
      total_in_top_leagues: filtered.length,
      league_filter: TOP_LEAGUES,
    },
    expires_at: expiresAt,
    generated_by_user_id: tokenData.user_id,
    tokens_input: 0,
    tokens_output: 0,
  });
  if (insertErr) {
    console.error("[ai-live-matches] cache insert error", insertErr);
    // não bloqueia resposta
  }

  return new Response(
    JSON.stringify({
      cached: false,
      generated_at: new Date().toISOString(),
      matches,
      total_live_in_top_leagues: filtered.length,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
