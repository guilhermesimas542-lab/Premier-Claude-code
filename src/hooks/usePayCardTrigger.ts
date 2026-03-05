import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserBettingHouse } from "./useUserBettingHouse";
import type { PayCardData } from "./usePayCards";
import { mockGetUser } from "@/mocks/user";
import { parseAudience, matchesAudienceCriteria } from "@/lib/audienceUtils";

export function usePayCardTrigger() {
  const { house } = useUserBettingHouse();
  const [payCard, setPayCard] = useState<PayCardData | null>(null);
  const [open, setOpen] = useState(false);

  const triggerPayCard = useCallback(async (plan: string) => {
    // Fetch user data for audience matching
    const mockUser = mockGetUser();
    let userTier = "free";
    let isVitalicio = false;
    let activeAddons: string[] = [];

    if (mockUser?.email) {
      const { data: userData } = await supabase
        .from("users")
        .select("id, main_tier, is_vitalicio")
        .eq("email", mockUser.email.toLowerCase().trim())
        .maybeSingle();
      if (userData) {
        userTier = userData.main_tier;
        isVitalicio = userData.is_vitalicio;
        const { data: ents } = await supabase
          .from("entitlements")
          .select("product_key")
          .eq("user_id", userData.id)
          .eq("status", "active");
        activeAddons = (ents ?? []).map((e: any) => e.product_key);
      }
    }

    // Helper to check audience match
    const checkAudience = async (card: any): Promise<boolean> => {
      const criteria = parseAudience(card.target_audience);
      if (criteria.length === 0) return true;
      return matchesAudienceCriteria(criteria, userTier, isVitalicio, activeAddons);
    };

    // 1. Try house-specific pay card
    if (house?.id) {
      const { data } = await supabase
        .from("pay_cards" as any)
        .select("*")
        .eq("associated_plan", plan)
        .eq("betting_house_id", house.id)
        .eq("is_active", true)
        .limit(10);
      
      for (const card of (data ?? []) as any[]) {
        if (await checkAudience(card)) {
          setPayCard(card as any as PayCardData);
          setOpen(true);
          return true;
        }
      }
    }

    // 2. Fallback to generic (null house)
    const { data: generic } = await supabase
      .from("pay_cards" as any)
      .select("*")
      .eq("associated_plan", plan)
      .is("betting_house_id", null)
      .eq("is_active", true)
      .limit(10);

    for (const card of (generic ?? []) as any[]) {
      if (await checkAudience(card)) {
        setPayCard(card as any as PayCardData);
        setOpen(true);
        return true;
      }
    }

    console.warn(`[usePayCardTrigger] No matching pay card found for plan: ${plan}`);
    return false;
  }, [house?.id]);

  const closePayCard = useCallback(() => {
    setOpen(false);
    setPayCard(null);
  }, []);

  return { triggerPayCard, payCard, open, closePayCard };
}
