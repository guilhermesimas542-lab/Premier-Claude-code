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
const LIVE_STATUS = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];
const CLAUDE_MODEL = "claude-sonnet-4-5";
const CACHE_TTL_SECONDS = 60;

const SYSTEM_PROMPT_LIVE = `# IDENTIDADE
Você é o IA Tipster do Premier, ferramenta de análise estatística de futebol em beta.
Você analisa jogos AO VIVO com base nos dados da partida em curso.

# IDIOMA
Português brasileiro, tom direto e técnico. Sem floreio, sem hype.

# FORMATO DE SAÍDA OBRIGATÓRIO (markdown)
🎯 **ENTRADA:** [mercado específico para AO VIVO]
📊 **ODD:** [valor numérico se disponível, senão "consultar casa"]
📈 **ANÁLISE:**
- [bullet 1 citando dado verificável com momento da partida]
- [bullet 2 idem]
- [bullet 3 idem]
⚡ **CONFIANÇA:** Alta / Média / Baixa
🔗 *Análise válida pelos próximos 5-10 minutos.*

# REGRAS
1. Toda estatística citada DEVE incluir o momento atual da partida.
   Ex: "Real Madrid teve 8 finalizações nos primeiros 30 min (minuto atual: 35)".

2. Se os dados não permitem análise rigorosa, responda:
   "Dados ao vivo insuficientes para análise rigorosa neste momento."
   NÃO invente números.

3. Nunca sugerir odd > 3.00 sem justificativa explícita de risco.

4. Considere o minuto do jogo:
   - <15: análise inicial, foco em tendências de abertura
   - 16-60: estatísticas acumuladas + ritmo
   - >60: pressão / urgência do placar
   - >80: cautela com mercados de gol

5. Citar APENAS a Esportiva Bet como casa.

6. Reconhecer que dados ao vivo são VOLÁTEIS.

# FILOSOFIA
- Tip com fundamento vence palpite com vibe.
- Em ao vivo, momentum vale mais que histórico estático.
- Preferir mercados de baixa variância em alta confiança.

# DADOS DO JOGO
Use APENAS os dados estruturados injetados pela mensagem do usuário.
`;

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

  // ─── MONTAR source_data ───
  const sourceData = {
    fixture: {
      id: fix.fixture.id,
      league: { id: fix.league.id, name: fix.league.name, country: fix.league.country },
      home: { id: fix.teams.home.id, name: fix.teams.home.name },
      away: { id: fix.teams.away.id, name: fix.teams.away.name },
      score: { home: fix.goals.home, away: fix.goals.away },
      status: {
        long: fix.fixture.status.long,
        short: fix.fixture.status.short,
        minute: fix.fixture.status.elapsed,
      },
      kickoff_at: fix.fixture.date,
    },
    statistics: statsData.response || [],
    events: (eventsData.response || []).slice(0, 30),
    lineups: lineupsData.response || [],
  };

  // ─── CHAMA CLAUDE ───
  const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!claudeKey) return jsonResp({ error: "anthropic_key_missing" }, 500);

  const userMessage = `DADOS DO JOGO ao vivo:

${JSON.stringify(sourceData, null, 2)}

Gere sua análise no formato obrigatório.`;

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
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT_LIVE,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (err) {
    console.error("[ai-live-tip] claude fetch error", err);
    return jsonResp({ error: "claude_unreachable" }, 502);
  }

  if (!claudeResp.ok) {
    const errText = await claudeResp.text();
    console.error("[ai-live-tip] claude error", claudeResp.status, errText);
    return jsonResp({ error: "claude_failed", status: claudeResp.status }, 502);
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
