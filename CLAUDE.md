# CLAUDE.md — CL Score

## Sobre o projeto

App do **CL Score** (Chile) — fork do template Premier FC adaptado pra mercado chileno (es-CL).

- **Repo dev:** `Premier-Claude-code` (origin) — onde commitamos
- **Repo template:** `ultrateste111` (upstream) — só leitura, sync periódico
- **Hosting front:** Vercel (deploy automático no push pra `main`)
- **Hosting back:** Supabase + Stape (GTM Server)

## Regras de comunicação

**Fale leigo e curto.** O usuário não é programador.

- Sempre que possível, responder em 2-3 frases. Texto longo só quando o usuário pedir explicação detalhada.
- Evitar termos técnicos sem traduzir. Quando usar (`pg_cron`, `vault`, etc.), explicar o que é entre parênteses.
- Não enfileirar 4 perguntas seguidas. Quando o usuário disser "decida você" / "siga sua recomendação", escolher e seguir — não voltar a perguntar.
- Cortar bullets/tabelas que não agregam. Quando 1 linha resolve, não fazer 3 seções.
- Resumo final de ação: 1-2 frases. O que mudou + o que vem a seguir.

## Banco de dados — ✅ MCP funciona neste projeto

Diferente do template Premier FC, o CL Score **usa o mesmo banco que está configurado no MCP do Supabase**:

- **Supabase project:** `snykhoctikatcpvlcoow.supabase.co`
- **MCP `mcp__supabase__*`:** ✅ aponta pro projeto correto, pode usar normalmente
- **Edge functions:** deploy via MCP (`mcp__supabase__deploy_edge_function`) — funciona
- **SQL:** `execute_sql` via MCP funciona — sempre confirmar antes de DDL/DML destrutivo

**Credenciais sensíveis:** SUPABASE_ACCESS_TOKEN e service_role keys **NÃO devem ser coladas no chat**. Se vazar, revogar imediatamente em https://supabase.com/dashboard/account/tokens.

## Infra externa importante

- **GTM Web:** `GTM-T886SRPV` (browser tags)
- **GTM Server:** `GTM-P2VX7Q62` hospedado em **Stape** (`api.clscore.app`)
- **Webhook PerfectPay:** `https://snykhoctikatcpvlcoow.supabase.co/functions/v1/perfectpay-webhook` — manda email via Resend (`acesso@clscore.app`)
- **Funil de venda:** **inLead** (botão dispara Custom Event `FormSubmit` no dataLayer)
- **Checkout:** **CenterPag** (rebrand do PerfectPay) — URLs `go.centerpag.com/*`
- **Onboarding pós-compra:** **Telegram bot `@Clscore_bot`** (link `https://t.me/Clscore_bot?start=...`)
- **Domínio:** `clscore.app` — DKIM/SPF OK no Resend, **DMARC pendente** (cai no spam)

## Idioma e branding

- **Idioma do app:** espanhol Chile (es-CL)
- **Marca:** "CL Score" (NUNCA "Premier FC", "Premier", "CL FC", etc.)
- **Moeda:** CLP (peso chileno) — formato `$10`, `$27` (sem decimais)
- **Timezone:** `America/Santiago`

## Convenções

- **Commits:** mensagem em pt-BR (uso interno), código sempre em inglês
- **PR/branch:** trabalhar em branch separada pra mudanças grandes (>5 arquivos), mergear via PR no GitHub
- **Auto-commit:** só commitar quando o usuário pedir explicitamente
- **Push pra main:** só com autorização explícita do usuário pra operações grandes (>50 arquivos)
- **NUNCA pushar no upstream** (`ultrateste111`) — sempre `git push origin main`

## Estrutura de tiers

```
free → basic → pro → ultra → premium → diamante
```

- **Diamante** = tier máximo, libera quase todas as features
- **`live_telegram`** = única feature que NÃO vem auto no Diamante (precisa entitlement manual)
- **Escada de upgrade:** free sempre vê popup "Premium" primeiro, depois Premium vê popup "Diamante" (feature exclusiva)

## Admin

- **Login admin:** rota `/admin/login` (verifica `admin_emails` table)
- **Admin atual:** `ferramentas.batman@gmail.com`
- **Criação de tips:** `/admin/tips/create` — autocomplete de palpites lê de `market_predictions` + histórico de `content_entries.condition_to_win`
