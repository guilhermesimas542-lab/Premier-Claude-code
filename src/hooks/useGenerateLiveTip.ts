import { useState } from "react";
import { toast } from "sonner";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { refreshCreditBalance } from "@/hooks/useCreditBalance";
import { refreshAiTipsterStatus } from "@/hooks/useAiTipsterStatus";

export interface LiveTipResponse {
  cached: boolean;
  tip_cache_id: string;
  credit_source: string;
  content: { markdown: string };
  source_data: any;
  generated_at: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  league_not_supported:
    "Análise IA ainda não disponível para esta competição. Seu crédito foi devolvido.",
  generation_failed:
    "Não conseguimos gerar análise no momento. Crédito devolvido. Tente novamente em alguns minutos.",
  fixture_too_far:
    "Esse jogo ainda não está siguiente o suficiente para análise.",
  fixture_already_started_or_past:
    "Esse jogo já começou ou terminou. Análise pré-jogo não disponível.",
  not_live: "O jogo não está mais ao vivo.",
  no_credits:
    "Tú não tem créditos disponíveis. Considere adquirir mais ou aguardar a renovação semanal.",
  insufficient_credits:
    "Tú não tem créditos suficientes. Compre créditos ou aguarde reset semanal.",
  ai_overloaded:
    "Sistema temporariamente sobrecarregado. Tente novamente em alguns instantes.",
  system_disabled:
    "Análise IA temporariamente indisponível.",
  fixture_not_found: "Jogo não encontrado.",
  fixture_fetch_failed:
    "Não conseguimos buscar os dados do jogo agora. Tente novamente.",
};

export function getFriendlyTipError(errorCode: string | undefined | null): string {
  if (!errorCode) return "Erro desconhecido. Tente novamente.";
  return ERROR_MESSAGES[errorCode] ?? `Erro inesperado: ${errorCode}. Tente novamente.`;
}

export function useGenerateLiveTip() {
  const [tip, setTip] = useState<LiveTipResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(fixtureId: number) {
    if (loading) {
      console.warn("[useGenerateLiveTip] Already pending, ignoring duplicate");
      return;
    }
    setLoading(true);
    setError(null);
    setTip(null);
    try {
      const { data, error: invokeErr } = await invokeWithAuth<LiveTipResponse>(
        "ai-live-tip",
        { body: { fixture_id: fixtureId } }
      );
      if (invokeErr) {
        const status = (invokeErr as any)?.context?.status ?? (invokeErr as any)?.status;
        let errorBody: any = null;
        try { errorBody = await (invokeErr as any)?.context?.json?.(); } catch {}

        if (status === 503) {
          toast.error("IA Tipster indisponível", { description: errorBody?.message || "Sistema temporariamente indisponível." });
          setError(getFriendlyTipError("system_disabled"));
          refreshAiTipsterStatus();
          return;
        }
        if (status === 402) {
          let resetsLabel = "segunda-feira";
          if (errorBody?.resets_at) {
            resetsLabel = new Date(errorBody.resets_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
          }
          toast.error("Sem créditos", { description: `Tú usou todos os créditos da semana. Renova em ${resetsLabel}.` });
          setError(getFriendlyTipError("insufficient_credits"));
          refreshCreditBalance();
          return;
        }
        // 400 com error code conhecido (league_not_supported, not_live, etc)
        if (status === 400 && errorBody?.error) {
          setError(getFriendlyTipError(errorBody.error));
          refreshCreditBalance();
          return;
        }
        if (status === 500 || errorBody?.error === "generation_failed") {
          toast.error("Falha temporária", { description: getFriendlyTipError("generation_failed") });
          setError(getFriendlyTipError(errorBody?.error || "generation_failed"));
          refreshCreditBalance();
          return;
        }
        const isDailyCap = status === 429 || /daily_cost_limit_reached/i.test(invokeErr.message || "");
        if (isDailyCap) {
          setError("⚠️ Análise IA temporariamente indisponível. Tente novamente em algumas horas.");
          return;
        }
        if (invokeErr.message?.includes("non-2xx") || invokeErr.message?.includes("FunctionsHttpError")) {
          toast.error("Falha temporária", { description: getFriendlyTipError("generation_failed") });
          setError(getFriendlyTipError("generation_failed"));
          return;
        }
        throw new Error(invokeErr.message || "tip_failed");
      }
      const d = data as any;
      if (d?.error === "daily_cost_limit_reached") {
        setError("⚠️ Análise IA temporariamente indisponível. Tente novamente em algumas horas.");
        return;
      }
      if (d?.error) {
        setError(getFriendlyTipError(d.error));
        return;
      }
      setTip(data as LiveTipResponse);
      refreshCreditBalance();
    } catch (err: any) {
      setError(getFriendlyTipError(err?.message));
    } finally {
      setLoading(false);
    }
  }

  return { tip, loading, isPending: loading, error, generate };
}
