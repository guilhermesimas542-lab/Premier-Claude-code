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
  checkout_config: { product_id?: string; title?: string; benefits?: string[]; checkout_url?: string; checkout_url_2?: string; checkout_label_1?: string; checkout_label_2?: string } | null;
  is_active: boolean;
  betting_house_id: string | null;
  button_color: string | null;
  checkout_template: string | null;
  checkout_final_config: Record<string, any> | null;
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
