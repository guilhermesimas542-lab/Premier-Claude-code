import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

export interface CrmPopupContent {
  title?: string | null;
  body?: string | null;
  cta?: {
    text?: string | null;
    url?: string | null;
  } | null;
}

export interface CrmPopupDelivery {
  id: string;
  schedule_id: string | null;
  user_id: string;
  content: CrmPopupContent;
  status: "pending" | "shown" | "clicked" | "dismissed";
}

async function resolveUserId(): Promise<string | null> {
  const u = mockGetUser();
  if (!u?.email) return null;
  if (u.dbId) return u.dbId;
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", u.email.toLowerCase().trim())
    .maybeSingle();
  return (data?.id as string) ?? null;
}

/**
 * Carrega no máximo 1 delivery pendente do CRM por carregamento.
 * O consumidor:
 *   - chama markShown() ao exibir
 *   - chama markClicked() ao clicar no CTA
 *   - chama markDismissed() ao fechar sem clicar
 *   - chama clear() para liberar memória (não muda status no banco)
 */
export function useCrmPopupQueue() {
  const [delivery, setDelivery] = useState<CrmPopupDelivery | null>(null);
  const fetchedOnceRef = useRef(false);
  const actedRef = useRef(false);

  useEffect(() => {
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;

    let cancelled = false;
    (async () => {
      const userId = await resolveUserId();
      if (!userId || cancelled) return;
      const { data, error } = await supabase
        .from("crm_popup_deliveries" as any)
        .select("id, schedule_id, user_id, content, status")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error || !data || cancelled) return;
      setDelivery(data as unknown as CrmPopupDelivery);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const markShown = useCallback(async (id: string) => {
    await supabase
      .from("crm_popup_deliveries" as any)
      .update({ status: "shown", shown_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending");
  }, []);

  const markClicked = useCallback(async (id: string) => {
    actedRef.current = true;
    await supabase
      .from("crm_popup_deliveries" as any)
      .update({ status: "clicked", acted_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  const markDismissed = useCallback(async (id: string) => {
    if (actedRef.current) return; // já clicou: não sobrescreve
    await supabase
      .from("crm_popup_deliveries" as any)
      .update({ status: "dismissed", acted_at: new Date().toISOString() })
      .eq("id", id)
      .neq("status", "clicked");
  }, []);

  const clear = useCallback(() => {
    setDelivery(null);
  }, []);

  return { delivery, markShown, markClicked, markDismissed, clear };
}
