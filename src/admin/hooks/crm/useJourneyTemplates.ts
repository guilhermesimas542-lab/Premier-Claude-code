import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChannelKey } from "../../lib/crm/channels";
import type { TriggerKey } from "../../lib/crm/triggers";
import type { DelayUnit } from "../../lib/crm/journeyTemplates";

export interface CustomTemplateStep {
  channel: ChannelKey;
  content: Record<string, any>;
  delay_value: number;
  delay_unit: DelayUnit;
  step_order: number;
}

export interface CustomJourneyTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  /** Canal fixo da jornada de origem. null = template antigo (misto). */
  channel: ChannelKey | null;
  trigger_type: TriggerKey;
  trigger_config: Record<string, any>;
  steps: CustomTemplateStep[];
  created_at: string;
}

export function useJourneyTemplates() {
  const [items, setItems] = useState<CustomJourneyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const list = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("crm_journey_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      // Tabela ainda não criada não é erro fatal
      if (error.code !== "42P01" && error.code !== "PGRST205") {
        console.error("[useJourneyTemplates.list]", error);
      }
      setItems([]);
    } else {
      setItems((data ?? []) as CustomJourneyTemplate[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    list();
  }, [list]);

  const saveFromJourney = useCallback(
    async (journeyId: string, overrideName?: string): Promise<CustomJourneyTemplate | null> => {
      const { data: journey, error: jErr } = await (supabase as any)
        .from("crm_journeys")
        .select("name, description, trigger_type, trigger_config, channel")
        .eq("id", journeyId)
        .single();
      if (jErr || !journey) {
        toast.error(`Erro ao ler jornada: ${jErr?.message ?? "desconhecido"}`);
        return null;
      }

      const { data: stepsRows, error: sErr } = await (supabase as any)
        .from("crm_journey_steps")
        .select("channel, content, delay_value, delay_unit, step_order")
        .eq("journey_id", journeyId)
        .order("step_order", { ascending: true });
      if (sErr) {
        toast.error(`Erro ao ler passos: ${sErr.message}`);
        return null;
      }

      const stepsPayload: CustomTemplateStep[] = (stepsRows ?? []).map((s: any, idx: number) => ({
        channel: s.channel,
        content: s.content ?? {},
        delay_value: s.delay_value ?? 0,
        delay_unit: s.delay_unit ?? "day",
        step_order: s.step_order ?? idx + 1,
      }));

      const finalName = (overrideName?.trim() || journey.name || "Template sem nome").slice(0, 120);

      const { data: inserted, error: iErr } = await (supabase as any)
        .from("crm_journey_templates")
        .insert({
          name: finalName,
          description: journey.description,
          category: "custom",
          channel: journey.channel ?? null,
          trigger_type: journey.trigger_type,
          trigger_config: journey.trigger_config ?? {},
          steps: stepsPayload,
        })
        .select()
        .single();

      if (iErr) {
        toast.error(`Erro ao salvar template: ${iErr.message}`);
        return null;
      }
      toast.success(`Template "${finalName}" salvo`);
      await list();
      return inserted as CustomJourneyTemplate;
    },
    [list]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await (supabase as any)
        .from("crm_journey_templates")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(`Erro ao excluir template: ${error.message}`);
        return false;
      }
      toast.success("Template excluído");
      await list();
      return true;
    },
    [list]
  );

  return { items, loading, refresh: list, saveFromJourney, remove };
}
