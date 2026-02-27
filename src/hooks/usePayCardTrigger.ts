import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserBettingHouse } from "./useUserBettingHouse";
import type { PayCardData } from "./usePayCards";

export function usePayCardTrigger() {
  const { house } = useUserBettingHouse();
  const [payCard, setPayCard] = useState<PayCardData | null>(null);
  const [open, setOpen] = useState(false);

  const triggerPayCard = useCallback(async (plan: string) => {
    // 1. Try house-specific pay card
    if (house?.id) {
      const { data } = await supabase
        .from("pay_cards" as any)
        .select("*")
        .eq("associated_plan", plan)
        .eq("betting_house_id", house.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (data) {
        setPayCard(data as any as PayCardData);
        setOpen(true);
        return true;
      }
    }

    // 2. Fallback to generic (null house)
    const { data: generic } = await supabase
      .from("pay_cards" as any)
      .select("*")
      .eq("associated_plan", plan)
      .is("betting_house_id", null)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (generic) {
      setPayCard(generic as any as PayCardData);
      setOpen(true);
      return true;
    }

    console.warn(`[usePayCardTrigger] No pay card found for plan: ${plan}`);
    return false;
  }, [house?.id]);

  const closePayCard = useCallback(() => {
    setOpen(false);
    setPayCard(null);
  }, []);

  return { triggerPayCard, payCard, open, closePayCard };
}
