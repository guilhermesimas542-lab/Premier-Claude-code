import { useState } from "react";
import { ChatMessage as Msg } from "@/hooks/useChatTipster";
import { DisambiguationCard } from "./DisambiguationCard";
import { TipAnalysis } from "./TipAnalysis";
import { BugReportDrawer } from "./BugReportDrawer";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Bug, ExternalLink, AlertCircle, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/events";

function getTeamName(team: any): string {
  if (!team) return "";
  if (typeof team === "string") return team;
  if (typeof team === "object" && team !== null) {
    return team.name ?? "";
  }
  return String(team);
}

export interface OpenEsportivaPayload {
  matchLabel: string;
  markdown: string | null;
  altenarEventUrl: string | null;
}

interface Props {
  message: Msg;
  onConfirmFixture: (fixtureId: number, label: string) => void;
  onOpenEsportiva?: (payload: OpenEsportivaPayload) => void;
  onRejectMatch?: () => void;
}

export function ChatMessage({ message, onConfirmFixture, onOpenEsportiva, onRejectMatch }: Props) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [bugOpen, setBugOpen] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-black font-semibold text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === "loading") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-muted-foreground">{message.label}</span>
        </div>
      </div>
    );
  }

  if (message.type === "text") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === "error") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-destructive/10 text-destructive px-4 py-2 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{message.message}</span>
        </div>
      </div>
    );
  }

  if (message.type === "disambiguation") {
    return (
      <div className="w-full">
        <DisambiguationCard
          matches={message.matches}
          confidence={message.confidence}
          onConfirm={onConfirmFixture}
          onReject={onRejectMatch}
        />
      </div>
    );
  }

  if (message.type === "tip") {
    const sendFeedback = async (value: "up" | "down") => {
      if (feedback) return;
      setFeedback(value);
      try {
        const token = localStorage.getItem("premier_token");
        if (!token) return;
        const userId = JSON.parse(atob(token))?.user_id;
        if (!userId) return;
        await supabase.from("ai_feedback").insert({
          user_id: userId,
          tip_cache_id: message.tipCacheId,
          feedback: value,
        });
      } catch (err) {
        console.error("feedback failed", err);
      }
    };

    return (
      <div className="w-full space-y-2">
        {message.cached && (
          <p className="text-[10px] italic text-muted-foreground px-2">
            Análise gerada por outro usuário · cache compartilhado · 0 créditos
          </p>
        )}

        <TipAnalysis markdown={message.markdown} />

        <div className="flex items-center gap-2 flex-wrap px-1 pt-1">
          <Button
            onClick={() => sendFeedback("up")}
            variant={feedback === "up" ? "default" : "outline"}
            size="sm"
            disabled={!!feedback}
          >
            <ThumbsUp className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => sendFeedback("down")}
            variant={feedback === "down" ? "default" : "outline"}
            size="sm"
            disabled={!!feedback}
          >
            <ThumbsDown className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => setBugOpen(true)}
            variant="outline"
            size="sm"
          >
            <Bug className="w-3 h-3 mr-1" />
            Reportar erro
          </Button>
          <Button
            onClick={() => {
              const altenarUrl = message.sourceData?.altenar_event_url as string | undefined;
              const altenarId = message.sourceData?.altenar_event_id as string | undefined;
              const home = getTeamName(message.sourceData?.fixture?.home);
              const away = getTeamName(message.sourceData?.fixture?.away);

              trackEvent("ia_tipster_open_esportiva", {
                mode: altenarUrl ? "event_specific" : "fallback_home",
                altenar_event_id: altenarId ?? null,
                source: "chat",
              });

              onOpenEsportiva?.({
                matchLabel: `${home} × ${away}`,
                markdown: message.markdown ?? null,
                altenarEventUrl: altenarUrl ?? null,
              });
            }}
            variant="default"
            size="sm"
            className="ml-auto text-black font-semibold"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Esportiva
          </Button>
        </div>

        <Button
          onClick={() => {
            const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
              'input[placeholder*="Pergunte sobre um jogo"], textarea[placeholder*="Pergunte sobre um jogo"]'
            );
            if (input) {
              input.focus();
              input.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Search className="w-3 h-3 mr-1" />
          Pedir análise de outro jogo
        </Button>

        <BugReportDrawer
          open={bugOpen}
          onOpenChange={setBugOpen}
          tipCacheId={message.tipCacheId}
        />
      </div>
    );
  }

  return null;
}
