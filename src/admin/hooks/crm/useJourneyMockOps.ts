import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Journey } from "./useJourneys";
import type { JourneyStep } from "./useJourneySteps";
import type { AudienceFilters } from "./useAudiences";
import { simulateMockSend, delayToMs } from "../../lib/crm/mockEngagement";
import {
  hasBehaviorFilter,
  resolveBehaviorUserIds,
} from "../../lib/crm/resolveBehaviorAudience";

/**
 * Hook com operações mock para jornadas (Sub-fase 2.5):
 *   - enrollLeads:  seleciona N leads pela audiência da jornada e cria enrollments
 *   - processSteps: avança enrollments ativos cujo delay venceu (ou todos, se forçado)
 *
 * Em Pilar 4 essas operações migram pra edge function + pg_cron.
 */
export function useJourneyMockOps() {
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * Resolve a audiência (mesmas regras do edge function de schedules) e
   * cria enrollments active. Respeita o UNIQUE parcial (mesmo lead 2x).
   */
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
          // Listas estáticas: só membros com user_id linkado podem virar enrollment
          // (crm_journey_enrollments.user_id é NOT NULL com FK em users).
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
          // Audiência dinâmica: filtra users por filters
          let q: any = supabase.from("users").select("id");

          // Behavior: intersecciona com user_ids elegíveis primeiro
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

        // 2) Tira quem já tem enrollment active nesta jornada
        const { data: existing } = await (supabase as any)
          .from("crm_journey_enrollments")
          .select("user_id")
          .eq("journey_id", journey.id)
          .eq("status", "active");

        const blockedIds = new Set<string>(
          ((existing ?? []) as Array<{ user_id: string }>).map((e) => e.user_id)
        );

        // 3) Amostragem aleatória
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

        // 4) Cria enrollments
        const firstStep = steps[0] ?? null;
        const enrollments = toEnroll.map((u) => ({
          journey_id: journey.id,
          user_id: u.id,
          current_step_id: firstStep?.id ?? null,
          current_step_at: new Date().toISOString(),
          status: "active",
          metadata: { mock: true, mode: "2.5_client", source: "manual_trigger" },
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

  /**
   * Avança enrollments active da jornada:
   *   - Para cada enrollment com delay vencido (ou se forceNow=true):
   *     - Gera step_event mock (delivered/opened/clicked/failed)
   *     - Move enrollment pro próximo step OU completa
   *
   * Retorna contadores agregados.
   */
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

        // Mapa pra navegação rápida
        const stepsById = new Map(steps.map((s) => [s.id, s]));
        const stepsByOrder = [...steps].sort((a, b) => a.step_order - b.step_order);
        const nextStepOf = (id: string): JourneyStep | null => {
          const cur = stepsById.get(id);
          if (!cur) return null;
          const idx = stepsByOrder.findIndex((s) => s.id === id);
          return idx >= 0 && idx + 1 < stepsByOrder.length ? stepsByOrder[idx + 1] : null;
        };

        // 1) Busca enrollments active
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
        const enrollUpdates: Array<{
          id: string;
          patch: Record<string, any>;
        }> = [];
        let completed = 0;

        for (const en of list) {
          // Sem step atual → completar diretamente
          if (!en.current_step_id) {
            enrollUpdates.push({
              id: en.id,
              patch: { status: "completed", completed_at: new Date().toISOString() },
            });
            completed++;
            continue;
          }

          const step = stepsById.get(en.current_step_id);
          if (!step) continue; // step removido — ignora

          const baseMs = en.current_step_at ? Date.parse(en.current_step_at) : now;
          const dueAt = baseMs + delayToMs(step.delay_value, step.delay_unit);

          // Se delay não venceu e não é force → pula
          if (!opts.forceNow && now < dueAt) continue;

          // Gera event mock
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

          // Avança enrollment
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

        // 2) Insere events em chunks
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

        // 3) Atualiza enrollments (1 update por linha — volumes pequenos em mock)
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

        return { processed, events_created: eventsToInsert.length, completed };
      } finally {
        setBusy(null);
      }
    },
    []
  );

  return { busy, enrollLeads, processSteps };
}
