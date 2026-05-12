import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CreditBalance {
  tier: string;
  is_unlimited: boolean;
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  bonus: number;
  purchased: number;
  cache_hits_today: number;
  cache_hits_limit: number;
  total_available: number;
}

function getUserIdFromToken(): string | null {
  try {
    const token = localStorage.getItem("premier_token");
    if (!token) return null;
    const data = JSON.parse(atob(token));
    return data.user_id || null;
  } catch {
    return null;
  }
}

export function useCreditBalance() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    const userId = getUserIdFromToken();
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase.rpc("get_credit_balance", {
        p_user_id: userId,
      });
      if (data && !(data as any).error) setBalance(data as unknown as CreditBalance);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
