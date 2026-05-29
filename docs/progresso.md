---
tipo: progresso
projeto: CRM-Premier-FC
atualizado: 2026-05-28
---

## Sub-fase 1.6b — Mock send provider
- **Data:** 2026-05-28
- **Contexto:** Pilar 1 (Schedules) em mock-first. Edge function `crm-process-schedule` estava em DRY-RUN seco — só criava events com `metadata.dry_run=true`. Faltava simular pipeline completa (envio + entrega + engajamento) pra UI ter dado realista.
- **Detalhes:**
  - Criado [mockProviders.ts](../supabase/functions/crm-process-schedule/mockProviders.ts): `sendBatch` simula latência 200-500ms por chunk, 95% delivered. Engagement (open 40%, click 8%) calculado na mesma execução pra canais que suportam. Push e Popup forçam `failed: channel_blocked`.
  - Refatorada [edge function](../supabase/functions/crm-process-schedule/index.ts): bloco DRY-RUN substituído por loop de mock providers. Agora persiste `provider_message_id`, `error_code`, `error_message` e métricas finais (`open_count`, `click_count`) no schedule.
  - Ajustado [useDispatchSchedule.ts](../src/admin/hooks/crm/useDispatchSchedule.ts): prefixo do toast `[DRY-RUN]` → `[MOCK]`, exibe aberturas e cliques quando > 0, trata broadcast falho.
  - PRD atualizado: 1.6b marcada como concluída, próxima sugerida = 1.6c (cron processor).
- **Próximo passo:** Sub-fase 1.6c — pg_cron + função SQL `crm_process_pending_schedules()` pra que schedules com `scheduled_at` futuro disparem sozinhos.
- **Estado de deploy:** edits salvos só local. Edge function ainda roda versão 1.6a no Supabase até deploy via Lovable.
- **Tags:** [[CRM-Premier-FC]] [[mock-first]] [[edge-function]] [[Supabase]] [[Resend]]

## Sub-fase 2.1 — Schema de Jornadas (arquivo local)
- **Data:** 2026-05-28
- **Contexto:** Usuário pediu pra ficar tudo local; a 1.6c precisa mexer em produção (extensões pg_cron/pg_net, vault, cron job). Pulamos pra 2.1 que pode ficar 100% local.
- **Detalhes:**
  - Criado [docs/sql/2.1_journeys_schema.sql](sql/2.1_journeys_schema.sql) com 4 tabelas: `crm_journeys`, `crm_journey_steps`, `crm_journey_enrollments`, `crm_journey_step_events`.
  - RLS `is_admin()` em todas, triggers `updated_at`, indexes em status/journey_id/created_at.
  - Índice parcial UNIQUE em `enrollments` previne duplicidade de leads ativos na mesma jornada (regra de negócio do PRD).
  - PRD atualizado: 2.1 marcada como schema pronto / aplicação pendente. Próxima sugerida = 2.2 (UI de listagem de jornadas).
- **Próximo passo:** Sub-fase 2.2 — UI de visão geral de jornadas (cards com trigger/status/funil). Pode ficar local também.
- **Estado de deploy:** arquivo SQL não aplicado em produção. Usuário decide quando aplicar.
- **Tags:** [[CRM-Premier-FC]] [[jornadas]] [[schema]] [[SQL]]
