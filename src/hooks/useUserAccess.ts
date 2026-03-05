import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

export interface UserAccess {
  mainTier: "free" | "basic" | "pro" | "ultra";
  hasAlavancagem: boolean;
  hasOddsAltas: boolean;
  hasLiveTelegram: boolean;
  isVitalicio: boolean;
  isUltra: boolean;
  isPro: boolean;
  isBasic: boolean;
  isFree: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT: UserAccess = {
  mainTier: "free",
  hasAlavancagem: false,
  hasOddsAltas: false,
  hasLiveTelegram: false,
  isVitalicio: false,
  isUltra: false,
  isPro: false,
  isBasic: false,
  isFree: true,
  loading: true,
  refetch: async () => {},
};

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
      .select("id, main_tier, is_vitalicio")
      .eq("email", mockUser.email.toLowerCase().trim())
      .maybeSingle();

    const tier = (userData?.main_tier as UserAccess["mainTier"]) || "free";
    const isVitalicio = userData?.is_vitalicio ?? false;
    const userId = userData?.id;

    let addons: string[] = [];
    if (userId) {
      const { data: ents } = await supabase
        .from("entitlements")
        .select("product_key")
        .eq("user_id", userId)
        .eq("status", "active");
      addons = (ents || []).map((e) => e.product_key);
    }

    setState({
      mainTier: tier,
      hasAlavancagem: addons.includes("alavancagem"),
      hasOddsAltas: addons.includes("desaltas"),
      hasLiveTelegram: addons.includes("live_telegram"),
      isVitalicio,
      isUltra: tier === "ultra",
      isPro: tier === "pro" || tier === "ultra",
      isBasic: tier === "basic" || tier === "pro" || tier === "ultra",
      isFree: tier === "free",
      loading: false,
    });
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...state, refetch: fetch };
}
