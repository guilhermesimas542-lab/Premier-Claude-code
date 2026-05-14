---
tipo: progresso
projeto: ultrateste111
atualizado: 2026-05-14
---

# Progresso — ultrateste111

## Remoção do redirect Telegram em "Cuota Gratis" e PlansModal
- **Data:** 2026-05-14
- **Contexto:** Em Premier FC, qualquer clique em "Reclamar Cuota Gratis" (header) ou na aba "Cuota Gratis" (página Sport) abria um popup que redirecionava o lead para um grupo de Telegram. No CL Score esse funil não será usado — o objetivo agora é que o lead apenas veja a odd gratuita diretamente.
- **Plano escolhido (3 opções consideradas):**
  - **Opção A — Reabilitar aba pra usuários free + remover botão do header (ESCOLHIDA):** Sem popup. Aba "Cuota Gratis" continua visível só pra usuários free (pagos continuam sem a aba, pois eles já têm odds melhores). Botão do header removido por ficar redundante. PlansModal também perde o redirect.
  - Opção B — Manter botão do header como atalho que rola até a aba.
  - Opção C — Só desativar popup, manter botões/estrutura. Mais conservador, menos limpo.
- **Mudanças por arquivo:**
  - `src/lib/paywallRouting.ts` — Removida variant `"telegram"` e a regra `if (feature === "free") return "telegram"`. Removida constante `TELEGRAM_URL_PLACEHOLDER` (sem uso).
  - `src/components/PaywallPopup.tsx` — Removido bloco `if (variant === "telegram")` que renderizava `TelegramRedeemModal`. Removidos state `telegramGroupUrl` e fetch de `betting_houses.telegram_group_url`. Removido import.
  - `src/pages/Sport.tsx` — Alterado `handleClick` da aba: quando feature `"free"` sem conteúdo, agora chama `scrollToFeature` em vez de disparar paywall.
  - `src/components/AppHeader.tsx` — Removido botão "Reclamar Cuota Gratis" (só visível pra `isFree`). Removidos state/effects de telegramGroupUrl/showTelegramModal e import de `TelegramRedeemModal` e `useUserBettingHouse`.
  - `src/components/PlansModal.tsx` — Botão "Gratis" do plano free agora vira `current` (se user é free) ou `info "Plan Gratis"` (caso contrário). Removidos type `"telegram"` no CtaSpec, renderização do botão telegram, state `showTelegramModal`/`telegramGroupUrl`, fetch e import.
  - `src/components/TelegramRedeemModal.tsx` — **DELETADO** (sem mais usos).
- **Não tocado:**
  - Filtro `Sport.tsx:325-328` que esconde tips `feature_required = "free"` para usuários pagos — mantido (pagos continuam sem aba).
  - Campo `betting_houses.telegram_group_url` no banco — pode ser usado por outras integrações.
  - `TELEGRAM_SUPPORT_URL_PLACEHOLDER` em `paywallRouting.ts` — fora do escopo.
- **Verificação:** `npx tsc --noEmit` sem erros. Grep por `variant === "telegram"` e `TelegramRedeemModal` em `src/` confirma zero ocorrências fora dos arquivos que mantêm a infra (LinksContext/AdminDefaultLinks usam apenas `telegram_group_url` da betting_house, não o popup).
- **Riscos / próximos passos:** Se houver odd com `feature_required = "free"` no banco, agora ela aparece direto no card sem paywall. Verificar visualmente que `content_entries` da aba Cuota Gratis renderiza com `display_status` correto. Validar que pagos continuam sem ver a aba.
- **Tags:** [[CL-Score]] [[paywall]] [[telegram]] [[odd-gratis]] [[ultrateste111]]

## Rebranding visual: Premier FC → CL Score (substituição de imagens)
- **Data:** 2026-05-14
- **Contexto:** Usuário entregou pasta `imagens novas/` com 18 arquivos novos correspondendo ao rebranding da marca de "Premier FC" para "CL Score" (foco aparente: mercado chileno — personagens novos usam camisa da seleção do Chile). O objetivo era trocar as imagens antigas pelas novas no devido lugar.
- **Plano escolhido (entre 3 abordagens consideradas):**
  - **Opção A — Substituir mantendo nomes antigos dos arquivos:** ESCOLHIDA. Maior probabilidade de sucesso (não quebra imports `.tsx`/`.ts` espalhados pelo código). Risco baixo.
  - Opção B — Renomear arquivos para nomes novos (`clscore-logo.png` etc) + refatorar imports: alto risco de quebrar build em vários lugares (~7 arquivos com import direto).
  - Opção C — Manter arquivos antigos e adicionar novos em paralelo: gera lixo, deixa estado ambíguo, e usuário pediu para "trocar".
- **Detalhes da execução (13 substituições):**
  - **Popups (5):** `ALAVANCAGEM.png`→`popups/alavancagem.png`; `CUOTAS PRO/SAFE/ULTRA.png`→`popups/odds_pro/safe/ultra.png`; `ACESSO VITALICO.png`→`popups/acesso_vitalicio.png` (NOVO — feature `acesso_vitalicio` já existia no código mas faltava o popup).
  - **Logos (5):** `CLSCORE LOGO 4.png`→`premier-logo.png` (horizontal principal); `CLSCORE LOGO 5.png`→`premier-logo-new.png` (verde, usada em Login/AdminVerify); `CLSCORE LOGO 3.png`→`premier-logo-new2.png`, `premier-logo-custom.png` (usada em AppHeader/Home/Support/Sport), e `public/obg/premier-fc-logo.png`.
  - **Personagens (3):** `site clscore (2).jpeg`→`robo-premier.png` e `robot-football.png`; `site clscore (4).jpeg`→`robo-cassino.png`. Convertidos de JPEG→PNG real via `sips` (não só renomeados).
- **Itens NÃO substituídos (intencionalmente):**
  - `premier-logo.svg` — é vetor, substituir por PNG quebraria a extensão.
  - `src/assets/logo.jpg` e `public/logo.jpg` — mascote brasileiro (homem com binóculos camisa Brasil), não é logo da marca, sem equivalente.
  - `public/images/futsal-arena.jpg`, `robo_premier_bola_fogo.mp4` — sem equivalentes nas imagens novas.
  - `site clscore (1, 3, 5, 6).jpeg` — personagens e logo extra sem destino claro, deixados em `imagens novas/` para uso futuro.
- **Riscos identificados:**
  - `premier-logo-custom.png` (usada em vários headers) era um hexágono pequeno; agora é texto "CL". Pode afetar visual do header. Usuário ciente.
  - Texto e classes `addon_alavancagem`, `Apalancamiento`, IDs de plano, etc. NÃO foram trocados — só imagens. Se quiser rebranding completo de texto/UX, é trabalho separado.
- **Decisões prévias:** usuário confirmou via prompt: (a) tratar como rebranding completo; (b) Claude decide mapeamento das logos por formato/uso; (c) sem backup explícito — confia no git.
- **Próximos passos sugeridos:** rodar `npm run dev` e verificar visualmente headers, popups e telas com personagens; decidir destino das 4 imagens novas remanescentes; eventualmente fazer rebranding de texto (`Premier FC`→`CL Score`) em strings hardcoded e metadata (`index.html`, `package.json`).
- **Tags:** [[rebranding]] [[CL-Score]] [[Premier-FC]] [[imagens]] [[ultrateste111]]

## CTAs de checkout convertidos para `<a>` rastreável pelo GTM
- **Data:** 2026-05-12
- **Contexto:** Demanda do usuário — botões com URL de redirecionamento precisam ser do tipo `<a>` com `href`, `id` e `class`, e compatíveis com o trigger nativo `gtm.linkClick` do GTM.
- **Detalhes:**
  - Auditoria identificou 7 CTAs de checkout no site público usando `<button onClick={() => window.open(url)}>` (não detectáveis como `gtm.linkClick`).
  - Refatorados: `Bd.tsx`, `BasicPlanAlert`, `ProPlanAlert`, `BasicPlanModal`, `LockedTipModal`, `EntryCard`, `MarketingCards`.
  - Padrão de id: `cta-checkout-{contexto}-{detalhe}`. Class comum: `cta-checkout`.
  - Em modais (`BasicPlanModal`, `LockedTipModal`), `onClick` paralelo preserva `onClose()` e `trackEvent` antes da navegação.
  - `MarketingCards`: condicional — vira `<a>` só para `card_type !== "funnel"` com `checkout_url`; tipo "funnel" continua `<button>` (abre dialog, não navega).
  - `npx tsc --noEmit` passa.
- **Próximos passos:** Configurar no GTM o trigger "Just Links" com `Click ID matches RegEx ^cta-checkout-` e tag GA4 com `{{Click ID}}` e `{{Click URL}}`. (responsabilidade do usuário — fora do escopo do código).
- **Tags:** [[GTM]] [[analytics]] [[checkout]]

## Preço da página /bd atualizado para $14,90 → $9,90 (USD)
- **Data:** 2026-05-12
- **Contexto:** Pedido direto do usuário.
- **Detalhes:** `src/pages/Bd.tsx:100-103` — `De $ 37,90 por $ 27,90` → `De $ 14,90 por $ 9,90`. Mantido formato `$ X,XX` por ser dólar (não CLP), conforme confirmação explícita.
- **Tags:** [[preco]] [[BD]]

## Sync via MCP Supabase: pay_cards `LOGIN_AQUISICAO` e `vitalicio` apontados pros checkouts CenterPag
- **Data:** 2026-05-12
- **Contexto:** Após push do commit `8bd53d3` (preços CLP + links CenterPag + rebranding), auditoria da tabela `pay_cards` via MCP mostrou que os planos NOVOS (premium, diamante, diamante_upgrade, add-ons) já estavam com os links CenterPag corretos, mas os planos LEGACY ainda ativos apontavam pros antigos `checkout.payt.com.br/*` ou estavam vazios.
- **Risco real identificado:** `Login.tsx:201-204` chama `triggerPayCard('LOGIN_AQUISICAO')` antes do fallback `CHECKOUT_LINKS.funil_premium_full`. Como o card estava ativo apontando pro payt antigo, o botão "Adquirir acceso" ignorava o link novo do código. Mesmo padrão pra `vitalicio` (botão "Acceso Vitalicio" do header).
- **Decisão:** atualizar APENAS os 6 cards de risco direto (`LOGIN_AQUISICAO` + `vitalicio`). Os outros legacy (basic, pro, ultra, UPGRADE_*, SUPORTE_UPGRADE, desaltas, live_telegram) ficam como estão — usuário decide depois via AdminPayCards.
- **Updates aplicados:**
  - `LOGIN_AQUISICAO` (3 cards) → `https://go.centerpag.com/PPU38CQBPB2` (14,90 — funil externo, lead frio)
  - `vitalicio` (3 cards) → `https://go.centerpag.com/PPU38CQBQS8` (14,90 — Premium in-app)
  - Ambos `checkout_url` e `checkout_url_2` foram atualizados via `jsonb_set`.
- **Pendência conhecida (não tocada):** 24 pay_cards legacy ainda ativos apontam pra payt.com.br ou estão vazios — `basic`(3), `pro`(3), `ultra`(3), `UPGRADE_BASICO`(3), `UPGRADE_PRO`(3), `UPGRADE_ULTRA`(3), `SUPORTE_UPGRADE`(3), `desaltas`(1), `live_telegram`(1). Se algum fluxo do app chamar `triggerPayCard()` com essas chaves, vai bater no link antigo.
- **Tags:** [[Supabase]] [[MCP]] [[pay_cards]] [[CenterPag]] [[LOGIN_AQUISICAO]] [[vitalicio]] [[ultrateste111]]

## Mapeamento dos checkout links CenterPag (Premium / Diamante / Add-ons)
- **Data:** 2026-05-11
- **Contexto:** Usuário forneceu os links reais da plataforma CenterPag substituindo os placeholders `checkout.premierfc.app`. Estrutura do funil é a do `paywallRouting.ts` novo (Free → Premium → Diamante + add-ons avulsos), não a legacy (basic/pro/ultra).
- **Decisões:**
  - `src/lib/checkoutLinks.ts` foi **reestruturado** para refletir o modelo novo: 3 grupos de chaves explícitas (`funil_*` externo, `inapp_*` in-app, `addon_*` avulso) + aliases `@deprecated` para os nomes legados.
  - `paywallRouting.ts` `PRICES` mudou de `number` para `string` (preços agora são "14,90", "39,90", "29,90", "9,90") porque os valores em pesos chilenos têm vírgula decimal. Todos os consumidores usam apenas em template strings (`${PRICES.x}`), então a mudança não quebra nada.
  - **Add-ons backredirect:** preço cheio E preço descontado viraram ambos 9,90 — ainda mostra duas variantes na UI (com/sem desconto), mas com mesmo valor. Se quiser remover o split, vale revisar `PaywallPopup.tsx:222-273`.
- **Mapeamento aplicado:**

  | Slot no código | Link |
  |---|---|
  | `Login.tsx:203` → `CHECKOUT_LINKS.funil_premium_full` (fallback do `acquire_access_url`) | 14,90 PPU38CQBPB2 |
  | `Home.tsx:104` → `CHECKOUT_LINKS.inapp_premium` (botão "Acceso Vitalicio" no header) | 14,90 PPU38CQBQS8 |
  | `Bd.tsx:110` → `CHECKOUT_LINKS.funil_premium_offer` (CTA `/bd` com desconto) | 9,90 PPU38CQBPB3 |
  | `inapp_diamante` (Free → Diamante in-app) | 39,90 PPU38CQBQUE |
  | `inapp_diamante_upgrade` (Premium → Diamante in-app) | 29,90 PPU38CQBQUF |
  | `addon_esportes_americanos` (Cuotas de Ligas Americanas) | 9,90 PPU38CQBQSA |
  | `addon_alavancagem` (Palancado Diario) | 9,90 PPU38CQBQSG |
  | `addon_multiplas_bingo` (Múltiples/Bingo) | 9,90 **PPU38CQBQSI** (corrigido — usuário mandou PPU38CQBQSG por engano) |
  | `addon_mercados_secundarios` (Mercados Secundarios) | 9,90 PPU38CQBQSL |

- **Pendência crítica — Pay Cards Supabase:** `PaywallPopup.tsx`, `PlansModal.tsx` e `PayCardFunnelModal.tsx` NÃO consomem `CHECKOUT_LINKS`. Eles buscam `checkout_url` direto da tabela `pay_cards` no Supabase via `associated_plan`. Os mesmos links precisam ser cadastrados em `AdminPayCards` para os planos:
  - `premium` → 14,90 PPU38CQBQS8 (in-app)
  - `diamante` → 39,90 PPU38CQBQUE
  - `diamante_upgrade` → 29,90 PPU38CQBQUF
  - `esportes_americanos` / `esportes_americanos_discount` → 9,90 PPU38CQBQSA
  - `alavancagem` / `alavancagem_discount` → 9,90 PPU38CQBQSG
  - `multiplas_bingo` / `multiplas_bingo_discount` → 9,90 PPU38CQBQSI
  - `mercados_secundarios` / `mercados_secundarios_discount` → 9,90 PPU38CQBQSL
  - (e quaisquer outros features de `FeatureKey`: `odds_safes`, `odds_pro`, `odds_ultra` se forem comprados avulsos)
- **TELEGRAM_URL_PLACEHOLDER:** mantido como está. Fluxo do app já busca primeiro `betting_houses.telegram_group_url` (admin > Default Links), só usa o placeholder como fallback.
- **Validação:** `npx tsc --noEmit` sem erros. Validação visual ainda pendente.
- **Tags:** [[CenterPag]] [[checkout-links]] [[paywall]] [[pay_cards]] [[Premium]] [[Diamante]] [[ultrateste111]]

## Rebranding parcial: "Premier" → "CL" no texto visível + cleanup `/bd`
- **Data:** 2026-05-11
- **Contexto:** App clonado de outra operação. Usuário pediu para retirar a marca "Premier" de todas as páginas e corrigir um bug na `/bd` (container de "Métodos de pago" indesejado).
- **Análise:** o termo "premier" aparecia em ~30 arquivos em 6 categorias diferentes — texto UI, comentários no código, imports de assets, URLs de checkout (`checkout.premierfc.app`), e-mails (`admin@premierultra.com`, `equipepremierfc@gmail.com`), chaves de `localStorage` (`premier_token`, `premier_user`, ...), nomes de eventos (`premier:login`), nomes de arquivos para CSV download e nomes físicos de assets (`premier-logo-*.png`, `robo-premier.png`).
- **Opções consideradas:**
  - A) Trocar tudo (incluindo URLs, e-mails, localStorage, assets) — risco alto: quebra login admin, links de checkout em produção e desloga usuários ativos.
  - B) Trocar texto + renomear arquivos de asset — risco médio: precisa renomear arquivos físicos + atualizar imports.
  - C) Trocar só texto visível ao usuário (UI, alts, meta tags, document.title, notificação do service worker) — risco zero.
- **Decisão:** opção C, confirmada pelo usuário via prompt. URLs, e-mails, localStorage, eventos e assets ficam intactos.
- **Substituições aplicadas:** `Premier Ultra` → `CL Ultra`, `PREMIER ULTRA` → `CL ULTRA`, `Premier FC` → `CL FC`, `Premier` standalone → `CL` (este último só no `Login.tsx` onde aparecia nos termos de uso, e em alguns alts/labels).
- **Arquivos editados (19):** `index.html`, `public/sw.js`, `src/mocks/sports.ts`, `src/admin/components/AdminSidebar.tsx`, `src/admin/pages/{AdminLogin,AdminVerify,AdminWebhook,AdminDashboard}.tsx`, `src/components/{AnimatedFootballIcon,AppHeader,BasicPlanAlert,InstallAppButton,BasicPlanModal}.tsx`, `src/pages/{Casino,Home,Sport,Login,Bd,Obg}.tsx`.
- **Bug `/bd`:** removido o bloco `<div>` que renderizava `/bd/payment-methods.svg` (logos de Mastercard/Visa/Amex) entre o CTA e a linha pontilhada. Removido o `<div>` separador junto, mantendo apenas uma divisão entre o CTA e a seção de atenção.
- **Pendências conhecidas (não tocadas conforme decisão):**
  - URLs `checkout.premierfc.app/*` em `src/lib/checkoutLinks.ts` (linhas 7–19) — trocar quando houver novo domínio.
  - E-mail `admin@premierultra.com` em `src/admin/config/admins.ts` (acesso admin).
  - E-mail `equipepremierfc@gmail.com` em `Login.tsx:612` (suporte).
  - Asset filenames: `premier-logo-*.png`, `robo-premier.png` em `src/assets/` — se renomeados, atualizar imports em `AdminVerify.tsx`, `AppHeader.tsx`, `AnimatedFootballIcon.tsx`, `Login.tsx`, `Home.tsx`, `Support.tsx`, `Sport.tsx` + path `/obg/premier-fc-logo.png` em `public/obg/`.
  - localStorage keys (`premier_token`, `premier_user`, `premier_access`, `premier_show_paywall`, `premier_checkout_url`, `premier_device_id`, `premier_session_id`, `premier_session_ts`, `premier_user_email`) e evento custom `premier:login` — trocar implica deslogar todos os usuários ativos.
  - Nomes de CSV download (`ranking_premier_*.csv`, `tips_premier_*.csv`, `clientes_premier_*.csv`) — admin-only, sem impacto pro usuário final.
  - Comentários no código (`src/lib/checkoutLinks.ts:2`, `src/lib/tierColors.ts:2`, `public/sw.js:1`).
- **Validação:** `npx tsc --noEmit` sem erros. Validação visual da `/bd` e demais páginas pelo usuário pendente (sem dev server rodando aqui).
- **Tags:** [[rebranding]] [[Premier]] [[CL]] [[ultrateste111]] [[bug-/bd]]

## Página `/obg` — confirmação de compra (es-CL)
- **Data:** 2026-05-08
- **Contexto:** Usuário baixou via [[SingleFile]] a página `https://premierfcapp.com/obrigado` (HTML estático de 610KB) e pediu para integrá-la com slug `/obg`, traduzida para [[es-CL]].
- **Análise da página de origem:** thank-you page mais simples que a `/bd`. Sem JS, 1 imagem (logo Premier FC, 4KB), usa shadcn-ui design tokens (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, `bg-card/70`, `text-muted-foreground`) e ícones lucide (`CircleCheck`, `MessageCircle`, `Clock`, `ShieldCheck`) — **mesmo stack do projeto**. Estrutura: glow verde radial → header com logo + tag "Premier FC" → ícone check verde → "Compra confirmada!" → texto explicativo → card com 2 itens (WhatsApp + tempo) → botão CTA verde gigante "Quero meu acesso agora" → linha de segurança → footer.
- **Decisão:** mesma abordagem da `/bd` (componente React + Tailwind + rota em `App.tsx`). Como o original já usa shadcn tokens, a tradução pra JSX foi quase 1:1 — substituí SVGs inline por `<CircleCheck/>`, `<MessageCircle/>`, `<Clock/>`, `<ShieldCheck/>` da `lucide-react` (já presente no projeto via `^0.462.0`).
- **Botão CTA:** ligado ao `useLinks().support_whatsapp_url` (do `LinksContext`) com fallback `SUPPORT_WHATSAPP_URL_FALLBACK` (já definido em `src/lib/userMock.ts` como `https://wa.me/56999999999?text=Hola, necesito ayuda!`). Mesmo padrão usado em `Support.tsx`/`Login.tsx`/`Casino.tsx`.
- **Resultado:**
  - ✅ `public/obg/premier-fc-logo.png` (3,8 KB) extraído do base64 do SingleFile.
  - ✅ `src/pages/Obg.tsx` (~95 linhas) criado seguindo design tokens do projeto.
  - ✅ Rota `<Route path="/obg" element={<Obg />} />` adicionada em `src/App.tsx`.
  - ✅ Conteúdo 100% es-CL (10+ strings traduzidas seguindo glossário).
  - ✅ `npx tsc --noEmit` exit 0.
- **Tags:** [[es-CL]] [[thank-you]] [[checkout]] [[lucide]] [[shadcn]] [[Premier-FC]] [[SingleFile]]

## Página `/bd` — landing de oferta com desconto (es-CL)
- **Data:** 2026-05-08
- **Contexto:** Usuário baixou via [[SingleFile]] a página `https://premierfcapp.com/bd` (HTML estático de 720KB com 2 imagens em base64 e CSS Tailwind) e pediu para integrá-la ao projeto, traduzida para [[es-CL]] e exposta no slug `/bd`.
- **Análise da página de origem:** landing simples sem JS, 100% Tailwind (mesmo stack do projeto), 1 link CTA (`checkout.payt.com.br/302d147f...`), 2 imagens (bandeiras de pagamento + selo de garantia 30 dias). Conteúdo em pt-BR. Estrutura: barra countdown vermelha → pílula amarela "DESCONTO EXCLUSIVO" → card verde "DESCONTO DE R$10" → card branco com preço riscado → botão CTA → bandeiras → bloco "ATENÇÃO! / triplicar banca / devolvemos cada centavo" → "Garantia 30 dias" + selo → rodapé.
- **4 abordagens consideradas:**
  1. Componente React + Tailwind + rota em `App.tsx` — recomendada (probabilidade muito alta, integra com `AnalyticsRouteTracker`/`GlobalPopups`/providers globais).
  2. Iframe com HTML em `public/bd.html` — escapa do Router/analytics, quebra padrão.
  3. `dangerouslySetInnerHTML` com HTML literal — anti-padrão, tradução vira string longa.
  4. Asset estático em `public/bd/index.html` — SPA fallback do Vite intercepta `/bd`, frágil.
- **Decisão:** Abordagem 1 (registrada em [[decisoes.md]] junto com decisões de moeda/link/countdown).
- **Plano de execução:**
  1. Extrair as 2 imagens base64 para `public/bd/payment-methods.png` e `public/bd/guarantee-30d.png` (mais leve, cacheável).
  2. Criar `src/pages/Bd.tsx` reproduzindo o layout em JSX, com countdown dinâmico de 5min via `useState`+`useEffect`, `document.title` em es-CL.
  3. Adicionar `<Route path="/bd" element={<Bd />} />` em `src/App.tsx` (rota pública, fora do `SportLayout`).
  4. Traduzir todos os textos para es-CL seguindo `docs/glossario-traducao.md`.
  5. Validar com `npx tsc --noEmit`.
  6. Remover o HTML do SingleFile da raiz (não deve ficar versionado).
- **Resultado:**
  - ✅ `public/bd/payment-methods.png` (147 KB) e `public/bd/guarantee-30d.png` (60 KB) extraídos.
  - ✅ `src/pages/Bd.tsx` (160 linhas) criado com layout idêntico ao original, classes Tailwind preservadas, countdown dinâmico, `document.title` em es-CL, `alt`s traduzidos.
  - ✅ Importação + rota `<Route path="/bd" element={<Bd />} />` adicionadas em `src/App.tsx`.
  - ✅ Todos os textos traduzidos seguindo o glossário (`Pago único / Acceso vitalicio` já existente em `PaywallPopup.tsx:312`, `Descuento de $10` já em `PaywallPopup.tsx:225`, moeda `$` sem `R`).
  - ✅ Link CTA: `CHECKOUT_LINKS.vitalicio` (`https://checkout.premierfc.app/vitalicio`) em vez do `payt.com.br` original.
  - ✅ `npx tsc --noEmit` exit 0.
  - ⚠️ Imagens herdadas em pt-BR + bandeiras BR (Boleto/Pix). Registrado em [[debitos-tecnicos.md]].
  - ⏸️ HTML do SingleFile (`Última chance： R$10 OFF ｜ Premier FC (08_05_2026 12：51：45).html`, 720 KB) ainda na raiz — não rastreado pelo git, mas precisa de aprovação do usuário pra deletar (ação destrutiva).
- **Tags:** [[es-CL]] [[landing]] [[checkout]] [[Tailwind]] [[SingleFile]] [[Premier-FC]]

## Localização integral do site para espanhol nativo do Chile (es-CL)
- **Data:** 2026-05-06
- **Contexto:** Usuário vai usar a estrutura do Premier Ultra como base para uma operação no Chile. O código será adaptado integralmente para [[es-CL]] (espanhol chileno), mas o banco de dados atual ([[Supabase]] de produção) NÃO pode ser tocado — a operação Chile vai usar um novo projeto Supabase isolado (`project_ref=snykhoctikatcpvlcoow`), que foi adicionado como [[MCP server]] em `.mcp.json`.
- **Restrições inegociáveis:**
  1. Zero alteração no Supabase atual (de produção)
  2. Estrutura do código (arquitetura, rotas, componentes) deve ser preservada — só conteúdo textual e config de locale mudam
  3. Schema do novo Supabase será replicado via `supabase/migrations/` existentes (49 migrations já versionadas)
- **Plano em 6 fases:**
  1. Documentação e glossário ([[docs/glossario-traducao.md]])
  2. Infraestrutura de locale: `index.html` lang, timezone (`America/Sao_Paulo`→`America/Santiago`), date-fns locale (`ptBR`→`es`), formatador de moeda (`BRL`→`CLP`), WhatsApp (`+55`→`+56`)
  3. Tradução de páginas públicas (8 arquivos em `src/pages/`)
  4. Tradução de componentes públicos (~30 arquivos críticos em `src/components/`)
  5. Tradução de páginas admin (32 arquivos em `src/admin/pages/`)
  6. Tradução de componentes admin + constantes (`revenue/constants.ts`, `AdminSidebar`, etc.)
  7. Validação de build e guia de migração para o novo Supabase (`docs/migracao-supabase.md`)
- **Estratégia de tradução:** direta nos arquivos JSX (sem instalar i18next). Justificativa registrada em [[decisoes.md]].
- **Status real ao final desta sessão (2026-05-06):**
  - ✅ Fase 1 — 100% completa (infra de locale)
  - ✅ Fase 2 — 100% completa (todas as 9 páginas públicas; Sport/UltimosGreens/CasinoGame finalizadas via subagente paralelo)
  - ✅ Fase 3 — 100% completa (15 arquivos `src/components/` traduzidos via subagente paralelo)
  - ✅ Fase 4 — 100% completa (27 arquivos `src/admin/pages/` traduzidos via subagente paralelo, ~940 strings)
  - ✅ Fase 5 — 100% completa (14 arquivos `src/admin/components/` + `revenue/constants.ts` traduzidos via subagente paralelo)
  - ✅ Cobertura adicional pós-fases — arquivos que escaparam dos greps iniciais foram detectados em sweep amplo e corrigidos manualmente: `src/lib/paywallRouting.ts` (FEATURE_LABELS, FEATURE_HEADLINES, FEATURE_EXPLANATIONS), `src/lib/audienceUtils.ts` (AUDIENCE_SEGMENTS), `src/mocks/sports.ts` (nomes de esportes), `src/components/PlansModal.tsx` (BULLETS, PLAN_META, getCta), `src/components/PaywallPopup.tsx` (PREMIUM_BENEFITS, DIAMANTE_BENEFITS, copies de backredirect/upgrade), `src/components/SpecialBettingCard.tsx` (textos da Justificativa), `src/components/PremiumSportCard.tsx` (premiumTexts, badges), `src/components/NewEntriesAlert.tsx`, `src/components/JustificativaModal.tsx`, `src/components/TelegramAlert.tsx`, `src/components/FeedbackModal.tsx`, `src/admin/components/funnel-popup/types.ts` (POPUP_TYPES), `src/admin/pages/AdminCassinoPlaceholder.tsx`, `src/admin/pages/AdminOverview.tsx`, `src/admin/pages/AdminPredictions.tsx`, `aria-label="Fechar"` em 3 modais.
  - ✅ Bug latente corrigido pela Fase 5 — `src/admin/components/revenue/TransactionLogs.tsx` tinha labels de filtro CATEGORY_OPTIONS/CATEGORY_COLORS em pt-BR enquanto `revenue/constants.ts:getEventCategory` já retornava ES; o filtro de categoria estava quebrado. Agora alinhado a `Ingresos`/`Pérdida`/`Recuperación`.
  - ✅ Mudança consistente em CasinoGame.tsx: `signal === 'CASA'` → `'LOCAL'` (gerado e comparado no mesmo arquivo, sem referência cruzada — verificado via grep no projeto inteiro).
  - ✅ Build final verde — `npx tsc --noEmit` exit 0 após todas as correções.
  - ⏸️ Fase 6 — guia de migração Supabase ainda pendente (`docs/migracao-supabase.md` foi criado mas precisa do guia operacional para o novo project_ref `snykhoctikatcpvlcoow`).
- **Estratégia que funcionou:** após `.claude/settings.local.json` ganhar `Edit/Write/Bash` em `permissions.allow`, subagentes em background passam a editar arquivos sem prompt de permissão (resolvendo o bloqueio anterior). 4 subagentes em paralelo, um por fase, completaram ~1500 strings em ~80 minutos de wall-clock. Cada subagente recebeu: lista exata de arquivos do seu escopo, instrução de ler `glossario-traducao.md` antes, regras inegociáveis (preservar enums/IDs/className/comentários), validação obrigatória com `npx tsc --noEmit` antes de reportar, e instrução de NÃO mexer em `progresso.md` (consolidação centralizada evita race condition). Glossário cresceu de ~250 termos iniciais para >400 com seções "Admin/dashboard" e "Componentes" adicionadas pelos próprios agentes durante a tradução.
- **Aprendizado para próxima localização em projeto similar:** o grep inicial baseado em padrões PT comuns (`ção`, `Aposta`, `Bilhete`, etc.) deixa escapar copies que usam vocabulário diferente (Alavancagem, Cassino, Atualizado, Sinais). Sweep final case-insensitive com lista ampla de marcadores (`R$`, `Em breve`, `Voltar`, `Fechar`, `Não`, `Você`) é essencial para fechar a cobertura. Registrado em [[aprendizados.md]].
- **Tags:** [[localização]] [[i18n]] [[es-CL]] [[Chile]] [[Supabase]] [[MCP]]

## Migração do Lovable para desenvolvimento local com Claude Code
- **Data:** 2026-05-06
- **Contexto:** Projeto originalmente desenvolvido no Lovable (gerador de apps com IA), com código publicado no GitHub `guilhermesimas542-lab/ultrateste111`. O projeto está em produção com tráfego ativo, então não pode ser interrompido. Usuário relatou limitações da plataforma Lovable e decidiu migrar pra desenvolvimento local com [[Claude Code]] para ter mais controle.
- **Plano executado:**
  1. Clone do repo de produção em `/Users/guilhermesimas/Documents/premier/ultrateste111/`
  2. Remoção do `origin` antigo (impede push acidental no repo de produção)
  3. Conexão com novo `origin`: `Premier-Claude-code` (repo separado pra desenvolvimento)
  4. Remoção dos lockfiles do bun (`bun.lock`, `bun.lockb`) — escolhido npm como gerenciador
  5. `npm install` — instalação limpa das dependências
  6. Proteção do `.env` (criado `.env.example`, `.env` removido do tracking do Git e adicionado ao `.gitignore`)
  7. Validação do `npm run dev` — servidor sobe em `http://localhost:8080/`
  8. Criação da estrutura `docs/` (progresso, decisões, bugs)
- **Resultado:** Ambiente local funcional, repo de produção intocado, novo repo de desenvolvimento isolado. Pronto pra evoluir.
- **Próximos passos:**
  - Configurar Supabase CLI pra acessar o banco de produção localmente
  - Definir estratégia de deploy (continuar onde está? mudar pra Vercel/Netlify?)
  - Validar fluxos críticos (Casino, Sport, Login) no ambiente local
- **Tags:** [[Lovable]] [[migração]] [[Vite]] [[React]] [[Supabase]] [[npm]]
