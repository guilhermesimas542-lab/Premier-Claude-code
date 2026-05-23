import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CreditBalance {
  tier: string;
  weekly_remaining: number;
  weekly_quota: number;
  extras_bonus: number;
  extras_purchased: number;
  total_available: number;
  resets_at: string | null;
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
      const d = data as any;
      if (d && !d.error) {
        const bal = d.balance ?? {};
        const weekly_remaining = bal.weekly_remaining ?? 0;
        const extras_bonus = bal.extras_bonus ?? 0;
        const extras_purchased = bal.extras_purchased ?? 0;
        setBalance({
          tier: d.tier,
          weekly_remaining,
          weekly_quota: bal.weekly_quota ?? 0,
          extras_bonus,
          extras_purchased,
          total_available: weekly_remaining + extras_bonus + extras_purchased,
          resets_at: d.resets_at ?? null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
