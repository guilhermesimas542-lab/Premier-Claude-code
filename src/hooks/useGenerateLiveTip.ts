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
          setError("system_disabled");
          refreshAiTipsterStatus();
          return;
        }
        if (status === 402) {
          let resetsLabel = "segunda-feira";
          if (errorBody?.resets_at) {
            resetsLabel = new Date(errorBody.resets_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
          }
          toast.error("Sem créditos", { description: `Você usou todos os créditos da semana. Renova em ${resetsLabel}.` });
          setError("insufficient_credits");
          refreshCreditBalance();
          return;
        }
        if (status === 500 || errorBody?.error === "generation_failed") {
          toast.error("Falha temporária", { description: errorBody?.message || "Não conseguimos gerar a análise agora. Tente novamente em alguns segundos. Seu crédito foi preservado." });
          setError("generation_failed");
          refreshCreditBalance();
          return;
        }
        const isDailyCap = status === 429 || /daily_cost_limit_reached/i.test(invokeErr.message || "");
        if (isDailyCap) {
          setError("⚠️ Análise IA temporariamente indisponível. Tente novamente em algumas horas.");
          return;
        }
        if (invokeErr.message?.includes("non-2xx") || invokeErr.message?.includes("FunctionsHttpError")) {
          toast.error("Falha temporária", { description: "Não conseguimos gerar a análise agora. Tente novamente em alguns segundos." });
          setError("generation_failed");
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
        setError(d.message || d.error);
        return;
      }
      setTip(data as LiveTipResponse);
      refreshCreditBalance();
    } catch (err: any) {
      setError(err.message || "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  return { tip, loading, isPending: loading, error, generate };
}
