import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LiveMatch } from "@/hooks/useLiveMatches";
import { useGenerateLiveTip } from "@/hooks/useGenerateLiveTip";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { TipAnalysis } from "./TipAnalysis";
import { BugReportDrawer } from "./BugReportDrawer";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: LiveMatch;
}

export function LiveTipModal({ open, onOpenChange, match }: Props) {
  const navigate = useNavigate();
  const { tip, loading, error, generate } = useGenerateLiveTip();
  const { refetch: refetchBalance } = useCreditBalance();
  const [showSource, setShowSource] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [bugOpen, setBugOpen] = useState(false);

  async function handleGenerate() {
    await generate(match.fixture_id);
    refetchBalance();
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
    onOpenChange(false);
    navigate("/sport/1");
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
            <p className="text-sm font-medium">Analisando partida ao vivo...</p>
            <p className="text-xs text-muted-foreground">Pode levar até 15 segundos.</p>
          </div>
        )}

        {error && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-destructive">
              {error === "insufficient_credits"
                ? "Você não tem créditos suficientes. Compre créditos ou aguarde reset diário."
                : `Erro: ${error}`}
            </p>
            <Button onClick={handleGenerate} variant="outline" className="w-full">
              Tentar novamente
            </Button>
          </div>
        )}

        {tip && (
          <div className="space-y-4">
            {tip.cached && (
              <div className="text-[11px] text-muted-foreground bg-muted/50 rounded p-2">
                Análise gerada por outro usuário · cache compartilhado · 0 créditos
              </div>
            )}
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

            <Button onClick={handleOpenEsportiva} className="w-full" variant="default">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Esportiva
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

