import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChannelKey } from "../../lib/crm/channels";
import type { AudienceFilters } from "./useAudiences";

export type DelayUnit = "minute" | "hour" | "day" | "week";

export interface JourneyStep {
  id: string;
  journey_id: string;
  step_order: number;
  channel: ChannelKey;
  content: Record<string, any>;
  delay_value: number;
  delay_unit: DelayUnit;
  audience_filters: AudienceFilters | null;
  created_at: string;
  updated_at: string;
}

export interface NewStepPayload {
  journey_id: string;
  channel: ChannelKey;
  content?: Record<string, any>;
  delay_value?: number;
  delay_unit?: DelayUnit;
  audience_filters?: AudienceFilters | null;
}

function isTableMissing(err: any): boolean {
  const code = err?.code;
  if (code === "42P01" || code === "PGRST205") return true;
  const msg = (err?.message ?? "").toLowerCase();
  return msg.includes("could not find the table") || msg.includes("schema cache");
}

/**
 * Hook de CRUD para steps de uma jornada.
 * Mantém items ordenados por step_order e oferece move up/down + reorder em massa.
 */
export function useJourneySteps(journeyId: string | null) {
  const [items, setItems] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const load = useCallback(async () => {
    if (!journeyId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSchemaMissing(false);

    const { data, error } = await (supabase as any)
      .from("crm_journey_steps")
      .select("*")
      .eq("journey_id", journeyId)
      .order("step_order", { ascending: true });

    if (error) {
      if (isTableMissing(error)) {
        setSchemaMissing(true);
        setItems([]);
      } else {
        console.error("[useJourneySteps] Erro:", error);
        toast.error(`Erro ao carregar steps: ${error.message}`);
      }
    } else {
      setItems((data ?? []) as JourneyStep[]);
    }
    setLoading(false);
  }, [journeyId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (payload: NewStepPayload): Promise<JourneyStep | null> => {
      const nextOrder =
        items.length > 0 ? Math.max(...items.map((s) => s.step_order)) + 1 : 1;

      const { data, error } = await (supabase as any)
        .from("crm_journey_steps")
        .insert({
          journey_id: payload.journey_id,
          step_order: nextOrder,
          channel: payload.channel,
          content: payload.content ?? {},
          delay_value: payload.delay_value ?? 0,
          delay_unit: payload.delay_unit ?? "day",
          audience_filters: payload.audience_filters ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error("[useJourneySteps.create] Erro:", error);
        toast.error(`Erro ao adicionar step: ${error.message}`);
        return null;
      }
      toast.success("Step adicionado");
      await load();
      return data as JourneyStep;
    },
    [items, load]
  );

  const update = useCallback(
    async (
      id: string,
      payload: Partial<Omit<JourneyStep, "id" | "journey_id" | "created_at" | "updated_at">>
    ): Promise<boolean> => {
      const { error } = await (supabase as any)
        .from("crm_journey_steps")
        .update(payload)
        .eq("id", id);
      if (error) {
        toast.error(`Erro ao atualizar step: ${error.message}`);
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await (supabase as any)
        .from("crm_journey_steps")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(`Erro ao remover step: ${error.message}`);
        return false;
      }
      toast.success("Step removido");
      await load();
      return true;
    },
    [load]
  );

  /**
   * Move um step para uma nova posição. Reordena todos para manter step_order contíguo.
   * Constraint UNIQUE (journey_id, step_order) exige que façamos em duas passadas:
   *   1. Empurra todos os afetados pra valores temporários (negativos)
   *   2. Aplica os valores finais
   */
  const move = useCallback(
    async (id: string, direction: "up" | "down"): Promise<boolean> => {
      const idx = items.findIndex((s) => s.id === id);
      if (idx < 0) return false;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= items.length) return false;

      const a = items[idx];
      const b = items[swapIdx];

      // Passada 1: temporário
      const { error: e1 } = await (supabase as any)
        .from("crm_journey_steps")
        .update({ step_order: -1 * a.step_order })
        .eq("id", a.id);
      if (e1) {
        toast.error(`Erro ao reordenar: ${e1.message}`);
        return false;
      }

      // Passada 2: aplica novos valores
      const { error: e2 } = await (supabase as any)
        .from("crm_journey_steps")
        .update({ step_order: a.step_order })
        .eq("id", b.id);
      if (e2) {
        toast.error(`Erro ao reordenar: ${e2.message}`);
        return false;
      }

      const { error: e3 } = await (supabase as any)
        .from("crm_journey_steps")
        .update({ step_order: b.step_order })
        .eq("id", a.id);
      if (e3) {
        toast.error(`Erro ao reordenar: ${e3.message}`);
        return false;
      }

      await load();
      return true;
    },
    [items, load]
  );

  return {
    items,
    loading,
    schemaMissing,
    refresh: load,
    create,
    update,
    remove,
    move,
  };
}
