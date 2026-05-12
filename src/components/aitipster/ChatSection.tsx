import { useEffect, useRef } from "react";
import { useChatTipster } from "@/hooks/useChatTipster";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2 } from "lucide-react";

export function ChatSection() {
  const { messages, busy, sendQuery, confirmFixture, clear } = useChatTipster();
  const { refetch: refetchBalance } = useCreditBalance();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConfirm = async (fixtureId: number, label: string) => {
    await confirmFixture(fixtureId, label);
    refetchBalance();
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
            <div className="space-y-1.5 w-full max-w-xs">
              <button
                onClick={() => sendQuery("Real Madrid x Barcelona")}
                className="w-full text-left text-xs rounded-md border bg-card px-3 py-2 hover:bg-accent transition-colors"
              >
                Real Madrid x Barcelona
              </button>
              <button
                onClick={() => sendQuery("Flamengo x Palmeiras")}
                className="w-full text-left text-xs rounded-md border bg-card px-3 py-2 hover:bg-accent transition-colors"
              >
                Flamengo x Palmeiras
              </button>
              <button
                onClick={() => sendQuery("Manchester City x Arsenal")}
                className="w-full text-left text-xs rounded-md border bg-card px-3 py-2 hover:bg-accent transition-colors"
              >
                Manchester City x Arsenal
              </button>
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
