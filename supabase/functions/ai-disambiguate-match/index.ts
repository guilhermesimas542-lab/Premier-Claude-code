import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Beta allowlist removido — launch técnico (tier-based credit check)

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
  15,
  344,
  255,
  667,
  10,
];
const WINDOW_DAYS_FUTURE = 15;
const WINDOW_DAYS_PAST = 7;

// Mapping: alias normalizado → array de league_ids (suporta múltiplos
// pra casos como "Primera División" que existem em Chile/Uruguai/Venezuela)
const LEAGUE_ALIASES: Record<string, number[]> = {
  "brasileirao": [71], "brasileirao a": [71], "brasileirao serie a": [71], "br serie a": [71],
  "brasileirao b": [72], "br serie b": [72], "serie b brasil": [72],
  "copa do brasil": [73],
  "brasileirao c": [75], "serie c": [75],
  "liga profesional": [128], "liga profesional argentina": [128], "primera argentina": [128],
  "copa argentina": [130], "primera b nacional": [129],
  "libertadores": [13], "copa libertadores": [13],
  "sulamericana": [11], "sudamericana": [11], "copa sulamericana": [11], "copa sudamericana": [11],
  "premier": [39], "premier league": [39], "pl": [39],
  "championship": [40], "efl championship": [40],
  "efl cup": [48], "carabao": [48], "carabao cup": [48],
  "la liga": [140], "laliga": [140], "espanhol": [140], "campeonato espanhol": [140],
  "la liga 2": [141], "segunda espanhola": [141],
  "serie a italia": [135], "campeonato italiano": [135], "serie b italia": [136],
  "bundesliga": [78], "campeonato alemao": [78], "2 bundesliga": [79], "segunda bundesliga": [79],
  "ligue 1": [61], "ligue 2": [62], "campeonato frances": [61], "coupe de france": [66],
  "primeira liga": [94], "liga portugal": [94], "campeonato portugues": [94], "liga portugal 2": [95],
  "eredivisie": [88], "campeonato holandes": [88],
  "champions": [2], "champions league": [2], "ucl": [2], "liga dos campeoes": [2],
  "europa league": [3], "uel": [3],
  "conference": [848], "conference league": [848],
  "mls": [253], "major league soccer": [253],
  "liga mx": [262], "campeonato mexicano": [262],
  "liga betplay": [239], "colombia": [239], "liga colombiana": [239],
  "primera chile": [265], "primera division chile": [265],
  "primera uruguai": [268], "primera division uruguai": [268],
  "liga 1 peru": [281], "primera peru": [281],
  "primera venezuela": [299],
  "ligapro": [242], "liga pro": [242], "campeonato equatoriano": [242],
  "liga 2 romenia": [284],
  "allsvenskan": [113],
  "eliteserien": [103], "campeonato noruegues": [103],
  "superliga dinamarca": [119],
  "super lig": [203], "campeonato turco": [203],
  "saudi pro league": [307], "liga saudita": [307],
  "world cup": [1], "copa do mundo": [1],
  "primera division": [265, 268, 299], "primera a": [265, 268, 299],
};

function detectLeague(rawQuery: string): number[] | null {
  const normalized = normalize(rawQuery);
  if (!normalized) return null;
  if (LEAGUE_ALIASES[normalized]) return LEAGUE_ALIASES[normalized];
  for (const [alias, leagueIds] of Object.entries(LEAGUE_ALIASES)) {
    if (alias.length < 6) continue;
    if (normalized === alias) return leagueIds;
    if (normalized.length >= 6 && normalized.includes(alias)) return leagueIds;
    if (alias.includes(normalized) && normalized.length >= 8) return leagueIds;
  }
  return null;
}

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

async function fetchUpcomingByLeague(leagueIds: number[], apiKey: string, limit = 10): Promise<any[]> {
  const all: any[] = [];
  await Promise.all(leagueIds.map(async (leagueId) => {
    try {
      const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&next=${limit}`;
      const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data.response)) all.push(...data.response);
    } catch (e) {
      console.warn(`fetchUpcomingByLeague league=${leagueId} failed`, e);
    }
  }));
  all.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
  return all.slice(0, limit);
}

async function fetchUpcomingByTeam(teamId: number, apiKey: string, limit = 3): Promise<any[]> {
  try {
    const url = `https://v3.football.api-sports.io/fixtures?team=${teamId}&next=${limit}`;
    const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.response) ? data.response : [];
  } catch (e) {
    console.warn(`fetchUpcomingByTeam team=${teamId} failed`, e);
    return [];
  }
}

/**
 * Tenta identificar um time específico via match do nome COMPLETO
 * contra a query. Diferente do matchup, que fragmenta em tokens,
 * essa função compara strings normalizadas inteiras.
 *
 * Retorna o time com melhor score (>= 0.7). Caso contrário null.
 */
function tryDetectTeamByName(
  rawQuery: string,
  allFixtures: any[],
  rejectedTeamIds: Set<number> = new Set()
): { teamId: number; teamName: string } | null {
  const normalizedQuery = normalize(rawQuery);
  if (normalizedQuery.length < 4) return null;
  const teamScores = new Map<number, { score: number; name: string }>();
  for (const f of allFixtures) {
    for (const side of ["home", "away"] as const) {
      const team = f.teams[side];
      if (!team?.id || !team?.name) continue;
      if (rejectedTeamIds.has(team.id)) continue;
      const teamNorm = normalize(team.name);
      let score = 0;
      if (teamNorm === normalizedQuery) {
        score = 1.0;
      } else if (teamNorm.includes(normalizedQuery)) {
        score = (normalizedQuery.length / teamNorm.length) * 0.95;
      } else if (normalizedQuery.includes(teamNorm) && teamNorm.length >= 4) {
        score = teamNorm.length / normalizedQuery.length;
      }
      if (score > 0) {
        const prev = teamScores.get(team.id)?.score ?? 0;
        if (score > prev) {
          teamScores.set(team.id, { score, name: team.name });
        }
      }
    }
  }
  if (teamScores.size === 0) return null;
  const sorted = Array.from(teamScores.entries()).sort(
    (a, b) => b[1].score - a[1].score
  );
  const [topId, topData] = sorted[0];
  if (topData.score < 0.7) return null;
  return { teamId: topId, teamName: topData.name };
}

function fixtureToMatch(f: any) {
  return {
    fixture_id: f.fixture.id,
    home: f.teams.home.name,
    away: f.teams.away.name,
    league: f.league.name,
    kickoff_at: f.fixture.date,
    kickoff_label: formatKickoff(f.fixture.date),
  };
}

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

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
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
  const tokenScore = matches / Math.max(ta.length, tb.length);

  // FALLBACK: tolerância a digitação via Levenshtein.
  // Aplica só quando os métodos anteriores falharam (tokenScore = 0)
  // e ambas as strings são suficientemente longas para evitar falsos positivos.
  if (tokenScore === 0 && na.length >= 5 && nb.length >= 5) {
    const dist = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    const similarity = 1 - dist / maxLen;
    // Threshold conservador (>= 0.8 = no máximo ~2 edições em palavras de 10 chars).
    // Multiplica por 0.85 para garantir que match exato sempre fique acima.
    if (similarity >= 0.8) {
      return similarity * 0.85;
    }
  }

  return tokenScore;
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

  // Carrega rejeições do user para essa query (últimos 7 dias)
  const rejectedFixtureIds = new Set<number>();
  const rejectedTeamIds = new Set<number>();
  const rejectedLeagueIds = new Set<number>();
  try {
    const queryNormForRej = normalize(query);
    const { data: rejRows } = await supabase
      .from("ai_user_rejected_fixtures")
      .select("fixture_id, rejected_team_id, rejected_league_ids")
      .eq("user_id", token.user_id)
      .eq("query_normalized", queryNormForRej)
      .gt("expires_at", new Date().toISOString());
    for (const r of rejRows || []) {
      if (r.fixture_id && Number(r.fixture_id) > 0) rejectedFixtureIds.add(Number(r.fixture_id));
      if (r.rejected_team_id) rejectedTeamIds.add(Number(r.rejected_team_id));
      if (Array.isArray(r.rejected_league_ids)) {
        for (const lid of r.rejected_league_ids) rejectedLeagueIds.add(Number(lid));
      }
    }
  } catch (e) {
    console.warn("[disambiguate] rejected lookup failed", e);
  }

  // ─── ROUTE 1: Detect league name → próximos jogos da liga ────
  const leagueIds = detectLeague(query);
  if (leagueIds && leagueIds.length > 0) {
    const filteredLeagueIds = leagueIds.filter((id) => !rejectedLeagueIds.has(id));
    if (filteredLeagueIds.length > 0) {
      const fixtures = await fetchUpcomingByLeague(filteredLeagueIds, apiKey, 10);
      const filtered = fixtures.filter((f) => !rejectedFixtureIds.has(f.fixture.id));
      if (filtered.length > 0) {
        return jsonResp({
          status: "league_upcoming",
          league_ids: filteredLeagueIds,
          matches: filtered.map(fixtureToMatch),
        });
      }
    }
  }

  const today = new Date();
  const TOP_LEAGUES_SET = new Set(TOP_LEAGUES);
  const fixturesByLeague: any[] = [];
  const dateOffsets: number[] = [];
  for (let d = -WINDOW_DAYS_PAST; d <= WINDOW_DAYS_FUTURE; d++) {
    dateOffsets.push(d);
  }

  await Promise.all(
    dateOffsets.map(async (dayOffset) => {
      const target = new Date(today.getTime() + dayOffset * 86400000);
      const dateStr = target.toISOString().split("T")[0];
      try {
        const url = `https://v3.football.api-sports.io/fixtures?date=${dateStr}`;
        const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
        if (!resp.ok) {
          return;
        }
        const data = await resp.json();
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

  if (fixturesByLeague.length === 0) {
    return jsonResp({
      status: "not_found",
      message: "Não encontrei jogos nas ligas cobertas na janela atual.",
    });
  }

  // ─── ROUTE 2: Detect single team via full name match (antes do matchup) ──
  const teamHit = tryDetectTeamByName(query, fixturesByLeague, rejectedTeamIds);
  if (teamHit) {
    const upcoming = await fetchUpcomingByTeam(teamHit.teamId, apiKey, 3);
    const filtered = upcoming.filter((f) => !rejectedFixtureIds.has(f.fixture.id));
    if (filtered.length > 0) {
      return jsonResp({
        status: "team_upcoming",
        team_id: teamHit.teamId,
        team_name: teamHit.teamName,
        matches: filtered.map(fixtureToMatch),
      });
    }
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

  const topCandidates = [...scored]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10)
    .map(s => ({
      home: s.fixture.teams.home.name,
      away: s.fixture.teams.away.name,
      homeScore: Number(s.homeScore.toFixed(2)),
      awayScore: Number(s.awayScore.toFixed(2)),
      totalScore: Number(s.totalScore.toFixed(2)),
      league: s.fixture.league.name,
      date: s.fixture.fixture.date,
    }));
  const candidates = scored
    .filter(s => s.totalScore > 0.3 && s.homeScore > 0 && s.awayScore > 0)
    .filter(s => !rejectedFixtureIds.has(s.fixture.fixture.id))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  if (candidates.length === 0) {
    // ─── ROUTE 2: fallback single-team — usa o mesmo `scored` ───
    const teamScores = new Map<number, { score: number; name: string }>();
    for (const s of scored) {
      const home = s.fixture.teams.home;
      const away = s.fixture.teams.away;
      if (s.homeScore >= 0.6 && !rejectedTeamIds.has(home.id)) {
        const prev = teamScores.get(home.id);
        if (!prev || s.homeScore > prev.score) {
          teamScores.set(home.id, { score: s.homeScore, name: home.name });
        }
      }
      if (s.awayScore >= 0.6 && !rejectedTeamIds.has(away.id)) {
        const prev = teamScores.get(away.id);
        if (!prev || s.awayScore > prev.score) {
          teamScores.set(away.id, { score: s.awayScore, name: away.name });
        }
      }
    }
    if (teamScores.size > 0) {
      const [teamId, top] = Array.from(teamScores.entries())
        .sort((a, b) => b[1].score - a[1].score)[0];
      const upcoming = await fetchUpcomingByTeam(teamId, apiKey, 3);
      const filtered = upcoming.filter((f) => !rejectedFixtureIds.has(f.fixture.id));
      if (filtered.length > 0) {
        return jsonResp({
          status: "team_upcoming",
          team_id: teamId,
          team_name: top.name,
          matches: filtered.map(fixtureToMatch),
        });
      }
    }
    return jsonResp({
      status: "not_found",
      message: "Não achei outro jogo pra essa busca. Tenta com mais detalhes (ex: nome completo do time).",
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
        kickoff_label: kickoff.toLocaleString("es-CL", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }),
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
        kickoff_label: new Date(c.fixture.fixture.date).toLocaleString("es-CL", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }),
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
        played_label: new Date(c.fixture.fixture.date).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }),
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
