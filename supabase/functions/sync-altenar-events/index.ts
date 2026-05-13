import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|sc|ec|cf|ac|cr|sp|rj|mg|pr|rs|bahia|club|de|do|da)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamSimilarity(a: string, b: string): number {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (na === nb) return 1.0;

  const ta = new Set(na.split(" ").filter((x) => x.length >= 3));
  const tb = new Set(nb.split(" ").filter((x) => x.length >= 3));
  if (ta.size === 0 || tb.size === 0) return 0;

  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / Math.max(ta.size, tb.size);
}

function buildEventUrl(
  event: any,
  _champ: any | undefined,
  _category: any | undefined,
  _competitorsById: Map<number, any>
): string {
  // URL mínima: deixa a Esportiva resolver redirect interno pra
  // página com slugs corretos. Evita 404 por slug divergente
  // (ex: "brasileirao-a" vs "brasileirao-serie-a").
  return `https://esportiva.bet.br/sports/futebol/ev-${event.id}`;
}

async function fetchAltenarEvents(champId: number, sportId = 66) {
  const params = new URLSearchParams({
    culture: "pt-BR",
    timezoneOffset: "180",
    integration: "esportiva",
    deviceType: "1",
    numFormat: "en-GB",
    countryCode: "BR",
    champIds: String(champId),
    sportId: String(sportId),
  });
  const url = `https://sb2frontend-altenar2.biahosted.com/api/widget/GetEvents?${params}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Altenar HTTP ${resp.status}`);
  return await resp.json();
}

async function fetchApiFootballFixtures(leagueId: number, fromDate: string, toDate: string) {
  const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&from=${fromDate}&to=${toDate}&season=${new Date().getUTCFullYear()}`;
  let resp = await fetch(url, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY },
  });
  let data = resp.ok ? await resp.json() : { response: [] };

  if (!data.response?.length) {
    const url2 = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&from=${fromDate}&to=${toDate}&season=${new Date().getUTCFullYear() - 1}`;
    resp = await fetch(url2, {
      headers: { "x-apisports-key": API_FOOTBALL_KEY },
    });
    data = resp.ok ? await resp.json() : { response: [] };
  }
  return data.response ?? [];
}

function matchEvent(altenarEvent: any, fixtures: any[], competitorsById: Map<number, any>) {
  const c1 = competitorsById.get(altenarEvent.competitorIds?.[0]);
  const c2 = competitorsById.get(altenarEvent.competitorIds?.[1]);
  if (!c1 || !c2) return null;

  const altDate = new Date(altenarEvent.startDate).getTime();
  let best: any = null;
  let bestScore = 0;

  for (const fx of fixtures) {
    const fxDate = new Date(fx.fixture.date).getTime();
    const hoursDiff = Math.abs(altDate - fxDate) / 3_600_000;
    if (hoursDiff > 24) continue;

    const homeName = fx.teams?.home?.name ?? "";
    const awayName = fx.teams?.away?.name ?? "";

    const sim_direct =
      (teamSimilarity(c1.name, homeName) + teamSimilarity(c2.name, awayName)) / 2;
    const sim_swap =
      (teamSimilarity(c1.name, awayName) + teamSimilarity(c2.name, homeName)) / 2;
    const sim = Math.max(sim_direct, sim_swap);

    const dateBoost = hoursDiff <= 2 ? 0.1 : 0;
    const score = sim + dateBoost;

    if (score > bestScore) {
      bestScore = score;
      best = fx;
    }
  }

  if (bestScore < 0.6) return null;
  return { fixture: best, confidence: bestScore };
}

async function syncChampionship(
  supabase: any,
  champ: any
): Promise<{ events: number; matched: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let eventsCount = 0;
  let matched = 0;
  let skipped = 0;

  try {
    const altenarData = await fetchAltenarEvents(
      champ.altenar_champ_id,
      champ.altenar_sport_id
    );
    const events = altenarData.events ?? [];
    const competitors = altenarData.competitors ?? [];
    const champs = altenarData.champs ?? [];
    const categories = altenarData.categories ?? [];

    const competitorsById = new Map<number, any>();
    competitors.forEach((c: any) => competitorsById.set(c.id, c));
    const champById = new Map<number, any>();
    champs.forEach((c: any) => champById.set(c.id, c));
    const catById = new Map<number, any>();
    categories.forEach((c: any) => catById.set(c.id, c));

    eventsCount = events.length;
    if (eventsCount === 0) {
      return { events: 0, matched: 0, skipped: 0, errors: ["no events returned"] };
    }

    const dates = events.map((e: any) => new Date(e.startDate));
    const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
    const fromStr = new Date(minDate.getTime() - 24 * 3_600_000)
      .toISOString()
      .split("T")[0];
    const toStr = new Date(maxDate.getTime() + 24 * 3_600_000)
      .toISOString()
      .split("T")[0];

    const fixtures = await fetchApiFootballFixtures(
      champ.api_football_league_id,
      fromStr,
      toStr
    );

    for (const ev of events) {
      const match = matchEvent(ev, fixtures, competitorsById);
      if (!match) {
        skipped++;
        continue;
      }
      const fx = match.fixture;
      const champRef = champById.get(ev.champId);
      const catRef = catById.get(ev.catId);
      const eventUrl = buildEventUrl(ev, champRef, catRef, competitorsById);

      const c1 = competitorsById.get(ev.competitorIds[0]);
      const c2 = competitorsById.get(ev.competitorIds[1]);

      const { error: upsertErr } = await supabase
        .from("ai_match_altenar_map")
        .upsert(
          {
            api_football_fixture_id: fx.fixture.id,
            altenar_event_id: String(ev.id),
            altenar_event_url: eventUrl,
            home_team: c1?.name ?? fx.teams?.home?.name,
            away_team: c2?.name ?? fx.teams?.away?.name,
            league_id: champ.api_football_league_id,
            league_name: champ.league_name,
            kickoff_at: ev.startDate,
            confidence: Number(Math.min(1, match.confidence).toFixed(2)),
            expires_at: new Date(
              new Date(ev.startDate).getTime() + 3 * 3_600_000
            ).toISOString(),
          },
          { onConflict: "api_football_fixture_id" }
        );
      if (upsertErr) {
        errors.push(`upsert ${fx.fixture.id}: ${upsertErr.message}`);
      } else {
        matched++;
      }
    }

    await supabase
      .from("ai_altenar_championships")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_events_count: eventsCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", champ.id);
  } catch (e: any) {
    errors.push(String(e?.message ?? e));
  }

  return { events: eventsCount, matched, skipped, errors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    let userEmail: string | null = null;
    try {
      userEmail = JSON.parse(atob(token)).email ?? null;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: adminCheck } = await supabase
      .from("admin_emails")
      .select("email")
      .eq("email", userEmail)
      .maybeSingle();
    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {}
    const requestedLeagueIds: number[] | undefined = body.league_ids;

    let query = supabase
      .from("ai_altenar_championships")
      .select("*")
      .eq("active", true);
    if (requestedLeagueIds && requestedLeagueIds.length > 0) {
      query = query.in("api_football_league_id", requestedLeagueIds);
    }
    const { data: championships, error: cErr } = await query;
    if (cErr) throw cErr;

    const results: any[] = [];
    for (const champ of championships ?? []) {
      const r = await syncChampionship(supabase, champ);
      results.push({
        league: champ.league_name,
        api_football_league_id: champ.api_football_league_id,
        altenar_champ_id: champ.altenar_champ_id,
        ...r,
      });
    }

    const totals = results.reduce(
      (acc, r) => ({
        events: acc.events + r.events,
        matched: acc.matched + r.matched,
        skipped: acc.skipped + r.skipped,
      }),
      { events: 0, matched: 0, skipped: 0 }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        championships_synced: results.length,
        totals,
        per_championship: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("sync-altenar-events error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
