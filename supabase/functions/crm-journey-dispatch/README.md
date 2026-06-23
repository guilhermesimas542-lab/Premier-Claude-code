# crm-journey-dispatch

Edge function que processa enrollments ativos das jornadas de CRM e despacha mensagens
pelos canais configurados (email, SMS, push, popup, telegram).

## Como roda
- Cron `crm_journey_dispatch` (`*/10 * * * *`) chama `POST /functions/v1/crm-journey-dispatch`
  com `Authorization: Bearer <service_role_key>` (do vault).
- A função lê `crm_journey_settings.dispatch_enabled` e `test_user_ids` pra decidir o escopo.
- Processa `crm_journey_enrollments` com `status='active'`, em ordem de `step_order`,
  respeitando `delay_value` + `delay_unit` a partir de `anchor_at` (ou `enrolled_at`).
- Deduplica envios pela combinação `(step_id, channel)` em `crm_journey_step_events`.

## Variáveis de ambiente (Supabase Edge)
- `SUPABASE_URL` (auto)
- `SUPABASE_SERVICE_ROLE_KEY` (auto)
- `SUPABASE_ANON_KEY` (auto)
- `SMS_DEV_TOKEN`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN` (configurar por canal)

## Bootstrap em um projeto novo
1. Rodar a migration `supabase/migrations/<ts>_crm_engine.sql`
2. Criar a secret no vault:
   ```sql
   select vault.create_secret('<sb_secret_…>', 'service_role_key', 'service role key (new API key)');
   ```
3. Deployar esta função: `supabase functions deploy crm-journey-dispatch --no-verify-jwt`
4. Configurar secrets dos canais em `crm_channel_settings`
5. Setar `dispatch_enabled=true` (e popular `test_user_ids` enquanto testa)

## Arquivos
- `index.ts` — entrypoint, autenticação por bearer (service_role OU admin), loop de enrollments
- `realProviders.ts` — implementações reais de cada canal
- `mockProviders.ts` — tipos compartilhados + mocks pra teste
- `normalizePhone.ts` — normalização de celular BR/CL
- `webpush.ts` — VAPID JWT + envio de Web Push
