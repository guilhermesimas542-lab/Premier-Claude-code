import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AudienceFilters } from "./useAudiences";
import {
  hasBehaviorFilter,
  resolveBehaviorUserIds,
} from "../../lib/crm/resolveBehaviorAudience";

/**
 * Conta quantos leads na tabela `users` batem com os filtros, em tempo real (debounced 500ms).
 *
 * Aplica filtros progressivamente:
 *   - plans         → users.main_tier IN (...)
 *   - days_since_login → users.last_seen_at relativo a NOW
 *   - status        → "active" (last_seen_at recente), "inactive", "churn_risk"
 *   - origin        → users.origin (ainda não existe; ignorado por enquanto)
 *   - opt_ins       → users.opt_ins (ainda não existe; ignorado por enquanto)
 *
 * Status calculado:
 *   - active:      last_seen_at <= 7 dias
 *   - inactive:    last_seen_at entre 7 e 30 dias
 *   - churn_risk:  last_seen_at > 30 dias OU nunca logou
 */
export function usePreviewAudience(filters: AudienceFilters, enabled = true) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      // Behavior: resolve user_ids antes (intersecciona com a query users)
      let behaviorUserIds: string[] | null = null;
      if (hasBehaviorFilter(filters.behavior)) {
        const r = await resolveBehaviorUserIds(filters.behavior!);
        if (cancelled) return;
        behaviorUserIds = r.user_ids;
        if (behaviorUserIds.length === 0) {
          setCount(0);
          setLoading(false);
          return;
        }
      }

      let q: any = (supabase as any).from("users").select("id", { count: "exact", head: true });

      if (behaviorUserIds) {
        q = q.in("id", behaviorUserIds);
      }

      // Plans
      if (filters.plans && filters.plans.length > 0) {
        q = q.in("main_tier", filters.plans);
      }

      // Days since login: traduzido pra range em last_seen_at
      if (filters.days_since_login) {
        const now = new Date();
        if (typeof filters.days_since_login.gte === "number") {
          // "dias sem login >= X" → last_seen_at <= NOW - X dias
          const cutoff = new Date(now.getTime() - filters.days_since_login.gte * 86400000);
          q = q.lte("last_seen_at", cutoff.toISOString());
        }
        if (typeof filters.days_since_login.lte === "number") {
          // "dias sem login <= Y" → last_seen_at >= NOW - Y dias
          const cutoff = new Date(now.getTime() - filters.days_since_login.lte * 86400000);
          q = q.gte("last_seen_at", cutoff.toISOString());
        }
      }

      // Status comportamental (sobrescreve days_since_login se ambos vierem)
      if (filters.status && filters.status.length > 0) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

        // Se múltiplos status, vamos usar OR
        const orConditions: string[] = [];
        if (filters.status.includes("active")) {
          orConditions.push(`last_seen_at.gte.${sevenDaysAgo}`);
        }
        if (filters.status.includes("inactive")) {
          orConditions.push(
            `and(last_seen_at.lt.${sevenDaysAgo},last_seen_at.gte.${thirtyDaysAgo})`
          );
        }
        if (filters.status.includes("churn_risk")) {
          orConditions.push(`last_seen_at.lt.${thirtyDaysAgo}`);
          orConditions.push(`last_seen_at.is.null`);
        }
        if (orConditions.length > 0) {
          q = q.or(orConditions.join(","));
        }
      }

      const { count: c, error: err } = await q;
      if (cancelled) return;
      if (err) {
        console.error("[usePreviewAudience] Erro na query:", err, "filters:", filters);
        setError(err.message);
        setCount(null);
      } else {
        setCount(c ?? 0);
      }
      setLoading(false);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [JSON.stringify(filters), enabled]);

  return { count, loading, error };
}
