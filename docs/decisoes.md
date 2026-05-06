---
tipo: decisoes
projeto: ultrateste111
atualizado: 2026-05-06
---

# Decisões — ultrateste111

## Escolha do gerenciador de pacotes: npm ao invés de bun
- **Data:** 2026-05-06
- **Contexto:** O Lovable gerou o projeto com dois lockfiles (bun e npm). Era preciso escolher um pra evitar inconsistência de versões de dependências.
- **Detalhes:**
  - **Opção A — Bun:** Instalação muito mais rápida, dev server mais rápido. Porém, é um runtime/gerenciador novo (2023+), com menos suporte universal e menos testado em produção.
  - **Opção B — npm:** Padrão da indústria, suportado por todas as plataformas de hospedagem (Vercel, Netlify, Render, Railway, etc.), incluído por padrão com Node.js, comportamento previsível há 15 anos.
  - **Decisão:** [[npm]]. Como o projeto está EM PRODUÇÃO COM TRÁFEGO ATIVO, prioridade máxima é previsibilidade e compatibilidade com infraestrutura de deploy. Velocidade de instalação local é ganho menor comparado ao risco de divergência sutil entre bun e npm na resolução de dependências. Se no futuro houver necessidade real de performance no build, podemos reavaliar.
- **Impacto:** `bun.lock` e `bun.lockb` foram deletados. `package-lock.json` é a fonte da verdade pra dependências.
- **Tags:** [[npm]] [[bun]] [[gerenciador-de-pacotes]] [[ferramentas]]

## Separação de repositórios: produção vs desenvolvimento
- **Data:** 2026-05-06
- **Contexto:** Repo `guilhermesimas542-lab/ultrateste111` está em produção. Mexer direto nele é arriscado.
- **Detalhes:**
  - **Opção A — Trabalhar no mesmo repo, criar branches:** Mais simples, mas qualquer push errado pode afetar produção.
  - **Opção B — Repo separado pra desenvolvimento (`Premier-Claude-code`), depois sincronizar:** Isolamento total, zero risco de tocar produção por acidente. Custo: precisa pensar como sincronizar mudanças validadas pro repo de produção depois.
  - **Decisão:** Opção B. Risco de produção é maior que custo de sincronização manual.
- **Impacto:** O remote `origin` aponta pra `Premier-Claude-code`. Repo de produção fica intocado até decidirmos como mover mudanças validadas pra lá.
- **Tags:** [[git]] [[produção]] [[isolamento]]

## Remoção do `.env` do tracking do Git
- **Data:** 2026-05-06
- **Contexto:** O Lovable commitou o `.env` com chaves do Supabase no repo público de produção. Não é um vazamento crítico (a `anon key` é pública por design e protegida por Row Level Security do Supabase), mas é má prática.
- **Detalhes:**
  - Adicionado `.env`, `.env.local`, `.env.*.local` ao `.gitignore`.
  - Criado `.env.example` com placeholders, esse SIM commitado, pra servir de referência pra futuros desenvolvedores.
  - `.env` removido do tracking via `git rm --cached .env` (arquivo local preservado pra rodar o projeto).
  - **Obs:** o histórico antigo de commits ainda contém o `.env` original, mas como esse histórico só vai pro novo repo `Premier-Claude-code`, e a `anon key` é pública por natureza, não há ação adicional necessária. Se em algum momento for preciso uma chave secreta de verdade (`service_role`), ela DEVE ficar apenas no `.env` local.
- **Tags:** [[segurança]] [[supabase]] [[gitignore]] [[boas-práticas]]
