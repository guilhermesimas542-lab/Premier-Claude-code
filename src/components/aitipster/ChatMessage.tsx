import { useEffect, useState } from "react";
import { ChatMessage as Msg } from "@/hooks/useChatTipster";
import { DisambiguationCard } from "./DisambiguationCard";
import { TipAnalysis } from "./TipAnalysis";
import { BugReportDrawer } from "./BugReportDrawer";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Bug, ExternalLink, AlertCircle, Loader2, Search, ChevronRight, Trophy, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { trackEvent } from "@/lib/events";
import { trackEsportivaOpened, trackAnalysisOpened } from "@/lib/analysisTracking";

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
  onRejectMatch?: (fixtureIds: number[]) => void;
}

export function ChatMessage({ message, onConfirmFixture, onOpenEsportiva, onRejectMatch }: Props) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [bugOpen, setBugOpen] = useState(false);

  /**
   * Dispara analysis_opened uma única vez quando uma mensagem do tipo "tip"
   * é renderizada pela primeira vez. Usa message.id como dep — cada análise
   * tem id único, então só dispara uma vez por análise gerada.
   */
  useEffect(() => {
    if (message.role !== "bot" || (message as any).type !== "tip") return;
    const md = (message as any).markdown as string | undefined;
    const src = (message as any).sourceData;
    trackAnalysisOpened({
      source: "chat",
      fixture: {
        fixture_id: src?.fixture?.fixture_id ?? src?.fixture_id ?? null,
        home: getTeamName(src?.fixture?.home),
        away: getTeamName(src?.fixture?.away),
        league_id: src?.fixture?.league_id ?? src?.league_id ?? null,
        league_name:
          src?.fixture?.league_name ??
          src?.fixture?.league ??
          src?.league_name ??
          null,
        league_country: src?.fixture?.league_country ?? null,
      },
      markdown: md,
      altenar_event_id: (src?.altenar_event_id as string | undefined) ?? null,
      altenar_event_url: (src?.altenar_event_url as string | undefined) ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

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

  if (message.type === "upcoming_list") {
    const rejectLabel = message.listType === "team" ? "No es este equipo" : "No es esta liga";
    const canReject =
      (message.listType === "team" && !!message.teamId) ||
      (message.listType === "league" && !!message.leagueIds && message.leagueIds.length > 0);

    const handleRejectList = async () => {
      try {
        const body: any = { query: message.originalQuery };
        if (message.listType === "team" && message.teamId) {
          body.team_id = message.teamId;
        } else if (message.listType === "league" && message.leagueIds) {
          body.league_ids = message.leagueIds;
        }
        await invokeWithAuth("ai-reject-fixture", { body });
      } catch (e) {
        console.warn("failed to reject list", e);
      }
      onRejectMatch?.([]);
    };

    return (
      <div className="w-full space-y-2">
        {message.matches.map((m) => (
          <button
            key={m.fixture_id}
            onClick={() => onConfirmFixture(m.fixture_id, `${m.home} x ${m.away}`)}
            className="w-full text-left rounded-lg border bg-card hover:bg-accent p-3 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {m.home} <span className="text-muted-foreground mx-1">×</span> {m.away}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 truncate">
                    <Trophy className="w-3 h-3 shrink-0" />
                    <span className="truncate">{m.league}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {m.kickoff_label}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        ))}
        {canReject && (
          <Button
            onClick={handleRejectList}
            variant="outline"
            size="sm"
            className="w-full text-xs"
          >
            {rejectLabel}
          </Button>
        )}
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

              trackEsportivaOpened({
                source: "chat",
                fixture: {
                  fixture_id:
                    (message.sourceData?.fixture?.fixture_id as number | undefined) ??
                    (message.sourceData?.fixture_id as number | undefined) ??
                    null,
                  home,
                  away,
                  league_id:
                    (message.sourceData?.fixture?.league_id as number | undefined) ??
                    (message.sourceData?.league_id as number | undefined) ??
                    null,
                  league_name:
                    (message.sourceData?.fixture?.league_name as string | undefined) ??
                    (message.sourceData?.fixture?.league as string | undefined) ??
                    (message.sourceData?.league_name as string | undefined) ??
                    null,
                  league_country:
                    (message.sourceData?.fixture?.league_country as string | undefined) ??
                    null,
                },
                markdown: message.markdown,
                altenar_event_id: altenarId ?? null,
                altenar_event_url: altenarUrl ?? null,
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
            Bet7k
          </Button>
        </div>

        <Button
          onClick={() => {
            const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
              'input[placeholder*="Pregunta sobre un partido"], textarea[placeholder*="Pregunta sobre un partido"]'
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
