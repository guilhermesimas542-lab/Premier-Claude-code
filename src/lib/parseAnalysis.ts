export interface AnalysisSections {
  opening: string;
  entrada: string;
  alternativas: string;
  contexto: string;
  footer: string;
}

/**
 * Parser do markdown emitido pelo Claude (ai-chat-tip e ai-live-tip)
 * O formato esperado:
 *   🔥 [abertura...]
 *   🎯 **ENTRADA PRINCIPAL** [conteúdo...]
 *   ⚡ **ALTERNATIVAS** [bullets...]
 *   🔍 **CONTEXTO** [conteúdo...]
 *   ⏱️ [rodapé...]
 *
 * Os headers (🎯, ⚡, 🔍) não entram na seção — o card renderiza seu próprio header.
 * O 🔥 e o ⏱️ ficam dentro da string (renderizados como parte do conteúdo).
 */
export function parseAnalysis(markdown: string): AnalysisSections {
  const empty: AnalysisSections = {
    opening: "",
    entrada: "",
    alternativas: "",
    contexto: "",
    footer: "",
  };
  if (!markdown) return empty;

  const lines = markdown.split("\n");
  const buffers: Record<keyof AnalysisSections, string[]> = {
    opening: [],
    entrada: [],
    alternativas: [],
    contexto: [],
    footer: [],
  };

  let current: keyof AnalysisSections = "opening";

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("🔥")) {
      current = "opening";
      buffers[current].push(line);
      continue;
    }
    if (trimmed.startsWith("🎯")) {
      current = "entrada";
      // descarta a linha do header — o card tem o próprio header
      continue;
    }
    if (trimmed.startsWith("⚡")) {
      current = "alternativas";
      continue;
    }
    if (trimmed.startsWith("🔍")) {
      current = "contexto";
      continue;
    }
    if (trimmed.startsWith("⏱️")) {
      current = "footer";
      buffers[current].push(line);
      continue;
    }

    buffers[current].push(line);
  }

  return {
    opening: buffers.opening.join("\n").trim(),
    entrada: buffers.entrada.join("\n").trim(),
    alternativas: buffers.alternativas.join("\n").trim(),
    contexto: buffers.contexto.join("\n").trim(),
    footer: buffers.footer.join("\n").trim(),
  };
}
