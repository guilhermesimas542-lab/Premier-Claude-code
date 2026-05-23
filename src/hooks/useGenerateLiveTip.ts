import { useState } from "react";
import { invokeWithAuth } from "@/lib/invokeWithAuth";

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
        const isDailyCap =
          (invokeErr as any)?.context?.status === 429 ||
          (invokeErr as any)?.status === 429 ||
          /daily_cost_limit_reached/i.test(invokeErr.message || "");
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
