import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

export interface CrmPopupContent {
  title?: string | null;
  body?: string | null;
  image_url?: string | null;
  link_url?: string | null;
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
  status: "pending" | "shown" | "clicked" | "dismissed" | "expired";
  max_views: number;
  view_count: number;
  expires_at: string | null;
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
 * Fila de popups CRM. Carrega TODAS as deliveries pendentes do usuário,
 * empilhando-as em ordem cronológica. O consumidor exibe uma de cada vez
 * e chama os marks correspondentes; quando view_count atinge max_views,
 * a delivery vira 'shown' e não volta a aparecer.
 *
 * Também marca como 'expired' qualquer delivery cujo expires_at já passou.
 */
export function useCrmPopupQueue() {
  const [queue, setQueue] = useState<CrmPopupDelivery[]>([]);
  const fetchedOnceRef = useRef(false);
  const actedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;

    let cancelled = false;
    (async () => {
      const userId = await resolveUserId();
      if (!userId || cancelled) return;

      const nowIso = new Date().toISOString();

      // Marca como 'expired' qualquer pendente cujo expires_at já passou.
      // (Limpa a fila do lead antes de carregar.)
      await supabase
        .from("crm_popup_deliveries" as any)
        .update({ status: "expired" })
        .eq("user_id", userId)
        .eq("status", "pending")
        .not("expires_at", "is", null)
        .lt("expires_at", nowIso);

      const { data, error } = await supabase
        .from("crm_popup_deliveries" as any)
        .select(
          "id, schedule_id, user_id, content, status, max_views, view_count, expires_at"
        )
        .eq("user_id", userId)
        .eq("status", "pending")
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("created_at", { ascending: true });

      if (error || !data || cancelled) return;
      setQueue(data as unknown as CrmPopupDelivery[]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Incrementa view_count. Quando atinge max_views, marca status='shown'
   * para que essa delivery não apareça em sessões futuras.
   */
  const markShown = useCallback(async (delivery: CrmPopupDelivery) => {
    const nextCount = (delivery.view_count ?? 0) + 1;
    const reachedMax = nextCount >= (delivery.max_views ?? 1);
    await supabase
      .from("crm_popup_deliveries" as any)
      .update({
        view_count: nextCount,
        status: reachedMax ? "shown" : "pending",
        shown_at: new Date().toISOString(),
      })
      .eq("id", delivery.id);
  }, []);

  const markClicked = useCallback(async (id: string) => {
    actedRef.current.add(id);
    await supabase
      .from("crm_popup_deliveries" as any)
      .update({ status: "clicked", acted_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  const markDismissed = useCallback(async (id: string) => {
    if (actedRef.current.has(id)) return; // já clicou: não sobrescreve
    // Só mata definitivamente se já bateu o max_views (já está 'shown');
    // caso contrário deixamos como 'pending' para aparecer da próxima vez.
    const delivery = queue.find((d) => d.id === id);
    const reachedMax =
      delivery && (delivery.view_count ?? 0) + 1 >= (delivery.max_views ?? 1);
    if (reachedMax) {
      await supabase
        .from("crm_popup_deliveries" as any)
        .update({ status: "dismissed", acted_at: new Date().toISOString() })
        .eq("id", id)
        .neq("status", "clicked");
    }
  }, [queue]);

  /** Remove a primeira delivery da fila local (após exibir). */
  const shift = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  return { queue, markShown, markClicked, markDismissed, shift };
}
