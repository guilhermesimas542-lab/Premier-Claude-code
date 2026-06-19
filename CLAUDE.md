# CLAUDE.md — ONBOARDING-PREMIER

## Sobre este projeto

Onboarding in-app do **PREMIER FC** (`ultrateste111`). Desenvolvido isolado aqui
e plugado no app prod depois — sem push direto pro repo do app.

- O entregável real fica em **`src/components/onboarding/`**. Tudo o resto
  (preview page, AppMockShell, mocks) é descartável.
- A stack **espelha o app prod**: Vite 5, React 18, TS, Tailwind 3,
  shadcn (Radix), React Router 6. Mantenha sincronizado.
- Repo do app prod fica clonado em `_app-prod-ref/` (gitignored) — read-only,
  consulta sempre que precisar entender padrão.

## Regras de comunicação com o operador

- **Curto.** 2-3 frases por resposta. Texto longo só sob pedido explícito.
- **Sem jargão** (ou traduzido entre parênteses).
- **Sem 4 perguntas seguidas.** Quando ele disser "decida você", decida.
- **Resumo de ação no fim:** 1-2 frases. O que mudou + o que vem agora.

## Regras de execução

1. **Nunca push pro `ultrateste111`** sem autorização explícita do operador.
2. **`_app-prod-ref/` é read-only.** Não editar — só consultar.
3. **Manter `components/onboarding/` plug-in-ready:** zero acoplamento com
   Supabase, roteamento ou window.* dentro do componente. Tudo via props.
4. **Steps em `data/steps.ts`** — copy/ordem mora ali. UI fica em `steps/`.
5. **Tokens copiados de prod.** Se o app prod mudar paleta, sincronizar.
6. **Mock-first.** Sem provider real (Supabase, Pixel, etc.). Stubs em `lib/`.

## Comandos

```bash
npm run dev        # http://localhost:8080/preview
npm run build      # build de produção
npm run lint
```
