import { describe, it, expect } from "vitest";
import {
  CSV_HEADERS,
  serializeTip,
  serializeBatch,
  parseCSV,
  normalizeRow,
  inferCategoria,
  formatDateForExport,
  dedupKey,
  parseDateInput,
  type ExportableTip,
} from "./csvExportImport";

const sample: ExportableTip = {
  date: "2026-02-26",
  starts_at: "2026-02-26T20:00:00",
  team1_name: "Colo-Colo",
  team2_name: "Universidad de Chile",
  tier_required: "ultra",
  addon_required: "alavancagem",
  feature_required: "alavancagem",
  odd: 1.85,
  condition_to_win: "Más de 1.5 goles",
  market: "Over/Under",
  category_explanation: "Explicación",
  justification: "Ambos llegan en racha",
};

describe("inferCategoria", () => {
  it("reconstrói 'alavancagem' a partir de ultra + addon", () => {
    expect(
      inferCategoria({ tier_required: "ultra", addon_required: "alavancagem", feature_required: "alavancagem" })
    ).toBe("alavancagem");
  });

  it("reconstrói 'free' quando nada está setado", () => {
    expect(inferCategoria({ tier_required: "free", addon_required: null, feature_required: null })).toBe("free");
  });

  it("reconstrói 'basico' a partir de basic + odds_safes", () => {
    expect(
      inferCategoria({ tier_required: "basic", addon_required: null, feature_required: "odds_safes" })
    ).toBe("basico");
  });

  it("fallback no tier quando não há match", () => {
    expect(
      inferCategoria({ tier_required: "pro", addon_required: "inexistente", feature_required: null })
    ).toBe("pro");
  });
});

describe("formatDateForExport", () => {
  it("formata starts_at ISO em local ISO sem Z", () => {
    expect(formatDateForExport("2026-02-26T20:00:00", "2026-02-26")).toBe("2026-02-26T20:00:00");
  });

  it("preserva HH:MM se segundos faltam", () => {
    expect(formatDateForExport("2026-02-26T20:00", "2026-02-26")).toBe("2026-02-26T20:00:00");
  });

  it("usa date com 00:00:00 quando starts_at é null", () => {
    expect(formatDateForExport(null, "2026-02-26")).toBe("2026-02-26T00:00:00");
  });

  it("retorna vazio quando ambos null", () => {
    expect(formatDateForExport(null, null)).toBe("");
  });
});

describe("serializeTip", () => {
  it("gera uma linha com 9 colunas na ordem do CSV_HEADERS", () => {
    const line = serializeTip(sample);
    const cols = line.split('","');
    expect(cols.length).toBe(CSV_HEADERS.length);
  });

  it("escapa aspas duplas dentro de campos", () => {
    const tip = { ...sample, justification: 'Ele disse "vai dar"' };
    const line = serializeTip(tip);
    expect(line).toContain('"Ele disse ""vai dar"""');
  });

  it("preserva vírgulas em campos via aspas", () => {
    const tip = { ...sample, justification: "linha, com vírgula" };
    const line = serializeTip(tip);
    expect(line).toContain('"linha, com vírgula"');
  });
});

describe("serializeBatch", () => {
  it("retorna BOM + apenas header quando array vazio", () => {
    const csv = serializeBatch([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const noBom = csv.replace(/^﻿/, "");
    expect(noBom.split("\n").length).toBe(1);
  });

  it("retorna BOM + header + N linhas pra N tips", () => {
    const csv = serializeBatch([sample, sample, sample]);
    const noBom = csv.replace(/^﻿/, "");
    expect(noBom.split("\n").length).toBe(4);
  });

  it("primeiro caractere é sempre BOM", () => {
    expect(serializeBatch([sample]).charCodeAt(0)).toBe(0xfeff);
  });
});

describe("parseCSV", () => {
  it("detecta separador vírgula", () => {
    const csv = `a,b\n1,2`;
    const rows = parseCSV(csv);
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("detecta separador ponto e vírgula quando não há vírgula no header", () => {
    const csv = `a;b\n1;2`;
    const rows = parseCSV(csv);
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("respeita aspas com vírgula interna", () => {
    const csv = `a,b\n"hello, world","x"`;
    const rows = parseCSV(csv);
    expect(rows[0]).toEqual({ a: "hello, world", b: "x" });
  });

  it("respeita aspas duplas escapadas", () => {
    const csv = `a,b\n"Ele disse ""oi""","x"`;
    const rows = parseCSV(csv);
    expect(rows[0].a).toBe('Ele disse "oi"');
  });

  it("ignora linhas vazias", () => {
    const csv = `a,b\n1,2\n\n3,4\n`;
    const rows = parseCSV(csv);
    expect(rows.length).toBe(2);
  });

  it("remove BOM se presente", () => {
    const csv = `﻿a,b\n1,2`;
    const rows = parseCSV(csv);
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("normaliza headers para snake_case lowercase", () => {
    const csv = `Data Hora,TIME1\n2026-01-01T20:00:00,Colo`;
    const rows = parseCSV(csv);
    expect(Object.keys(rows[0])).toEqual(["data_hora", "time1"]);
  });
});

describe("parseDateInput", () => {
  it("aceita formato BR DD/MM/YYYY HH:MM", () => {
    const r = parseDateInput("26/02/2026 20:00");
    expect(r.date).toBe("2026-02-26");
    expect(r.starts_at).toMatch(/^2026-02-26T20:00:00/);
  });

  it("aceita ISO YYYY-MM-DDTHH:MM:SS", () => {
    const r = parseDateInput("2026-02-26T20:00:00");
    expect(r.date).toBe("2026-02-26");
    expect(r.starts_at).toBe("2026-02-26T20:00:00");
  });

  it("aceita ISO sem segundos", () => {
    const r = parseDateInput("2026-02-26T20:00");
    expect(r.date).toBe("2026-02-26");
    expect(r.starts_at).toBe("2026-02-26T20:00:00");
  });

  it("retorna vazio pra input inválido", () => {
    const r = parseDateInput("não é data");
    expect(r.date).toBe("");
    expect(r.starts_at).toBe("");
  });
});

describe("round-trip (serialize → parse → normalize)", () => {
  it("preserva todos os campos críticos em uma única tip", () => {
    const csv = serializeBatch([sample]);
    const rows = parseCSV(csv);
    expect(rows.length).toBe(1);
    const norm = normalizeRow(rows[0]);
    expect(norm.date).toBe("2026-02-26");
    expect(norm.starts_at).toBe("2026-02-26T20:00:00");
    expect(norm.team1_name).toBe("Colo-Colo");
    expect(norm.team2_name).toBe("Universidad de Chile");
    expect(norm.categoria).toBe("alavancagem");
    expect(parseFloat(norm.odd)).toBeCloseTo(1.85);
    expect(norm.palpite).toBe("Más de 1.5 goles");
    expect(norm.mercado).toBe("Over/Under");
    expect(norm.explicacao).toBe("Explicación");
    expect(norm.justificativa).toBe("Ambos llegan en racha");
  });

  it("round-trip com 3 tips mantém ordem e contagem", () => {
    const tips = [
      sample,
      { ...sample, team1_name: "Palestino", team2_name: "U Católica", odd: 2.1, tier_required: "free", addon_required: null, feature_required: null },
      { ...sample, team1_name: "Audax", team2_name: "O'Higgins", odd: 1.5, tier_required: "pro", addon_required: null, feature_required: "odds_pro" },
    ];
    const csv = serializeBatch(tips);
    const rows = parseCSV(csv).map(normalizeRow);
    expect(rows.length).toBe(3);
    expect(rows[0].categoria).toBe("alavancagem");
    expect(rows[1].categoria).toBe("free");
    expect(rows[2].categoria).toBe("pro");
    expect(rows[2].team2_name).toBe("O'Higgins");
  });

  it("não vaza team_logo_url no CSV — escudos resolvem no destino", () => {
    const csv = serializeBatch([sample]);
    expect(csv).not.toContain("logo");
    expect(csv).not.toContain("supabase.co/storage");
  });
});

describe("dedupKey", () => {
  it("gera mesma chave pra mesmo jogo independente de capitalização", () => {
    const a = dedupKey({ date: "2026-02-26", team1_name: "Colo-Colo", team2_name: "U de Chile", odd: 1.85, palpite: "Más de 1.5" });
    const b = dedupKey({ date: "2026-02-26", team1_name: "colo-colo", team2_name: "U DE CHILE", odd: 1.85, palpite: "más de 1.5" });
    expect(a).toBe(b);
  });

  it("gera chaves diferentes pra odds diferentes", () => {
    const a = dedupKey({ date: "2026-02-26", team1_name: "A", team2_name: "B", odd: 1.85, palpite: "x" });
    const b = dedupKey({ date: "2026-02-26", team1_name: "A", team2_name: "B", odd: 2.10, palpite: "x" });
    expect(a).not.toBe(b);
  });

  it("aceita odd como número ou string", () => {
    const a = dedupKey({ date: "2026-02-26", team1_name: "A", team2_name: "B", odd: 1.85, palpite: "x" });
    const b = dedupKey({ date: "2026-02-26", team1_name: "A", team2_name: "B", odd: "1.85", palpite: "x" });
    expect(a).toBe(b);
  });
});
