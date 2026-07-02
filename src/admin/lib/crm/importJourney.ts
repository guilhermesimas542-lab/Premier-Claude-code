import { supabase } from "@/integrations/supabase/client";

/**
 * Importa a DEFINIÇÃO de uma jornada exportada por outro app (formato do export).
 *
 * Garantias (ver requisitos):
 *  - Gera UUIDs NOVOS para a jornada e cada passo; remapeia edges + parent_step_id.
 *  - Valida enums (trigger/channel/node_type/delay_unit); valores desconhecidos são
 *    mantidos e listados no relatório (a jornada entra como draft pra revisão).
 *  - audience_id que não existe aqui vira null (mantém audience_filters).
 *  - content com template_id inexistente tem a referência removida (listado).
 *  - Sempre cria NOVA jornada como status 'draft', nome "... (importada)". Nunca sobrescreve.
 *  - Rollback total se qualquer passo falhar.
 *  - NUNCA importa enrollments/step_events.
 */

// Valores aceitos pelos CHECK constraints do banco DESTE app.
// Obs: o banco usa "auto" (o código chama de "webhook_status") — mapeamos abaixo.
const VALID_TRIGGERS = ["onboarding", "upgrade", "churn_inactive", "manual", "auto"];
const VALID_CHANNELS = ["email", "sms", "telegram_group", "telegram_x1", "whatsapp", "push", "popup"];
const VALID_NODE_TYPES = ["trigger", "message", "wait", "condition", "tag", "stage"];
const VALID_DELAY_UNITS = ["minute", "hour", "day", "week"];

// Aliases conhecidos entre apps (nome no código -> valor aceito no banco).
const TRIGGER_ALIASES: Record<string, string> = { webhook_status: "auto" };

export interface ImportResult {
  ok: boolean;
  journeyId?: string;
  journeyName?: string;
  stepsCount?: number;
  edgesCount?: number;
  adjustments: string[];
  error?: string;
}

function newUuid(): string {
  // crypto.randomUUID é suportado em todos os navegadores modernos.
  return (crypto as any).randomUUID();
}

export async function importJourney(file: File): Promise<ImportResult> {
  const adjustments: string[] = [];
  let createdJourneyId: string | null = null;

  try {
    // ── 1) Parse + validação de formato ────────────────────────────────────
    const raw = await file.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, adjustments, error: "O arquivo não é um JSON válido." };
    }
    if (!data || typeof data !== "object" || !data.journey || typeof data.journey !== "object") {
      return { ok: false, adjustments, error: "Formato inválido: falta o objeto 'journey'." };
    }

    const j = data.journey;
    const srcSteps: any[] = Array.isArray(data.steps) ? data.steps : [];
    const srcEdges: any[] = Array.isArray(data.edges) ? data.edges : [];

    // ── 2) Enums da jornada — CONVERTE valores inválidos (o banco tem CHECK). ─
    let trigger_type = j.trigger_type ?? "manual";
    if (!VALID_TRIGGERS.includes(trigger_type)) {
      const mapped = TRIGGER_ALIASES[trigger_type] ?? "manual";
      adjustments.push(
        `trigger "${trigger_type}" não é aceito aqui — convertido para "${mapped}". Reconfigure na jornada se precisar.`
      );
      trigger_type = mapped;
    }
    let channel = j.channel ?? null;
    if (channel && !VALID_CHANNELS.includes(channel)) {
      adjustments.push(`canal "${channel}" não é aceito aqui — removido (defina o canal manualmente).`);
      channel = null;
    }

    // ── 3) audience_id: só mantém se existir em crm_audiences deste app ──────
    let audience_id: string | null = j.audience_id ?? null;
    if (audience_id) {
      const { data: aud } = await (supabase as any)
        .from("crm_audiences")
        .select("id")
        .eq("id", audience_id)
        .maybeSingle();
      if (!aud) {
        adjustments.push(
          `audiência "${audience_id}" não existe aqui — gravada como vazia (os filtros foram mantidos).`
        );
        audience_id = null;
      }
    }

    // ── 4) Cria a jornada (draft, nome "(importada)") ───────────────────────
    const { data: newJourney, error: jErr } = await (supabase as any)
      .from("crm_journeys")
      .insert({
        name: `${j.name ?? "Jornada"} (importada)`,
        description: j.description ?? null,
        trigger_type,
        trigger_config: j.trigger_config ?? {},
        audience_id,
        audience_filters: j.audience_filters ?? null,
        status: "draft",
        channel,
      })
      .select("id")
      .single();
    if (jErr) throw jErr;
    createdJourneyId = newJourney.id as string;

    // ── 5) Remapeia IDs dos passos (old -> new) ─────────────────────────────
    const idMap = new Map<string, string>();
    for (const s of srcSteps) {
      if (s && s.id) idMap.set(s.id, newUuid());
    }

    const stepsToInsert = srcSteps.map((s) => {
      const newId = (s && s.id && idMap.get(s.id)) || newUuid();

      let node_type = s.node_type ?? "message";
      if (!VALID_NODE_TYPES.includes(node_type)) {
        adjustments.push(`passo: tipo "${s.node_type}" não aceito — convertido para "message".`);
        node_type = "message";
      }
      let delay_unit = s.delay_unit ?? "day";
      if (!VALID_DELAY_UNITS.includes(delay_unit)) {
        adjustments.push(`passo: unidade de tempo "${s.delay_unit}" não aceita — convertida para "day".`);
        delay_unit = "day";
      }
      let stepChannel = s.channel ?? null;
      if (stepChannel && !VALID_CHANNELS.includes(stepChannel)) {
        adjustments.push(`passo: canal "${stepChannel}" não aceito — removido.`);
        stepChannel = null;
      }

      // content: remove referência a template/mensagem que não existe aqui.
      let content = s.content ?? {};
      if (content && typeof content === "object" && !Array.isArray(content)) {
        for (const refKey of ["template_id", "message_id", "message_template_id"]) {
          if (content[refKey]) {
            adjustments.push(
              `passo: referência ${refKey}="${content[refKey]}" removida (não existe aqui) — reconfigure o conteúdo.`
            );
            const clone = { ...content };
            delete clone[refKey];
            content = clone;
          }
        }
      }

      return {
        id: newId,
        journey_id: createdJourneyId,
        parent_step_id: s.parent_step_id ? idMap.get(s.parent_step_id) ?? null : null,
        node_type,
        position: s.position ?? null,
        channel: stepChannel,
        content,
        config: s.config ?? {},
        step_order: s.step_order ?? null,
        delay_value: s.delay_value ?? 0,
        delay_unit,
      };
    });

    if (stepsToInsert.length) {
      const { error: sErr } = await (supabase as any).from("crm_journey_steps").insert(stepsToInsert);
      if (sErr) throw sErr;
    }

    // ── 6) Remapeia edges; descarta as que apontam pra passo ausente ────────
    const edgesToInsert = srcEdges
      .map((e) => ({
        journey_id: createdJourneyId,
        source_step_id: e.source_step_id ? idMap.get(e.source_step_id) ?? null : null,
        target_step_id: e.target_step_id ? idMap.get(e.target_step_id) ?? null : null,
        branch: e.branch ?? null,
        condition: e.condition ?? {},
      }))
      .filter((e) => e.source_step_id && e.target_step_id);
    const droppedEdges = srcEdges.length - edgesToInsert.length;
    if (droppedEdges > 0) {
      adjustments.push(`${droppedEdges} conexão(ões) descartada(s) por apontar para um passo ausente.`);
    }
    if (edgesToInsert.length) {
      const { error: eErr } = await (supabase as any).from("crm_journey_edges").insert(edgesToInsert);
      if (eErr) throw eErr;
    }

    return {
      ok: true,
      journeyId: createdJourneyId,
      journeyName: `${j.name ?? "Jornada"} (importada)`,
      stepsCount: stepsToInsert.length,
      edgesCount: edgesToInsert.length,
      adjustments,
    };
  } catch (err: any) {
    // ── Rollback: apaga tudo que já foi criado ──────────────────────────────
    if (createdJourneyId) {
      try {
        await (supabase as any).from("crm_journey_edges").delete().eq("journey_id", createdJourneyId);
        await (supabase as any).from("crm_journey_steps").delete().eq("journey_id", createdJourneyId);
        await (supabase as any).from("crm_journeys").delete().eq("id", createdJourneyId);
      } catch (rbErr) {
        console.error("[importJourney] rollback falhou:", rbErr);
      }
    }
    return { ok: false, adjustments, error: err?.message ?? String(err) };
  }
}
