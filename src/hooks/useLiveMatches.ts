import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveMatch {
  fixture_id: number;
  league: { id: number; name: string; logo: string; country: string };
  home: { id: number; name: string; logo: string; score: number | null };
  away: { id: number; name: string; logo: string; score: number | null };
  status: { long: string; short: string; minute: number | null };
  kickoff_at: string;
  altenar_event_id: string | null;
  has_cached_tip: boolean;
}

export interface LiveMatchesResponse {
  cached: boolean;
  generated_at?: string;
  matches: LiveMatch[];
  total_live_in_top_leagues?: number;
}

export function useLiveMatches() {
  const [data, setData] = useState<LiveMatchesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("premier_token");
      if (!token) throw new Error("not_authenticated");

      const { data: resp, error: invokeErr } = await supabase.functions.invoke(
        "ai-live-matches",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (invokeErr) throw new Error(invokeErr.message || "fetch_failed");
      setData(resp as LiveMatchesResponse);
      setError(null);
    } catch (err: any) {
      setError(err.message || "unknown_error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  return { data, loading, error, refetch: fetchMatches };
}
