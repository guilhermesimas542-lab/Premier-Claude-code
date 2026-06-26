import { useEffect, useRef, useState } from "react";
import { useChatTipster } from "@/hooks/useChatTipster";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { ChatMessage } from "./ChatMessage";
import type { OpenEsportivaPayload } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar, Trophy } from "lucide-react";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { useActivationLock } from "@/components/onboarding/ActivationGateProvider";

interface Suggestion {
  home: string;
  away: string;
  league: string;
  kickoff_label: string;
}

interface ChatSectionProps {
  onOpenEsportiva?: (payload: OpenEsportivaPayload) => void;
}

export function ChatSection({ onOpenEsportiva }: ChatSectionProps = {}) {
  const { messages, busy, sendQuery, confirmFixture, selectBetType, changeBetType, clear, rejectMatch } = useChatTipster();
  const { refetch: refetchBalance } = useCreditBalance();
  const { isLocked, requestActivation } = useActivationLock();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const guardedSendQuery = (query: string) => {
    if (isLocked) { requestActivation(); return; }
    sendQuery(query);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) return;
    if (suggestions !== null) return;
    if (loadingSuggestions) return;

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const { data, error } = await invokeWithAuth("ai-upcoming-suggestions", {});
        if (error) {
          console.error("suggestions error", error);
          setSuggestions([]);
          return;
        }
        const list = (data as any)?.suggestions || [];
        setSuggestions(list);
      } catch (err) {
        console.error("suggestions fetch error", err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [messages.length, suggestions, loadingSuggestions]);

  const handleConfirm = async (fixtureId: number, label: string) => {
    if (isLocked) { requestActivation(); return; }
    await confirmFixture(fixtureId, label);
    refetchBalance();
  };

  const renderSuggestions = () => {
    if (loadingSuggestions && !suggestions) {
      return (
        <p className="text-center text-xs" style={{ color: "#8a8c94" }}>
          Cargando próximos partidos...
        </p>
      );
    }
    if (!suggestions || suggestions.length === 0) {
      return (
        <p className="text-center text-xs" style={{ color: "#8a8c94" }}>
          Escribe el nombre de los equipos abajo para empezar.
        </p>
      );
    }
    return (
      <div className="mx-auto w-full max-w-md space-y-1.5">
        <p
          className="mb-2 text-center text-[10px] uppercase tracking-[0.12em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "#8a8c94" }}
        >
          Próximos partidos en las ligas cubiertas
        </p>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => guardedSendQuery(`${s.home} x ${s.away}`)}
            className="w-full rounded-xl px-3 py-2.5 text-left transition-colors"
            style={{
              background: "rgba(235,235,245,.04)",
              border: "1px solid rgba(235,235,245,.1)",
            }}
          >
            <div className="text-xs font-semibold" style={{ color: "#ECEAE4" }}>
              {s.home} <span style={{ color: "#8a8c94" }}>×</span> {s.away}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px]" style={{ color: "#8a8c94" }}>
              <span className="flex items-center gap-1">
                <Trophy className="h-2.5 w-2.5" style={{ color: "#c9a56b" }} />
                {s.league}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" style={{ color: "#c9a56b" }} />
                {s.kickoff_label}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col" style={{ background: "#0a0b0e" }}>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 pt-12 text-center">
            <svg
              viewBox="0 0 24 24"
              width="42"
              height="42"
              className="mb-3.5 block"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="iaStarChat" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#f6d588" />
                  <stop offset="1" stopColor="#c9952f" />
                </linearGradient>
              </defs>
              <path
                d="M12 1.2 C12.7 7.1 16.9 11.3 22.8 12 C16.9 12.7 12.7 16.9 12 22.8 C11.3 16.9 7.1 12.7 1.2 12 C7.1 11.3 11.3 7.1 12 1.2 Z"
                fill="url(#iaStarChat)"
              />
            </svg>
            <p
              className="mb-2 text-[22px] leading-tight"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#cfd1cb" }}
            >
              Pregunta sobre cualquier partido
            </p>
            <p className="mb-5 max-w-[30ch] text-[13px] leading-relaxed" style={{ color: "#8a8c94" }}>
              Dime el nombre de los equipos. Busco en los siguientes 15 días y armo la mejor entrada con datos reales.
            </p>
            {renderSuggestions()}
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            onConfirmFixture={handleConfirm}
            onSelectBetType={selectBetType}
            onChangeBetType={changeBetType}
            onAskAnother={clear}
            onOpenEsportiva={onOpenEsportiva}
            onRejectMatch={rejectMatch}
          />
        ))}
      </div>

      <div
        className="shrink-0"
        style={{ background: "#0a0b0e", borderTop: "1px solid rgba(235,235,245,.07)" }}
      >
        {messages.length > 0 && (
          <div className="flex justify-end px-3 pt-1.5">
            <Button
              onClick={clear}
              variant="ghost"
              size="sm"
              className="h-7 text-xs hover:bg-transparent"
              style={{ color: "#8a8c94" }}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Limpiar
            </Button>
          </div>
        )}

        <ChatInput onSend={guardedSendQuery} disabled={busy} />
      </div>
    </div>
  );
}
