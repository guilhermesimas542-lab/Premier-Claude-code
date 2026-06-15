import { useState } from "react";
import { LiveMatch } from "@/hooks/useLiveMatches";
import { useGenerateLiveTip } from "@/hooks/useGenerateLiveTip";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { TipAnalysis } from "./TipAnalysis";
import { BugReportDrawer } from "./BugReportDrawer";
import type { OpenEsportivaPayload } from "./ChatMessage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ExternalLink,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Bug,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/events";
import { trackAnalysisOpened, trackEsportivaOpened } from "@/lib/analysisTracking";

function getTeamName(team: any): string {
  if (!team) return "";
  if (typeof team === "string") return team;
  if (typeof team === "object" && team !== null) {
    return team.name ?? "";
  }
  return String(team);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: LiveMatch;
  onOpenEsportiva?: (payload: OpenEsportivaPayload) => void;
}

export function LiveTipModal({ open, onOpenChange, match, onOpenEsportiva }: Props) {
  const { tip, loading, error, generate } = useGenerateLiveTip();
  const { refetch: refetchBalance } = useCreditBalance();
  const [showSource, setShowSource] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [bugOpen, setBugOpen] = useState(false);

  async function handleGenerate() {
    await generate(match.fixture_id);
    refetchBalance();
    // Tracking enriquecido pós-geração
    trackAnalysisOpened({
      source: "live",
      fixture: {
        fixture_id: match.fixture_id,
        home: match.home?.name ?? null,
        away: match.away?.name ?? null,
        league_id: match.league?.id ?? null,
        league_name: match.league?.name ?? null,
        league_country: match.league?.country ?? null,
      },
      markdown: tip?.content?.markdown,
      altenar_event_id:
        (tip?.source_data?.altenar_event_id as string | undefined) ?? null,
      altenar_event_url:
        (tip?.source_data?.altenar_event_url as string | undefined) ?? null,
    });
  }

  async function sendFeedback(value: "up" | "down") {
    if (!tip?.tip_cache_id || feedback) return;
    setFeedback(value);
    try {
      const userId = JSON.parse(atob(localStorage.getItem("premier_token") || ""))?.user_id;
      if (!userId) return;
      await supabase.from("ai_feedback").insert({
        user_id: userId,
        tip_cache_id: tip.tip_cache_id,
        feedback: value,
      });
    } catch (err) {
      console.error("feedback failed", err);
    }
  }

  function handleOpenEsportiva() {
    const altenarUrl = tip?.source_data?.altenar_event_url as string | undefined;
    const altenarId = tip?.source_data?.altenar_event_id as string | undefined;
    const home = getTeamName(tip?.source_data?.fixture?.home) || match.home.name;
    const away = getTeamName(tip?.source_data?.fixture?.away) || match.away.name;

    trackEsportivaOpened({
      source: "live",
      fixture: {
        fixture_id: match.fixture_id,
        home,
        away,
        league_id: match.league?.id ?? null,
        league_name: match.league?.name ?? null,
        league_country: match.league?.country ?? null,
      },
      markdown: tip?.content?.markdown,
      altenar_event_id: altenarId ?? null,
      altenar_event_url: altenarUrl ?? null,
    });

    onOpenChange(false);
    onOpenEsportiva?.({
      matchLabel: `${home} × ${away}`,
      markdown: tip?.content?.markdown ?? null,
      altenarEventUrl: altenarUrl ?? null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {match.home.name} x {match.away.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {match.league.name} ·{" "}
            <span className="font-semibold text-foreground">
              {match.home.score ?? 0} - {match.away.score ?? 0}
              {match.status.minute !== null && ` · ${match.status.minute}'`}
            </span>
          </DialogDescription>
        </DialogHeader>

        {!tip && !loading && !error && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Gerar análise IA consome 1 crédito. Análises de cache compartilhado
              (já geradas por outros usuários nos últimos 60s) não consomem.
            </p>
            <Button onClick={handleGenerate} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar análise IA
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Analizando partido en vivo...</p>
            <p className="text-xs text-muted-foreground">Puede tardar hasta 15 segundos.</p>
          </div>
        )}

        {error && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={handleGenerate} variant="outline" className="w-full">
              Intentar de nuevo
            </Button>
          </div>
        )}

        {tip && (
          <div className="space-y-4">
            <TipAnalysis markdown={tip.content?.markdown ?? ""} />

            <div className="flex items-center gap-2">
              <Button
                onClick={() => sendFeedback("up")}
                variant={feedback === "up" ? "default" : "outline"}
                size="sm"
                disabled={!!feedback}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => sendFeedback("down")}
                variant={feedback === "down" ? "default" : "outline"}
                size="sm"
                disabled={!!feedback}
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setBugOpen(true)}
                variant="outline"
                size="sm"
              >
                <Bug className="w-4 h-4 mr-1" />
                Reportar erro
              </Button>
            </div>

            <Button onClick={handleOpenEsportiva} className="w-full text-black font-semibold" variant="default">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Esportiva Bet
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        )}
      </DialogContent>
      <BugReportDrawer
        open={bugOpen}
        onOpenChange={setBugOpen}
        tipCacheId={tip?.tip_cache_id ?? ""}
      />
    </Dialog>
  );
}

