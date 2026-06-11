# 🔖 RESTAURAÇÃO DA UI ORIGINAL (pós-Copa)

> **Lembrete pro Claude:** a UI ORIGINAL (pré-Copa) está 100% salva e intocada.
> Quando o usuário pedir pra "voltar pra UI original / tirar a Copa", use este guia.

## Onde está cada coisa
- **UI ORIGINAL (pré-Copa):**
  - Tag imutável: **`pre-copa-ui`** → commit `35e5705a` ("Ativou index events para ms")
  - Também é o branch **`main`** / **`origin/main`** (GitHub) — backup off-machine.
  - Eu NUNCA toquei no `main`. Está idêntica ao que estava antes da Copa.
- **UI de COPA (temporária / sazonal):**
  - Branch **`copa-clima`** (local, **sem push**).
  - Contém: tema visual de Copa no **Login** (`src/pages/Login.tsx`) e **Menu** (`src/pages/Home.tsx`, `src/components/cards/CardType1Lateral.tsx`) — fundos de Copa, dourado (#E0B341 / #F2C84B), glow girando, logo "RUMO AO HEXA".
  - Assets em `public/images/Copa/` (Login + Menu).

## Como recuperar a UI ORIGINAL (quando o usuário pedir)
```bash
git checkout main          # ou: git checkout pre-copa-ui
```
Pronto — a UI original volta 100% idêntica. A Copa continua guardada no branch `copa-clima` (pode voltar a ela com `git checkout copa-clima`).

## Regras
- ⚠️ NÃO mergear `copa-clima` no `main` sem o usuário pedir explicitamente.
- A Copa é **sazonal**: terminou a Copa → voltar pro `main` / `pre-copa-ui`.
- Recolor dos personagens (dourado) ficou pendente do billing do Gemini (chave precisa estar no projeto com pré-pagamento).

## Datas
- Criado em: 2026-06-09
- Base da Copa = commit `35e5705a` (tag `pre-copa-ui`).
