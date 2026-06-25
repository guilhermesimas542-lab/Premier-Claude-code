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
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          background:
            "radial-gradient(130% 70% at 50% -15%, rgba(140,147,200,0.06), rgba(140,147,200,0) 55%), #0c0d11",
          border: "1px solid rgba(235,235,245,0.08)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-base"
            style={{ color: "#ECEAE4", fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {match.home.name} <span style={{ color: "#5c5e66" }}>×</span> {match.away.name}
          </DialogTitle>
          <DialogDescription className="text-xs" style={{ color: "#9a9ca4" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
              {match.league.name}
            </span>{" "}
            ·{" "}
            <span className="font-semibold" style={{ color: "#ECEAE4" }}>
              {match.home.score ?? 0} - {match.away.score ?? 0}
            </span>
            {match.status.minute !== null && (
              <span className="font-semibold" style={{ color: "#e5484d" }}>
                {" "}
                · {match.status.minute}'
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!tip && !loading && !error && (
          <div className="space-y-3 py-2">
            <p className="text-xs leading-relaxed" style={{ color: "#9a9ca4" }}>
              Generar análisis IA consume 1 crédito. Los análisis de caché compartido
              (ya generados por otros usuarios en los últimos 60s) no consumen.
            </p>
            <button
              onClick={handleGenerate}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "#e9b949",
                color: "#1c1810",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.6px",
                textTransform: "uppercase",
                border: "none",
                boxShadow: "0 0 22px rgba(233,185,73,0.2)",
              }}
            >
              <Sparkles className="w-4 h-4" />
              Generar análisis IA
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#8c93c8" }} />
            <p className="text-sm font-medium" style={{ color: "#ECEAE4" }}>
              Analizando partido en vivo...
            </p>
            <p className="text-xs" style={{ color: "#9a9ca4" }}>
              Puede tardar hasta 15 segundos.
            </p>
          </div>
        )}

        {error && (
          <div className="space-y-3 py-2">
            <p className="text-sm" style={{ color: "#e5484d" }}>
              {error}
            </p>
            <button
              onClick={handleGenerate}
              className="w-full py-3 rounded-xl flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ECEAE4",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {tip && (
          <div className="space-y-4">
            <TipAnalysis markdown={tip.content?.markdown ?? ""} />

            <div className="flex items-center gap-2">
              <button
                onClick={() => sendFeedback("up")}
                disabled={!!feedback}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-all disabled:opacity-50"
                style={
                  feedback === "up"
                    ? { background: "rgba(111,181,140,0.15)", border: "1px solid #6fb58c", color: "#6fb58c" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#9a9ca4" }
                }
                aria-label="Me gusta"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => sendFeedback("down")}
                disabled={!!feedback}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-all disabled:opacity-50"
                style={
                  feedback === "down"
                    ? { background: "rgba(229,72,77,0.15)", border: "1px solid #e5484d", color: "#e5484d" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#9a9ca4" }
                }
                aria-label="No me gusta"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setBugOpen(true)}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#9a9ca4",
                }}
              >
                <Bug className="w-4 h-4" />
                Reportar error
              </button>
            </div>

            <button
              onClick={handleOpenEsportiva}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "#e9b949",
                color: "#1c1810",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.6px",
                textTransform: "uppercase",
                border: "none",
                boxShadow: "0 0 22px rgba(233,185,73,0.2)",
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Abrir en la casa
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
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

