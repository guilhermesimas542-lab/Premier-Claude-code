import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Exporta a DEFINIÇÃO de uma jornada de CRM para um arquivo `.json`.
 *
 * Exporta apenas a definição (jornada + passos + conexões) — NUNCA dados de
 * execução (`crm_journey_enrollments` / `crm_journey_step_events`). O formato
 * é o consumido pelo import do app destino: IDs dos passos são preservados
 * aqui para que o import possa remapeá-los para UUIDs novos.
 */
export async function exportJourney(journeyId: string, fallbackName = "jornada"): Promise<void> {
  try {
    // 1) Jornada — só os campos de definição (sem status/stats/created_by).
    const { data: journey, error: jErr } = await (supabase as any)
      .from("crm_journeys")
      .select(
        "name, description, trigger_type, trigger_config, audience_id, audience_filters, channel"
      )
      .eq("id", journeyId)
      .single();
    if (jErr) throw jErr;
    if (!journey) throw new Error("Jornada não encontrada");

    // 2) Passos — mantém o `id` original (o import gera UUIDs novos e remapeia).
    const { data: steps, error: sErr } = await (supabase as any)
      .from("crm_journey_steps")
      .select(
        "id, parent_step_id, node_type, position, channel, content, config, step_order, delay_value, delay_unit"
      )
      .eq("journey_id", journeyId)
      .order("step_order", { ascending: true });
    if (sErr) throw sErr;

    // 3) Conexões — referenciam os IDs originais dos passos.
    const { data: edges, error: eErr } = await (supabase as any)
      .from("crm_journey_edges")
      .select("source_step_id, target_step_id, branch, condition")
      .eq("journey_id", journeyId);
    if (eErr) throw eErr;

    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      journey,
      steps: steps ?? [],
      edges: edges ?? [],
    };

    // Slug do nome do arquivo (remove acentos via NFD + faixa de diacríticos U+0300–U+036F).
    const rawName = (journey.name as string) || fallbackName;
    const slug =
      rawName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "jornada";

    // Download do arquivo.
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journey-${slug}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(
      `Jornada "${journey.name}" exportada — ${(steps ?? []).length} passos, ${
        (edges ?? []).length
      } conexões.`
    );
  } catch (err: any) {
    console.error("[exportJourney] Erro:", err);
    toast.error(`Erro ao exportar jornada: ${err?.message ?? String(err)}`);
  }
}
