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
const CLAUDE_MODEL = "claude-sonnet-4-5";
const CACHE_TTL_HOURS = 24;

const SYSTEM_PROMPT_CHAT = `Você é o Savel, tipster especialista em futebol e fundador da Premier Ultra. Você analisa jogos com base em dados estatísticos, percentuais e contexto, não em paixão ou achismo.

# SUA FILOSOFIA

- Você valoriza splits casa/fora — onde o time joga importa mais do que números globais.
- Você trabalha com percentuais reais dos últimos 10 jogos, não com sensações.
- Você considera odds reais ao avaliar valor: odd inflada em mercado provável = entrada de valor.
- Você analisa streaks (sequências), forma recente e momento dos times.
- Você assume conhecimento básico do leitor — não explica conceitos básicos de futebol nem de apostas.
- Você não inventa números: só usa dados que estão no contexto.

# MERCADOS QUE VOCÊ DOMINA

1X2 (vencedor), Total de Gols (Over/Under), Handicap Asiático, Chance Dupla, Ambas Marcam (BTTS), Empate Anula Aposta (raro), Gol no 1º Tempo, Escanteios (totais e 1ºT), Cartões (totais e 1ºT), Team Over (Total de Gols de UM time específico, ex: "Atlético-MG +1.5 gols").

# DADOS QUE VOCÊ VAI RECEBER

Tabela do campeonato com splits casa/fora, forma e percentuais dos últimos 10, H2H, streaks, odds reais quando disponíveis.

# FORMATO DE SAÍDA OBRIGATÓRIO (markdown PT-BR)

A saída tem exatamente 4 seções nesta ordem, marcadas pelos emojis especificados:

🎯 **ENTRADA PRINCIPAL**

***[Mercado + linha exata]*** @ [odd aproximada]

[Parágrafo de 3-5 frases justificando, narrativa, usando dados específicos naturalmente.]

⚡ **ALTERNATIVAS**

***[Alternativa A — mercado + linha]*** @ [odd]

***[Alternativa B — mercado + linha]*** @ [odd]

**[Nome curto da A]**: [1-2 frases de justificativa].

**[Nome curto da B]**: [1-2 frases de justificativa].

📋 **RESUMO**

[1-2 frases capturando a essência do jogo. Pode mencionar quem é favorito, momento dos times, fator de decisão tático.]

🔍 **CONTEXTO**

[Parágrafo final de 2-4 frases com ressalvas técnicas, padrões H2H notáveis, variáveis de risco ou contexto adicional.]

⏱️ *Análise válida até o início do jogo*

# REGRAS RÍGIDAS

- NÃO emitir seção "CONFIANÇA: Alta/Média/Baixa". Modular tom internamente.
- NÃO usar palavras vazias ("definitivamente", "garantido", "100%").
- NÃO repetir o nome dos times mais de 3 vezes (use "o mandante", "o visitante").
- NÃO incluir link da Esportiva Bet.
- NÃO inventar dados. Campo null = ignore.
- USAR PT-BR brasileiro e termos técnicos de aposta.
- ALTERNATIVAS em mercados DIFERENTES da principal e entre si.
- Entradas com odd estimada abaixo de 1.30 evitar como principal.
- Os emojis (🎯 ⚡ 📋 🔍 ⏱️) são OBRIGATÓRIOS exatamente nessas posições e nesta ordem.
- A linha da entrada principal DEVE usar ***triple asterisks*** (gera bold+itálico+sublinhado no frontend).
- As linhas de alternativas DEVEM usar ***triple asterisks*** com odd, uma linha por alternativa, com linha em branco entre elas.
- As justificativas das alternativas DEVEM começar com **Nome do mercado**: (bold no nome, seguido de dois pontos).
- Se odd não estiver disponível no contexto, omitir " @ [odd]" da linha.
- NÃO emitir 🔥 (formato antigo descontinuado — use 📋 para resumo, depois de alternativas).

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cacheKey = `chat_prematch:${fixtureId}`;
  const { data: cached } = await supabase
    .from("ai_tip_cache")
    .select("id, content, source_data, generated_at")
    .eq("match_key", cacheKey)
    .eq("match_type", "chat_prematch")
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isCacheHit = !!cached;

  const { data: creditResult, error: creditErr } = await supabase.rpc(
    "check_and_debit_credit",
    { p_user_id: token.user_id, p_is_cache_hit: isCacheHit }
  );
  if (creditErr) return jsonResp({ error: "credit_check_failed" }, 500);
  if (!creditResult?.allowed) {
    return jsonResp(
      { error: "insufficient_credits", reason: creditResult?.reason },
      402
    );
  }

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

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) return jsonResp({ error: "api_football_key_missing" }, 500);

  const headers = { "x-apisports-key": apiKey };

  const fixResp = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, { headers });
  if (!fixResp.ok) return jsonResp({ error: "fixture_fetch_failed" }, 502);
  const fixtureData = await fixResp.json();
  const fix = fixtureData.response?.[0];
  if (!fix) return jsonResp({ error: "fixture_not_found" }, 404);
  if (!TOP_LEAGUES.includes(fix.league.id)) {
    return jsonResp({ error: "league_not_supported" }, 400);
  }

  const kickoff = new Date(fix.fixture.date);
  if (kickoff.getTime() < Date.now()) {
    return jsonResp({
      error: "fixture_already_started_or_past",
      message: "Esse jogo ja comecou ou ja aconteceu. Use a aba Ao Vivo se ainda esta em andamento.",
    }, 400);
  }

  const homeId = fix.teams.home.id;
  const awayId = fix.teams.away.id;
  const leagueId = fix.league.id;

  const [homeFormResp, awayFormResp, h2hResp] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?team=${homeId}&last=10`, { headers }),
    fetch(`https://v3.football.api-sports.io/fixtures?team=${awayId}&last=10`, { headers }),
    fetch(`https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`, { headers }),
  ]);

  const homeForm = homeFormResp.ok ? (await homeFormResp.json()).response || [] : [];
  const awayForm = awayFormResp.ok ? (await awayFormResp.json()).response || [] : [];
  const h2h = h2hResp.ok ? (await h2hResp.json()).response || [] : [];

  const [standings, odds] = await Promise.all([
    fetchStandings(supabase, leagueId, apiKey),
    fetchOdds(supabase, fixtureId, apiKey),
  ]);
  const homePercentages = calcPercentages(homeForm);
  const awayPercentages = calcPercentages(awayForm);
  const homeStreak = calcStreak(homeForm, homeId);
  const awayStreak = calcStreak(awayForm, awayId);
  const homeTableRow = standings?.find((s: any) => s.team_id === homeId) ?? null;
  const awayTableRow = standings?.find((s: any) => s.team_id === awayId) ?? null;

  const trimForm = (arr: any[]) => arr.slice(0, 10).map((m: any) => ({
    date: m.fixture.date,
    home: m.teams.home.name,
    away: m.teams.away.name,
    score: `${m.goals.home}-${m.goals.away}`,
    league: m.league.name,
  }));

  const sourceData = {
    fixture: {
      id: fix.fixture.id,
      league: { id: fix.league.id, name: fix.league.name, country: fix.league.country },
      home: { id: homeId, name: fix.teams.home.name },
      away: { id: awayId, name: fix.teams.away.name },
      kickoff_at: fix.fixture.date,
      venue: fix.fixture.venue?.name,
    },
    home_last_10: trimForm(homeForm),
    away_last_10: trimForm(awayForm),
    h2h_last_5: trimForm(h2h),
    standings_home: homeTableRow,
    standings_away: awayTableRow,
    percentages_home: homePercentages,
    percentages_away: awayPercentages,
    streak_home: homeStreak,
    streak_away: awayStreak,
    odds,
  };

  const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!claudeKey) return jsonResp({ error: "anthropic_key_missing" }, 500);

  const userMessage = `Contexto do jogo (use APENAS estes dados; ignore campos null):

${JSON.stringify(sourceData, null, 2)}

Gere a análise no formato definido no system prompt.`;

  let claudeResp: Response;
  try {
    claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT_CHAT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (err) {
    return jsonResp({ error: "claude_unreachable" }, 502);
  }

  if (!claudeResp.ok) {
    const errText = await claudeResp.text();
    console.error("[ai-chat-tip] claude error", claudeResp.status, errText);
    return jsonResp({ error: "claude_failed", status: claudeResp.status }, 502);
  }

  const claudeData = await claudeResp.json();
  const responseText = claudeData.content?.[0]?.text || "";
  const usage = claudeData.usage || {};

  const expiresKickoff = kickoff.getTime();
  const expires24h = Date.now() + CACHE_TTL_HOURS * 3600000;
  const expiresAt = new Date(Math.min(expiresKickoff, expires24h)).toISOString();

  const { data: inserted } = await supabase
    .from("ai_tip_cache")
    .insert({
      match_key: cacheKey,
      match_type: "chat_prematch",
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
