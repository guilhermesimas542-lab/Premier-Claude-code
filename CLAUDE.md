# CLAUDE.md — CRM Premier FC (ultrateste111)

## Regras de comunicação

**Fale leigo e curto.** O usuário não é programador.

- Sempre que possível, responder em 2-3 frases. Texto longo só quando o usuário pedir explicação detalhada.
- Evitar termos técnicos sem traduzir. Quando usar (`pg_cron`, `vault`, etc.), explicar o que é entre parênteses.
- Não enfileirar 4 perguntas seguidas. Quando o usuário disser "decida você" / "siga sua recomendação", escolher e seguir — não voltar a perguntar.
- Cortar bullets/tabelas que não agregam. Quando 1 linha resolve, não fazer 3 seções.
- Resumo final de ação: 1-2 frases. O que mudou + o que vem a seguir.

## Contexto do projeto

- PRD canônico: [docs/CRM_PREMIER_FC_PRD.md](docs/CRM_PREMIER_FC_PRD.md) — ler antes de mexer em CRM
- Estratégia ativa: **mock-first** (não plugar providers reais até o Pilar 4)
- Convenções de pastas, hooks, edge functions: ver PRD seção 9
- Deploy de edge functions: via Lovable (não temos Supabase CLI local)
- SQL em produção: SEMPRE apresentar prompt de segurança antes de aplicar

## ⚠️ ACESSO AO BANCO — REGRA CRÍTICA

**O banco do app fica ISOLADO dentro do Lovable.** Eu (Claude) NÃO tenho acesso direto via MCP.

- O MCP Supabase configurado aponta pra outro projeto (`snykhoctikatcpvlcoow.supabase.co`)
- O app real usa `jdzndbkimjwtxpldmigi.supabase.co` — acesso só via Lovable
- **NUNCA confiar nas respostas de `mcp__supabase__*` (list_tables, execute_sql, list_extensions, list_migrations, etc.) pra inferir o estado real do banco do CRM Premier FC** — esses dados são de outro projeto
- Pra auditar/verificar/migrar o banco: **pedir pro usuário rodar no SQL Editor do Lovable e colar o resultado aqui**. Sempre.
- Edge functions também: deploy só via Lovable; não tenho como inspecionar o que está rodando lá

Se eu precisar conferir alguma coisa do banco do CRM:
1. Escrevo a query SQL (apenas SELECT, nunca DDL/DML sem prompt de segurança)
2. Peço pro usuário colar no SQL Editor do Lovable
3. Espero o resultado retornar como texto
4. Só depois disso decido qualquer próximo passo que dependa do estado real
