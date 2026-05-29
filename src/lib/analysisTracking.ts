import { trackEvent } from "@/lib/events";

/**
 * Tracking enriquecido pra análises da IA Tipster.
 *
 * Extrai do markdown gerado pela IA: mercado principal, odd, alternativas.
 * Combina com contexto da partida (times, liga, fixture_id) e dispara
 * trackEvent estruturado pra alimentar futuros relatórios de comportamento
 * e filtros de audiência no CRM.
 */

export type AnalysisSource = "chat" | "live";

export interface FixtureLite {
  fixture_id?: number | string | null;
  home?: string | null;
  away?: string | null;
  league_id?: number | string | null;
  league_name?: string | null;
  league_country?: string | null;
}

export interface ParsedEntry {
  market: string | null;
  odd: number | null;
}

/**
 * Extrai da primeira linha *** [mercado] *** @ [odd] que aparecer.
 * Tolera variações de formato (negrito, espaço, separadores).
 */
function parseEntryLine(line: string): ParsedEntry {
  // Remove asteriscos e negrito
  const clean = line
    .replace(/\*+/g, "")
    .replace(/_+/g, "")
    .trim();
  // Procura " @ <odd>" no final
  const oddMatch = clean.match(/@\s*([0-9]+(?:[.,][0-9]+)?)/);
  let odd: number | null = null;
  let market = clean;
  if (oddMatch) {
    odd = parseFloat(oddMatch[1].replace(",", "."));
    market = clean.slice(0, oddMatch.index).trim();
  }
  market = market.replace(/[—-]\s*$/, "").trim();
  return { market: market || null, odd: isFinite(odd ?? NaN) ? odd : null };
}

/**
 * Parser leve do markdown produzido pelos prompts da IA Tipster.
 * Extrai entrada principal e até 2 alternativas.
 */
export function parseAnalysisMarkdown(markdown: string | null | undefined): {
  main: ParsedEntry | null;
  alt_a: ParsedEntry | null;
  alt_b: ParsedEntry | null;
} {
  if (!markdown) return { main: null, alt_a: null, alt_b: null };

  const sections = markdown.split(/\n\s*\n/);
  const findSection = (emoji: string) =>
    sections.find((s) => s.trim().startsWith(emoji)) ?? null;

  const mainSection = findSection("🎯");
  const altSection = findSection("⚡");

  // Linha que contém *** ... @ X.XX
  const ENTRY_LINE = /^\s*\*\*\*.*@\s*[0-9]/;

  const main = mainSection
    ? parseEntryLine(
        mainSection.split(/\n/).find((l) => ENTRY_LINE.test(l)) ?? ""
      )
    : null;

  let alt_a: ParsedEntry | null = null;
  let alt_b: ParsedEntry | null = null;

  if (altSection) {
    const altLines = altSection.split(/\n/).filter((l) => ENTRY_LINE.test(l));
    if (altLines[0]) alt_a = parseEntryLine(altLines[0]);
    if (altLines[1]) alt_b = parseEntryLine(altLines[1]);
  }

  return { main, alt_a, alt_b };
}

interface TrackAnalysisOpenedArgs {
  source: AnalysisSource;
  fixture: FixtureLite;
  markdown: string | null | undefined;
  altenar_event_id?: string | null;
  altenar_event_url?: string | null;
  credits_balance?: number | null;
}

/**
 * Evento "ia_tipster_analysis_opened" — disparado quando o lead acessa
 * uma análise gerada. Captura tudo que precisamos pra entender:
 *   - Em que campeonato ele joga
 *   - Que mercados ele consome
 *   - Faixa de odd que escolhe
 *   - Chat vs Ao Vivo
 */
export function trackAnalysisOpened(args: TrackAnalysisOpenedArgs): void {
  const parsed = parseAnalysisMarkdown(args.markdown);
  trackEvent("ia_tipster_analysis_opened", {
    source: args.source,
    fixture_id: args.fixture.fixture_id ?? null,
    home: args.fixture.home ?? null,
    away: args.fixture.away ?? null,
    league_id: args.fixture.league_id ?? null,
    league_name: args.fixture.league_name ?? null,
    league_country: args.fixture.league_country ?? null,
    main_market: parsed.main?.market ?? null,
    main_odd: parsed.main?.odd ?? null,
    alt_a_market: parsed.alt_a?.market ?? null,
    alt_a_odd: parsed.alt_a?.odd ?? null,
    alt_b_market: parsed.alt_b?.market ?? null,
    alt_b_odd: parsed.alt_b?.odd ?? null,
    credits_balance: args.credits_balance ?? null,
    altenar_event_id: args.altenar_event_id ?? null,
    has_altenar_link: !!args.altenar_event_url,
  });
}

interface TrackEsportivaOpenedArgs {
  source: AnalysisSource;
  fixture: FixtureLite;
  markdown: string | null | undefined;
  altenar_event_id?: string | null;
  altenar_event_url?: string | null;
}

/**
 * Evento existente "ia_tipster_open_esportiva", agora enriquecido com
 * mercado/liga/times. Mantém o mesmo event_name pra não quebrar relatórios
 * já existentes — só amplia o metadata.
 */
export function trackEsportivaOpened(args: TrackEsportivaOpenedArgs): void {
  const parsed = parseAnalysisMarkdown(args.markdown);
  trackEvent("ia_tipster_open_esportiva", {
    source: args.source,
    mode: args.altenar_event_url ? "event_specific" : "fallback_home",
    altenar_event_id: args.altenar_event_id ?? null,
    fixture_id: args.fixture.fixture_id ?? null,
    home: args.fixture.home ?? null,
    away: args.fixture.away ?? null,
    league_id: args.fixture.league_id ?? null,
    league_name: args.fixture.league_name ?? null,
    league_country: args.fixture.league_country ?? null,
    main_market: parsed.main?.market ?? null,
    main_odd: parsed.main?.odd ?? null,
  });
}
