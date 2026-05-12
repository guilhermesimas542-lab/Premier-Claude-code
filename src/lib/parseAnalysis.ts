// src/lib/parseAnalysis.ts
//
// Parser robusto que reconhece 3 gerações de formato da IA Tipster:
// 1. Moderno (Fase 7a.6+): 🎯 ENTRADA PRINCIPAL → ⚡ ALTERNATIVAS → 📋 RESUMO → 🔍 CONTEXTO → ⏱️
// 2. Fire (Fase 7a.4):    🔥 abertura → 🎯 ENTRADA PRINCIPAL → ⚡ ALTERNATIVAS → 🔍 CONTEXTO → ⏱️
// 3. Pre-emoji (legado):  lead em prosa → **Entrada principal** → **Alternativas** → resto
// 4. Fallback final:      markdown bruto inteiro vai pro card "Resumo"

export interface ParsedAnalysis {
  entrada: string;
  alternativas: string;
  resumo: string;
  contexto: string;
  footer: string;
}

const EMPTY: ParsedAnalysis = {
  entrada: "",
  alternativas: "",
  resumo: "",
  contexto: "",
  footer: "",
};

function extractSection(
  markdown: string,
  startPattern: RegExp,
  endPatterns: RegExp[]
): string {
  const startMatch = markdown.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return "";

  const startIdx = startMatch.index + startMatch[0].length;
  const remaining = markdown.slice(startIdx);

  let endIdx = remaining.length;
  for (const pattern of endPatterns) {
    const endMatch = remaining.match(pattern);
    if (endMatch && endMatch.index !== undefined && endMatch.index < endIdx) {
      endIdx = endMatch.index;
    }
  }

  return remaining.slice(0, endIdx).trim();
}

// 1. Formato moderno (emojis padronizados)
function parseModern(markdown: string): ParsedAnalysis {
  const entradaMarker = /🎯\s*ENTRADA PRINCIPAL\s*\n/i;
  const alternativasMarker = /⚡\s*ALTERNATIVAS\s*\n/i;
  const resumoMarker = /📋\s*RESUMO\s*\n/i;
  const contextoMarker = /🔍\s*CONTEXTO\s*\n/i;
  const footerMarker = /⏱️/;

  const allEnds = [
    entradaMarker,
    alternativasMarker,
    resumoMarker,
    contextoMarker,
    footerMarker,
  ];

  return {
    entrada: extractSection(markdown, entradaMarker, allEnds),
    alternativas: extractSection(markdown, alternativasMarker, allEnds),
    resumo: extractSection(markdown, resumoMarker, allEnds),
    contexto: extractSection(markdown, contextoMarker, allEnds),
    footer: extractSection(markdown, footerMarker, allEnds),
  };
}

// 2. Formato 🔥 (Fase 7a.4)
function parseFire(markdown: string): ParsedAnalysis {
  const aberturaMarker = /🔥[^\n]*\n/;
  const entradaMarker = /🎯\s*ENTRADA PRINCIPAL\s*\n/i;
  const alternativasMarker = /⚡\s*ALTERNATIVAS\s*\n/i;
  const contextoMarker = /🔍\s*CONTEXTO\s*\n/i;
  const footerMarker = /⏱️/;

  const allEnds = [
    aberturaMarker,
    entradaMarker,
    alternativasMarker,
    contextoMarker,
    footerMarker,
  ];

  return {
    entrada: extractSection(markdown, entradaMarker, allEnds),
    alternativas: extractSection(markdown, alternativasMarker, allEnds),
    resumo: extractSection(markdown, aberturaMarker, allEnds),
    contexto: extractSection(markdown, contextoMarker, allEnds),
    footer: extractSection(markdown, footerMarker, allEnds),
  };
}

// 3. Formato pre-emoji (Galo × Mirassol case)
function parsePreEmoji(markdown: string): ParsedAnalysis {
  const entradaMarker = /\*\*Entrada principal\*\*\s*\n/i;
  const alternativasMarker = /\*\*Alternativas\*\*\s*\n/i;

  const entradaMatch = markdown.match(entradaMarker);
  if (!entradaMatch || entradaMatch.index === undefined) return EMPTY;

  const lead = markdown.slice(0, entradaMatch.index).trim();

  const entrada = extractSection(markdown, entradaMarker, [
    entradaMarker,
    alternativasMarker,
  ]);

  let alternativas = "";
  let contexto = "";

  const altMatch = markdown.match(alternativasMarker);
  if (altMatch && altMatch.index !== undefined) {
    const afterAlt = markdown.slice(altMatch.index + altMatch[0].length);
    const nextBlock = afterAlt.match(/\n\n[A-ZÀ-Ú]/);
    if (nextBlock && nextBlock.index !== undefined) {
      alternativas = afterAlt.slice(0, nextBlock.index).trim();
      contexto = afterAlt.slice(nextBlock.index).trim();
    } else {
      alternativas = afterAlt.trim();
    }
  }

  return {
    entrada,
    alternativas,
    resumo: lead,
    contexto,
    footer: "",
  };
}

function hasContent(p: ParsedAnalysis): boolean {
  return !!(p.entrada || p.alternativas || p.resumo);
}

export function parseAnalysis(markdown: string | null | undefined): ParsedAnalysis {
  if (!markdown || typeof markdown !== "string") return EMPTY;
  const trimmed = markdown.trim();
  if (!trimmed) return EMPTY;

  const modern = parseModern(trimmed);
  if (hasContent(modern)) return modern;

  const fire = parseFire(trimmed);
  if (hasContent(fire)) return fire;

  const preEmoji = parsePreEmoji(trimmed);
  if (hasContent(preEmoji)) return preEmoji;

  // Fallback final: joga markdown todo no resumo (último recurso)
  return {
    entrada: "",
    alternativas: "",
    resumo: trimmed,
    contexto: "",
    footer: "",
  };
}
