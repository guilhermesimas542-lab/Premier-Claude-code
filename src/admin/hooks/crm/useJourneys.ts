import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { JourneyStatus, TriggerKey } from "../../lib/crm/triggers";
import type { ChannelKey } from "../../lib/crm/channels";
import type { AudienceFilters } from "./useAudiences";

export interface JourneyStats {
  active?: number;
  completed?: number;
  cancelled?: number;
  churned?: number;
  completion_rate?: number;
}

export interface Journey {
  id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerKey;
  trigger_config: Record<string, any>;
  audience_id: string | null;
  audience_filters: AudienceFilters | null;
  status: JourneyStatus;
  /** Canal fixo da jornada. null = jornada legada (mista). */
  channel: ChannelKey | null;
  stats: JourneyStats;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  audience?: { id: string; name: string } | null;
  /** Contagem de steps (vem via subquery). */
  step_count?: number;
}

export interface NewJourneyPayload {
  name: string;
  description?: string;
  trigger_type: TriggerKey;
  trigger_config?: Record<string, any>;
  audience_id?: string | null;
  audience_filters?: AudienceFilters | null;
  status?: JourneyStatus;
  channel?: ChannelKey | null;
}

export interface JourneysFilter {
  status?: JourneyStatus;
  trigger_type?: TriggerKey;
  channel?: ChannelKey;
}

/** Códigos de erro que indicam que a tabela ainda não existe.
 *   - 42P01: PostgreSQL puro "relation does not exist"
 *   - PGRST205: PostgREST "table not in schema cache" (mais comum via Supabase REST)
 */
function isTableMissing(err: any): boolean {
  const code = err?.code;
  if (code === "42P01" || code === "PGRST205") return true;
  const msg = (err?.message ?? "").toLowerCase();
  return msg.includes("could not find the table") || msg.includes("schema cache");
}

/**
 * Hook de CRUD para jornadas CRM.
 *
 * Inclui sinalização `schemaMissing=true` quando a tabela `crm_journeys` ainda
 * não foi aplicada em produção (Sub-fase 2.1 entregou o SQL como arquivo local).
 */
export function useJourneys(initialFilter: JourneysFilter = {}) {
  const [items, setItems] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [filter, setFilter] = useState<JourneysFilter>(initialFilter);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSchemaMissing(false);

    let q: any = (supabase as any)
      .from("crm_journeys")
      .select(
        `
        id, name, description, trigger_type, trigger_config,
        audience_id, audience_filters, status, stats, channel,
        created_by, created_at, updated_at,
        audience:crm_audiences ( id, name, kind, filters ),
        step_count:crm_journey_steps ( count )
      `
      )
      .order("created_at", { ascending: false });

    if (filter.status) q = q.eq("status", filter.status);
    if (filter.trigger_type) q = q.eq("trigger_type", filter.trigger_type);
    if (filter.channel) q = q.eq("channel", filter.channel);

    const { data, error: err } = await q;

    if (err) {
      if (isTableMissing(err)) {
        // Schema da 2.1 ainda não foi aplicado em produção — não é bug, só pendência
        setSchemaMissing(true);
        setItems([]);
        setLoading(false);
        return;
      }
      console.error("[useJourneys] Erro:", err);
      setError(err.message);
      toast.error(`Erro ao carregar jornadas: ${err.message}`);
    } else {
      const normalized = (data ?? []).map((j: any) => ({
        ...j,
        step_count: Array.isArray(j.step_count) ? j.step_count[0]?.count ?? 0 : 0,
      }));
      setItems(normalized as Journey[]);
    }
    setLoading(false);
  }, [JSON.stringify(filter)]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (payload: NewJourneyPayload): Promise<Journey | null> => {
      const { data, error: err } = await (supabase as any)
        .from("crm_journeys")
        .insert({
          name: payload.name,
          description: payload.description ?? null,
          trigger_type: payload.trigger_type,
          trigger_config: payload.trigger_config ?? {},
          audience_id: payload.audience_id ?? null,
          audience_filters: payload.audience_filters ?? null,
          status: payload.status ?? "draft",
          channel: payload.channel ?? null,
        })
        .select()
        .single();
      if (err) {
        if (isTableMissing(err)) {
          setSchemaMissing(true);
          toast.error("Schema das jornadas ainda não foi aplicado em produção.");
        } else {
          console.error("[useJourneys.create] Erro:", err);
          toast.error(`Erro ao criar jornada: ${err.message}`);
        }
        return null;
      }
      toast.success("Jornada criada");
      await load();
      return data as Journey;
    },
    [load]
  );

  const update = useCallback(
    async (id: string, payload: Partial<NewJourneyPayload>): Promise<boolean> => {
      const { error: err } = await (supabase as any)
        .from("crm_journeys")
        .update(payload)
        .eq("id", id);
      if (err) {
        console.error("[useJourneys.update] Erro:", err);
        toast.error(`Erro ao atualizar: ${err.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  const duplicate = useCallback(
    async (id: string): Promise<Journey | null> => {
      const source = items.find((j) => j.id === id);
      if (!source) return null;
      return await create({
        name: `${source.name} (cópia)`,
        description: source.description ?? undefined,
        trigger_type: source.trigger_type,
        trigger_config: source.trigger_config,
        audience_id: source.audience_id,
        audience_filters: source.audience_filters,
        status: "draft",
        channel: source.channel,
      });
    },
    [items, create]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error: err } = await (supabase as any)
        .from("crm_journeys")
        .delete()
        .eq("id", id);
      if (err) {
        toast.error(`Erro ao excluir: ${err.message}`);
        return false;
      }
      toast.success("Jornada excluída");
      await load();
      return true;
    },
    [load]
  );

  const setStatus = useCallback(
    async (id: string, status: JourneyStatus): Promise<boolean> => {
      return await update(id, { status });
    },
    [update]
  );

  return {
    items,
    loading,
    error,
    schemaMissing,
    filter,
    setFilter,
    refresh: load,
    create,
    update,
    duplicate,
    remove,
    setStatus,
  };
}
