import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

export interface UserAccess {
  /** Raw tier string from DB. Use ONLY for display/labels — never gate features by this. */
  mainTier: string;
  // Feature flags (gated via user_has_feature server-side)
  hasOddsSafes: boolean;
  hasOddsPro: boolean;
  hasAlavancagem: boolean;
  
  hasLiveTelegram: boolean;
  hasMultiplasBingo: boolean;
  hasMercadosSecundarios: boolean;
  hasEsportesAmericanos: boolean;
  hasOddsUltra: boolean;
  isVitalicio: boolean;
  // Legacy display helpers (kept for back-compat with components that rely on tier label)
  isUltra: boolean;
  isPro: boolean;
  isBasic: boolean;
  isFree: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT: Omit<UserAccess, "refetch"> = {
  mainTier: "free",
  hasOddsSafes: false,
  hasOddsPro: false,
  hasAlavancagem: false,
  
  hasLiveTelegram: false,
  hasMultiplasBingo: false,
  hasMercadosSecundarios: false,
  hasEsportesAmericanos: false,
  hasOddsUltra: false,
  isVitalicio: false,
  isUltra: false,
  isPro: false,
  isBasic: false,
  isFree: true,
  loading: true,
};

// Features checked via DB function user_has_feature
const FEATURE_KEYS = [
  "odds_safes",
  "odds_pro",
  "alavancagem",
  
  "live_telegram",
  "multiplas_bingo",
  "mercados_secundarios",
  "esportes_americanos",
  "odds_ultra",
  "acesso_vitalicio",
] as const;

export function useUserAccess(): UserAccess {
  const [state, setState] = useState<Omit<UserAccess, "refetch">>({ ...DEFAULT, loading: true });

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const mockUser = mockGetUser();
    if (!mockUser) {
      setState({ ...DEFAULT, loading: false });
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id, main_tier")
      .eq("email", mockUser.email.toLowerCase().trim())
      .maybeSingle();

    const tier = (userData?.main_tier as string) || "free";
    const userId = userData?.id;

    // Default all flags to false; only call user_has_feature if we have a user.
    const flags: Record<string, boolean> = {};
    if (userId) {
      const results = await Promise.all(
        FEATURE_KEYS.map((k) =>
          supabase.rpc("user_has_feature", { p_user: userId, p_feature: k }),
        ),
      );
      FEATURE_KEYS.forEach((k, i) => {
        flags[k] = results[i].data === true;
      });
    }

    setState({
      mainTier: tier,
      hasOddsSafes: !!flags.odds_safes,
      hasOddsPro: !!flags.odds_pro,
      hasAlavancagem: !!flags.alavancagem,
      
      hasLiveTelegram: !!flags.live_telegram,
      hasMultiplasBingo: !!flags.multiplas_bingo,
      hasMercadosSecundarios: !!flags.mercados_secundarios,
      hasEsportesAmericanos: !!flags.esportes_americanos,
      hasOddsUltra: !!flags.odds_ultra,
      isVitalicio: !!flags.acesso_vitalicio,
      isUltra: tier === "ultra" || tier === "diamante",
      isPro: tier === "pro" || tier === "ultra" || tier === "premium" || tier === "diamante",
      isBasic: tier !== "free",
      isFree: tier === "free",
      loading: false,
    });
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...state, refetch: fetch };
}
