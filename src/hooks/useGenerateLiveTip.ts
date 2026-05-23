import { useState } from "react";
import { toast } from "sonner";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { refreshCreditBalance } from "@/hooks/useCreditBalance";

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
        if (status === 402) {
          let resetsLabel = "segunda-feira";
          try {
            const body = await (invokeErr as any)?.context?.json?.();
            if (body?.resets_at) {
              resetsLabel = new Date(body.resets_at).toLocaleDateString("pt-BR", {
                weekday: "short", day: "2-digit", month: "short",
              });
            }
          } catch {}
          toast.error("Sem créditos", {
            description: `Você usou todos os créditos da semana. Renova em ${resetsLabel}.`,
          });
          setError("insufficient_credits");
          return;
        }
        const isDailyCap = status === 429 || /daily_cost_limit_reached/i.test(invokeErr.message || "");
        throw new Error(
          isDailyCap
            ? "⚠️ Análise IA temporariamente indisponível. Tente novamente em algumas horas."
            : invokeErr.message || "tip_failed"
        );
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
    } catch (err: any) {
      setError(err.message || "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  return { tip, loading, error, generate };
}
