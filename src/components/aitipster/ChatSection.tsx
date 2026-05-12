import { useEffect, useRef, useState } from "react";
import { useChatTipster } from "@/hooks/useChatTipster";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Suggestion {
  fixture_id: number;
  home: string;
  away: string;
  league: string;
  kickoff_at: string;
  kickoff_label: string;
}

export function ChatSection() {
  const { messages, busy, sendQuery, confirmFixture, clear } = useChatTipster();
  const { refetch: refetchBalance } = useCreditBalance();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const token = localStorage.getItem("premier_token");
        const { data, error } = await supabase.functions.invoke(
          "ai-upcoming-suggestions",
          {
            body: {},
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (cancelled) return;
        if (error) {
          console.error("[suggestions] error", error);
          setSuggestions([]);
        } else {
          setSuggestions((data as any)?.suggestions ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[suggestions] exception", err);
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = async (fixtureId: number, label: string) => {
    await confirmFixture(fixtureId, label);
    refetchBalance();
  };

  const handleSuggestionClick = (s: Suggestion) => {
    sendQuery(`${s.home} x ${s.away}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-10 px-6">
            <Sparkles className="w-10 h-10 text-primary mb-3" />
            <p className="text-sm font-medium mb-2">Pergunte sobre qualquer jogo</p>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Diga o nome dos times. Eu busco nos próximos 15 dias e analiso com dados reais.
            </p>

            <div className="w-full max-w-sm">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
                Próximos jogos nas ligas cobertas
              </p>

              {loadingSuggestions && (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              )}

              {!loadingSuggestions && suggestions.length === 0 && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  Digite o nome dos times no campo abaixo para começar.
                </p>
              )}

              {!loadingSuggestions && suggestions.length > 0 && (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.fixture_id}
                      onClick={() => handleSuggestionClick(s)}
                      disabled={busy}
                      className="w-full text-left rounded-md border bg-card px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-xs font-semibold leading-tight">
                        {s.home} <span className="text-muted-foreground">x</span> {s.away}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground truncate">
                          {s.league}
                        </span>
                        <span className="text-[10px] text-primary font-medium ml-2 shrink-0">
                          {s.kickoff_label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            onConfirmFixture={handleConfirm}
          />
        ))}

        {busy && messages.length === 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processando...
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="px-3 py-1 border-t flex justify-end">
          <Button
            onClick={clear}
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      <ChatInput onSend={sendQuery} disabled={busy} />
    </div>
  );
}
