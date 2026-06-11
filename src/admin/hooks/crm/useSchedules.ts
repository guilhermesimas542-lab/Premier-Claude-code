import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChannelKey, ScheduleStatus } from "../../lib/crm/channels";
import type { AudienceFilters } from "./useAudiences";

export interface Schedule {
  id: string;
  name: string;
  channel: ChannelKey;
  audience_id: string | null;
  audience_filters: AudienceFilters | null;
  /** Estrutura varia por canal: Email = {subject, body, html}, SMS = {body}, etc. */
  content: Record<string, any>;
  scheduled_at: string | null;
  sent_at: string | null;
  status: ScheduleStatus;
  reach_count: number;
  delivered_count: number;
  failed_count: number;
  open_count: number;
  click_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Audiência expandida (vem do JOIN quando audience_id != null). */
  audience?: { id: string; name: string } | null;
}

export interface NewSchedulePayload {
  name: string;
  channel: ChannelKey;
  audience_id?: string | null;
  audience_filters?: AudienceFilters | null;
  content: Record<string, any>;
  scheduled_at?: string | null;
  status?: ScheduleStatus;
}

export interface SchedulesFilter {
  channel?: ChannelKey;
  status?: ScheduleStatus;
  /** Busca por nome (partial match) */
  name?: string;
  /** Qual campo de data usar: created_at ou scheduled_at */
  dateField?: "created_at" | "scheduled_at";
  /** ISO date string (início) */
  from?: string;
  /** ISO date string (fim) */
  to?: string;
}

/**
 * Hook de CRUD para schedules CRM.
 * Inclui JOIN com crm_audiences pra mostrar o nome da audiência salva.
 */
export function useSchedules(initialFilter: SchedulesFilter = {}) {
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SchedulesFilter>(initialFilter);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    let q: any = (supabase as any)
      .from("crm_schedules")
      .select(
        `
        id, name, channel, audience_id, audience_filters, content,
        scheduled_at, sent_at, status,
        reach_count, delivered_count, failed_count, open_count, click_count,
        created_by, created_at, updated_at,
        audience:crm_audiences ( id, name, kind )
      `
      )
      .order("created_at", { ascending: false });

    if (filter.channel) q = q.eq("channel", filter.channel);
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.name) q = q.ilike("name", `%${filter.name}%`);

    const dateCol = filter.dateField ?? "created_at";
    if (filter.from) q = q.gte(dateCol, filter.from);
    if (filter.to) {
      // Adiciona um dia para incluir o dia todo no filtro
      const end = new Date(filter.to);
      end.setDate(end.getDate() + 1);
      q = q.lt(dateCol, end.toISOString());
    }

    const { data, error: err } = await q;
    if (err) {
      console.error("[useSchedules] Erro:", err);
      setError(err.message);
      toast.error(`Erro ao carregar schedules: ${err.message}`);
    } else {
      setItems((data ?? []) as Schedule[]);
    }
    setLoading(false);
  }, [JSON.stringify(filter)]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (payload: NewSchedulePayload): Promise<Schedule | null> => {
      const { data, error: err } = await (supabase as any)
        .from("crm_schedules")
        .insert({
          name: payload.name,
          channel: payload.channel,
          audience_id: payload.audience_id ?? null,
          audience_filters: payload.audience_filters ?? null,
          content: payload.content,
          scheduled_at: payload.scheduled_at ?? null,
          status: payload.status ?? "draft",
        })
        .select()
        .single();
      if (err) {
        console.error("[useSchedules.create] Erro:", err);
        toast.error(`Erro ao criar schedule: ${err.message}`);
        return null;
      }
      toast.success("Schedule criado");
      await load();
      return data as Schedule;
    },
    [load]
  );

  const update = useCallback(
    async (id: string, payload: Partial<NewSchedulePayload>): Promise<boolean> => {
      const { error: err } = await (supabase as any)
        .from("crm_schedules")
        .update(payload)
        .eq("id", id);
      if (err) {
        console.error("[useSchedules.update] Erro:", err);
        toast.error(`Erro ao atualizar: ${err.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  /** Duplica um schedule existente como rascunho novo (sem o histórico de envio). */
  const duplicate = useCallback(
    async (id: string): Promise<Schedule | null> => {
      const source = items.find((s) => s.id === id);
      if (!source) return null;
      return await create({
        name: `${source.name} (cópia)`,
        channel: source.channel,
        audience_id: source.audience_id,
        audience_filters: source.audience_filters,
        content: source.content,
        scheduled_at: null,
        status: "draft",
      });
    },
    [items, create]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error: err } = await (supabase as any)
        .from("crm_schedules")
        .delete()
        .eq("id", id);
      if (err) {
        toast.error(`Erro ao excluir: ${err.message}`);
        return false;
      }
      toast.success("Schedule excluído");
      await load();
      return true;
    },
    [load]
  );

  const pause = useCallback(
    async (id: string): Promise<boolean> => {
      return await update(id, { status: "paused" } as any);
    },
    [update]
  );

  const resume = useCallback(
    async (id: string): Promise<boolean> => {
      // Volta pro estado anterior plausível: se tinha scheduled_at futuro = scheduled, senão draft
      const target = items.find((s) => s.id === id);
      const nextStatus: ScheduleStatus =
        target?.scheduled_at && new Date(target.scheduled_at).getTime() > Date.now()
          ? "scheduled"
          : "draft";
      return await update(id, { status: nextStatus } as any);
    },
    [items, update]
  );

  return {
    items,
    loading,
    error,
    filter,
    setFilter,
    refresh: load,
    create,
    update,
    duplicate,
    remove,
    pause,
    resume,
  };
}
