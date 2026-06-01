import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunnelPopup, FunnelPopupData } from "@/components/FunnelPopup";
import { mockGetUser } from "@/mocks/user";
import { useCrmPopupQueue, type CrmPopupDelivery } from "@/hooks/useCrmPopupQueue";

/**
 * Converte uma delivery do CRM no formato esperado pelo FunnelPopup
 * (sem imagem, sem quiz, template default com title + body como benefício + CTA).
 */
function crmDeliveryToFunnelPopupData(d: CrmPopupDelivery): FunnelPopupData {
  const ctaUrl = d.content?.cta?.url ?? null;
  const ctaText = d.content?.cta?.text ?? null;
  return {
    id: `crm:${d.id}`,
    type: "crm_popup",
    image_url: null,
    button_url: null,
    question_1_text: null,
    question_1_options: null,
    question_2_text: null,
    question_2_options: null,
    question_3_text: null,
    question_3_options: null,
    final_title: d.content?.title ?? "Premier FC",
    final_benefits: d.content?.body ? [d.content.body] : [],
    checkout_link: ctaUrl,
    final_template: "default",
    final_config: ctaText ? { button_text: ctaText } : {},
  };
}

interface FunnelPopupContextValue {
  openPopup: (type: string) => Promise<void>;
  openPopupForHouse: (type: string, houseId: string) => Promise<void>;
}

const FunnelPopupContext = createContext<FunnelPopupContextValue>({
  openPopup: async () => {},
  openPopupForHouse: async () => {},
});

export function FunnelPopupProvider({ children }: { children: ReactNode }) {
  const [activePopup, setActivePopup] = useState<FunnelPopupData | null>(null);

  const fetchPopup = useCallback(async (type: string, houseId: string | null) => {
    let query = supabase
      .from("popups" as any)
      .select("*")
      .eq("type", type)
      .eq("is_active", true);

    if (houseId) {
      query = (query as any).eq("betting_house_id", houseId);
    } else {
      query = (query as any).is("betting_house_id", null);
    }

    const { data } = await (query as any).maybeSingle();

    // Fallback: try without house filter
    if (!data && houseId) {
      const { data: fallback } = await supabase
        .from("popups" as any)
        .select("*")
        .eq("type", type)
        .eq("is_active", true)
        .is("betting_house_id", null)
        .maybeSingle() as any;
      if (fallback) setActivePopup(fallback as FunnelPopupData);
      return;
    }

    if (data) setActivePopup(data as FunnelPopupData);
  }, []);

  const openPopup = useCallback(async (type: string) => {
    const user = mockGetUser();
    let houseId: string | null = null;

    if (user?.email) {
      const { data } = await supabase
        .from("users")
        .select("betting_house_id")
        .eq("email", user.email)
        .maybeSingle();
      houseId = data?.betting_house_id ?? null;
    }

    await fetchPopup(type, houseId);
  }, [fetchPopup]);

  const openPopupForHouse = useCallback(async (type: string, houseId: string) => {
    await fetchPopup(type, houseId);
  }, [fetchPopup]);

  return (
    <FunnelPopupContext.Provider value={{ openPopup, openPopupForHouse }}>
      {children}
      {activePopup && (
        <FunnelPopup popup={activePopup} onClose={() => setActivePopup(null)} />
      )}
    </FunnelPopupContext.Provider>
  );
}

export const useFunnelPopup = () => useContext(FunnelPopupContext);
