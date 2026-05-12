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

const TOP_LEAGUES = [
  71, 72, 75, 73,
  128, 129,
  265,
  239,
  119,
  242,
  39, 40, 48,
  2, 3, 848, 525,
  61, 66, 62,
  78, 79,
  1,
  135, 136,
  262, 263,
  88, 89,
  103,
  284,
  281,
  94, 95,
  307,
  179,
  13, 11, 1042,
  140, 141,
  113,
  203,
  253, 254,
  268,
  299,
  16,
];
const WINDOW_DAYS_FUTURE = 15;
const WINDOW_DAYS_PAST = 7;

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

function tokenSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const checkAcronym = (acronym: string, fullName: string): number => {
    if (acronym.length < 2 || acronym.length > 5) return 0;
    if (acronym.includes(" ")) return 0;
    const words = fullName.split(" ").filter(w => w.length > 0);
    if (words.length < 2) return 0;
    const initials = words.map(w => w[0]).join("");
    if (initials === acronym) return 0.9;
    if (initials.startsWith(acronym)) return 0.75;
    if (acronym.startsWith(initials)) return 0.75;
    return 0;
  };

  const acronymScore = Math.max(
    checkAcronym(na, nb),
    checkAcronym(nb, na)
  );
  if (acronymScore > 0) return acronymScore;

  const ta = na.split(" ").filter(x => x.length >= 3);
  const tb = nb.split(" ").filter(x => x.length >= 3);
  if (ta.length === 0 || tb.length === 0) return 0;
  const matches = ta.filter(x => tb.some(y => y.startsWith(x) || x.startsWith(y))).length;
  return matches / Math.max(ta.length, tb.length);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "method_not_allowed" }, 405);

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

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "invalid_body" }, 400);
  }
  const query = (body.query || "").trim();
  if (!query || query.length < 3) {
    return jsonResp({ error: "query_too_short" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: aliases } = await supabase
    .from("ai_team_aliases")
    .select("api_football_team_id, alias");

  const aliasMap = new Map<number, string[]>();
  (aliases || []).forEach((a: any) => {
    const arr = aliasMap.get(a.api_football_team_id) || [];
    arr.push(a.alias);
    aliasMap.set(a.api_football_team_id, arr);
  });

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) return jsonResp({ error: "api_football_key_missing" }, 500);

  const today = new Date();
  const TOP_LEAGUES_SET = new Set(TOP_LEAGUES);
  const fixturesByLeague: any[] = [];
  const dateOffsets: number[] = [];
  for (let d = -WINDOW_DAYS_PAST; d <= WINDOW_DAYS_FUTURE; d++) {
    dateOffsets.push(d);
  }

  console.log(`[DBG] query="${query}", windowDaysPast=${WINDOW_DAYS_PAST}, windowDaysFuture=${WINDOW_DAYS_FUTURE}`);

  await Promise.all(
    dateOffsets.map(async (dayOffset) => {
      const target = new Date(today.getTime() + dayOffset * 86400000);
      const dateStr = target.toISOString().split("T")[0];
      try {
        const url = `https://v3.football.api-sports.io/fixtures?date=${dateStr}`;
        const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
        if (!resp.ok) {
          console.log(`[DBG] date=${dateStr}: API returned 0 fixtures, status=${resp.status}`);
          return;
        }
        const data = await resp.json();
        const totalInResponse = Array.isArray(data?.response) ? data.response.length : 0;
        console.log(`[DBG] date=${dateStr}: API returned ${totalInResponse} fixtures, status=${resp.status}`);
        if (Array.isArray(data.response)) {
          for (const f of data.response) {
            if (f?.league?.id && TOP_LEAGUES_SET.has(f.league.id)) {
              fixturesByLeague.push(f);
            }
          }
        }
      } catch (err) {
        console.error("[disambiguate] date fetch error", dateStr, err);
      }
    })
  );

  console.log(`[DBG] total fixtures filtered by TOP_LEAGUES: ${fixturesByLeague.length}`);
  if (fixturesByLeague.length > 0) {
    const sample = fixturesByLeague.slice(0, 3).map(f => ({
      league: f.league?.name,
      league_id: f.league?.id,
      home: f.teams?.home?.name,
      away: f.teams?.away?.name,
      date: f.fixture?.date,
    }));
    console.log(`[DBG] sample fixtures:`, JSON.stringify(sample));
  }

  if (fixturesByLeague.length === 0) {
    return jsonResp({
      status: "not_found",
      message: "Não encontrei jogos nas ligas cobertas na janela atual.",
    });
  }

  const scored = fixturesByLeague.map((f: any) => {
    const homeAliases = aliasMap.get(f.teams.home.id) || [];
    const awayAliases = aliasMap.get(f.teams.away.id) || [];
    const homeNames = [f.teams.home.name, ...homeAliases];
    const awayNames = [f.teams.away.name, ...awayAliases];

    const queryTokens = normalize(query).split(" ").filter(t => t.length >= 3);
    let homeScore = 0;
    let awayScore = 0;

    for (const qt of queryTokens) {
      for (const hn of homeNames) {
        const sim = tokenSimilarity(qt, hn);
        if (sim > homeScore) homeScore = sim;
      }
      for (const an of awayNames) {
        const sim = tokenSimilarity(qt, an);
        if (sim > awayScore) awayScore = sim;
      }
    }

    const totalScore = (homeScore + awayScore) / 2;
    return { fixture: f, homeScore, awayScore, totalScore };
  });

  const candidates = scored
    .filter(s => s.totalScore > 0.3 && s.homeScore > 0 && s.awayScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  if (candidates.length === 0) {
    return jsonResp({
      status: "not_found",
      message: "Não encontrei esse confronto nas próximas duas semanas. Me dá mais detalhes (liga, data)?",
    });
  }

  const now = Date.now();
  const futureCandidates = candidates.filter(c => new Date(c.fixture.fixture.date).getTime() > now);
  const pastCandidates = candidates.filter(c => new Date(c.fixture.fixture.date).getTime() <= now);

  if (futureCandidates.length > 0 && futureCandidates[0].totalScore >= 0.7) {
    const c = futureCandidates[0];
    const kickoff = new Date(c.fixture.fixture.date);
    const daysAhead = (kickoff.getTime() - now) / 86400000;
    if (daysAhead > WINDOW_DAYS_FUTURE) {
      return jsonResp({
        status: "out_of_window",
        message: `Esse jogo é em ${Math.ceil(daysAhead)} dias — analisamos apenas os próximos ${WINDOW_DAYS_FUTURE}.`,
      });
    }
    return jsonResp({
      status: "found",
      confidence: "high",
      matches: [{
        fixture_id: c.fixture.fixture.id,
        home: c.fixture.teams.home.name,
        away: c.fixture.teams.away.name,
        league: c.fixture.league.name,
        kickoff_at: c.fixture.fixture.date,
        kickoff_label: kickoff.toLocaleString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
        score: c.totalScore,
      }],
    });
  }

  if (futureCandidates.length > 0) {
    return jsonResp({
      status: "ambiguous",
      confidence: "medium",
      matches: futureCandidates.slice(0, 3).map(c => ({
        fixture_id: c.fixture.fixture.id,
        home: c.fixture.teams.home.name,
        away: c.fixture.teams.away.name,
        league: c.fixture.league.name,
        kickoff_at: c.fixture.fixture.date,
        kickoff_label: new Date(c.fixture.fixture.date).toLocaleString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
        score: c.totalScore,
      })),
    });
  }

  if (pastCandidates.length > 0) {
    const c = pastCandidates[0];
    return jsonResp({
      status: "past",
      match: {
        home: c.fixture.teams.home.name,
        away: c.fixture.teams.away.name,
        league: c.fixture.league.name,
        played_at: c.fixture.fixture.date,
        played_label: new Date(c.fixture.fixture.date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        result: c.fixture.goals.home !== null
          ? `${c.fixture.teams.home.name} ${c.fixture.goals.home} x ${c.fixture.goals.away} ${c.fixture.teams.away.name}`
          : "resultado não disponível",
      },
      message: "Esse jogo já aconteceu. Não há entrada possível para jogos passados.",
    });
  }

  return jsonResp({
    status: "not_found",
    message: "Não encontrei esse confronto. Me dá mais detalhes (liga, data)?",
  });
});
