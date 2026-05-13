import { useEffect, useRef, useState } from "react";
import { useChatTipster } from "@/hooks/useChatTipster";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { ChatMessage } from "./ChatMessage";
import type { OpenEsportivaPayload } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, Calendar, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const { messages, busy, sendQuery, confirmFixture, clear } = useChatTipster();
  const { refetch: refetchBalance } = useCreditBalance();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
        const token = localStorage.getItem("premier_token");
        if (!token) return;
        const { data, error } = await supabase.functions.invoke("ai-upcoming-suggestions", {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    await confirmFixture(fixtureId, label);
    refetchBalance();
  };

  const renderSuggestions = () => {
    if (loadingSuggestions && !suggestions) {
      return (
        <p className="text-xs text-muted-foreground text-center">
          Carregando jogos próximos...
        </p>
      );
    }
    if (!suggestions || suggestions.length === 0) {
      return (
        <p className="text-xs text-muted-foreground text-center">
          Digite o nome dos times no campo abaixo para começar.
        </p>
      );
    }
    return (
      <div className="space-y-1.5 w-full max-w-md mx-auto">
        <p className="text-[10px] text-muted-foreground text-center mb-2">
          Próximos jogos nas ligas cobertas
        </p>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => sendQuery(`${s.home} x ${s.away}`)}
            className="w-full text-left rounded-md border bg-card px-3 py-2 hover:bg-accent transition-colors"
          >
            <div className="text-xs font-medium">
              {s.home} <span className="text-muted-foreground">x</span> {s.away}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Trophy className="w-2.5 h-2.5" />
                {s.league}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {s.kickoff_label}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-10 px-3">
            <Sparkles className="w-10 h-10 text-primary mb-3" />
            <p className="text-sm font-medium mb-2">Pergunte sobre qualquer jogo</p>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Diga o nome dos times. Eu busco nos próximos 15 dias e analiso com dados reais.
            </p>
            {renderSuggestions()}
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            onConfirmFixture={handleConfirm}
          />
        ))}
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
