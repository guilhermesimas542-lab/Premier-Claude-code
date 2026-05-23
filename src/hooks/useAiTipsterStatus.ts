import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AiTipsterStatus {
  enabled: boolean;
  message: string;
}

let listeners = new Set<() => void>();
export function refreshAiTipsterStatus() {
  listeners.forEach((l) => l());
}

export function useAiTipsterStatus() {
  const [status, setStatus] = useState<AiTipsterStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)("get_ai_tipster_status");
      if (error) throw error;
      if (data) {
        setStatus({
          enabled: !!(data as any).enabled,
          message: (data as any).message ?? "",
        });
      } else {
        setStatus({ enabled: true, message: "" });
      }
    } catch (e) {
      console.warn("[useAiTipsterStatus]", e);
      // fail-open
      setStatus({ enabled: true, message: "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 60_000);
    listeners.add(fetchStatus);
    return () => {
      clearInterval(t);
      listeners.delete(fetchStatus);
    };
  }, [fetchStatus]);

  return { status, loading, refetch: fetchStatus };
}
