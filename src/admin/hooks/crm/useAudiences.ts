import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Estrutura dos filtros de audiência (armazenada como jsonb em crm_audiences.filters).
 * Pode crescer no futuro sem migration — só adiciona novas chaves.
 */
export interface AudienceFilters {
  /** Multi-select de planos. Ex: ['free', 'premium', 'diamante'] */
  plans?: string[];
  /** Range de dias sem login. gte=mínimo, lte=máximo (inclusive). */
  days_since_login?: {
    gte?: number;
    lte?: number;
  };
  /** Multi-select de status comportamental. */
  status?: Array<"active" | "inactive" | "churn_risk">;
  /** Origem dos dados. */
  origin?: "payt" | "db_app" | "both";
  /** Opt-ins por canal. Multi-select. */
  opt_ins?: string[];
  /**
   * Filtros baseados em comportamento na IA Tipster — exige cruzamento com
   * tabela `events`. Resolvido via helper `resolveBehaviorUserIds`.
   */
  behavior?: AudienceBehaviorFilter;
}

export interface AudienceBehaviorFilter {
  /** Janela de tempo pra avaliar comportamento (em dias). Default 30. */
  window_days?: number;
  /** Pelo menos uma análise de qualquer dessas ligas. */
  league_names?: string[];
  /** Pelo menos uma análise consumindo qualquer destes mercados. */
  markets?: string[];
  /** Pelo menos uma análise em jogo envolvendo qualquer destes times (home ou away). */
  team_names?: string[];
  /** Origem da análise: chat, ao vivo ou qualquer. */
  source?: "chat" | "live" | "any";
  /** Mínimo de análises geradas na janela. */
  min_analyses?: number;
  /** Dias desde a ÚLTIMA análise (útil pra re-engajamento). */
  last_analysis_age_days?: {
    gte?: number;
    lte?: number;
  };
}

export type AudienceKind = "dynamic" | "static_list";

export interface Audience {
  id: string;
  name: string;
  description: string | null;
  kind: AudienceKind;
  filters: AudienceFilters;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Quando kind = static_list, contagem agregada de membros. */
  members_count?: number;
}

export interface NewAudiencePayload {
  name: string;
  description?: string | null;
  kind?: AudienceKind;
  filters: AudienceFilters;
}

/**
 * Hook de CRUD para audiências CRM.
 * Direct supabase.from() — RLS is_admin() na tabela protege o acesso.
 */
export function useAudiences() {
  const [items, setItems] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await (supabase as any)
      .from("crm_audiences")
      .select(
        `id, name, description, kind, filters, created_by, created_at, updated_at,
         members_count:crm_audience_members(count)`
      )
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      toast.error(`Erro ao carregar audiências: ${err.message}`);
    } else {
      // Normaliza o subselect count → number
      const normalized = (data ?? []).map((a: any) => ({
        ...a,
        members_count: Array.isArray(a.members_count)
          ? a.members_count[0]?.count ?? 0
          : 0,
      }));
      setItems(normalized as Audience[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (payload: NewAudiencePayload): Promise<Audience | null> => {
      const { data, error: err } = await (supabase as any)
        .from("crm_audiences")
        .insert({
          name: payload.name,
          description: payload.description ?? null,
          kind: payload.kind ?? "dynamic",
          filters: payload.filters,
        })
        .select()
        .single();
      if (err) {
        toast.error(`Erro ao criar audiência: ${err.message}`);
        return null;
      }
      toast.success("Audiência criada com sucesso");
      await load();
      return data as Audience;
    },
    [load]
  );

  const update = useCallback(
    async (id: string, payload: Partial<NewAudiencePayload>): Promise<boolean> => {
      const { error: err } = await (supabase as any)
        .from("crm_audiences")
        .update(payload)
        .eq("id", id);
      if (err) {
        toast.error(`Erro ao atualizar: ${err.message}`);
        return false;
      }
      toast.success("Audiência atualizada");
      await load();
      return true;
    },
    [load]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error: err } = await (supabase as any)
        .from("crm_audiences")
        .delete()
        .eq("id", id);
      if (err) {
        toast.error(`Erro ao excluir: ${err.message}`);
        return false;
      }
      toast.success("Audiência excluída");
      await load();
      return true;
    },
    [load]
  );

  return { items, loading, error, refresh: load, create, update, remove };
}
