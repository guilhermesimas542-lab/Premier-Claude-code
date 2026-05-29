# CRM Premier FC — PRD & Estado de Implementação

> Documento de produto + estado técnico do CRM interno do Premier Ultra.
> Última atualização: 2026-05-28 · Sub-fase 1.6b + 2.1 (schema pendente aplicação) · Estratégia: mock-first

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Estratégia de desenvolvimento: mock-first](#2-estratégia-de-desenvolvimento-mock-first)
3. [Estado atual da implementação](#3-estado-atual-da-implementação)
4. [Arquitetura técnica](#4-arquitetura-técnica)
5. [Schema do banco](#5-schema-do-banco)
6. [Roadmap restante](#6-roadmap-restante)
7. [Decisões importantes tomadas](#7-decisões-importantes-tomadas)
8. [Dependências externas pendentes](#8-dependências-externas-pendentes)
9. [Como continuar (próxima sessão)](#9-como-continuar-próxima-sessão)
10. [Anexo: brief original](#10-anexo-brief-original)

---

## 1. Visão geral

### O que é

O CRM Premier FC é um **orquestrador de comunicação multicanal** para o time interno (marketing, CRM, customer success). Não é CRM de pipeline de vendas — é uma ferramenta de disparo e automação de mensagens para a base de 2.000 a 10.000 clientes ativos.

### Princípio central

O CRM é a **camada de orquestração e visualização**, não o motor de envio. Os motores são third-parties (Resend, SMS Funnel, WhatsApp API, SendPulse, Telegram). O sistema define quem recebe, quando, por qual canal e com qual conteúdo.

### Dois pilares

| Pilar | Natureza | Estado |
|---|---|---|
| **1. Schedules** | Disparos pontuais ou agendados, manuais | Sub-fase 1.6b concluída |
| **2. Jornadas** | Fluxos automatizados triggerados por eventos | Não iniciado |

### Canais (7)

| Canal | Provider | Filtro por cliente | Builder HTML | Status integração |
|---|---|---|---|---|
| Email | Resend | sim | sim (Nano Banana) | config_needed |
| SMS | SMS Funnel | sim | não | config_needed |
| Telegram (grupo) | Telegram direto | sim | não | config_needed |
| Telegram x1 | SendPulse | **não (broadcast)** | não | config_needed |
| WhatsApp | API oficial | sim | não | config_needed |
| Push app | A definir | sim | não | blocked |
| Popup in-app | A definir | sim | sim (Nano Banana) | blocked |

---

## 2. Estratégia de desenvolvimento: mock-first

**Decisão tomada na sessão de 2026-05-28:**

Construir todo o sistema (Schedules + Jornadas + Configurações) com **dados mockados e providers simulados** antes de plugar APIs externas. Quando todo o produto estiver redondo, conectamos third-parties uma por uma.

### Implicações práticas

| Componente | Modo mock | Modo real (futuro) |
|---|---|---|
| Edge function de disparo | `dry_run: true` (atual) — usa `mockProviders.ts` com latência, 95% delivered, open/click realistas | Plugar Resend/SMS/WhatsApp via `realProviders.ts` |
| Cron processor | Implementar pg_cron real (sem dependência externa) | Mantém igual |
| Channel Settings | UI cadastra "API keys" mockados sem validar | Validar e testar real |
| Webhooks Resend | Não implementar agora | Implementar quando Resend rolar |
| Jornadas | Triggers simulados + steps em dry-run | Eventos reais (cadastro, upgrade, churn) |
| Audiências | Já é real (query em `users`) | Mantém igual |

### Vantagens

- Velocidade: sem esperar setup de DNS, API keys, validação de domínio
- Foco em UX: time pode validar fluxos visuais primeiro
- Risco zero: nenhum email/SMS real enviado por engano
- Iteração rápida: features evoluem sem coordenação com providers

### Como saber que tá em mock

- Toast de disparo mostra "[MOCK]"
- `crm_schedule_events.metadata.mock = true` e `metadata.mode = "1.6b"`
- Página de Settings mostra todos canais como "config_needed" ou "blocked"
- Nenhum webhook externo configurado

---

## 3. Estado atual da implementação

### Sub-fases concluídas (Pilar 1 — Schedules)

| ID | Sub-fase | Data | Entrega |
|---|---|---|---|
| 1.1 | Estrutura base | 2026-05-28 | 4 rotas + sidebar + páginas placeholder |
| 1.2 | Schema do banco | 2026-05-28 | 4 tabelas + 7 canais seed + RLS is_admin |
| 1.3 | Audiências | 2026-05-28 | CRUD + builder visual + preview tempo real |
| 1.4 | Lista de Schedules | 2026-05-28 | Filtros canal/status + ações + métricas |
| 1.5 | Wizard de criação | 2026-05-28 | 5 passos: canal → audiência → conteúdo → agendamento → revisão |
| 1.6a | Backend disparo (dry-run) | 2026-05-28 | Edge function + botão "Disparar agora" |
| 1.6b | Mock send provider | 2026-05-28 | `mockProviders.ts` com latência, 95% sucesso, open 40%, click 8%. Push/popup forçam failed. Edge function refatorada. |
| 2.1 (schema) | Schema das Jornadas | 2026-05-28 | SQL pronto em [docs/sql/2.1_journeys_schema.sql](sql/2.1_journeys_schema.sql) — 4 tabelas + RLS + triggers. Aplicação em produção pendente. |
| 2.2 | Visão geral de Jornadas | 2026-05-28 | Rota `/admin/crm/journeys`, cards com trigger/status/steps/ativos/conclusão, filtros, banner "schema pendente" enquanto tabelas não aplicadas. |
| 2.3 | Journey Builder | 2026-05-28 | Rotas `/admin/crm/journeys/new` e `/journeys/:id/edit`. Top bar editável (nome/trigger/audiência), canvas vertical de steps com delay + content por canal, picker de canal (modal), reorder via setas, ativar/pausar. |
| 2.4 | Detalhe de jornada | 2026-05-28 | Rota `/admin/crm/journeys/:id`. KPIs (ativos/concluídos/churn/cancelados), tabela funil por step com taxas, lista de enrollments recentes, toggle ativar/pausar. |
| 2.5 | Triggers automáticos (mock) | 2026-05-28 | `mockEngagement.ts` + `useJourneyMockOps` + `MockTriggerPanel` integrado na tela de detalhe. Botões: "Inscrever N leads", "Processar pendentes", "Forçar agora". Lógica roda no client (mock-first) — em Pilar 4 migra pra edge function + pg_cron. |
| 2.6 | 3 jornadas template | 2026-05-28 | `journeyTemplates.ts` + `TemplateLibrary` modal. Botão "Templates" na listing instala Onboarding / Upgrade / Reativação com steps + content pré-preenchidos. |
| 1.7 | Channel Settings UI | 2026-05-28 | `channelConfigSchemas.ts` + `useChannelSettings` + `AdminCrmSettings` refeito. Cards expansíveis por canal com forms tipados, toggle ativo, "Testar conexão" mock (latência + 90% sucesso), notas internas. |
| Pilar 3 | Dashboard analítico | 2026-05-28 | `useCrmDashboard` + `AdminCrmDashboard` refeito. KPIs clicáveis (schedules / jornadas / leads em jornadas / audiências), card de último envio, performance por canal 7d/30d com barras CSS, lista dos últimos disparos. Tolera schema de jornadas faltante. |
| 4.1 | Vault de credenciais | 2026-05-28 | 3 RPCs (save/clear/get) + hook estendido + UI mascarada com 2 estados (cadastrado/digitando). API keys cifradas no Supabase Vault, nunca voltam pra UI. SQL aplicado em prod. |
| 4.2 | Listas importadas (audiences) | 2026-05-28 | `crm_audience_members` + import modal (paste text + parse), `kind=static_list` em `crm_audiences`. Match automático com `users` via email/phone. SQL aplicado em prod. |
| 4.3 | Tracking de comportamento (F1+F2+F4) | 2026-05-28 | `analysisTracking.ts` (parser markdown) + `useBehaviorReport` + `AdminBehavior` (KPIs/top/heatmap) + filtros de behavior no `AudienceBuilder` (campeonatos/mercados/frequência/recência). Fix bug `house_id` no `trackEvent`. |

### Validações feitas

- Audiência "Premium Ativos | Login 7D" criada (455 leads)
- Schedule "tobias 13323" via Email criado e disparado em dry-run
- 455 events em `crm_schedule_events` criados com `dry_run=true`
- Schedule transicionou `draft → sending → sent`
- Métricas (`reach_count`, `delivered_count`) atualizadas corretamente
- Constraint `audience_id IS NOT NULL OR audience_filters IS NOT NULL` respeitada
- Telegram x1 marca `audience_filters = { broadcast: true }` semanticamente
- RLS `is_admin()` aplicada nas 4 tabelas CRM (mesmo padrão de `ai_credit_*`)

---

## 4. Arquitetura técnica

### Estrutura de arquivos

```
src/admin/
├── lib/crm/
│   └── channels.ts                          # Catálogo central dos 7 canais
├── hooks/crm/
│   ├── useAudiences.ts                      # CRUD crm_audiences
│   ├── usePreviewAudience.ts                # Count em tempo real (debounced 500ms)
│   ├── useSchedules.ts                      # CRUD crm_schedules + filtros
│   └── useDispatchSchedule.ts               # Invoca edge function
├── components/crm/
│   ├── AudienceBuilder.tsx                  # Modal construtor de filtros
│   └── wizard/
│       └── ScheduleWizard.tsx               # Wizard 5 passos
└── pages/crm/
    ├── AdminCrmDashboard.tsx                # /admin/crm
    ├── AdminCrmSchedules.tsx                # /admin/crm/schedules
    ├── AdminCrmScheduleNew.tsx              # /admin/crm/schedules/new
    ├── AdminCrmAudiences.tsx                # /admin/crm/audiences
    └── AdminCrmSettings.tsx                 # /admin/crm/settings

supabase/functions/
└── crm-process-schedule/
    └── index.ts                             # Edge function (modo dry-run)
```

### Rotas

| URL | Componente | Status |
|---|---|---|
| `/admin/crm` | AdminCrmDashboard | placeholder com cards e status canais |
| `/admin/crm/schedules` | AdminCrmSchedules | funcional |
| `/admin/crm/schedules/new` | AdminCrmScheduleNew | funcional (wizard) |
| `/admin/crm/audiences` | AdminCrmAudiences | funcional |
| `/admin/crm/settings` | AdminCrmSettings | placeholder com lista de canais |

### Sidebar

Grupo "CRM" adicionado em `src/admin/components/AdminSidebar.tsx`, posicionado entre "IA Tipster" e "Links e Pop-ups":

```typescript
{
  label: "CRM",
  items: [
    { to: "/admin/crm",            icon: Megaphone, label: "Dashboard", end: true },
    { to: "/admin/crm/schedules",  icon: Send,      label: "Schedules" },
    { to: "/admin/crm/audiences",  icon: Users,     label: "Audiências" },
    { to: "/admin/crm/settings",   icon: Settings,  label: "Configurações" },
  ],
}
```

### Padrões reutilizáveis

| Padrão | Onde mora | Como usar |
|---|---|---|
| Catálogo de canais | `lib/crm/channels.ts` | `import { CHANNELS, CHANNEL_LIST }` |
| Filtros de audiência | tipo `AudienceFilters` | reusado em Schedules e Jornadas |
| Status de Schedule | `SCHEDULE_STATUS_META` | cor + label de cada status |
| Preview de count | `usePreviewAudience` | hook reusável com debounce |
| RLS de admin | já configurado nas 4 tabelas | `is_admin()` policy |

---

## 5. Schema do banco

### Tabelas criadas (Sub-fase 1.2)

#### crm_audiences

Filtros reutilizáveis compartilhados entre Schedules e Jornadas.

```sql
CREATE TABLE public.crm_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
```

Estrutura do JSONB `filters`:

```typescript
{
  plans?: string[];                              // ["free", "premium", "diamante", "ultra"]
  days_since_login?: { gte?: number, lte?: number };
  status?: ("active" | "inactive" | "churn_risk")[];
  origin?: "payt" | "db_app" | "both";            // não implementado ainda
  opt_ins?: string[];                             // não implementado ainda
  broadcast?: boolean;                            // marca semântica pra Telegram x1
}
```

#### crm_schedules

Disparos pontuais ou agendados.

```sql
CREATE TABLE public.crm_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN (
    'email','sms','telegram_group','telegram_x1','whatsapp','push','popup'
  )),
  audience_id uuid REFERENCES public.crm_audiences(id) ON DELETE SET NULL,
  audience_filters jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','scheduled','sending','sent','failed','paused'
  )),
  reach_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  open_count int NOT NULL DEFAULT 0,
  click_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_schedules_audience_check CHECK (
    audience_id IS NOT NULL OR audience_filters IS NOT NULL
  )
);
```

Estrutura do JSONB `content` (varia por canal):

```typescript
// email
{ subject: string, body: string, html?: string }

// sms / telegram_group / telegram_x1 / whatsapp
{ body: string }

// push
{ title: string, body: string }

// popup
{ title: string, body: string, cta: string }
```

#### crm_schedule_events

Log granular: 1 linha por destinatário.

```sql
CREATE TABLE public.crm_schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.crm_schedules(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_identifier text,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','sent','delivered','failed','opened','clicked','bounced'
  )),
  provider_message_id text,
  error_code text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
```

Em modo dry-run, `metadata = { dry_run: true, mode: "1.6a", channel: "email" }`.

#### crm_channel_settings

Configuração dos 7 canais com seed inicial.

```sql
CREATE TABLE public.crm_channel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL UNIQUE CHECK (channel IN (
    'email','sms','telegram_group','telegram_x1','whatsapp','push','popup'
  )),
  provider text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_test_at timestamptz,
  last_test_success boolean,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
```

Sementes inseridas: email/resend, sms/sms_funnel, telegram_group/telegram_direct, telegram_x1/sendpulse, whatsapp/whatsapp_official, push/pending, popup/pending.

### Segurança (RLS)

Todas as 4 tabelas têm RLS habilitada com policy `FOR ALL USING (is_admin()) WITH CHECK (is_admin())`. Service role usado pela edge function bypassa RLS. Admin UI lê direto via anon client (autoriza via `is_admin()` baseado no contexto da sessão admin).

---

## 6. Roadmap restante

### Pilar 1 — Schedules (faltam 2 sub-fases)

#### Sub-fase 1.6c — Cron processor (autonomia)

**Entregáveis:**
- Função SQL `crm_process_pending_schedules()` que:
  - Busca schedules com `status='scheduled' AND scheduled_at <= NOW()`
  - Chama edge function `crm-process-schedule` em loop
- Cron job (pg_cron) que invoca a função SQL a cada minuto
- Schedule criado pelo wizard com `scheduled_at` futuro vira `sent` automaticamente quando a hora chega

**Sem dependência externa.** pg_cron já vem com Supabase.

#### Sub-fase 1.7 — Channel Settings (UI completa)

**Entregáveis:**
- Refactor `AdminCrmSettings.tsx` (atualmente placeholder):
  - Formulário pra editar cada canal (config jsonb)
  - Toggle ativo/inativo
  - Botão "Testar conexão" (chama mock provider em modo "validação")
  - Histórico de últimos testes (last_test_at, last_test_success)
- Configs em modo mock: aceita qualquer "API key" sem validar, marca `active=true`

### Pilar 2 — Jornadas (não iniciado)

#### Sub-fase 2.1 — Schema de jornadas

Tabelas a criar:

```
crm_journeys
├── id, name, description, trigger_type, trigger_config (jsonb)
├── audience_id, audience_filters
├── status (draft/active/paused/archived)
├── stats (jsonb com leads_total, completion_rate, etc)
└── created_by, created_at, updated_at

crm_journey_steps
├── id, journey_id
├── step_order (int)
├── channel, content (jsonb)
├── delay_value (int), delay_unit (text: minute/hour/day/week)
├── audience_filters (sub-filtro opcional)
└── created_at, updated_at

crm_journey_enrollments
├── id, journey_id, user_id
├── current_step_id, current_step_at
├── status (active/completed/cancelled/churned)
├── enrolled_at, completed_at
└── metadata (jsonb)

crm_journey_step_events
├── id, enrollment_id, step_id
├── channel, content_snapshot
├── status (pending/sent/delivered/failed/skipped)
└── created_at, updated_at
```

#### Sub-fase 2.2 — Visão geral de Jornadas (Tela 04)

Cards de jornada com:
- Nome, trigger, status
- Leads ativos, funil por step, taxa de conclusão
- Ações: editar, pausar/ativar, duplicar, arquivar

#### Sub-fase 2.3 — Journey Builder (Tela 05)

A tela mais complexa. Editor livre estilo ManyChat/SendPulse:
- Top bar com nome editável + badge de trigger + audiência + prévia + ativar
- Canvas vertical com steps + delays
- Step card colapsado/expandido
- Picker de canais ao adicionar
- Drag-and-drop pra reordenar
- Avisos contextuais (Telegram x1, integração pendente)

#### Sub-fase 2.4 — Detalhe de jornada (Tela 06)

Timeline visual de jornada ativa, performance por step, toggle ativar/pausar.

#### Sub-fase 2.5 — Triggers automáticos (mock)

Eventos simulados que disparam entrada na jornada:
- Mock "novo_cadastro" via botão admin
- Mock "upgrade_plano" via botão admin
- Mock "churn_X_dias" via job que avalia condição

Em modo real (depois): triggers via webhooks reais de cadastro/upgrade e job de churn checking last_seen_at.

#### Sub-fase 2.6 — 3 jornadas template seedeadas

Inserir na criação de banco:
1. **Onboarding** — trigger: novo cadastro. Steps: Email D+0 → Push D+1 → WhatsApp D+3 → Email D+7
2. **Upgrade confirmado** — trigger: upgrade. Steps: Email D+0 → Push D+1 → Email D+5
3. **Reativação de churn** — trigger: 7 dias sem login (configurável). Steps: Push D+7 → Email D+14 → WhatsApp D+30

### Pilar 3 — Dashboard analítico (futuro)

Visão agregada: schedules ativos, jornadas ativas, leads em jornadas, último envio, métricas por canal nos últimos 7/30 dias.

### Pilar 4 — Integrações reais (último)

Trocar todos os mock providers por chamadas reais:
- Email: Resend (precisa de conta + domínio + API key)
- SMS: SMS Funnel
- WhatsApp: API oficial
- Telegram grupo: Telegram bot direto
- Telegram x1: SendPulse
- Webhooks: configurar callbacks pra delivered/opened/clicked
- Builder HTML (Nano Banana): integrar API de geração

---

## 7. Decisões importantes tomadas

### Visuais e UX

| Decisão | Razão |
|---|---|
| Botão CTA primário verde sólido = `#24c660` (não `#00FF7F`) | Padrão da app (Acessar, Adicionar) — verde sólido é mais sóbrio que neon |
| Texto branco em CTA verde do Hero IA Tipster | Padrão visual aprovado pelo usuário |
| Catálogo de canais centralizado em `lib/crm/channels.ts` | Fonte única de verdade — evita drift visual entre Schedules, Wizard, Settings, Jornadas |
| Cor por canal | Identificação visual rápida na lista |
| Empty state com CTA | Quando a lista vazia, sempre há "+ Criar primeiro" |
| Confirm dialog antes de delete e dispatch | Previne ações destrutivas acidentais |

### Arquitetura

| Decisão | Razão |
|---|---|
| Hooks por entidade (`useSchedules`, `useAudiences`) | Encapsulamento, fácil testar |
| Filtros como JSONB | Schema evolutivo sem migrations |
| `audience_id` OU `audience_filters` (constraint OR) | Audiência salva OU filtros ad-hoc |
| `audience_filters = { broadcast: true }` pra Telegram x1 | Constraint satisfeita + semântica clara |
| Edge function usa service_role | Bypass RLS, segurança via validação manual |
| Modo dry-run como default | Segurança em desenvolvimento, evita disparo acidental |
| Hook `useDispatchSchedule` usa `supabase.functions.invoke` direto | Admin não usa `premier_token` do app — chamada direta sem `invokeWithAuth` |
| Mock providers em arquivo separado (`mockProviders.ts`) | Em Pilar 4 vira `realProviders.ts` — swap trivial sem inflar `index.ts` |
| Push/popup forçam `failed: channel_blocked` no mock | Reflete `integrationStatus: "blocked"` do catálogo — evita métrica enganosa de "95% entrega" pra canal inexistente |
| Engagement (open/click) calculado na mesma execução do disparo | Mock-first: prioriza ter dado pra UI já no fim do disparo; webhooks dispersos exigiriam pg_cron (escopo 1.6c) |
| Random puro (sem seed) no mock | Ruído leve é desejável — mostra que é simulação. Testes automatizados não são prioridade nesta fase. |
| Latência simulada por chunk (200-500ms), não por destinatário | 50k * 350ms = 7h estouraria timeout. 1 chunk ≈ 1 round-trip à API real do provider. |

### Banco

| Decisão | Razão |
|---|---|
| RLS `is_admin()` em todas as tabelas CRM | Padrão do projeto (mesmo de `ai_credit_*`) |
| Trigger `updated_at` em todas tabelas | Auditoria automática |
| Indexes nos campos de filtro (status, channel, created_at) | Performance em listagens |
| FK com `ON DELETE SET NULL` em `audience_id` | Excluir audiência não quebra schedules |
| FK com `ON DELETE CASCADE` em `schedule_events.schedule_id` | Excluir schedule remove events |
| Chunking de inserts a 1000 rows | Limite do Supabase pra inserts em batch |

---

## 8. Dependências externas pendentes

### Necessárias para integrações reais (Pilar 4)

| Item | Para que serve | Fornecedor | Como obter |
|---|---|---|---|
| Conta Resend | Email | resend.com | 5min, free tier 3k/mês |
| Domínio verificado | Sender de Resend | DNS do cliente | 10min com registros TXT/MX |
| RESEND_API_KEY | Auth Resend | Resend dashboard | Após criar conta |
| Conta SMS Funnel | SMS | SMS Funnel | Verificar com cliente |
| WhatsApp Business API | WhatsApp | Meta | Aprovação demorada |
| Telegram Bot Token | Telegram grupo | BotFather | 2min |
| ID do grupo Telegram | Telegram grupo | Telegram | Adicionar bot ao grupo |
| SendPulse API key | Telegram x1 | sendpulse.com | Após criar conta |
| Nano Banana API | Builder HTML | A confirmar com cliente | Cliente confirma disponibilidade |

### Não necessárias para mock-first

Todos os itens acima ficam pendentes. Construímos o produto inteiro com simulações e plugamos quando o time tiver acesso.

---

## 9. Como continuar (próxima sessão)

### Contexto mínimo pra retomar

Ler nesta ordem:
1. Este PRD (`docs/CRM_PREMIER_FC_PRD.md`)
2. Catálogo de canais (`src/admin/lib/crm/channels.ts`)
3. Edge function (`supabase/functions/crm-process-schedule/index.ts`)
4. ScheduleWizard (`src/admin/components/crm/wizard/ScheduleWizard.tsx`)

### Estado de teste reproduzível

- Audiência existente no banco: "Premium Ativos | Login 7D" (455 leads)
- Schedule existente no banco: "tobias 13323" (status = sent, dry-run, 455 events)
- Para criar novo schedule de teste: `/admin/crm/schedules` → "+ Novo Schedule"
- Para resetar: deletar via UI ou via SQL `DELETE FROM crm_schedules WHERE name LIKE 'teste%'`

### Próxima sub-fase sugerida

**Estado atual: produto end-to-end em mock-first com Vault de credenciais + tracking comportamental + filtros de audiência por comportamento.**

**Pendências registradas:**
- **Edge function de schedules + filter behavior**: hoje o `crm-process-schedule` resolve filtros tradicionais e listas estáticas, mas não cruza behavior server-side. Jornadas (lógica client) já funcionam. Quando deploy via Lovable rolar, instrumentar.
- **1.6c — Cron processor**: pg_cron pra schedules agendados dispararem sozinhos. Precisa habilitar pg_cron/pg_net em prod.
- **F3 — Perfil por usuário**: `/admin/clients/:id/comportamento` com timeline + stats. Não iniciado.
- **CSV upload em audience import**: hoje só paste de texto.
- **Edição de membros de lista estática**: hoje cria/destrói; falta adicionar/remover 1 a 1.

**Próximo passo natural**: Pilar 5 — providers reais (Resend, SMS Funnel, WhatsApp Business). O "Testar conexão" da tela de Settings vira chamada real ao provider quando integrar.

### Como rodar local

```bash
cd /Users/guilhermesimas/Documents/Premierapp/ultrateste111
node --version  # deve ser v20.x (instalado via nvm)
npm run dev
# Aguardar Vite ready e acessar localhost:8080
```

Node 20 LTS é obrigatório — Vite 5 não funciona bem em Node 24.

### Convenções a seguir

- Arquivos novos do CRM em `src/admin/{lib,hooks,components,pages}/crm/`
- Edge functions em `supabase/functions/crm-{nome}/`
- Sempre usar `CHANNELS` do catálogo, nunca hardcodar canal
- Sempre chamar `supabase.functions.invoke` direto no admin (não usar `invokeWithAuth`)
- SQL em produção: enviar com **prompt de segurança** (ver Sub-fase 1.2 como modelo)
- Edge functions deployadas via Lovable (não temos Supabase CLI local)
- Cores de CTA: verde sólido `#24c660` com texto branco

### Riscos conhecidos

- Vite local pode travar em primeiras requests (esperar até 3min na 1ª, depois fica rápido). Causa: optimizar de deps Lovable-tagger.
- Workaround se travar muito: `rm -rf node_modules/.vite && npm run dev`.
- localStorage tem várias flags do IA Tipster — limpar com `localStorage.clear()` se confundir testes.

---

## 10. Anexo: brief original

### Documento de produto original (recebido em 2026-05-28)

#### Visão geral

O CRM Premier FC é um orquestrador de comunicação multicanal — uma camada de gestão, disparo e automação de mensagens para a base de clientes do Premier FC. Não é CRM de pipeline de vendas.

- Volume de clientes ativos: 2.000 a 10.000
- Base de dados: Payt + banco de dados do app
- Canais disponíveis: 7

#### Arquitetura de módulos

```
CRM Premier FC
├── Pilar 1: Schedules
│   └── Disparos manuais e agendados para segmentos da base
│
└── Pilar 2: Jornadas
    └── Fluxos automatizados triggerados por eventos do lead
```

#### Jornadas template iniciais

1. **Onboarding** — trigger: novo cadastro confirmado
   - Email D+0 (boas-vindas) → Push D+1 → WhatsApp D+3 → Email D+7

2. **Upgrade confirmado** — trigger: upgrade de plano registrado
   - Email D+0 (confirmação) → Push D+1 → Email D+5 (tutorial)

3. **Reativação de churn** — trigger: X dias sem login (configurável)
   - Push D+7 → Email D+14 → WhatsApp D+30 → arquivar

#### Telas a construir (8 telas)

1. Dashboard principal
2. Criar Schedule (wizard 5 passos)
3. Lista de Schedules
4. Jornadas — visão geral
5. Journey Builder (mais complexa)
6. Detalhe de jornada
7. Segmentação / Audiências
8. Configurações de canal

#### Variáveis de personalização

- `{nome}` — primeiro nome do lead
- `{plano}` — plano atual do usuário
- `{dias_sem_login}` — dias desde o último acesso
- `{data_cadastro}` — data de entrada do lead

#### Microcopys de referência

| Contexto | Texto |
|---|---|
| Aviso Telegram x1 | "Este canal não suporta filtro por cliente. A mensagem será enviada para toda a base SendPulse." |
| Canal com integração pendente | "Integração pendente. Configure o canal em Configurações para usar este step." |
| Jornada sem trigger | "Configure o trigger para ativar esta jornada." |
| Lead já na jornada | "Este lead já está ativo nesta jornada. Nova entrada bloqueada." |
| Confirmar exclusão de step | "Excluir este step? Esta ação não pode ser desfeita." |
| Jornada ativada | "Jornada ativa. Novos leads entrarão automaticamente." |
| Schedule enviado | "Enviado para [N] contatos via [canal]." |

#### Regras de negócio críticas

1. Telegram x1 sem filtro — disparo sempre broadcast
2. Push/Popup com integração pendente
3. Jornadas editáveis livremente (sem restrição estrutural)
4. Threshold de churn configurável
5. Sem duplicidade de jornadas (mesmo lead duas vezes na mesma)
6. Segmentação compartilhada entre Schedules e Jornadas
7. Builder HTML (Nano Banana) só Email e Popup
8. Dados de envio são read-only no CRM (logs vêm via API dos providers)

---

*Documento atualizado em 2026-05-28 · Versão 1.1 · Próxima atualização: ao concluir Sub-fase 1.6c*
