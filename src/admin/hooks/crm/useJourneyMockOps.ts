import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Journey } from "./useJourneys";
import type { JourneyStep } from "./useJourneySteps";
import type { AudienceFilters } from "./useAudiences";
import { simulateMockSend, delayToMs } from "../../lib/crm/mockEngagement";
import type { ChannelKey } from "../../lib/crm/channels";
import {
  hasBehaviorFilter,
  resolveBehaviorUserIds,
} from "../../lib/crm/resolveBehaviorAudience";
import { attributeConversions } from "./useJourneyConversions";


/**
 * Hook com operações mock para jornadas.
 *
 * 9.4 — agora suporta travessia de grafo (crm_journey_edges) com avaliação
 * de condição (opened/clicked/converted). Mantém fallback linear (step_order+1)
 * para jornadas antigas sem edges.
 *
 * Em Pilar 4 essas operações migram pra edge function + pg_cron.
 */

type NodeType = "trigger" | "message" | "wait" | "condition" | "tag";
type DelayUnit = "minute" | "hour" | "day" | "week";

interface GraphNode {
  id: string;
  journey_id: string;
  node_type: NodeType;
  channel: ChannelKey | null;
  content: Record<string, any> | null;
  config: Record<string, any> | null;
  delay_value: number | null;
  delay_unit: DelayUnit | null;
  step_order: number | null;
}

interface GraphEdge {
  id: string;
  journey_id: string;
  source_step_id: string;
  target_step_id: string;
  branch: string | null;
  condition: Record<string, any> | null;
}

async function loadGraph(
  journeyId: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const [nRes, eRes] = await Promise.all([
    (supabase as any).from("crm_journey_steps").select("*").eq("journey_id", journeyId),
    (supabase as any).from("crm_journey_edges").select("*").eq("journey_id", journeyId),
  ]);
  return {
    nodes: ((nRes.data ?? []) as GraphNode[]),
    edges: ((eRes.data ?? []) as GraphEdge[]),
  };
}

function pickStartNode(nodes: GraphNode[], edges: GraphEdge[]): GraphNode | null {
  if (nodes.length === 0) return null;
  const trigger = nodes.find((n) => n.node_type === "trigger");
  if (trigger) return trigger;
  const targets = new Set(edges.map((e) => e.target_step_id));
  const noIncoming = nodes.find((n) => !targets.has(n.id));
  if (noIncoming) return noIncoming;
  return [...nodes].sort(
    (a, b) => (a.step_order ?? 0) - (b.step_order ?? 0)
  )[0];
}

/** Encontra o nó message mais próximo a montante (BFS pelas edges de entrada). */
function nearestUpstreamMessage(
  startId: string,
  nodesById: Map<string, GraphNode>,
  edges: GraphEdge[]
): string | null {
  const incoming = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    if (!incoming.has(e.target_step_id)) incoming.set(e.target_step_id, []);
    incoming.get(e.target_step_id)!.push(e);
  }
  const visited = new Set<string>([startId]);
  let frontier = (incoming.get(startId) ?? []).map((e) => e.source_step_id);
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);
      const n = nodesById.get(id);
      if (n?.node_type === "message") return id;
      for (const e of incoming.get(id) ?? []) next.push(e.source_step_id);
    }
    frontier = next;
  }
  return null;
}

/** Avalia uma condição. Retorna 'yes' ou 'no'. */
async function evaluateCondition(
  conditionNode: GraphNode,
  enrollment: { id: string; user_id: string; current_step_at: string | null },
  nodesById: Map<string, GraphNode>,
  edges: GraphEdge[]
): Promise<"yes" | "no"> {
  const cfg = conditionNode.config ?? {};
  const event = (cfg.event ?? "opened") as "opened" | "clicked" | "converted";
  const windowHours = Number(cfg.window_hours ?? 24);
  const sourceId: string | null =
    cfg.source_node_id ??
    nearestUpstreamMessage(conditionNode.id, nodesById, edges);

  if (!sourceId) return "no";

  // Pega o envio mais recente desse enrollment no source node
  const { data: sends } = await (supabase as any)
    .from("crm_journey_step_events")
    .select("id, status, created_at, metadata")
    .eq("enrollment_id", enrollment.id)
    .eq("step_id", sourceId)
    .order("created_at", { ascending: false })
    .limit(1);

  const send = (sends ?? [])[0];
  if (!send) return "no";

  const sentAtMs = send.metadata?.sent_at
    ? Date.parse(send.metadata.sent_at)
    : Date.parse(send.created_at);
  const cutoffMs = sentAtMs + windowHours * 3_600_000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const sentIso = new Date(sentAtMs).toISOString();

  if (event === "opened" || event === "clicked") {
    const targetStatuses = event === "opened" ? ["opened", "clicked"] : ["clicked"];
    const { data: hits } = await (supabase as any)
      .from("crm_journey_step_events")
      .select("id")
      .eq("enrollment_id", enrollment.id)
      .eq("step_id", sourceId)
      .in("status", targetStatuses)
      .gte("created_at", sentIso)
      .lte("created_at", cutoffIso)
      .limit(1);
    return (hits ?? []).length > 0 ? "yes" : "no";
  }

  // converted: financial_events do user dentro da janela
  if (event === "converted") {
    const revenueEvents = ["Purchase_Order_Confirmed", "Recurrent_Payment"];
    const { data: fin } = await (supabase as any)
      .from("financial_events")
      .select("id")
      .eq("user_id", enrollment.user_id)
      .in("event_name", revenueEvents)
      .gte("created_at", sentIso)
      .lte("created_at", cutoffIso)
      .limit(1);
    return (fin ?? []).length > 0 ? "yes" : "no";
  }

  return "no";
}

export function useJourneyMockOps() {
  const [busy, setBusy] = useState<string | null>(null);

  const enrollLeads = useCallback(
    async (
      journey: Journey,
      steps: JourneyStep[],
      requestedCount: number
    ): Promise<{ enrolled: number; skipped: number } | null> => {
      setBusy("enroll");
      try {
        const audience = journey.audience as any;
        const filters: AudienceFilters | null =
          audience?.filters ?? journey.audience_filters ?? null;
        const isStaticList = audience?.kind === "static_list";

        let pool: Array<{ id: string }> = [];

        if (isStaticList && audience?.id) {
          const { data: members, error: memErr } = await (supabase as any)
            .from("crm_audience_members")
            .select("user_id")
            .eq("audience_id", audience.id)
            .not("user_id", "is", null)
            .limit(5000);

          if (memErr) {
            toast.error(`Erro ao resolver lista: ${memErr.message}`);
            return null;
          }
          pool = ((members ?? []) as Array<{ user_id: string }>).map((m) => ({
            id: m.user_id,
          }));

          if (pool.length === 0) {
            toast.error(
              "A lista está vazia ou nenhum contato foi linkado a um usuário cadastrado."
            );
            return { enrolled: 0, skipped: 0 };
          }
        } else {
          let q: any = supabase.from("users").select("id");

          if (hasBehaviorFilter(filters?.behavior)) {
            const r = await resolveBehaviorUserIds(filters!.behavior!);
            if (r.user_ids.length === 0) {
              toast.error(
                "Nenhum lead bate com os filtros de comportamento na janela escolhida."
              );
              return { enrolled: 0, skipped: 0 };
            }
            q = q.in("id", r.user_ids);
          }

          if (filters?.plans && filters.plans.length > 0) {
            q = q.in("main_tier", filters.plans);
          }
          if (filters?.days_since_login) {
            const now = Date.now();
            if (typeof filters.days_since_login.gte === "number") {
              const cutoff = new Date(now - filters.days_since_login.gte * 86400000);
              q = q.lte("last_seen_at", cutoff.toISOString());
            }
            if (typeof filters.days_since_login.lte === "number") {
              const cutoff = new Date(now - filters.days_since_login.lte * 86400000);
              q = q.gte("last_seen_at", cutoff.toISOString());
            }
          }
          if (filters?.status && filters.status.length > 0) {
            const now = Date.now();
            const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
            const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
            const ors: string[] = [];
            if (filters.status.includes("active"))     ors.push(`last_seen_at.gte.${sevenDaysAgo}`);
            if (filters.status.includes("inactive"))   ors.push(`and(last_seen_at.lt.${sevenDaysAgo},last_seen_at.gte.${thirtyDaysAgo})`);
            if (filters.status.includes("churn_risk")) {
              ors.push(`last_seen_at.lt.${thirtyDaysAgo}`);
              ors.push(`last_seen_at.is.null`);
            }
            if (ors.length > 0) q = q.or(ors.join(","));
          }

          const { data: users, error: usersErr } = await q.limit(5000);
          if (usersErr) {
            toast.error(`Erro ao resolver audiência: ${usersErr.message}`);
            return null;
          }

          pool = (users ?? []) as Array<{ id: string }>;
          if (pool.length === 0) {
            toast.error("A audiência da jornada está vazia.");
            return { enrolled: 0, skipped: 0 };
          }
        }

        const { data: existing } = await (supabase as any)
          .from("crm_journey_enrollments")
          .select("user_id")
          .eq("journey_id", journey.id)
          .eq("status", "active");

        const blockedIds = new Set<string>(
          ((existing ?? []) as Array<{ user_id: string }>).map((e) => e.user_id)
        );

        const available = pool.filter((u) => !blockedIds.has(u.id));
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        const toEnroll = shuffled.slice(0, requestedCount);
        const skipped = requestedCount - toEnroll.length;

        if (toEnroll.length === 0) {
          toast.message(
            "Nenhum lead novo pra inscrever (todos da audiência já estão ativos)."
          );
          return { enrolled: 0, skipped };
        }

        // Determina nó inicial via grafo (trigger / sem entrada / fallback)
        const { nodes, edges } = await loadGraph(journey.id);
        let startId: string | null = null;
        if (nodes.length > 0) {
          startId = pickStartNode(nodes, edges)?.id ?? null;
        }
        if (!startId) {
          startId = steps[0]?.id ?? null;
        }

        const enrollments = toEnroll.map((u) => ({
          journey_id: journey.id,
          user_id: u.id,
          current_step_id: startId,
          current_step_at: new Date().toISOString(),
          status: "active",
          metadata: { mock: true, mode: "9.4_graph", source: "manual_trigger", tags: [] },
        }));

        const { error: insErr } = await (supabase as any)
          .from("crm_journey_enrollments")
          .insert(enrollments);

        if (insErr) {
          toast.error(`Erro ao criar enrollments: ${insErr.message}`);
          return null;
        }

        toast.success(
          `${toEnroll.length} lead${toEnroll.length > 1 ? "s" : ""} inscritos${
            skipped > 0 ? ` (${skipped} pulados — audiência menor que pedido)` : ""
          }`
        );
        return { enrolled: toEnroll.length, skipped };
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const processSteps = useCallback(
    async (
      journey: Journey,
      steps: JourneyStep[],
      opts: { forceNow?: boolean } = {}
    ): Promise<{
      processed: number;
      events_created: number;
      completed: number;
    } | null> => {
      setBusy("process");
      try {
        if (steps.length === 0) {
          toast.error("Esta jornada não tem passos para processar.");
          return null;
        }

        const { nodes, edges } = await loadGraph(journey.id);

        // ====== FALLBACK LINEAR (jornadas antigas sem edges) ======
        if (edges.length === 0) {
          return await processLinear(journey, steps, opts);
        }

        // ====== TRAVESSIA DE GRAFO ======
        const nodesById = new Map(nodes.map((n) => [n.id, n]));
        const outgoing = new Map<string, GraphEdge[]>();
        for (const e of edges) {
          if (!outgoing.has(e.source_step_id)) outgoing.set(e.source_step_id, []);
          outgoing.get(e.source_step_id)!.push(e);
        }

        const { data: enrolls, error: enrErr } = await (supabase as any)
          .from("crm_journey_enrollments")
          .select("id, user_id, current_step_id, current_step_at, metadata")
          .eq("journey_id", journey.id)
          .eq("status", "active");

        if (enrErr) {
          toast.error(`Erro ao buscar enrollments: ${enrErr.message}`);
          return null;
        }

        const list = (enrolls ?? []) as Array<{
          id: string;
          user_id: string;
          current_step_id: string | null;
          current_step_at: string | null;
          metadata: Record<string, any> | null;
        }>;

        if (list.length === 0) {
          toast.message("Nenhum lead ativo nesta jornada.");
          return { processed: 0, events_created: 0, completed: 0 };
        }

        const eventsToInsert: any[] = [];
        const enrollUpdates: Array<{ id: string; patch: Record<string, any> }> = [];
        let completed = 0;
        const MAX_HOPS = 20;

        for (const en of list) {
          let curId = en.current_step_id;
          let curAt = en.current_step_at;
          let metadata: Record<string, any> = { ...(en.metadata ?? {}) };
          let didAdvance = false;
          let finalize: Record<string, any> | null = null;

          for (let hop = 0; hop < MAX_HOPS; hop++) {
            if (!curId) {
              finalize = {
                current_step_id: null,
                status: "completed",
                completed_at: new Date().toISOString(),
              };
              completed++;
              break;
            }
            const node = nodesById.get(curId);
            if (!node) {
              // nó sumiu — completa
              finalize = {
                current_step_id: null,
                status: "completed",
                completed_at: new Date().toISOString(),
              };
              completed++;
              break;
            }

            const outs = outgoing.get(curId) ?? [];

            if (node.node_type === "trigger") {
              const next = outs[0];
              if (!next) {
                finalize = {
                  current_step_id: null,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                };
                completed++;
                break;
              }
              curId = next.target_step_id;
              didAdvance = true;
              continue;
            }

            if (node.node_type === "message") {
              const ch = (node.channel ?? "email") as ChannelKey;
              const sim = simulateMockSend(ch);
              eventsToInsert.push({
                enrollment_id: en.id,
                step_id: node.id,
                channel: ch,
                content_snapshot: node.content ?? {},
                status: sim.status,
                provider_message_id: sim.provider_message_id ?? null,
                error_code: sim.error_code ?? null,
                error_message: sim.error_message ?? null,
                metadata: sim.metadata,
              });
              const next = outs[0];
              if (!next) {
                finalize = {
                  current_step_id: null,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                };
                completed++;
                break;
              }
              curId = next.target_step_id;
              didAdvance = true;
              continue;
            }

            if (node.node_type === "wait") {
              const baseMs = curAt ? Date.parse(curAt) : Date.now();
              const dueAt =
                baseMs +
                delayToMs(
                  node.delay_value ?? 0,
                  (node.delay_unit ?? "minute") as DelayUnit
                );
              if (!opts.forceNow && Date.now() < dueAt) {
                // ainda esperando — para o loop sem mexer
                break;
              }
              const next = outs[0];
              if (!next) {
                finalize = {
                  current_step_id: null,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                };
                completed++;
                break;
              }
              curId = next.target_step_id;
              curAt = new Date().toISOString(); // zera ao entrar no próximo
              didAdvance = true;
              continue;
            }

            if (node.node_type === "tag") {
              const cfg = node.config ?? {};
              const action = (cfg.action ?? "add") as "add" | "remove";
              const tag = String(cfg.tag ?? "").trim();
              if (tag) {
                const current: string[] = Array.isArray(metadata.tags)
                  ? [...metadata.tags]
                  : [];
                if (action === "add" && !current.includes(tag)) current.push(tag);
                if (action === "remove") {
                  const idx = current.indexOf(tag);
                  if (idx >= 0) current.splice(idx, 1);
                }
                metadata = { ...metadata, tags: current };
              }
              const next = outs[0];
              if (!next) {
                finalize = {
                  current_step_id: null,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                };
                completed++;
                break;
              }
              curId = next.target_step_id;
              didAdvance = true;
              continue;
            }

            if (node.node_type === "condition") {
              const result = await evaluateCondition(
                node,
                { id: en.id, user_id: en.user_id, current_step_at: curAt },
                nodesById,
                edges
              );
              const branchEdge =
                outs.find((e) => (e.branch ?? "") === result) ?? null;
              if (!branchEdge) {
                // sem edge para esse lado — encerra esse caminho
                finalize = {
                  current_step_id: null,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                };
                completed++;
                break;
              }
              curId = branchEdge.target_step_id;
              didAdvance = true;
              continue;
            }

            // node_type desconhecido — completa por segurança
            finalize = {
              current_step_id: null,
              status: "completed",
              completed_at: new Date().toISOString(),
            };
            completed++;
            break;
          }

          if (finalize) {
            enrollUpdates.push({
              id: en.id,
              patch: { ...finalize, metadata },
            });
          } else if (didAdvance) {
            enrollUpdates.push({
              id: en.id,
              patch: {
                current_step_id: curId,
                current_step_at: curAt ?? new Date().toISOString(),
                metadata,
              },
            });
          }
        }

        // Insere events em chunks
        const CHUNK = 500;
        for (let i = 0; i < eventsToInsert.length; i += CHUNK) {
          const slice = eventsToInsert.slice(i, i + CHUNK);
          const { error: evErr } = await (supabase as any)
            .from("crm_journey_step_events")
            .insert(slice);
          if (evErr) {
            console.error("[useJourneyMockOps] erro events:", evErr);
            toast.error(`Erro ao gravar eventos: ${evErr.message}`);
          }
        }

        for (const u of enrollUpdates) {
          const { error: upErr } = await (supabase as any)
            .from("crm_journey_enrollments")
            .update(u.patch)
            .eq("id", u.id);
          if (upErr) {
            console.error("[useJourneyMockOps] erro update enrollment:", upErr);
          }
        }

        const processed = enrollUpdates.length;
        if (processed === 0) {
          toast.message(
            opts.forceNow
              ? "Nada pra processar — nenhum enrollment elegível."
              : "Ainda não venceu o delay de nenhum passo. Use 'forçar agora' pra testar."
          );
        } else {
          toast.success(
            `${processed} avançados · ${eventsToInsert.length} eventos · ${completed} concluídos`
          );
        }

        await attributeConversions(journey.id).catch((e) =>
          console.error("[useJourneyMockOps] attributeConversions:", e)
        );

        return { processed, events_created: eventsToInsert.length, completed };
      } finally {
        setBusy(null);
      }

    },
    []
  );

  return { busy, enrollLeads, processSteps };
}

/** Comportamento linear original (fallback para jornadas sem edges). */
async function processLinear(
  journey: Journey,
  steps: JourneyStep[],
  opts: { forceNow?: boolean }
): Promise<{ processed: number; events_created: number; completed: number } | null> {
  const stepsById = new Map(steps.map((s) => [s.id, s]));
  const stepsByOrder = [...steps].sort((a, b) => a.step_order - b.step_order);
  const nextStepOf = (id: string): JourneyStep | null => {
    const idx = stepsByOrder.findIndex((s) => s.id === id);
    return idx >= 0 && idx + 1 < stepsByOrder.length ? stepsByOrder[idx + 1] : null;
  };

  const { data: enrolls, error: enrErr } = await (supabase as any)
    .from("crm_journey_enrollments")
    .select("id, user_id, current_step_id, current_step_at")
    .eq("journey_id", journey.id)
    .eq("status", "active");

  if (enrErr) {
    toast.error(`Erro ao buscar enrollments: ${enrErr.message}`);
    return null;
  }

  const list = (enrolls ?? []) as Array<{
    id: string;
    user_id: string;
    current_step_id: string | null;
    current_step_at: string | null;
  }>;

  if (list.length === 0) {
    toast.message("Nenhum lead ativo nesta jornada.");
    return { processed: 0, events_created: 0, completed: 0 };
  }

  const now = Date.now();
  const eventsToInsert: any[] = [];
  const enrollUpdates: Array<{ id: string; patch: Record<string, any> }> = [];
  let completed = 0;

  for (const en of list) {
    if (!en.current_step_id) {
      enrollUpdates.push({
        id: en.id,
        patch: { status: "completed", completed_at: new Date().toISOString() },
      });
      completed++;
      continue;
    }
    const step = stepsById.get(en.current_step_id);
    if (!step) continue;
    const baseMs = en.current_step_at ? Date.parse(en.current_step_at) : now;
    const dueAt = baseMs + delayToMs(step.delay_value, step.delay_unit);
    if (!opts.forceNow && now < dueAt) continue;

    const sim = simulateMockSend(step.channel);
    eventsToInsert.push({
      enrollment_id: en.id,
      step_id: step.id,
      channel: step.channel,
      content_snapshot: step.content ?? {},
      status: sim.status,
      provider_message_id: sim.provider_message_id ?? null,
      error_code: sim.error_code ?? null,
      error_message: sim.error_message ?? null,
      metadata: sim.metadata,
    });

    const next = nextStepOf(step.id);
    if (next) {
      enrollUpdates.push({
        id: en.id,
        patch: {
          current_step_id: next.id,
          current_step_at: new Date().toISOString(),
        },
      });
    } else {
      enrollUpdates.push({
        id: en.id,
        patch: {
          current_step_id: null,
          status: "completed",
          completed_at: new Date().toISOString(),
        },
      });
      completed++;
    }
  }

  const CHUNK = 500;
  for (let i = 0; i < eventsToInsert.length; i += CHUNK) {
    const slice = eventsToInsert.slice(i, i + CHUNK);
    const { error: evErr } = await (supabase as any)
      .from("crm_journey_step_events")
      .insert(slice);
    if (evErr) {
      console.error("[useJourneyMockOps] erro events:", evErr);
      toast.error(`Erro ao gravar eventos: ${evErr.message}`);
    }
  }

  for (const u of enrollUpdates) {
    const { error: upErr } = await (supabase as any)
      .from("crm_journey_enrollments")
      .update(u.patch)
      .eq("id", u.id);
    if (upErr) console.error("[useJourneyMockOps] erro update enrollment:", upErr);
  }

  const processed = enrollUpdates.length;
  if (processed === 0) {
    toast.message(
      opts.forceNow
        ? "Nada pra processar — nenhum enrollment elegível."
        : "Ainda não venceu o delay de nenhum passo. Use 'forçar agora' pra testar."
    );
  } else {
    toast.success(
      `${processed} avançados · ${eventsToInsert.length} eventos · ${completed} concluídos`
    );
  }

  return { processed, events_created: eventsToInsert.length, completed };
}
