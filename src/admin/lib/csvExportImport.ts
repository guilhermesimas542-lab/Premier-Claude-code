// Formato canônico CSV pra export/import de odds (tips).
// Mesmos headers servem nos dois sentidos — round-trip Chile↔Espanha sem retrabalho.
// O acoplamento entre tip e escudo é pelo NOME do time (teams.name); o destino
// resolve o logo_url a partir da própria tabela teams — URLs nunca cruzam projetos.

export const CSV_HEADERS = [
  "data_hora",
  "time1",
  "time2",
  "categoria",
  "odd",
  "palpite",
  "mercado",
  "explicacao",
  "justificativa",
] as const;

// Mapeia categoria (chave) → tier_required + addon_required + feature_required.
// Espelho exato do que AdminTipsImport e AdminTipsCreate usam.
export const CATEGORIA_MAP: Record<
  string,
  { tier: string; addon: string | null; feature: string | null }
> = {
  free:                 { tier: "free",  addon: null,             feature: null },
  basico:               { tier: "basic", addon: null,             feature: "odds_safes" },
  basic:                { tier: "basic", addon: null,             feature: "odds_safes" },
  pro:                  { tier: "pro",   addon: null,             feature: "odds_pro" },
  ultra:                { tier: "ultra", addon: null,             feature: "odds_pro" },
  premium:              { tier: "pro",   addon: null,             feature: "odds_pro" },
  alavancagem:          { tier: "ultra", addon: "alavancagem",    feature: "alavancagem" },
  multiplas_bingo:      { tier: "ultra", addon: "multiplas_bingo", feature: "multiplas_bingo" },
  mercados_secundarios: { tier: "ultra", addon: null,             feature: "mercados_secundarios" },
  esportes_americanos:  { tier: "ultra", addon: null,             feature: "esportes_americanos" },
  odds_ultra:           { tier: "ultra", addon: null,             feature: "odds_ultra" },
};

/** Entrada de tip pra serializar (subset de content_entries). */
export interface ExportableTip {
  date: string | null;
  starts_at: string | null;
  team1_name: string | null;
  team2_name: string | null;
  tier_required: string | null;
  addon_required: string | null;
  feature_required: string | null;
  odd: number | null;
  condition_to_win: string | null;
  market: string | null;
  category_explanation: string | null;
  justification: string | null;
}

/** Resultado do parse, pronto pra payload do importer. */
export interface ParsedTipRow {
  date: string;
  starts_at: string;
  team1_name: string;
  team2_name: string;
  categoria: string;
  odd: string;
  palpite: string;
  mercado: string;
  explicacao: string;
  justificativa: string;
}

// --- Serialização (export) ---

/** Reconstrói a chave da categoria a partir do trio tier/addon/feature. */
export function inferCategoria(t: {
  tier_required?: string | null;
  addon_required?: string | null;
  feature_required?: string | null;
}): string {
  const tier = t.tier_required ?? "free";
  const addon = t.addon_required ?? null;
  const feature = t.feature_required ?? null;

  // procura match exato no map
  for (const [key, val] of Object.entries(CATEGORIA_MAP)) {
    if (val.tier === tier && val.addon === addon && val.feature === feature) {
      return key;
    }
  }
  // fallback: se nenhum match, devolve o tier (importer reaplica como "free" se inválido)
  return tier;
}

/** Formata data pra ISO local sem timezone shift (`YYYY-MM-DDTHH:MM:SS`). */
export function formatDateForExport(starts_at: string | null, date: string | null): string {
  // DIA canônico = campo `date` (o dia ao qual a tip pertence). A HORA vem de
  // starts_at só como referência. Isso evita que o dia desloque por fuso
  // (ex.: jogo de hoje à noite cujo starts_at em UTC já é madrugada de amanhã).
  let time = "00:00:00";
  if (starts_at) {
    const m = String(starts_at).match(/[T ](\d{2}:\d{2})(:\d{2})?/);
    if (m) time = `${m[1]}${m[2] || ":00"}`;
  }
  const day =
    date && /^\d{4}-\d{2}-\d{2}/.test(date)
      ? date.slice(0, 10)
      : starts_at
        ? String(starts_at).slice(0, 10)
        : "";
  return day ? `${day}T${time}` : "";
}

function escapeCSVCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Sempre envolver em aspas pra ser conservador (lida com `,`, `;`, `"`, `\n`)
  return `"${s.replace(/"/g, '""')}"`;
}

/** Serializa uma tip em uma linha CSV (sem newline final). */
export function serializeTip(t: ExportableTip): string {
  const cells = [
    formatDateForExport(t.starts_at, t.date),
    t.team1_name ?? "",
    t.team2_name ?? "",
    inferCategoria(t),
    t.odd != null ? String(t.odd) : "",
    t.condition_to_win ?? "",
    t.market ?? "",
    t.category_explanation ?? "",
    t.justification ?? "",
  ];
  return cells.map(escapeCSVCell).join(",");
}

/** Serializa um batch: BOM + header + N linhas, separadas por \n. */
export function serializeBatch(tips: ExportableTip[]): string {
  const header = CSV_HEADERS.map(escapeCSVCell).join(",");
  const body = tips.map(serializeTip).join("\n");
  const csv = body ? `${header}\n${body}` : header;
  return `﻿${csv}`;
}

// --- Parsing (import) ---

/** Parse de uma linha CSV respeitando aspas e o separador detectado. */
function parseCSVLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQuotes = false; continue; }
      cur += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === sep) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Parseia o CSV inteiro em objetos chave→valor. Auto-detecta separador `,` ou `;`. */
export function parseCSV(text: string): Record<string, string>[] {
  // remove BOM se presente
  const clean = text.replace(/^﻿/, "").trim();
  if (!clean) return [];
  const firstLine = clean.split(/\r?\n/)[0];
  const sep = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const lines = clean.split(/\r?\n/);
  const headers = parseCSVLine(lines[0], sep).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_")
  );
  return lines
    .slice(1)
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const cols = parseCSVLine(l, sep);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] ?? "";
      });
      return row;
    });
}

/** Converte um data_hora em pares (date, starts_at ISO). Aceita BR e ISO. */
export function parseDateInput(raw: string): { date: string; starts_at: string } {
  let cleaned = (raw || "").trim();
  if (!cleaned) return { date: "", starts_at: "" };

  const brMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})(?::\d{2})?$/);
  if (brMatch) {
    const [, dd, mm, yyyy, time] = brMatch;
    cleaned = `${yyyy}-${mm}-${dd}T${time}:00`;
  }
  const normalized = cleaned.includes("T") ? cleaned : cleaned.replace(" ", "T");
  const dt = new Date(normalized);
  if (isNaN(dt.getTime())) return { date: "", starts_at: "" };

  // mantém local — usa o YYYY-MM-DD do input quando ISO sem Z
  const dateMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  const dateOnly = dateMatch ? dateMatch[1] : dt.toISOString().split("T")[0];
  // starts_at: se o input já tinha Z/offset, usa toISOString; senão, devolve como veio + ":00" se faltar segundos
  const isoLike = /Z|[+-]\d{2}:?\d{2}$/.test(normalized)
    ? dt.toISOString()
    : normalized.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      ? `${normalized}:00`
      : normalized;
  return { date: dateOnly, starts_at: isoLike };
}

/** Transforma uma row crua do parseCSV em ParsedTipRow normalizada. */
export function normalizeRow(r: Record<string, string>): ParsedTipRow {
  const rawDate = r.data_hora || r.date || r.data || "";
  const { date, starts_at } = parseDateInput(rawDate);
  return {
    date,
    starts_at,
    team1_name: r.time1 || r.team1_name || r.team1 || "",
    team2_name: r.time2 || r.team2_name || r.team2 || "",
    categoria: (r.categoria || r.category || "free").toLowerCase(),
    odd: r.odd || "",
    palpite: r.palpite || r.condition_to_win || "",
    mercado: r.mercado || r.market || "",
    explicacao: r.explicacao || r.mercado_explicacao || r.category_explanation || "",
    justificativa: r.justificativa || r.justification || "",
  };
}

/** Chave canônica pra detecção de duplicatas (case-insensitive nos textos). */
export function dedupKey(t: {
  date: string;
  team1_name: string;
  team2_name: string;
  odd: string | number;
  condition_to_win?: string | null;
  palpite?: string | null;
}): string {
  const oddNum = typeof t.odd === "number" ? t.odd : parseFloat(t.odd || "0");
  const palpite = (t.condition_to_win ?? t.palpite ?? "").trim().toLowerCase();
  return [
    t.date,
    t.team1_name.trim().toLowerCase(),
    t.team2_name.trim().toLowerCase(),
    isNaN(oddNum) ? "0" : oddNum.toFixed(2),
    palpite,
  ].join("|");
}
