import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export interface ChatTipResponse {
  cached: boolean;
  tip_cache_id: string;
  credit_source: string;
  content: { markdown: string };
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
  | { id: string; role: "bot"; type: "tip"; tipCacheId: string; markdown: string; sourceData: any; cached: boolean; createdAt: number }
  | { id: string; role: "bot"; type: "error"; message: string; createdAt: number };

function genId(): string {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getAuthToken(): string | null {
  return localStorage.getItem("premier_token");
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
      console.warn("Falha ao persistir chat", e);
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
        const token = getAuthToken();
        await supabase.functions.invoke("ai-reject-fixture", {
          body: { query, fixture_ids: fixtureIds },
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn("failed to register rejection", e);
      }
    }
    append({
      id: genId(),
      role: "bot",
      type: "text",
      content: "Beleza, qual jogo então? Pode escrever os dois times ou só o nome de um.",
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
      label: "Procurando o jogo...",
      createdAt: Date.now(),
    });

    try {
      const token = getAuthToken();
      const { data, error } = await supabase.functions.invoke("ai-disambiguate-match", {
        body: { query: text.trim() },
        headers: { Authorization: `Bearer ${token}` },
      });

      removeLoading();

      if (error) {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: error.message || "Erro ao buscar jogo.",
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
          ? "Próximos jogos da rodada — qual quer analisar?"
          : `Próximos jogos${d.team_name ? ` de ${d.team_name}` : ""} — qual quer analisar?`;
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
          content: `Esse jogo já aconteceu em ${m?.played_label || "data desconhecida"}. ${m?.result || ""}\n\nNão há entrada possível para jogos passados.`,
          createdAt: Date.now(),
        });
        return;
      }
      if (status === "out_of_window") {
        append({
          id: genId(),
          role: "bot",
          type: "text",
          content: (data as any).message || "Esse jogo está fora da janela de análise (próximos 15 dias).",
          createdAt: Date.now(),
        });
        return;
      }
      append({
        id: genId(),
        role: "bot",
        type: "text",
        content: (data as any)?.message || "Não encontrei esse confronto. Me dá mais detalhes (liga, data)?",
        createdAt: Date.now(),
      });
    } catch (err: any) {
      removeLoading();
      append({
        id: genId(),
        role: "bot",
        type: "error",
        message: err?.message || "Erro inesperado.",
        createdAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  }, [append, removeLoading, busy]);

  const confirmFixture = useCallback(async (fixtureId: number, label: string) => {
    if (busy) return;
    setBusy(true);

    append({
      id: genId(),
      role: "user",
      content: `Sim, é esse: ${label}`,
      createdAt: Date.now(),
    });
    append({
      id: genId(),
      role: "bot",
      type: "loading",
      label: "Analisando o jogo...",
      createdAt: Date.now(),
    });

    try {
      const token = getAuthToken();
      const { data, error } = await supabase.functions.invoke("ai-chat-tip", {
        body: { fixture_id: fixtureId },
        headers: { Authorization: `Bearer ${token}` },
      });

      removeLoading();

      if (error) {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: error.message || "Erro ao gerar análise.",
          createdAt: Date.now(),
        });
        return;
      }

      const d = data as any;
      if (d?.error === "insufficient_credits") {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: "Você não tem créditos suficientes. Compre créditos ou aguarde o reset diário.",
          createdAt: Date.now(),
        });
        return;
      }
      if (d?.error) {
        append({
          id: genId(),
          role: "bot",
          type: "error",
          message: `Erro: ${d.error}`,
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
        cached: tipResp.cached,
        createdAt: Date.now(),
      });
    } catch (err: any) {
      removeLoading();
      append({
        id: genId(),
        role: "bot",
        type: "error",
        message: err?.message || "Erro inesperado.",
        createdAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  }, [append, removeLoading, busy]);

  return { messages, busy, sendQuery, confirmFixture, clear, rejectMatch };
}
