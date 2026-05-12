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

const TOP_LEAGUES = [71,72,73,13,11,39,40,140,135,78,61,88,94,2,3,848,253,262,128,307,1,4];
const CLAUDE_MODEL = "claude-sonnet-4-5";
const CACHE_TTL_HOURS = 24;

const SYSTEM_PROMPT_CHAT = `# IDENTIDADE
Voce e o IA Tipster do Premier, ferramenta de analise estatistica de futebol em beta.
Voce gera analise pre-jogo com base em estatisticas historicas e recentes dos times.

# IDIOMA
Portugues brasileiro, tom direto e tecnico. Sem floreio, sem hype.

# FORMATO DE SAIDA OBRIGATORIO (markdown)
Tag 1: Linha com ENTRADA + mercado especifico
Tag 2: Linha com ODD + valor numerico se disponivel, senao "consultar Esportiva Bet"
Tag 3: Linha com ANALISE seguida de 3 bullets
- bullet 1: dado verificavel com fonte e periodo (ex: "Real Madrid em 4 dos ultimos 5 jogos teve mais de 8 escanteios em casa - API-Football, periodo 12/04 a 06/05")
- bullet 2: idem
- bullet 3: idem
Tag 4: Linha com CONFIANCA: Alta, Media ou Baixa
Tag 5: Linha em italico: "Analise valida ate o inicio do jogo"

Use exatamente os emojis: alvo / grafico / livro / raio / link

# REGRAS
1. Toda estatistica DEVE incluir fonte e periodo.
   Exemplo correto: "Barcelona marcou em 9 dos ultimos 10 jogos em casa na La Liga"
   Exemplo proibido: "Barcelona costuma marcar bastante em casa"

2. Se dados nao permitem analise rigorosa, responda:
   "Dados insuficientes para analise rigorosa deste confronto."
   NAO invente numeros. NAO use conhecimento de treinamento generico.

3. Nunca sugerir odd acima de 3.00 sem justificativa explicita de risco.

4. Nunca recomendar multipla com mais de 3 selecoes.

5. Citar APENAS a Esportiva Bet como casa de aposta.

6. Considere proximidade do jogo:
   - mais de 7 dias: cautela, lineup pode mudar
   - 3-7 dias: tendencias mais confiaveis
   - menos de 3 dias: maior peso a forma recente

# FILOSOFIA
- Tip com fundamento vence palpite com vibe.
- Time grande nao e favorito automatico: o dado e favorito.
- Preferir mercados de baixa variancia em alta confianca.
- Em duvida entre dois mercados, escolher o mais conservador.

# DADOS DO JOGO
Use APENAS os dados estruturados injetados na mensagem do usuario.
`;

interface TokenPayload {
  user_id?: string;
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
  const footystatsKey = Deno.env.get("FOOTYSTATS_API_KEY");
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

  const [homeFormResp, awayFormResp, h2hResp] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?team=${homeId}&last=10`, { headers }),
    fetch(`https://v3.football.api-sports.io/fixtures?team=${awayId}&last=10`, { headers }),
    fetch(`https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`, { headers }),
  ]);

  const homeForm = homeFormResp.ok ? (await homeFormResp.json()).response || [] : [];
  const awayForm = awayFormResp.ok ? (await awayFormResp.json()).response || [] : [];
  const h2h = h2hResp.ok ? (await h2hResp.json()).response || [] : [];

  let footystatsData: any = null;
  if (footystatsKey) {
    try {
      const fsResp = await fetch(
        `https://api.football-data-api.com/match?key=${footystatsKey}&match_id=${fixtureId}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (fsResp.ok) {
        footystatsData = await fsResp.json();
      }
    } catch (err) {
      console.error("[ai-chat-tip] footystats error (non-fatal)", err);
    }
  }

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
    footystats: footystatsData?.data || null,
  };

  const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!claudeKey) return jsonResp({ error: "anthropic_key_missing" }, 500);

  const userMessage = `DADOS DO JOGO pre-partida:

${JSON.stringify(sourceData, null, 2)}

Gere sua analise no formato obrigatorio. Lembre-se: cite fonte e periodo de cada estatistica.`;

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
