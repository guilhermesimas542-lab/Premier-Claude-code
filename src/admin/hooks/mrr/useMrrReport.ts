import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PREMIER_PRODUCT_IDS,
  PREMIER_PRODUCT_NAMES,
  SALE_EVENTS,
  REFUND_EVENTS,
  CHARGEBACK_EVENTS,
} from "@/admin/components/revenue/constants";

export type MrrTimeframe = "7d" | "30d" | "90d" | "custom";

export interface MrrSeriePoint {
  date: string; // YYYY-MM-DD
  mrr: number;
}

export interface MrrReport {
  mrrAcumulado: number;
  numVendas: number;
  numReembolsadas: number;
  numChargebacks: number;
  churnPct: number;
  serie: MrrSeriePoint[];
}

const EMPTY: MrrReport = {
  mrrAcumulado: 0,
  numVendas: 0,
  numReembolsadas: 0,
  numChargebacks: 0,
  churnPct: 0,
  serie: [],
};

function timeframeToRange(
  timeframe: MrrTimeframe,
  customStart?: string,
  customEnd?: string,
): { startISO: string; endISO?: string } {
  if (timeframe === "custom" && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }
  const days = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
  return { startISO: new Date(Date.now() - days * 86400000).toISOString() };
}

export function useMrrReport(
  timeframe: MrrTimeframe,
  customStart?: string,
  customEnd?: string,
) {
  const [data, setData] = useState<MrrReport>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);

    const noProduct =
      PREMIER_PRODUCT_IDS.length === 0 && PREMIER_PRODUCT_NAMES.length === 0;
    if (noProduct) {
      setData(EMPTY);
      setIsLoading(false);
      return;
    }

    const { startISO, endISO } = timeframeToRange(timeframe, customStart, customEnd);

    let q: any = (supabase.from as any)("financial_events")
      .select("value_cents, event_name, created_at, product_id, product_name")
      .eq("is_test", false)
      .gte("created_at", startISO);
    if (endISO) q = q.lte("created_at", endISO);

    const { data: rows, error } = await q;
    if (error || !rows) {
      setData(EMPTY);
      setIsLoading(false);
      return;
    }

    const filtered = (rows as any[]).filter((r) => {
      const byId = r.product_id && PREMIER_PRODUCT_IDS.includes(r.product_id);
      const byName = r.product_name && PREMIER_PRODUCT_NAMES.includes(r.product_name);
      return byId || byName;
    });

    let mrrCents = 0;
    let numVendas = 0;
    let numReembolsadas = 0;
    let numChargebacks = 0;
    const byDay = new Map<string, number>();

    for (const r of filtered) {
      const ev = r.event_name as string;
      if (SALE_EVENTS.includes(ev)) {
        const cents = Number(r.value_cents || 0);
        mrrCents += cents;
        numVendas += 1;
        const day = new Date(r.created_at).toISOString().slice(0, 10);
        byDay.set(day, (byDay.get(day) || 0) + cents);
      }
      if (REFUND_EVENTS.includes(ev)) numReembolsadas += 1;
      if (CHARGEBACK_EVENTS.includes(ev)) numChargebacks += 1;
    }

    const serie: MrrSeriePoint[] = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cents]) => ({ date, mrr: cents / 100 }));

    const churnPct =
      numVendas > 0 ? ((numReembolsadas + numChargebacks) / numVendas) * 100 : 0;

    setData({
      mrrAcumulado: mrrCents / 100,
      numVendas,
      numReembolsadas,
      numChargebacks,
      churnPct,
      serie,
    });
    setIsLoading(false);
  }, [timeframe, customStart, customEnd]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, refetch: load };
}
