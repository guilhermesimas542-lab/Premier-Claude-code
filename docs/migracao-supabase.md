---
tipo: progresso
projeto: ultrateste111
atualizado: 2026-05-07
---

# Migração para o novo Supabase — Operação Chile

Este documento descreve o que **já foi feito** e o que **ainda falta** para a operação Chile rodar com o novo projeto Supabase isolado, sem nunca tocar no banco de produção.

> **Project ref Chile:** `snykhoctikatcpvlcoow`
> **Project ref Produção (BR):** `jdzndbkimjwtxpldmigi` — **NUNCA tocar**

---

## ✅ O que JÁ foi feito (sessão de 2026-05-07)

### 1. MCP Supabase autenticado
- `.mcp.json` aponta para o projeto Chile (`project_ref=snykhoctikatcpvlcoow`)
- Claude autenticado via OAuth na sessão atual

### 2. 89 migrations aplicadas no banco Chile
- Aplicado via `supabase db push --include-all` (após `supabase login` interativo do usuário)
- Schema completo replicado: 36 tabelas em `public`, todas com RLS habilitado
- Histórico de migrations registrado em `supabase_migrations.schema_migrations`
- Tabelas criadas: `users`, `entitlements`, `orders`, `content_banners`, `content_entries`, `events`, `sessions`, `admin_emails`, `notifications`, `banner_analytics`, `push_subscriptions`, `betting_houses` (2 rows seed), `popups`, `user_gamification`, `referrals`, `xp_events`, `teams`, `market_predictions`, `cards` (1 row seed), `funnel_steps`, `user_popup_views`, `pay_cards`, `app_errors`, `webhook_logs`, `products_catalog`, `funnel_analytics`, `raw_webhook_logs`, `financial_events`, `achievements`, `user_achievements`, `special_achievement_entries`, `user_feedback`, `admin_last_seen`, `features`, `users_pending_review`, `users_premigration_snapshot`

### 3. 13 edge functions deployadas
Status `ACTIVE` no projeto Chile, todas com `verify_jwt: true`:
`altenar-proxy`, `auth-login`, `banners`, `checkout-guard`, `entries`, `events`, `handle-xp-events`, `me`, `payment-webhook`, `save-push-subscription`, `send-push-notification`, `sessions`, `vapid-public-key`

### 4. `supabase/config.toml` atualizado
`project_id = "snykhoctikatcpvlcoow"` (era `jdzndbkimjwtxpldmigi`)

### 5. Inventário de secrets concluído
Apenas **5 secrets manuais** precisam ser configurados (o resto é injetado automaticamente pelo Supabase em todas as edge functions):

| Secret | Functions que consomem | Origem |
|---|---|---|
| `WEBHOOK_SECRET` | `payment-webhook` | Definido por você — token compartilhado com o gateway de pagamento |
| `LASTLINK_WEBHOOK_SECRET` | `payment-webhook` | Pegar com Lastlink (gateway de pagamento BR — provavelmente Chile vai usar gateway DIFERENTE; investigar) |
| `VAPID_PUBLIC_KEY` | `send-push-notification`, `vapid-public-key` | Gerar par novo via `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | `send-push-notification` | Mesmo par acima |
| `VAPID_SUBJECT` | `send-push-notification` | Algo tipo `mailto:contato@premierultra.cl` |

> **NÃO precisam ser definidos** (Supabase injeta sozinho): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`.
> **Não há `JWT_SECRET` nem `ALTENAR_API_KEY`** — `altenar-proxy` é um proxy puro sem env vars; auth usa Supabase Auth nativo.

### 6. Validação via advisors
49 warnings (zero erros). Todos esperados:
- 27 `rls_policy_always_true` — INSERT/UPDATE liberados pra service_role acessar via backend (padrão do projeto, mesmo da produção)
- 9 + 9 SECURITY DEFINER em funções intencionais
- 4 buckets públicos com listing (storage de assets)

Nenhum warning é bloqueante e nenhum foi introduzido pela operação Chile — todos vêm das migrations originais.

---

## ⏸️ O que VOCÊ ainda precisa fazer manualmente

### 7. Atualizar `.env` local
> Não toco em `.env` por regra global. Faça o swap manualmente.

```env
SUPABASE_URL="https://snykhoctikatcpvlcoow.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_kV7vddwPAzT8J8AoAWmWsw_TdkFPrbK"

VITE_SUPABASE_URL="https://snykhoctikatcpvlcoow.supabase.co"
VITE_SUPABASE_PROJECT_ID="snykhoctikatcpvlcoow"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_kV7vddwPAzT8J8AoAWmWsw_TdkFPrbK"
```

> A `service_role` (secreta, bypass RLS) só aparece no dashboard `Settings → API`. Não vai pro `.env` do frontend — só pra scripts admin. O MCP não expõe ela por segurança.
> A `anon` legacy (`eyJhbGc...j0uk`) também funciona, mas o **publishable** acima é a recomendação atual.

### 8. Configurar os 5 secrets das edge functions
Dashboard do projeto Chile: `Edge Functions → Secrets → Add secret`. Configure as 5 da tabela acima.

### 9. ~~Authentication providers~~ — não aplicável
O produto usa fluxo de login **custom** via edge function `auth-login` + tabela `public.users` direto. Não usa `Supabase Auth` (`auth.users`, Magic Link, OTP, OAuth). Validado em 2026-05-07 com login do email `suntainer@hotmail.com`: o usuário foi criado em `public.users` sem nada em `auth.users`. Logo, **nada a configurar em `Authentication → Providers`** no dashboard.

### 10. Popular conteúdo es-CL
O schema está vazio (exceto sementes herdadas das migrations: 2 betting_houses + 1 card). Conteúdo ainda precisa ser inserido:

| Tabela | O que inserir |
|---|---|
| `betting_houses` | Casas chilenas (Coolbet Chile, Betsson Chile, etc.) com `iframe_url` adaptada |
| `content_entries` | Tips diárias em es-CL (conteúdo novo, não copia do BR) |
| `content_banners` | Banners promocionais em es-CL |
| `pay_cards` | Cards de pagamento com preços CLP e copy ES |
| `default_links` | URLs WhatsApp `+56...`, Telegram do grupo Chile |
| `popups` / `funnel_steps` | Popups em es-CL |
| `achievements` | Mecânicas iguais, `name`/`description` em es-CL |
| `notifications` | Templates ES |
| `features` | Configs iguais (chaves técnicas), `description` em es-CL |
| `admin_emails` | Emails dos admins da operação Chile |

> Se quiser, posso gerar SQL de seed via MCP — me passa os dados que você quer inserir.

### 11. Validar end-to-end
Depois do `.env` swap:
```bash
npm run dev
```
- [ ] App sobe em `http://localhost:8080/`
- [ ] Login funciona (com email teste)
- [ ] Páginas carregam (banco vazio → empty states esperados)
- [ ] Console do browser sem 401/403/CORS
- [ ] `npm run build` passa (já validado nesta sessão antes do swap)

### 12. Deploy do frontend
Quando tudo estiver OK localmente, faça deploy do frontend (Vercel/Netlify/Render) configurando as `.env` do servidor com as variáveis do **novo** Supabase.

> **Nunca aponte o frontend de Chile pro Supabase de produção brasileiro.**

---

## Comandos úteis (já configurados)

```bash
# Apontar CLI pro projeto Chile (já feito)
supabase link --project-ref snykhoctikatcpvlcoow

# Aplicar nova migration futura
# 1. Crie em supabase/migrations/YYYYMMDDHHMMSS_nome.sql
# 2. supabase db push

# Ver logs em tempo real de uma function
supabase functions logs <nome-da-function>

# Deploy de uma function específica
supabase functions deploy <nome-da-function>

# Status das functions
supabase functions list
```

---

## 🚨 Notas importantes

- **Não há sincronização automática** entre os dois Supabase. Cada um é projeto independente. Mudanças de schema feitas em um não afetam o outro — exceto via novas migrations + `supabase db push` apontando pra cada projeto separadamente.
- **MCP Supabase**: enquanto autenticado, Claude lê o dashboard, cria migrations e aplica via tools MCP — mas **só nesse projeto Chile**, nunca no BR.
- **Custo**: cada projeto Supabase tem cobrança independente. Verifique se o tier escolhido pra Chile aguenta o tráfego esperado.
- **Backups**: já que o banco Chile inicia vazio, não é crítico. Mas configure `Database → Backups` no dashboard depois que começar a popular dados.
- **Gateway de pagamento**: o BR usa Lastlink. Chile provavelmente vai usar outro (Khipu, Webpay, Mercado Pago Chile, etc.) — `payment-webhook` precisará ser adaptado quando o gateway final for definido. Por ora, o code-path de Lastlink continua deployado mas sem secret configurado, então não vai disparar.

---

**Tags:** [[Supabase]] [[migração]] [[Chile]] [[banco-de-dados]] [[deploy]] [[MCP]]
