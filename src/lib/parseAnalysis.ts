export interface AnalysisSections {
  entrada: string;
  alternativas: string;
  resumo: string;
  contexto: string;
  footer: string;
}

/**
 * Parser do markdown emitido pelo Claude (ai-chat-tip e ai-live-tip).
 *
 * Marcadores reconhecidos:
 *   🎯 → entrada principal
 *   ⚡ → alternativas
 *   📋 → resumo (formato novo)
 *   🔥 → resumo (formato legado: caches gerados antes da Fase 7a.6)
 *   🔍 → contexto
 *   ⏱️ → rodapé
 *
 * Linhas de cabeçalho (com emoji marcador) NÃO entram no conteúdo —
 * o componente TipAnalysis renderiza seu próprio header por card.
 * Exceção: a linha do rodapé (⏱️) entra como conteúdo, porque é só uma frase.
 */
export function parseAnalysis(markdown: string): AnalysisSections {
  const empty: AnalysisSections = {
    entrada: "",
    alternativas: "",
    resumo: "",
    contexto: "",
    footer: "",
  };
  if (!markdown) return empty;

  const lines = markdown.split("\n");
  const buffers: Record<keyof AnalysisSections, string[]> = {
    entrada: [],
    alternativas: [],
    resumo: [],
    contexto: [],
    footer: [],
  };

  // Conteúdo antes de qualquer marcador é descartado (raro acontecer,
  // mas garante que texto solto no início não polua o resumo).
  let current: keyof AnalysisSections | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("🎯")) {
      current = "entrada";
      continue;
    }
    if (trimmed.startsWith("⚡")) {
      current = "alternativas";
      continue;
    }
    if (trimmed.startsWith("📋") || trimmed.startsWith("🔥")) {
      current = "resumo";
      // Em formato legado (🔥), a linha já contém o texto da abertura
      // logo após o emoji. Captura esse texto também.
      if (trimmed.startsWith("🔥")) {
        const remainder = trimmed.slice(2).trim();
        if (remainder) buffers.resumo.push(remainder);
      }
      continue;
    }
    if (trimmed.startsWith("🔍")) {
      current = "contexto";
      continue;
    }
    if (trimmed.startsWith("⏱️")) {
      current = "footer";
      buffers.footer.push(line);
      continue;
    }

    if (current) {
      buffers[current].push(line);
    }
  }

  return {
    entrada: buffers.entrada.join("\n").trim(),
    alternativas: buffers.alternativas.join("\n").trim(),
    resumo: buffers.resumo.join("\n").trim(),
    contexto: buffers.contexto.join("\n").trim(),
    footer: buffers.footer.join("\n").trim(),
  };
}
