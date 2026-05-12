import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatMessage as Msg } from "@/hooks/useChatTipster";
import { DisambiguationCard } from "./DisambiguationCard";
import { TipAnalysis } from "./TipAnalysis";
import { BugReportDrawer } from "./BugReportDrawer";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Bug, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  message: Msg;
  onConfirmFixture: (fixtureId: number, label: string) => void;
}

export function ChatMessage({ message, onConfirmFixture }: Props) {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [bugOpen, setBugOpen] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-primary-foreground text-sm">
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
            title="Reportar bug"
          >
            <Bug className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => navigate("/sport/1")}
            variant="default"
            size="sm"
            className="ml-auto"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Esportiva
          </Button>
        </div>

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
