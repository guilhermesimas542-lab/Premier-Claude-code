import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { refreshCreditBalance } from "@/hooks/useCreditBalance";
import { refreshAiTipsterStatus } from "@/hooks/useAiTipsterStatus";

const SESSION_KEY = "ia_tipster_chat_messages_v1";

export interface DisambiguationMatch {
  fixture_id: number;
  home: string;
  away: string;
  league: string;
  kickoff_at: string;
  kickoff_label: string;
  score?: number;
}

export interface CombinedMarket {
  market: string;
  selection: string;
  odd: number;
  reason?: string;
}

export interface CombinedTip {
  bet_type_label: string;
  intro: string;
  markets: CombinedMarket[];
  total_odd: number;
  probability: number;
}

export interface ChatTipResponse {
  cached: boolean;
  tip_cache_id: string;
  credit_source: string;
  content: { markdown: string; combined?: CombinedTip };
  source_data: any;
  generated_at: string;
}

export interface UpcomingMatch {
  fixture_id: number;
  home: string;
  away: string;
  league: string;
  kickoff_at: string;
  kickoff_label: string;
}

export type ChatMessage =
  | { id: string; role: "user"; content: string; createdAt: number }
  | { id: string; role: "bot"; type: "text"; content: string; createdAt: number }
  | { id: string; role: "bot"; type: "loading"; label: string; createdAt: number }
  | { id: string; role: "bot"; type: "disambiguation"; matches: DisambiguationMatch[]; confidence: "high" | "medium"; createdAt: number }
  | { id: string; role: "bot"; type: "upcoming_list"; matches: UpcomingMatch[]; listType: "team" | "league"; teamId: number | null; leagueIds: number[] | null; originalQuery: string; createdAt: number }
  | { id: string; role: "bot"; type: "tip"; tipCacheId: string; markdown: string; sourceData: any; combined?: CombinedTip; cached: boolean; createdAt: number }
  | { id: string; role: "bot"; type: "bet_type_selector"; fixtureId: number; label: string; createdAt: number }
  | { id: string; role: "bot"; type: "error"; message: string; createdAt: number };

function genId(): string {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}


export function useChatTipster() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as ChatMessage[];
      // drop any orphaned loading messages from previous session
      return parsed.filter((m) => !(m.role === "bot" && (m as any).type === "loading"));
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const lastQueryRef = useRef<string>("");

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Error ao persistir chat", e);
    }
  }, [messages]);

  const append = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const removeLoading = useCallback(() => {
    setMessages((prev) => prev.filter((m) => !(m.role === "bot" && m.type === "loading")));
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }, []);

  const rejectMatch = useCallback(async (fixtureIds?: number[]) => {
    const query = lastQueryRef.current;
    if (query && fixtureIds && fixtureIds.length > 0) {
      try {
        await invokeWithAuth("ai-reject-fixture", {
          body: { query, fixture_ids: fixtureIds },
        });
      } catch (e) {
        console.warn("failed to register rejection", e);
      }
    }
    append({
      id: genId(),
      role: "bot",
      type: "text",
      content: "Dale, ¿qué partido entonces? Puedes escribir los dos equipos o solo el nombre de uno.",
      createdAt: Date.now(),
    });
  }, [append]);

  const sendQuery = useCallback(async (text: string) => {
    if (!text.trim() || busy) return;
    lastQueryRef.current = text.trim();
    setBusy(true);

    append({
      id: genId(),
      role: "user",
      content: text.trim(),
      createdAt: Date.now(),
    });
    append({
      id: genId(),
      role: "bot",
      type: "loading",
      label: "Buscando el partido...",
      createdAt: Date.now(),
    });

    try {
      const { data, error } = await invokeWithAuth("ai-disambiguate-match", {
        body: { query: text.trim() },
      });

      removeLoading();

      if (error) {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: error.message || "Error al buscar partido.",
          createdAt: Date.now(),
        });
        return;
      }

      const status = (data as any)?.status;

      if (status === "found") {
        append({
          id: genId(),
          role: "bot",
          type: "disambiguation",
          matches: (data as any).matches,
          confidence: "high",
          createdAt: Date.now(),
        });
        return;
      }
      if (status === "ambiguous") {
        append({
          id: genId(),
          role: "bot",
          type: "disambiguation",
          matches: (data as any).matches,
          confidence: "medium",
          createdAt: Date.now(),
        });
        return;
      }
      if (status === "league_upcoming" || status === "team_upcoming") {
        const d = data as any;
        const header = status === "league_upcoming"
          ? "Siguientes partidos de la fecha — ¿cuál quieres analizar?"
          : `Siguientes partidos${d.team_name ? ` de ${d.team_name}` : ""} — ¿cuál quieres analizar?`;
        append({
          id: genId(),
          role: "bot",
          type: "text",
          content: header,
          createdAt: Date.now(),
        });
        append({
          id: genId(),
          role: "bot",
          type: "upcoming_list",
          matches: d.matches || [],
          listType: status === "team_upcoming" ? "team" : "league",
          teamId: d.team_id ?? null,
          leagueIds: Array.isArray(d.league_ids) ? d.league_ids : null,
          originalQuery: lastQueryRef.current,
          createdAt: Date.now(),
        });
        return;
      }
      if (status === "past") {
        const m = (data as any).match;
        append({
          id: genId(),
          role: "bot",
          type: "text",
          content: `Ese partido ya ocurrió el ${m?.played_label || "fecha desconocida"}. ${m?.result || ""}\n\nNo hay entrada posible para partidos pasados.`,
          createdAt: Date.now(),
        });
        return;
      }
      if (status === "out_of_window") {
        append({
          id: genId(),
          role: "bot",
          type: "text",
          content: (data as any).message || "Ese partido está fuera de la ventana de análisis (siguientes 15 días).",
          createdAt: Date.now(),
        });
        return;
      }
      append({
        id: genId(),
        role: "bot",
        type: "text",
        content: (data as any)?.message || "No encontré ese partido. ¿Me das más detalles (liga, fecha)?",
        createdAt: Date.now(),
      });
    } catch (err: any) {
      removeLoading();
      append({
        id: genId(),
        role: "bot",
        type: "error",
        message: err?.message || "Error inesperado.",
        createdAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  }, [append, removeLoading, busy]);

  const runAnalysis = useCallback(async (fixtureId: number, label: string, betType: string) => {
    if (busy) return;
    setBusy(true);

    append({
      id: genId(),
      role: "bot",
      type: "loading",
      label: "Analizando el partido...",
      createdAt: Date.now(),
    });

    try {
      const { data, error } = await invokeWithAuth("ai-chat-tip", {
        body: { fixture_id: fixtureId, bet_type: betType },
      });

      removeLoading();

      if (error) {
        const status = (error as any)?.context?.status ?? (error as any)?.status;
        let errorBody: any = null;
        try { errorBody = await (error as any)?.context?.json?.(); } catch {}
        const isDailyCap = status === 429 || /daily_cost_limit_reached/i.test(error.message || "");
        if (status === 503) {
          let msg = errorBody?.message || "Sistema temporalmente no disponible.";
          toast.error("IA Tipster no disponible", { description: msg });
          refreshAiTipsterStatus();
          return;
        }
        if (status === 402) {
          let resetsLabel = "lunes";
          if (errorBody?.resets_at) {
            resetsLabel = new Date(errorBody.resets_at).toLocaleDateString("es-CL", {
              weekday: "short", day: "2-digit", month: "short",
            });
          }
          toast.error("Sin créditos", {
            description: `Usaste todos los créditos de la semana. Se renuevan el ${resetsLabel}.`,
          });
          refreshCreditBalance();
          return;
        }
        if (status === 500 && errorBody?.error === "generation_failed") {
          toast.error("Error temporal", {
            description: errorBody.message || "No pudimos generar el análisis ahora. Tu crédito fue devuelto. Inténtalo de nuevo en unos segundos.",
          });
          refreshCreditBalance();
          return;
        }
        if (status === 400 && errorBody?.error === "fixture_too_far") {
          append({
            id: genId(),
            role: "bot",
            type: "text",
            content: errorBody.message ?? "Ese partido está muy lejos. Vuelve más cerca de la fecha para un análisis preciso.",
            createdAt: Date.now(),
          });
          refreshCreditBalance();
          return;
        }
        if (
          error.message?.includes("non-2xx") ||
          error.message?.includes("FunctionsHttpError") ||
          (error as any).name === "FunctionsHttpError"
        ) {
          toast.error("Error temporal", {
            description: "No pudimos generar el análisis ahora. Inténtalo de nuevo en unos segundos.",
          });
          return;
        }
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: isDailyCap
            ? "⚠️ Análisis IA temporalmente no disponible. Inténtalo de nuevo en unas horas."
            : error.message || "Error al generar análisis.",
          createdAt: Date.now(),
        });
        return;
      }

      const d = data as any;
      if (d?.error === "daily_cost_limit_reached") {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: "⚠️ Análisis IA temporalmente no disponible. Inténtalo de nuevo en unas horas.",
          createdAt: Date.now(),
        });
        return;
      }
      if (d?.error === "insufficient_credits") {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: "No tienes créditos suficientes. Compra créditos o espera el reset diario.",
          createdAt: Date.now(),
        });
        return;
      }
      if (d?.error === "ai_overloaded" || d?.error === "claude_failed") {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: d.message ?? "La IA está sobrecargada. Inténtalo en unos segundos.",
          createdAt: Date.now(),
        });
        return;
      }
      if (d?.error === "fixture_too_far") {
        append({
          id: genId(),
          role: "bot",
          type: "text",
          content: d.message ?? "Ese partido está muy lejos. Vuelve más cerca de la fecha para un análisis preciso.",
          createdAt: Date.now(),
        });
        return;
      }
      if (d?.error) {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: d.message ?? `Error: ${d.error}`,
          createdAt: Date.now(),
        });
        return;
      }

      const tipResp = data as ChatTipResponse;
      append({
        id: genId(),
        role: "bot",
        type: "tip",
        tipCacheId: tipResp.tip_cache_id,
        markdown: tipResp.content.markdown,
        sourceData: tipResp.source_data,
        combined: tipResp.content.combined,
        cached: tipResp.cached,
        createdAt: Date.now(),
      });
      refreshCreditBalance();
    } catch (err: any) {
      removeLoading();
      append({
        id: genId(),
        role: "bot",
        type: "error",
        message: err?.message || "Error inesperado.",
        createdAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  }, [append, removeLoading, busy]);

  const confirmFixture = useCallback(async (fixtureId: number, label: string) => {
    if (busy) return;
    append({
      id: genId(),
      role: "user",
      content: `Sí, es este: ${label}`,
      createdAt: Date.now(),
    });
    append({
      id: genId(),
      role: "bot",
      type: "bet_type_selector",
      fixtureId,
      label,
      createdAt: Date.now(),
    });
  }, [append, busy]);

  /**
   * Re-exibe o seletor de tipo de entrada para o MESMO jogo, sem refazer
   * a busca/desambiguação. Usado pelo botão "Cambiar tipo de entrada" no
   * output: dá um append de uma nova msg bet_type_selector com o mesmo
   * fixtureId/label, mantendo o fluxo aditivo.
   */
  const changeBetType = useCallback((fixtureId: number, label: string) => {
    append({
      id: genId(),
      role: "bot",
      type: "text",
      content: "Dale, elige otro tipo de entrada para el mismo partido.",
      createdAt: Date.now(),
    });
    append({
      id: genId(),
      role: "bot",
      type: "bet_type_selector",
      fixtureId,
      label,
      createdAt: Date.now(),
    });
  }, [append]);

  const selectBetType = useCallback(async (fixtureId: number, label: string, betType: string) => {
    const labels: Record<string, string> = {
      simple: "Apuesta Simple",
      safe: "Combinadas Safe",
      ultra: "Combinadas Ultra",
      multiple_partido: "Múltiple del Partido",
      multiple_jornada: "Múltiples de la Jornada",
    };
    append({
      id: genId(),
      role: "user",
      content: labels[betType] ?? betType,
      createdAt: Date.now(),
    });
    await runAnalysis(fixtureId, label, betType);
  }, [append, runAnalysis]);

  return { messages, busy, sendQuery, confirmFixture, selectBetType, changeBetType, clear, rejectMatch };
}
