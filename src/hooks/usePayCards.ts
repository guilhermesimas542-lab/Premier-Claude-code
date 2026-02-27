import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FunnelQuestion } from "@/admin/components/funnel-popup/types";

export interface PayCardData {
  id: string;
  name: string;
  associated_plan: string;
  has_intro_popup: boolean;
  popup_config: { title?: string; text?: string; image_url?: string; cta_text?: string } | null;
  quiz_questions: FunnelQuestion[] | null;
  checkout_config: { product_id?: string; title?: string; benefits?: string[]; checkout_url?: string } | null;
  is_active: boolean;
}

export function usePayCardByPlan() {
  const [loading, setLoading] = useState(false);

  const fetchByPlan = useCallback(async (plan: string): Promise<PayCardData | null> => {
    setLoading(true);
    const { data } = await supabase
      .from("pay_cards" as any)
      .select("*")
      .eq("associated_plan", plan)
      .eq("is_active", true)
      .limit(1)
      .single();
    setLoading(false);
    return (data as any as PayCardData) ?? null;
  }, []);

  return { fetchByPlan, loading };
}
