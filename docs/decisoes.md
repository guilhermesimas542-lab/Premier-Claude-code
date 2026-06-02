---
tipo: decisoes
projeto: CRM-Premier-FC
atualizado: 2026-05-28
---

## Mock providers em arquivo separado
- **Data:** 2026-05-28
- **Contexto:** Sub-fase 1.6b. Onde colocar a lógica de simulação de envio.
- **Detalhes:** Optado por criar `supabase/functions/crm-process-schedule/mockProviders.ts` separado em vez de inline no `index.ts`. Em Pilar 4, troca-se por `realProviders.ts` mantendo a mesma interface `SendResult`. Reduz risco de retrabalho e mantém `index.ts` focado em orquestração.
- **Tags:** [[arquitetura]] [[mock-first]] [[edge-function]]

## Push e Popup forçam failed no mock
- **Data:** 2026-05-28
- **Contexto:** Canais com `integrationStatus: "blocked"` no catálogo do front.
- **Detalhes:** Mock retorna 100% `failed` com `error_code: "channel_blocked"` para esses dois canais. Evita métrica enganosa de "95% entrega" em algo que ainda não tem provider definido. Quando Push/Popup ganharem provider real, basta tirar a flag `blocked` no catálogo `mockProviders.ts`.
- **Tags:** [[CRM-Premier-FC]] [[canais]] [[push]] [[popup]]

## Engagement (open/click) calculado na mesma execução
- **Data:** 2026-05-28
- **Contexto:** Em produção real, opens e clicks chegariam via webhooks dispersos ao longo de horas/dias.
- **Detalhes:** Pra mock-first, o status final do event (`delivered/opened/clicked`) é decidido na hora do disparo. Vantagem: a UI já tem dado realista pra renderizar dashboards. Desvantagem: não imita o tempo real de propagação. Aceito porque simular dispersão temporal exigiria pg_cron + jobs (escopo da 1.6c).
- **Tags:** [[mock-first]] [[engagement]] [[trade-off]]

## Latência simulada por chunk, não por destinatário
- **Data:** 2026-05-28
- **Contexto:** Simular 200-500ms por destinatário em audiência de 50k = até 7h. Estouraria timeout da edge function.
- **Detalhes:** Latência aplicada por chunk de 1000 (mesmo do INSERT). 50k = 50 chunks * 350ms ≈ 17s. Corresponde à realidade: 1 round-trip à API do provider por lote, não por destinatário individual.
- **Tags:** [[performance]] [[edge-function]]

## Random puro, sem seed
- **Data:** 2026-05-28
- **Contexto:** Decisão sobre testes reproduzíveis com seed.
- **Detalhes:** Optado por `Math.random()` puro. Ruído leve entre execuções (ex: 172 vs 168 opens) é desejável — comunica visualmente que é simulação. Testes automatizados não são prioridade nesta fase do produto.
- **Tags:** [[testes]] [[mock-first]]
