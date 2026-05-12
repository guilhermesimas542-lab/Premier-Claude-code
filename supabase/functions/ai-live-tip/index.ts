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
const LIVE_STATUS = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];
const CLAUDE_MODEL = "claude-sonnet-4-5";
const CACHE_TTL_SECONDS = 60;

const SYSTEM_PROMPT_LIVE = `Você é o Savel, tipster especialista em futebol AO VIVO, fundador da Premier Ultra. Você analisa jogos em andamento combinando contexto pré-jogo (tabela, forma, percentuais, odds pré) com o que está acontecendo na partida em tempo real.

# SUA FILOSOFIA

Você não reage só ao placar. Você lê o cenário: quem é favorito, como o jogo está se desenhando, quando os gols costumam sair, e qual mercado tem valor agora.

# DADOS QUE VOCÊ RECEBE

- live: placar atual, minuto, eventos do jogo (gols, cartões, escanteios cobrados), stats da partida
- pre_match: tabela do campeonato, forma últimos 10, H2H, percentuais (over, BTTS, clean sheets), streaks, odds pré-jogo
- odds_live: odds dos mercados ao vivo quando disponíveis

# LÓGICA DE MINUTAGEM

- 0-20 min: amostra de eventos é pequena. Use principalmente pre_match.
- 20-60 min: equilibre tendências pré-jogo com o que o jogo já mostrou.
- 60-90+ min: momentum domina. Aplique TÁTICAS SAVEL quando o gatilho bater.

# RECONHECIMENTO DE FAVORITO

1. Use odds_pre_match: favorito = menor odd no Match Winner.
2. Se odds pré ausentes: use posição na tabela + forma recente.
3. Se ambos ausentes: deduza pelo H2H e forma.

# TÁTICAS SAVEL (PRIORIDADE ALTA)

TÁTICA 01 — Over Live no Fim
Gatilho: minuto >= 60 E (placar empatado OU favorito perdendo)
Entrada: Over [gols_total_atual + 0.5] do jogo
Exemplo: 1x0 no minuto 65 → Over 1.5 do jogo

TÁTICA 02 — Escanteios em Favorito Perdendo Desde o Início
Gatilho: favorito perdendo antes do minuto 30
Entrada: Over escanteios alto no restante (linha atual + 4 ou +5)

TÁTICA 03 — Over Jogo após 1ºT Desfavorável
Gatilho: favorito perdendo no fim do 1º tempo
Entrada: Over [gols_total_atual + 1.5] do jogo total
Exemplo: 0x1 no intervalo → Over 2.5 do jogo

Quando um gatilho de tática bater, PRIORIZE essa entrada como principal.

# FORMATO DE SAÍDA OBRIGATÓRIO (markdown PT-BR)

A saída tem exatamente 4 seções nesta ordem:

🎯 **ENTRADA PRINCIPAL**

***[Mercado + linha exata]*** @ [odd live se disponível, senão omitir]

[Parágrafo de 3-5 frases. Mencione minuto e placar contextualmente. Se TÁTICA SAVEL acionada, faça o cenário aparecer ("favorito perdendo aos 65 — clássico cenário de pressão no fim") sem nomear a tática.]

⚡ **ALTERNATIVAS**

***[Alternativa A]*** @ [odd]

***[Alternativa B]*** @ [odd]

**[Nome curto da A]**: [1-2 frases].

**[Nome curto da B]**: [1-2 frases].

📋 **RESUMO**

[1-2 frases capturando minuto, placar e leitura do jogo. Ex: "29 minutos, 1x0 pro mandante — jogo está se desenhando do jeito que os números previam, com o visitante encostando aos poucos."]

🔍 **CONTEXTO**

[Parágrafo final de 2-4 frases com ressalva sobre tempo restante, cartões perigosos, substituições importantes, ou padrão histórico.]

⏱️ *Análise válida pelos próximos minutos. Cenário pode mudar com novos eventos.*

# REGRAS RÍGIDAS

- NÃO emitir "CONFIANÇA: Alta/Média/Baixa".
- NÃO recusar análise por "dados insuficientes" antes dos 20 min. Use pre_match.
- NÃO repetir nomes de times mais de 3 vezes.
- NÃO incluir link da Esportiva Bet.
- NÃO inventar dados.
- USAR PT-BR brasileiro e termos técnicos de aposta.
- ALTERNATIVAS em mercados DIFERENTES da principal e entre si.
- Quando aplicar TÁTICA SAVEL: cenário aparente, sem rotular como "tática".
- Os emojis (🎯 ⚡ 📋 🔍 ⏱️) são OBRIGATÓRIOS exatamente nessas posições e ordem.
- Linha da entrada e linhas de alternativas DEVEM usar ***triple asterisks*** com odd.
- Justificativas das alternativas DEVEM começar com **Nome do mercado**:
- NÃO emitir 🔥 (formato antigo descontinuado — use 📋 para resumo).
- Em jogos passando dos 80 min: ressalva clara sobre tempo restante.

REGRAS DE LINGUAGEM ESTATÍSTICA (rigor obrigatório):

- NUNCA use a palavra "invicto" se o time tiver QUALQUER derrota no
  período citado. "Invicto" só pode ser usado quando for literalmente
  verdade no recorte temporal usado. Para destacar sequência recente
  positiva, escreva "sem derrota nas últimas N partidas em casa", "vem
  de N jogos sem perder em casa", "engatou N jogos invicto", ou similar
  — sempre com a janela explícita.

- Sempre seja explícito sobre a janela temporal de cada estatística que
  citar: "nos últimos 10 jogos", "nesta Série B", "nas últimas 4 partidas
  em casa", "no H2H recente". Nunca misture janelas diferentes no mesmo
  parágrafo sem deixar claro qual estatística pertence a qual janela.

- Não construa narrativa positiva descartando dados desfavoráveis. Se o
  time tem 2V-0E-2D em casa, apresente como "2V-0E-2D em casa neste
  campeonato" e, separadamente se for o caso, "vem de N partidas sem
  perder em casa". As duas informações coexistem — uma não anula a
  outra. Não invente recortes pra esconder dados ruins.

- Verifique consistência interna do parágrafo antes de finalizar: se
  uma frase contradiz outra no mesmo bloco (ex: "invicto" + "derrotas"),
  reescreva. Análise contraditória derruba a credibilidade da entrada
  inteira.
`;

async function fetchStandings(
  supabase: any,
  leagueId: number,
  apiKey: string
): Promise<any | null> {
  const cacheKey = `standings:league_${leagueId}`;
  const { data: cached } = await supabase
    .from("ai_tip_cache")
    .select("content")
    .eq("match_key", cacheKey)
    .eq("match_type", "live")
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cached) return (cached.content as any)?.standings ?? null;

  const year = new Date().getFullYear();
  for (const season of [year, year - 1]) {
    try {
      const url = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`;
      const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
      if (!resp.ok) continue;
      const data = await resp.json();
      const league = data?.response?.[0]?.league;
      const table = league?.standings?.[0];
      if (Array.isArray(table) && table.length > 0) {
        const simplified = table.map((t: any) => ({
          rank: t.rank,
          team: t.team?.name,
          team_id: t.team?.id,
          played: t.all?.played,
          win: t.all?.win,
          draw: t.all?.draw,
          lose: t.all?.lose,
          gf: t.all?.goals?.for,
          ga: t.all?.goals?.against,
          gd: t.goalsDiff,
          pts: t.points,
          form: t.form,
          home_played: t.home?.played,
          home_win: t.home?.win,
          home_draw: t.home?.draw,
          home_lose: t.home?.lose,
          away_played: t.away?.played,
          away_win: t.away?.win,
          away_draw: t.away?.draw,
          away_lose: t.away?.lose,
        }));
        const expiresAt = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
        await supabase.from("ai_tip_cache").insert({
          match_key: cacheKey,
          match_type: "live",
          content: { standings: simplified, season },
          source_data: { league_id: leagueId },
          expires_at: expiresAt,
          tokens_input: 0,
          tokens_output: 0,
        });
        return simplified;
      }
    } catch (err) {
      console.error("[standings] error", leagueId, season, err);
    }
  }
  return null;
}

async function fetchOdds(
  supabase: any,
  fixtureId: number,
  apiKey: string
): Promise<any | null> {
  const cacheKey = `odds:fixture_${fixtureId}`;
  const { data: cached } = await supabase
    .from("ai_tip_cache")
    .select("content")
    .eq("match_key", cacheKey)
    .eq("match_type", "live")
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cached) return (cached.content as any)?.odds ?? null;

  try {
    const url = `https://v3.football.api-sports.io/odds?fixture=${fixtureId}`;
    const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const bookmakers = data?.response?.[0]?.bookmakers ?? [];
    if (bookmakers.length === 0) return null;

    const bookmaker = bookmakers[0];
    const interestingMarkets = [
      "Match Winner",
      "Goals Over/Under",
      "Both Teams Score",
      "Asian Handicap",
      "Double Chance",
      "First Half Winner",
      "Corners Over Under",
      "Cards Over/Under",
      "Home Team Total Goals",
      "Away Team Total Goals",
    ];
    const filtered: any = {};
    for (const bet of bookmaker?.bets ?? []) {
      if (interestingMarkets.includes(bet.name)) {
        filtered[bet.name] = bet.values?.slice(0, 6) ?? [];
      }
    }
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase.from("ai_tip_cache").insert({
      match_key: cacheKey,
      match_type: "live",
      content: { odds: filtered, bookmaker: bookmaker?.name },
      source_data: { fixture_id: fixtureId },
      expires_at: expiresAt,
      tokens_input: 0,
      tokens_output: 0,
    });
    return filtered;
  } catch (err) {
    console.error("[odds] error", fixtureId, err);
    return null;
  }
}

async function fetchLiveOdds(
  fixtureId: number,
  apiKey: string
): Promise<any | null> {
  // Sem cache: odds live mudam constantemente
  try {
    const url = `https://v3.football.api-sports.io/odds/live?fixture=${fixtureId}`;
    const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const odds = data?.response?.[0];
    if (!odds) return null;
    const interestingMarkets = [
      "Match Winner",
      "Goals Over/Under",
      "Both Teams Score",
      "Asian Handicap",
      "Double Chance",
      "Next Goal",
      "Corners Over Under",
      "Cards Over/Under",
    ];
    const filtered: any = {};
    for (const bet of odds?.odds ?? []) {
      if (interestingMarkets.includes(bet?.name)) {
        filtered[bet.name] = bet.values?.slice(0, 6) ?? [];
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : null;
  } catch (err) {
    console.error("[live-odds] error", fixtureId, err);
    return null;
  }
}

function calcPercentages(fixtures: any[]): any {
  const total = fixtures.length;
  if (total === 0) return null;
  let over15 = 0, over25 = 0, over35 = 0;
  let btts = 0, cleanSheets = 0;
  for (const f of fixtures) {
    const homeGoals = f?.goals?.home ?? 0;
    const awayGoals = f?.goals?.away ?? 0;
    const totalGoals = homeGoals + awayGoals;
    if (totalGoals >= 2) over15++;
    if (totalGoals >= 3) over25++;
    if (totalGoals >= 4) over35++;
    if (homeGoals > 0 && awayGoals > 0) btts++;
    if (homeGoals === 0 || awayGoals === 0) cleanSheets++;
  }
  return {
    over_15_pct: Math.round((over15 / total) * 100),
    over_25_pct: Math.round((over25 / total) * 100),
    over_35_pct: Math.round((over35 / total) * 100),
    btts_pct: Math.round((btts / total) * 100),
    clean_sheets_pct: Math.round((cleanSheets / total) * 100),
    sample: total,
  };
}

function calcStreak(fixtures: any[], teamId: number): any {
  if (fixtures.length === 0) return { result: null, length: 0 };
  const resultFor = (f: any): string => {
    const isHome = f?.teams?.home?.id === teamId;
    const hg = f?.goals?.home ?? 0;
    const ag = f?.goals?.away ?? 0;
    if (hg === ag) return "D";
    if (isHome && hg > ag) return "W";
    if (!isHome && ag > hg) return "W";
    return "L";
  };
  const first = resultFor(fixtures[0]);
  let length = 1;
  for (let i = 1; i < fixtures.length; i++) {
    if (resultFor(fixtures[i]) === first) length++;
    else break;
  }
  return { result: first, length };
}

async function fetchPreMatchContext(
  supabase: any,
  apiKey: string,
  fixture: any
): Promise<any> {
  const homeId = fixture.teams.home.id;
  const awayId = fixture.teams.away.id;
  const leagueId = fixture.league.id;

  const fetchTeamLast = async (teamId: number, _venue: "home" | "away") => {
    try {
      const url = `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=10`;
      const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
      if (!resp.ok) return [];
      const data = await resp.json();
      return Array.isArray(data?.response) ? data.response : [];
    } catch (err) {
      console.error("[live] team last error", teamId, err);
      return [];
    }
  };

  const fetchH2H = async () => {
    try {
      const url = `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`;
      const resp = await fetch(url, { headers: { "x-apisports-key": apiKey } });
      if (!resp.ok) return [];
      const data = await resp.json();
      return Array.isArray(data?.response) ? data.response : [];
    } catch (err) {
      console.error("[live] h2h error", err);
      return [];
    }
  };

  const [homeForm, awayForm, h2h, standings, oddsPre] = await Promise.all([
    fetchTeamLast(homeId, "home"),
    fetchTeamLast(awayId, "away"),
    fetchH2H(),
    fetchStandings(supabase, leagueId, apiKey),
    fetchOdds(supabase, fixture.fixture.id, apiKey),
  ]);

  const trimForm = (arr: any[]) => arr.slice(0, 10).map((m: any) => ({
    date: m.fixture?.date,
    home: m.teams?.home?.name,
    away: m.teams?.away?.name,
    score: `${m.goals?.home ?? "-"}-${m.goals?.away ?? "-"}`,
    league: m.league?.name,
  }));

  return {
    home_last_10: trimForm(homeForm),
    away_last_10: trimForm(awayForm),
    h2h_last_5: trimForm(h2h),
    standings_home: standings?.find((s: any) => s.team_id === homeId) ?? null,
    standings_away: standings?.find((s: any) => s.team_id === awayId) ?? null,
    percentages_home: calcPercentages(homeForm),
    percentages_away: calcPercentages(awayForm),
    streak_home: calcStreak(homeForm, homeId),
    streak_away: calcStreak(awayForm, awayId),
    odds_pre_match: oddsPre,
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "method_not_allowed" }, 405);

  // ─── AUTH ───
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResp({ error: "missing_bearer" }, 401);
  let token: TokenPayload;
  try {
    token = JSON.parse(atob(authHeader.replace("Bearer ", "")));
  } catch {
    return jsonResp({ error: "invalid_token" }, 401);
  }
  if (!token?.user_id) return jsonResp({ error: "no_user_id" }, 401);
  if (token.exp < Date.now()) return jsonResp({ error: "token_expired" }, 401);

  // ─── BETA ALLOWLIST ───
  const tokenEmail = token.email?.toLowerCase()?.trim();
  if (!tokenEmail || !AI_BETA_ALLOWLIST.includes(tokenEmail)) {
    return jsonResp({ error: "beta_access_denied", message: "Beta privado" }, 403);
  }

  // ─── BODY ───
  let body: { fixture_id?: number };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "invalid_body" }, 400);
  }
  const fixtureId = body.fixture_id;
  if (!fixtureId || typeof fixtureId !== "number") {
    return jsonResp({ error: "fixture_id_required" }, 400);
  }

  // ─── SUPABASE ───
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ─── CACHE LOOKUP (bucket de 60s) ───
  const bucket = Math.floor(Date.now() / 60000);
  const cacheKey = `live_tip:${fixtureId}:${bucket}`;
  const { data: cached } = await supabase
    .from("ai_tip_cache")
    .select("id, content, source_data, generated_at")
    .eq("match_key", cacheKey)
    .eq("match_type", "live")
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isCacheHit = !!cached;

  // ─── DÉBITO DE CRÉDITO ───
  const { data: creditResult, error: creditErr } = await supabase.rpc(
    "check_and_debit_credit",
    { p_user_id: token.user_id, p_is_cache_hit: isCacheHit }
  );
  if (creditErr) {
    console.error("[ai-live-tip] credit RPC error", creditErr);
    return jsonResp({ error: "credit_check_failed" }, 500);
  }
  if (!creditResult?.allowed) {
    return jsonResp(
      { error: "insufficient_credits", reason: creditResult?.reason },
      402
    );
  }

  // ─── SE CACHE HIT, RETORNA ───
  if (isCacheHit && cached) {
    // Incrementa hit_count async (não bloqueia retorno)
    supabase
      .rpc("increment_tip_hit", { p_tip_id: cached.id })
      .then(({ error }: { error: any }) => {
        if (error) console.error("increment_tip_hit error", error);
      });
    return jsonResp({
      cached: true,
      tip_cache_id: cached.id,
      credit_source: creditResult.source,
      content: cached.content,
      source_data: cached.source_data,
      generated_at: cached.generated_at,
    });
  }

  // ─── FETCH API-FOOTBALL ───
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) return jsonResp({ error: "api_football_key_missing" }, 500);

  const headers = { "x-apisports-key": apiKey };
  const [fixResp, statsResp, evResp, lineupResp] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, { headers }),
    fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`, { headers }),
    fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`, { headers }),
    fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`, { headers }),
  ]);

  if (!fixResp.ok) {
    console.error("[ai-live-tip] fixture fetch failed", fixResp.status);
    return jsonResp({ error: "fixture_fetch_failed" }, 502);
  }

  const fixtureData = await fixResp.json();
  const fix = fixtureData.response?.[0];
  if (!fix) return jsonResp({ error: "fixture_not_found" }, 404);

  if (!TOP_LEAGUES.includes(fix.league.id)) {
    return jsonResp({ error: "league_not_supported" }, 400);
  }
  if (!LIVE_STATUS.includes(fix.fixture.status.short)) {
    return jsonResp({
      error: "not_live",
      status: fix.fixture.status.long,
      kickoff_at: fix.fixture.date,
    }, 400);
  }

  const statsData = statsResp.ok ? await statsResp.json() : { response: [] };
  const eventsData = evResp.ok ? await evResp.json() : { response: [] };
  const lineupsData = lineupResp.ok ? await lineupResp.json() : { response: [] };

  const events = (eventsData.response || []).slice(0, 30);
  const matchStats = statsData.response || [];

  // ─── DADOS AO VIVO ───
  const liveData = {
    status: fix.fixture?.status?.long,
    minute: fix.fixture?.status?.elapsed,
    score: {
      home: fix.goals?.home ?? 0,
      away: fix.goals?.away ?? 0,
    },
    score_halftime: {
      home: fix.score?.halftime?.home ?? null,
      away: fix.score?.halftime?.away ?? null,
    },
    events,
    statistics: matchStats,
    lineups: lineupsData.response || [],
  };

  // ─── DADOS PRÉ-JOGO + ODDS LIVE ───
  const [preMatch, oddsLive] = await Promise.all([
    fetchPreMatchContext(supabase, apiKey, fix),
    fetchLiveOdds(fix.fixture.id, apiKey),
  ]);

  const sourceData = {
    fixture: {
      id: fix.fixture.id,
      league: {
        id: fix.league.id,
        name: fix.league.name,
        country: fix.league.country,
      },
      home: { id: fix.teams.home.id, name: fix.teams.home.name },
      away: { id: fix.teams.away.id, name: fix.teams.away.name },
      kickoff_at: fix.fixture.date,
    },
    live: liveData,
    pre_match: preMatch,
    odds_live: oddsLive,
  };

  // ─── CHAMA CLAUDE ───
  const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!claudeKey) return jsonResp({ error: "anthropic_key_missing" }, 500);

  const userMessage = `Contexto do jogo AO VIVO (use APENAS estes dados; campos null devem ser ignorados):

${JSON.stringify(sourceData, null, 2)}

Gere a análise no formato definido no system prompt. Considere o minuto atual ao escolher mercado e aplicar táticas.`;

  const claudePayload = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      { type: "text", text: SYSTEM_PROMPT_LIVE, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  let claudeResp: Response | null = null;
  let lastErrText = "";
  const RETRY_STATUSES = new Set([429, 500, 502, 503, 504, 529]);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
        },
        body: claudePayload,
      });
    } catch (err) {
      console.error(`[ai-live-tip] claude fetch error (attempt ${attempt + 1})`, err);
      claudeResp = null;
      lastErrText = String(err);
    }
    if (claudeResp && claudeResp.ok) break;
    if (claudeResp) {
      lastErrText = await claudeResp.text();
      console.error(`[ai-live-tip] claude error ${claudeResp.status} (attempt ${attempt + 1})`, lastErrText);
      if (!RETRY_STATUSES.has(claudeResp.status)) break;
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }

  if (!claudeResp || !claudeResp.ok) {
    const status = claudeResp?.status ?? 0;
    const overloaded = status === 503 || status === 529 || status === 429 || status === 0;
    return jsonResp({
      error: overloaded ? "ai_overloaded" : "claude_failed",
      message: overloaded
        ? "A IA está sobrecarregada no momento. Tente novamente em alguns segundos."
        : "Falha ao gerar análise. Tente novamente.",
      status,
      fallback: true,
      retryable: overloaded,
    }, 200);
  }

  const claudeData = await claudeResp.json();
  const responseText = claudeData.content?.[0]?.text || "";
  const usage = claudeData.usage || {};

  // ─── SALVAR CACHE ───
  const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString();
  const { data: inserted } = await supabase
    .from("ai_tip_cache")
    .insert({
      match_key: cacheKey,
      match_type: "live",
      api_football_fixture_id: fixtureId,
      content: { markdown: responseText },
      source_data: sourceData,
      tokens_input: usage.input_tokens || 0,
      tokens_output: usage.output_tokens || 0,
      tokens_cached: usage.cache_read_input_tokens || 0,
      expires_at: expiresAt,
      generated_by_user_id: token.user_id,
    })
    .select("id")
    .single();

  return jsonResp({
    cached: false,
    tip_cache_id: inserted?.id,
    credit_source: creditResult.source,
    content: { markdown: responseText },
    source_data: sourceData,
    generated_at: new Date().toISOString(),
  });
});
