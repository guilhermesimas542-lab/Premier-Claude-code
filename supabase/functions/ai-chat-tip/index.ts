import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lookupAltenarMapping } from "../_shared/altenar-lookup.ts";

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
];
const PRIMARY_MODEL = "claude-sonnet-4-5";
const FALLBACK_MODEL = "claude-opus-4-7";
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504, 529]);
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

PRINCÍPIO: organização visual. O leitor varre antes de ler. Mantenha TODA informação relevante, mas QUEBRE em blocos curtos com subsessões nomeadas dentro da ENTRADA. Frases curtas — 1 linha cada quando possível. Sem texto "enchendo" mas SEM cortar dado que importa.

🎯 **ENTRADA PRINCIPAL**

***[Mercado + linha exata]*** @ [odd aproximada]

✅ **[Punchline de 1 linha — leitura imediata do porquê dessa entrada]**

**📊 Os números falam:**
- [Dado-chave 1: número específico + janela explícita, 1 linha]
- [Dado-chave 2: número específico + janela explícita, 1 linha]
- [Dado-chave 3: opcional, só se realmente relevante]

**🧠 Leitura do jogo:**
[1-2 frases curtas explicando o cenário tático/momento. Cada frase em uma linha quando possível.]

**⚠️ O que pode quebrar:**
- [Risco ou variável que mexe na entrada, 1 linha]
- [Segundo risco, opcional, só se relevante]

⚡ **ALTERNATIVAS**

***[Alternativa A — mercado + linha]*** @ [odd]

**[Nome curto da A]**: [1-2 frases com números que justificam. Frases curtas separadas por pontuação clara.]

***[Alternativa B — mercado + linha]*** @ [odd]

**[Nome curto da B]**: [1-2 frases com números que justificam.]

📋 **RESUMO**

[1-2 frases capturando essência: quem é favorito + fator decisivo. Direto.]

🔍 **CONTEXTO**

- [Padrão H2H ou ressalva técnica 1, com número se houver]
- [Variável de risco ou contexto adicional 2]
- [Terceiro fator, opcional]

⏱️ *Análise válida até o início do jogo*

# REGRAS RÍGIDAS

- ORGANIZAÇÃO > BREVIDADE. NÃO cortar dado relevante só pra ficar curto. NÃO escrever ladainha enchendo linguiça.
- Use as SUBSESSÕES nomeadas dentro de ENTRADA PRINCIPAL ("📊 Os números falam", "🧠 Leitura do jogo", "⚠️ O que pode quebrar") — são obrigatórias, exatamente nesses títulos.
- "⚠️ O que pode quebrar" pode ser OMITIDO inteiramente se não houver risco notável (preferível a inventar risco).
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
- A punchline ✅ DEVE estar em bold (**texto**) — é a primeira impressão de valor.
- As linhas de alternativas DEVEM usar ***triple asterisks*** com odd, uma linha por alternativa, com linha em branco entre elas.
- As justificativas das alternativas DEVEM começar com **Nome do mercado**: (bold no nome, seguido de dois pontos).
- Se odd não estiver disponível no contexto, omitir " @ [odd]" da linha.
- CONTEXTO: até 3 bullets. NÃO escrever parágrafo corrido.
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

═══════════════════════════════════════════════════════
REGRAS DE LINGUAGEM ESTATÍSTICA — APLICAR SEMPRE
═══════════════════════════════════════════════════════

1. NUNCA use "invicto", "invencibilidade", "sem perder" se houver
   QUALQUER derrota no período citado. Conte as derrotas. 9V/10J
   NÃO é invicto. 10V/10J é invicto. Empate não quebra invicto.

2. SEMPRE explicite a janela temporal exata. Proibido:
   - "Recentemente"
   - "Ultimamente"
   - "Nos últimos jogos"
   - "Vem em boa fase"
   - "Já há um tempo"
   Use SEMPRE: "nos últimos 10 jogos", "nas últimas 5 partidas em
   casa", "nos últimos 5 confrontos contra X", "em 3 dos últimos
   5 fora de casa", etc.

3. NUNCA construa narrativa positiva descartando dados negativos.
   - Se 5V/10J com 3D, NÃO escreva "fase positiva" sem contextualizar
   - Use linguagem proporcional: "5 vitórias em 10, com 3 derrotas
     incluídas" — deixa o leitor avaliar
   - "Boa forma" exige 7V+ em 10 OU sequência limpa recente sem
     interrupção. Use com critério.

4. CONSISTÊNCIA INTERNA: revise cada parágrafo antes de finalizar.
   - Não pode dizer "invicto há 10 jogos" e depois "vinha mal nos
     últimos"
   - Não pode citar "5 vitórias seguidas" e depois "tropeçou recente"
   - Cada afirmação deve estar de acordo com os dados da query

5. EM CASA / FORA: sempre diferencie quando for relevante. "5V/10J
   no geral" pode esconder "1V/5J fora de casa". Se o jogo é fora,
   priorize o recorte fora.

6. CONFRONTO DIRETO (H2H): cite SOMENTE se houver dados de 3+ jogos
   recentes. Não use "tradicionalmente" ou "historicamente domina"
   sem dados.

7. PROIBIDO: superlativos genéricos sem suporte numérico.
   - "Vem voando", "fase brilhante", "fortíssimo em casa" sem
     número específico = REPROVADO

8. DADOS DESFAVORÁVEIS são parte da análise. Não esconda. Use
   pra contextualizar entrada: "Apesar das 3 derrotas em 10, o
   Time A bate confronto direto contra Time B (3V/5)."

9. CONSISTÊNCIA ENTRE ENTRADA E ALTERNATIVAS — proibido cravar
   placar específico via combinação de mercados.

   ❌ ERRADO: Entrada "Time A Over 1.5" + Alt "Jogo Under 2.5"
              (matematicamente força 2x0 ou 2x1 → cravar resultado
              exato disfarçado)
   
   ❌ ERRADO: Entrada "Casa vence" + Alt "Visitante NÃO marca"
              (= crava placar limpo, alternativa redundante)
   ✅ CERTO: Alternativas devem ser PROTEÇÕES ou COMPLEMENTOS
              independentes, não cenários combinados específicos.
              Exemplo: Entrada "Casa vence" + Alt "Chance Dupla 1X"
              (uma protege a outra, sem cravar placar).
   Antes de incluir uma alternativa, verificar mentalmente:
   "Se entrada + alternativa forem AMBAS pagas, isso cravou um
   placar específico?" Se sim, troque a alternativa.

10. PRECISÃO FACTUAL NA CONTAGEM — nunca generalize tipos de 
    resultado.

    Vitória, empate e derrota são CATEGORIAS DISTINTAS. Não some
    nem agrupe sob rótulos como "tropeços", "resultados ruins",
    "sequência negativa" se o conteúdo lista coisas diferentes.

    ❌ ERRADO: "2 derrotas em casa: 0-4 com Flamengo e 1-1 com 
                Botafogo" (1-1 é EMPATE, não derrota)
    
    ❌ ERRADO: "3 jogos sem vencer" se foram 1 empate + 2 derrotas
                = só está OK se a janela for clara (sim, 3 sem
                vitória), mas NÃO use "vem perdendo" pra empates.
    ✅ CERTO: Cite resultados específicos quando relevante:
               "Nos últimos 5 em casa: 2V, 2E, 1D — empatou com
                Botafogo (1-1) e perdeu pro Flamengo (0-4)."
    
    ✅ CERTO: Use o rótulo certo:
               "3 jogos sem vencer (2E + 1D)" se for o caso.
    REVISE cada parágrafo: cada partida citada está com o
    resultado correto identificado?

═══════════════════════════════════════════════════════
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
    .eq("match_type", "aux_standings")
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
          match_type: "aux_standings",
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
    .eq("match_type", "aux_odds")
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
      match_type: "aux_odds",
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

  // ─── KILL SWITCH ───
  try {
    const sbKill = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: status } = await sbKill.rpc("get_ai_tipster_status");
    if (status && (status as any).enabled === false) {
      return jsonResp({
        error: "system_disabled",
        message: (status as any).message || "Sistema temporariamente indisponível.",
      }, 503);
    }
  } catch (e) {
    console.error("[kill-switch] failed:", e);
  }

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

  // ─── HARD COST CAP (B.1) ───
  const DAILY_COST_CAP_USD = 100.0;
  const { data: dailyCost, error: costError } = await supabase.rpc("get_daily_ai_cost_usd");
  if (costError) {
    console.error("[cost-check] Failed to get daily cost:", costError);
  } else if (dailyCost && Number(dailyCost) >= DAILY_COST_CAP_USD) {
    console.warn("[cost-check] Daily cap reached:", dailyCost);
    return jsonResp(
      { error: "daily_cost_limit_reached", message: "Limite operacional diário atingido. Tente novamente em algumas horas." },
      429
    );
  }



  // ─── CACHE LOOKUP (antes do débito — cache hit é grátis) ───
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

  if (cached) {
    // Log cache hit (grátis, sem débito)
    await supabase.from("ai_credit_log").insert({
      user_id: token.user_id,
      event_type: "cache_hit_free",
      amount: 0,
      reason: "chat_prematch",
      metadata: { cache_id: cached.id, match_key: cacheKey },
    });
    supabase
      .rpc("increment_tip_hit", { p_tip_id: cached.id })
      .then(({ error }: { error: any }) => {
        if (error) console.error("increment_tip_hit error", error);
      });
    return jsonResp({
      cached: true,
      tip_cache_id: cached.id,
      credit_source: "cache_hit_free",
      credit_consumed: false,
      content: cached.content,
      source_data: cached.source_data,
      generated_at: cached.generated_at,
    });
  }

  // ─── CACHE MISS — agora sim debita ───
  const { data: creditResult, error: creditErr } = await supabase.rpc(
    "check_and_debit_credit",
    { p_user_id: token.user_id, p_source: "chat_prematch" }
  );
  if (creditErr) {
    console.error("[ai-chat-tip] credit RPC error", creditErr);
    return jsonResp({ error: "credit_check_failed" }, 500);
  }
  if (!creditResult?.success) {
    return jsonResp(creditResult ?? { error: "insufficient_credits" }, 402);
  }
  const debitType: string = creditResult.debit_type;

  async function refundIfFailed(reasonTag: string) {
    try {
      await supabase.rpc("refund_credit", {
        p_user_id: token.user_id,
        p_source: "chat_prematch",
        p_debit_type: debitType,
      });
      console.warn(`[ai-chat-tip] credit refunded (${reasonTag})`);
    } catch (e) {
      console.error("[ai-chat-tip] refund_credit failed", e);
    }
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      await refundIfFailed("api_football_key_missing");
      return jsonResp({ error: "api_football_key_missing" }, 500);
    }

    const headers = { "x-apisports-key": apiKey };

    const fixResp = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, { headers });
    if (!fixResp.ok) {
      await refundIfFailed("fixture_fetch_failed");
      return jsonResp({ error: "fixture_fetch_failed" }, 502);
    }
    const fixtureData = await fixResp.json();
    const fix = fixtureData.response?.[0];
    if (!fix) {
      await refundIfFailed("fixture_not_found");
      return jsonResp({ error: "fixture_not_found" }, 404);
    }
    if (!TOP_LEAGUES.includes(fix.league.id)) {
      await refundIfFailed("league_not_supported");
      return jsonResp({ error: "league_not_supported" }, 400);
    }

    const kickoff = new Date(fix.fixture.date);
    if (kickoff.getTime() < Date.now()) {
      await refundIfFailed("fixture_already_started_or_past");
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

    const altenar = await lookupAltenarMapping(supabase, fix.fixture.id);

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
      altenar_event_url: altenar?.altenar_event_url ?? null,
    };

    const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeKey) {
      await refundIfFailed("anthropic_key_missing");
      return jsonResp({ error: "anthropic_key_missing" }, 500);
    }

    const userMessage = `Contexto do jogo (use APENAS estes dados; ignore campos null):

${JSON.stringify(sourceData, null, 2)}

Gere a análise no formato definido no system prompt.`;

    const baseBody = {
      max_tokens: 1500,
      system: [
        { type: "text", text: SYSTEM_PROMPT_CHAT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userMessage }],
    };
    async function callClaude(model: string): Promise<Response> {
      return await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ ...baseBody, model }),
      });
    }

    let claudeResp: Response | null = null;
    let lastErrText = "";
    let modelUsed = PRIMARY_MODEL;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        claudeResp = await callClaude(PRIMARY_MODEL);
        if (claudeResp.ok) break;
        lastErrText = await claudeResp.text();
        console.error(`[ai-chat-tip] claude primary ${claudeResp.status} (attempt ${attempt + 1})`, lastErrText);
        if (!RETRY_STATUSES.has(claudeResp.status)) break;
      } catch (err) {
        console.error(`[ai-chat-tip] claude primary fetch error (attempt ${attempt + 1})`, err);
        claudeResp = null;
        lastErrText = String(err);
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt)));
    }

    if (!claudeResp?.ok && (claudeResp === null || RETRY_STATUSES.has(claudeResp.status))) {
      console.warn(`[ai-chat-tip] primary failed, trying fallback ${FALLBACK_MODEL}`);
      try {
        const fbResp = await callClaude(FALLBACK_MODEL);
        if (fbResp.ok) {
          claudeResp = fbResp;
          modelUsed = FALLBACK_MODEL;
          console.warn(`[ai-chat-tip] fallback ${FALLBACK_MODEL} succeeded`);
        } else {
          lastErrText = await fbResp.text();
          console.error(`[ai-chat-tip] fallback ${FALLBACK_MODEL} ${fbResp.status}`, lastErrText);
          claudeResp = fbResp;
        }
      } catch (err) {
        console.error(`[ai-chat-tip] fallback fetch error`, err);
      }
    }

    if (!claudeResp || !claudeResp.ok) {
      await refundIfFailed("claude_failed");
      const status = claudeResp?.status ?? 0;
      return jsonResp({
        error: "generation_failed",
        message: "Falha temporária na análise. Seu crédito foi restituído. Tente novamente em alguns segundos.",
        fixture_id: fixtureId,
        status_received: status,
        retryable: true,
      }, 500);
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
        altenar_event_id: altenar?.altenar_event_id ?? null,
        content: { markdown: responseText },
        source_data: { ...sourceData, claude_model_used: modelUsed },
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
      credit_source: creditResult.debit_type,
      content: { markdown: responseText },
      source_data: sourceData,
      generated_at: new Date().toISOString(),
    });
  } catch (unexpected) {
    console.error("[ai-chat-tip] unexpected error, refunding", unexpected);
    await refundIfFailed("unexpected_error");
    return jsonResp({
      error: "generation_failed",
      message: "Falha temporária na análise. Seu crédito foi restituído. Tente novamente em alguns segundos.",
    }, 500);
  }
});

