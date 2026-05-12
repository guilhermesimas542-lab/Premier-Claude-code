---
tipo: decisoes
projeto: ultrateste111
atualizado: 2026-05-12
---

# Decisões — ultrateste111

## CTAs de checkout migrados para `<a href>` nativo (GTM `gtm.linkClick`)
- **Data:** 2026-05-12
- **Contexto:** O time precisa rastrear cliques nos CTAs de checkout via [[GTM]] usando o trigger nativo "Just Links". Esse trigger só dispara `gtm.linkClick` para elementos `<a>` reais — `<button onClick={() => window.open(url)}>` cai em `gtm.click` genérico, sem URL no dataLayer, o que dificulta criar tags por destino.
- **Decisão:** converter os 7 CTAs de checkout do site público para `<a href target="_blank" rel="noopener noreferrer">` com `id` semântico (`cta-checkout-*`) e class comum `cta-checkout`. Em modais com lógica adicional (fechar dialog, `trackEvent`), o `onClick` foi mantido em paralelo ao `href` — o browser executa o handler e segue o link, então o `gtm.linkClick` continua sendo capturado.
- **Opções consideradas e descartadas:**
  - **Opção A — manter `<button>` e enviar evento custom para `dataLayer.push({event: 'cta_click', url})`:** funciona mas exige criar/manter tag custom no GTM, fora do padrão "Just Links". Mais frágil (esquecer de chamar em algum botão = perda silenciosa).
  - **Opção B — wrapper `<a><button></button></a>`:** HTML inválido aninhar button dentro de anchor; gera warning no React e quebra estilos.
  - **Opção C — refatorar tudo no admin também:** descartado porque GTM normalmente não trackeia admin e o escopo combinado com o usuário foi "apenas CTAs de checkout/CTA público".
- **Padrão de id:** `cta-checkout-{contexto}-{detalhe}` (ex: `cta-checkout-bd-funil-premium-offer`, `cta-checkout-locked-tip-pro-alavancagem`). Permite criar trigger único no GTM com `Click ID matches RegEx ^cta-checkout-`.
- **Arquivos afetados:** `src/pages/Bd.tsx`, `src/components/BasicPlanAlert.tsx`, `src/components/ProPlanAlert.tsx`, `src/components/BasicPlanModal.tsx`, `src/components/LockedTipModal.tsx`, `src/components/EntryCard.tsx`, `src/components/MarketingCards.tsx` (caso especial: só vira `<a>` quando `card_type !== "funnel"`).
- **Validação:** `npx tsc --noEmit` passa sem erros.
- **Tags:** [[GTM]] [[analytics]] [[checkout]] [[acessibilidade]] [[CenterPag]]

## Página `/bd` — preço atualizado para $14,90 → $9,90 (USD)
- **Data:** 2026-05-12
- **Contexto:** Usuário pediu para alterar o box de preços de "De $37,90 por $27,90" para "De $14,90 por $9,90". Confirmou que a venda é em **dólar** (não pesos chilenos), apesar do resto do site estar localizado para [[es-CL]].
- **Decisão:** mantido o formato `$ X,XX` (vírgula como decimal) por ser o que o usuário pediu literalmente e por consistência com o restante dos componentes de checkout que já usam esse padrão.
- **Arquivo:** `src/pages/Bd.tsx:100-103`.
- **Tags:** [[preco]] [[BD]] [[USD]]

## Página `/bd` — abordagem React + Tailwind, moeda `$`, link vitalicio, countdown 5min
- **Data:** 2026-05-08
- **Contexto:** Replicar a landing `https://premierfcapp.com/bd` (HTML estático baixado via [[SingleFile]], 720KB) dentro do projeto, com slug `/bd` e tradução para [[es-CL]]. A página usa Tailwind e tem 0 JS — mesma stack do projeto.
- **Decisão 1 — Como integrar ao projeto:** componente React em `src/pages/Bd.tsx` + rota em `src/App.tsx`. Outras opções consideradas: iframe pra `public/bd.html` (escapa de Router/analytics), `dangerouslySetInnerHTML` (anti-padrão, tradução vira string), asset estático em `public/bd/index.html` (SPA fallback intercepta). Escolha alinha 100% com o padrão das outras páginas do projeto.
- **Decisão 2 — Moeda dos preços:** `$ 37,90 → $ 27,90` (mantém os números, troca `R$` por `$`). Justificativa: o resto do site já usa `$` sem `R` em todos os componentes de checkout/paywall (`PaywallPopup.tsx`, `PlansModal.tsx`, `PaywallEducationStep.tsx`, `Login.tsx` que formata via `toLocaleString('es-CL')`). `R$` quebraria o padrão e confundiria o público chileno.
- **Decisão 3 — URL do botão CTA:** `https://checkout.premierfc.app/vitalicio` (do catálogo `src/lib/checkoutLinks.ts:CHECKOUT_LINKS.vitalicio`), em vez do link original `checkout.payt.com.br/302d147f...`. Justificativa: o link original é de checkout brasileiro (`.com.br`), não faz sentido pra operação Chile. O `vitalicio` casa exatamente com o copy "Acceso vitalicio • Pago único" da própria página.
- **Decisão 4 — Countdown:** timer dinâmico de 5min via `useState`+`useEffect`, sem persistência, para em `00:00`. Comportamento típico de landing de oferta. O HTML estático veio congelado em `03:27`, mas a página original usa JS para o timer.
- **Decisão 5 — Imagens:** decodificar os 2 PNGs base64 inline para `public/bd/payment-methods.png` e `public/bd/guarantee-30d.png`. Mais leve, cacheável, fora do bundle JS. Trade-off: as 2 imagens estão em **português** ("PAGAMENTOS À VISTA", "GARANTIA 30 DIAS") e a de bandeiras inclui Boleto/Pix (meios brasileiros). Registrado como [[débito técnico]] em `docs/debitos-tecnicos.md` — substituir por imagens localizadas (es-CL com WebPay/Servipag).
- **Decisão 6 — CSS dos blocos `<style>` do SingleFile:** descartar todos os 3 blocos. Os 2 maiores (~430KB) são reset/utilities do Tailwind, já presentes no projeto. O 3º (2,2KB) é CSS do Sonner (toast), também já presente via shadcn-ui. Reaproveitar zero CSS do dump.
- **Tags:** [[landing]] [[es-CL]] [[Tailwind]] [[checkout]] [[Premier-FC]]

## Estratégia de tradução pt-BR → es-CL: tradução direta no JSX (sem i18next)
- **Data:** 2026-05-06
- **Contexto:** Site não tinha nenhuma infra de internacionalização — todas as ~250+ strings estavam hardcoded em português direto no JSX dos componentes. Para a operação Chile, precisava decidir COMO traduzir antes de COMEÇAR a traduzir.
- **Opções consideradas:**
  - **Opção A — Instalar [[i18next]] + [[react-i18next]]:** Externalizar todas as strings em arquivos `locales/es-CL.json`, refatorar todo componente para usar hook `t('chave')`. Vantagem: permite multi-idioma futuro com flip de switch. Desvantagem: refactor invasivo (toca 130+ arquivos só pra adicionar `useTranslation()`), nova dependência, novo provider no `App.tsx`, **muda a estrutura existente** — viola restrição explícita do usuário ("não pode alterar a estrutura que existe atualmente").
  - **Opção B — Tradução direta no JSX:** Substituir cada string em português pela tradução em es-CL no próprio arquivo onde está. Vantagem: diff mínimo (só conteúdo de strings muda), sem nova dependência, sem refactor estrutural, fácil de revisar, alinhado à restrição do usuário. Desvantagem: se um dia precisar suportar múltiplos idiomas no MESMO app, terá que refazer (instalar i18n).
  - **Opção C — Híbrida (centralizar strings em arquivo `pt.ts` substituível):** Criar um arquivo único de strings que poderia ser substituído. Custo similar à opção A em refactor, sem o benefício de uma lib testada.
- **Decisão:** Opção B — tradução direta. Como esta é uma operação **dedicada ao Chile** (não app multilíngue) e a restrição "não alterar estrutura" é dura, a tradução direta é a única que atende todas as restrições com o menor risco.
- **Impacto:** Toca conteúdo de strings em ~130 arquivos `.tsx` mas não muda nenhum import, hook, provider, rota ou contrato de componente. Build, testes e arquitetura permanecem idênticos.
- **Trade-off aceito:** Para suportar PT+ES juntos no futuro, será necessário refazer o trabalho com i18next. Para a operação Chile, isso é aceitável.
- **Tags:** [[i18n]] [[es-CL]] [[localização]] [[arquitetura]]

## Banco de dados da operação Chile: novo projeto Supabase via MCP, migrations replicadas
- **Data:** 2026-05-06
- **Contexto:** Restrição inegociável: NÃO mexer no Supabase atual (produção). A operação Chile precisa de banco isolado.
- **Opções consideradas:**
  - **Opção A — Banco multi-tenant (mesmo Supabase, coluna `country`):** Inviável, viola a restrição.
  - **Opção B — Novo projeto Supabase + replicar schema via migrations:** O projeto já tem 49 migrations versionadas em `supabase/migrations/`. Criar novo projeto Supabase, conectar via [[Supabase MCP]] (`project_ref=snykhoctikatcpvlcoow`), aplicar todas migrations. Schema fica idêntico, dados começam zerados.
- **Decisão:** Opção B. Já implementada na config: MCP server adicionado a `.mcp.json` com escopo de projeto.
- **Impacto:** Usuário precisa autenticar o MCP via `claude /mcp` em terminal interativo (Claude não tem acesso a navegador para OAuth). Após autenticado, Claude pode aplicar migrations no novo projeto via tools MCP.
- **Tags:** [[Supabase]] [[MCP]] [[multi-tenant]] [[Chile]]

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
