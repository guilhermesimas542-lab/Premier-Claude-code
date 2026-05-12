import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const token = localStorage.getItem("premier_token");
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "ai-live-tip",
        {
          body: { fixture_id: fixtureId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (invokeErr) throw new Error(invokeErr.message || "tip_failed");
      const d = data as any;
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
