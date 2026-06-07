/**
 * Helpers para importação de listas de email/telefone em audiências estáticas.
 * Puro client-side — sem dependência de Supabase aqui.
 */
import { normalizeBrazilMobile } from "./normalizePhone";


export interface ImportedRow {
  email: string | null;
  phone: string | null;
  /** Linha original (debug / mostrar erro). */
  source: string;
}

export interface ImportParseResult {
  rows: ImportedRow[];
  total_lines: number;
  ignored_empty: number;
  ignored_invalid: number;
  ignored_duplicate: number;
  ignored_header: boolean;
  /** Mensagens de erro/aviso pra mostrar ao usuário. */
  warnings: string[];
}

export const IMPORT_LIMIT_MAX = 10_000;

const EMAIL_REGEX = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

/**
 * Detecta se a string parece um email válido.
 */
export function isEmail(s: string): boolean {
  return EMAIL_REGEX.test(s.trim());
}

/**
 * Normaliza email: trim + lowercase.
 */
export function normalizeEmail(s: string): string | null {
  const v = s.trim().toLowerCase();
  return isEmail(v) ? v : null;
}

/**
 * Normaliza telefone BR pro formato exigido pelo SMS Dev:
 * 55 + DDD + 9 + 8 dígitos (13 dígitos). Insere o 9 se faltar,
 * remove DDI duplicado, zero trunk e máscaras. Retorna null se inválido.
 */
export function normalizePhone(s: string): string | null {
  const r = normalizeBrazilMobile(s);
  return r.ok ? r.phone : null;
}



/**
 * Verifica se uma string é um cabeçalho (heurística): contém palavras-chave
 * típicas de header de planilha.
 */
function looksLikeHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return /\b(email|e[-_]?mail|phone|telefone|celular|whatsapp)\b/.test(lower);
}

/**
 * Parseia o texto colado pelo usuário.
 *
 * Aceita:
 *   - 1 valor por linha (email OU telefone)
 *   - 2 valores separados por vírgula, ponto-e-vírgula, tab ou pipe
 *   - Detecta automaticamente qual coluna é email (tem @) e qual é phone
 *   - Pula linha de cabeçalho se a primeira linha parecer header
 *
 * Faz dedupe interno (por email e por phone), valida formato, e respeita o
 * limite máximo IMPORT_LIMIT_MAX.
 */
export function parseImportText(raw: string): ImportParseResult {
  const result: ImportParseResult = {
    rows: [],
    total_lines: 0,
    ignored_empty: 0,
    ignored_invalid: 0,
    ignored_duplicate: 0,
    ignored_header: false,
    warnings: [],
  };

  if (!raw || !raw.trim()) {
    result.warnings.push("Cole pelo menos um email ou telefone.");
    return result;
  }

  const lines = raw.split(/\r?\n/);
  result.total_lines = lines.length;

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      result.ignored_empty++;
      return;
    }

    // Heurística de header: só na primeira linha não-vazia
    if (idx === 0 && looksLikeHeader(line)) {
      result.ignored_header = true;
      return;
    }

    const parts = line
      .split(/[,;|\t]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    let email: string | null = null;
    let phone: string | null = null;

    for (const part of parts) {
      const maybeEmail = normalizeEmail(part);
      if (maybeEmail && !email) {
        email = maybeEmail;
        continue;
      }
      const maybePhone = normalizePhone(part);
      if (maybePhone && !phone) {
        phone = maybePhone;
      }
    }

    if (!email && !phone) {
      result.ignored_invalid++;
      return;
    }

    // Dedupe — se email já vimos, ignora a linha inteira
    if (email && seenEmails.has(email)) {
      result.ignored_duplicate++;
      return;
    }
    if (phone && seenPhones.has(phone)) {
      result.ignored_duplicate++;
      return;
    }

    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);

    result.rows.push({ email, phone, source: line });
  });

  if (result.rows.length > IMPORT_LIMIT_MAX) {
    const extra = result.rows.length - IMPORT_LIMIT_MAX;
    result.rows = result.rows.slice(0, IMPORT_LIMIT_MAX);
    result.warnings.push(
      `Limite de ${IMPORT_LIMIT_MAX.toLocaleString("pt-BR")} contatos por lista. ${extra.toLocaleString("pt-BR")} linhas a mais foram ignoradas.`
    );
  }

  if (result.rows.length === 0) {
    result.warnings.push(
      "Nenhuma linha válida foi identificada. Cada linha deve conter um email (com @) ou telefone."
    );
  }

  return result;
}

/**
 * Resumo curto pra mostrar no preview do modal.
 */
export function summarizeParse(p: ImportParseResult): string {
  const parts: string[] = [];
  parts.push(`${p.rows.length.toLocaleString("pt-BR")} válidos`);
  if (p.ignored_empty > 0) parts.push(`${p.ignored_empty} vazios`);
  if (p.ignored_invalid > 0) parts.push(`${p.ignored_invalid} inválidos`);
  if (p.ignored_duplicate > 0) parts.push(`${p.ignored_duplicate} duplicados`);
  if (p.ignored_header) parts.push(`cabeçalho ignorado`);
  return parts.join(" · ");
}
