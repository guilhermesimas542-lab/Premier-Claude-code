import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * 9.5 — Atribuição de conversão por etapa.
 * Lê financial_events (Purchase_Order_Confirmed, Recurrent_Payment) e marca o
 * crm_journey_step_events de mensagem mais recente daquele lead (dentro da
 * janela) como convertido. Não duplica order_id.
 */

export const ATTRIBUTION_WINDOW_DAYS = 7;

type SentEvent = {
  id: string;
  enrollment_id: string;
  step_id: string;
  created_at: string;
  conversion_order_id: string | null;
};

export async function attributeConversions(
  journeyId: string,
  windowDays: number = ATTRIBUTION_WINDOW_DAYS
): Promise<{ matched: number; skipped: number } | null> {
  // 1) enrollments da jornada
  const { data: enrolls, error: enrErr } = await (supabase as any)
    .from("crm_journey_enrollments")
    .select("id, user_id")
    .eq("journey_id", journeyId);

  if (enrErr) {
    console.error("[attributeConversions] enrollments:", enrErr);
    return null;
  }
  const list = (enrolls ?? []) as Array<{ id: string; user_id: string }>;
  if (list.length === 0) return { matched: 0, skipped: 0 };

  const userIds = Array.from(new Set(list.map((e) => e.user_id)));
  const userByEnrollment = new Map(list.map((e) => [e.id, e.user_id]));

  // 2) emails dos leads
  const { data: users } = await (supabase as any)
    .from("users")
    .select("id, email")
    .in("id", userIds);

  const emailByUser = new Map<string, string>();
  const userByEmail = new Map<string, string>();
  for (const u of (users ?? []) as Array<{ id: string; email: string | null }>) {
    const em = (u.email ?? "").toLowerCase().trim();
    if (!em) continue;
    emailByUser.set(u.id, em);
    userByEmail.set(em, u.id);
  }
  if (userByEmail.size === 0) return { matched: 0, skipped: 0 };

  // 3) envios de mensagem já enviados, ordenados desc
  const enrollmentIds = list.map((e) => e.id);
  const { data: events } = await (supabase as any)
    .from("crm_journey_step_events")
    .select("id, enrollment_id, step_id, created_at, conversion_order_id, status")
    .in("enrollment_id", enrollmentIds)
    .eq("status", "sent")
    .order("created_at", { ascending: false });

  const sentEvents = (events ?? []) as SentEvent[];
  const eventsByUser = new Map<string, SentEvent[]>();
  for (const ev of sentEvents) {
    const uid = userByEnrollment.get(ev.enrollment_id);
    if (!uid) continue;
    if (!eventsByUser.has(uid)) eventsByUser.set(uid, []);
    eventsByUser.get(uid)!.push(ev);
  }

  const alreadyAttributed = new Set<string>(
    sentEvents.filter((e) => e.conversion_order_id).map((e) => e.conversion_order_id!)
  );

  // 4) financial_events dos emails
  const emails = Array.from(userByEmail.keys());
  const { data: fevents } = await (supabase as any)
    .from("financial_events")
    .select("email, event_name, value_cents, order_id, created_at")
    .in("email", emails)
    .in("event_name", ["Purchase_Order_Confirmed", "Recurrent_Payment"])
    .eq("is_test", false);

  const windowMs = Math.max(1, windowDays) * 86400000;
  const updates: Array<{
    id: string;
    conversion_order_id: string;
    converted_at: string;
    conversion_value_cents: number | null;
  }> = [];
  let skipped = 0;

  // ordena financeiros desc pra atribuir as compras mais recentes primeiro
  const sortedFevents = ((fevents ?? []) as Array<any>).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const fe of sortedFevents) {
    const orderId: string | null = fe.order_id;
    if (!orderId) {
      skipped++;
      continue;
    }
    if (alreadyAttributed.has(orderId)) {
      skipped++;
      continue;
    }
    const uid = userByEmail.get((fe.email ?? "").toLowerCase().trim());
    if (!uid) {
      skipped++;
      continue;
    }
    const userEvents = eventsByUser.get(uid);
    if (!userEvents || userEvents.length === 0) {
      skipped++;
      continue;
    }
    const purchaseTime = new Date(fe.created_at).getTime();
    const match = userEvents.find((ev) => {
      const t = new Date(ev.created_at).getTime();
      return t <= purchaseTime && purchaseTime - t <= windowMs;
    });
    if (!match) {
      skipped++;
      continue;
    }
    updates.push({
      id: match.id,
      conversion_order_id: orderId,
      converted_at: fe.created_at,
      conversion_value_cents:
        typeof fe.value_cents === "number" ? fe.value_cents : fe.value_cents ? Number(fe.value_cents) : null,
    });
    alreadyAttributed.add(orderId);
  }

  // 5) aplica updates
  for (const u of updates) {
    const { error: upErr } = await (supabase as any)
      .from("crm_journey_step_events")
      .update({
        converted: true,
        converted_at: u.converted_at,
        conversion_value_cents: u.conversion_value_cents,
        conversion_order_id: u.conversion_order_id,
      })
      .eq("id", u.id);
    if (upErr) console.error("[attributeConversions] update:", upErr);
  }

  return { matched: updates.length, skipped };
}

export function useJourneyConversions() {
  const [busy, setBusy] = useState(false);

  const recalc = useCallback(async (journeyId: string) => {
    setBusy(true);
    try {
      const r = await attributeConversions(journeyId);
      if (r) {
        toast.success(
          `${r.matched} conversão${r.matched === 1 ? "" : "ões"} atribuída${
            r.matched === 1 ? "" : "s"
          }${r.skipped > 0 ? ` · ${r.skipped} ignoradas` : ""}`
        );
      } else {
        toast.error("Erro ao recalcular conversões.");
      }
      return r;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, recalc };
}
