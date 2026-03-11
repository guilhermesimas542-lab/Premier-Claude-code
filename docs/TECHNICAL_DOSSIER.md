# 📋 Dossiê Técnico Completo — Premier Ultra

> **Gerado em:** 2026-03-11  
> **Status:** Somente leitura — nenhuma alteração foi feita no código.

---

## 1. Estrutura Geral do Projeto

### 1.1 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Estilização | Tailwind CSS + shadcn/ui |
| Roteamento | React Router DOM v6 |
| Estado Servidor | TanStack React Query v5 |
| Backend | Supabase (via Lovable Cloud) |
| Autenticação Admin | Supabase Auth (Magic Link OTP) |
| Autenticação Usuário | Mock localStorage (sem Supabase Auth) |

### 1.2 Árvore de Diretórios

```
/
├── public/
│   ├── favicon.ico
│   ├── logo.jpg
│   ├── placeholder.svg
│   ├── robots.txt
│   ├── sw.js                          # Service Worker (PWA)
│   └── images/                        # Assets estáticos públicos
├── docs/
│   ├── BACKEND_API.md
│   ├── BUSINESS_DOSSIER.md
│   ├── CATALOG_DIAGNOSIS.md
│   └── TECHNICAL_DOSSIER.md           # ← Este arquivo
├── supabase/
│   ├── config.toml                    # Config do projeto Supabase (auto-gerado)
│   ├── migrations/                    # Migrações SQL (read-only)
│   └── functions/                     # Edge Functions
│       ├── auth-login/                # Login do usuário, cria/busca no DB
│       ├── banners/                   # CRUD de banners
│       ├── entries/                   # CRUD de entradas/tips
│       ├── events/                    # Tracking de eventos
│       ├── handle-xp-events/          # Processamento de XP
│       ├── me/                        # Dados do usuário autenticado
│       ├── payment-webhook/           # Webhook de pagamento (LastLink)
│       ├── save-push-subscription/    # Salva subscription push
│       ├── send-push-notification/    # Envia push notification
│       ├── sessions/                  # Gestão de sessões
│       └── vapid-public-key/          # Retorna chave VAPID pública
└── src/
    ├── main.tsx                       # Ponto de entrada (ReactDOM.createRoot)
    ├── App.tsx                        # Definição de rotas e providers
    ├── App.css                        # CSS legado (pouco usado)
    ├── index.css                      # Design system (CSS variables, animações)
    ├── vite-env.d.ts
    ├── admin/                         # Módulo administrativo completo
    │   ├── components/                # Componentes do admin
    │   │   ├── AdminGuard.tsx         # Guard de autenticação admin
    │   │   ├── AdminLayout.tsx        # Layout com sidebar + header
    │   │   ├── AdminSidebar.tsx       # Menu lateral do admin
    │   │   ├── AdminRankingTab.tsx
    │   │   ├── ClientProfileModal.tsx
    │   │   ├── FunnelAnalyticsModal.tsx
    │   │   ├── LogoInput.tsx
    │   │   ├── PredictionAutocomplete.tsx
    │   │   ├── RealTimeClock.tsx
    │   │   ├── TeamAutocomplete.tsx
    │   │   ├── funnel-popup/          # Builder de popups de funil
    │   │   ├── pay-cards/             # Preview de pay cards
    │   │   └── revenue/               # Tabs de receita
    │   ├── config/
    │   │   └── admins.ts              # Config legada de admins
    │   ├── context/
    │   │   ├── AdminModeContext.tsx    # Contexto de modo admin
    │   │   └── BettingHouseContext.tsx # Seletor de casa de apostas
    │   ├── hooks/
    │   │   └── useAdmin.ts            # Hook de autenticação admin
    │   ├── pages/                     # ~20 páginas de admin
    │   └── types.ts
    ├── assets/                        # Imagens importadas via ES6
    ├── components/                    # Componentes do app do usuário
    │   ├── ui/                        # shadcn/ui (40+ componentes)
    │   ├── cards/                     # Cards reutilizáveis
    │   │   ├── CardType1Lateral.tsx   # Card com imagem lateral
    │   │   ├── CardType2Top.tsx       # Card com imagem no topo
    │   │   └── CardFunnelModal.tsx    # Modal de funil de card
    │   ├── funnel/                    # Componentes de funil
    │   │   ├── FinalTemplates.tsx
    │   │   ├── QuizOptionCard.tsx
    │   │   └── QuizStep.tsx
    │   ├── BottomNav.tsx              # Barra de navegação inferior (3 abas)
    │   ├── BettingTipCard.tsx         # Card legado de tip
    │   ├── PremiumBettingCard.tsx     # Card premium de tip
    │   ├── SpecialBettingCard.tsx     # Card especial de tip
    │   ├── EntryCard.tsx              # Card de entrada genérico
    │   ├── FunnelPopup.tsx            # Popup de funil renderizado
    │   ├── HousePopups.tsx            # Popups por casa de apostas
    │   ├── MarketingPopup.tsx         # Popup de marketing
    │   ├── PaywallPopup.tsx           # Popup de paywall
    │   ├── PayCardFunnelModal.tsx     # Modal de funil pay card
    │   ├── PromoCarousel.tsx          # Carousel de banners
    │   ├── MatrixRain.tsx             # Efeito Matrix (background)
    │   ├── ProfileModal.tsx           # Modal de perfil/avatar
    │   ├── AchievementsSection.tsx    # Seção de conquistas
    │   ├── AchievementDetailModal.tsx # Detalhe de conquista
    │   ├── SalesFunnel.tsx            # Funil de vendas
    │   ├── EmbeddedCheckout.tsx       # Checkout embutido (iframe)
    │   ├── InstallAppButton.tsx       # Botão instalar PWA
    │   ├── ShirtIcon.tsx              # Ícone de camisa de time
    │   └── ...                        # Demais componentes
    ├── context/
    │   └── FunnelPopupContext.tsx      # Provider global de popups de funil
    ├── contexts/
    │   └── GamificationContext.tsx     # Provider global de gamificação
    ├── hooks/                         # Custom hooks
    │   ├── use-mobile.tsx             # Detecção de mobile (768px)
    │   ├── use-toast.ts               # Hook de toast
    │   ├── useAchievements.ts         # Conquistas do usuário
    │   ├── useCards.ts                # Cards dinâmicos do DB
    │   ├── useGamificationCore.ts     # Lógica core de XP/level
    │   ├── useMatrixCanvas.ts         # Canvas do efeito Matrix
    │   ├── usePayCards.ts             # Pay cards do DB
    │   ├── usePayCardTrigger.ts       # Trigger inteligente de pay card
    │   ├── usePWAInstall.ts           # Instalação PWA
    │   ├── usePushNotifications.ts    # Push notifications
    │   ├── useUserAccess.ts           # Acesso/entitlements do usuário
    │   └── useUserBettingHouse.ts     # Casa de apostas do usuário
    ├── integrations/
    │   └── supabase/
    │       ├── client.ts              # Cliente Supabase (auto-gerado)
    │       └── types.ts               # Tipos do DB (auto-gerado)
    ├── lib/                           # Utilitários
    │   ├── auth.ts                    # Wrapper de autenticação mock
    │   ├── audienceUtils.ts           # Filtragem de audiência
    │   ├── avatars.ts                 # Avatares e títulos de nível
    │   ├── checkoutLinks.ts           # URLs de checkout
    │   ├── errorTracker.ts            # Tracker global de erros
    │   ├── events.ts                  # Tracking de eventos (Edge Function)
    │   ├── funnelTracker.ts           # Tracking de funis
    │   ├── prices.ts                  # Preços de planos
    │   ├── shirtColors.ts             # Cores de camisas de times
    │   ├── timezone.ts                # Timezone Brasil (São Paulo)
    │   ├── userMock.ts                # Mock de dados do usuário
    │   └── utils.ts                   # cn() e utilitários gerais
    ├── mocks/
    │   ├── user.ts                    # Sistema de mock user (localStorage)
    │   └── sports.ts                  # Dados mock de esportes
    ├── pages/                         # Páginas do app
    │   ├── Login.tsx                  # Tela de login
    │   ├── Home.tsx                   # Dashboard principal
    │   ├── Sport.tsx                  # Lista de tips esportivos
    │   ├── Casino.tsx                 # Lista de jogos cassino
    │   ├── CasinoGame.tsx             # Jogo individual (iframe)
    │   ├── UltimosGreens.tsx          # Histórico de greens
    │   ├── Support.tsx                # Perfil Hub (perfil + gamificação)
    │   └── NotFound.tsx               # Página 404
    └── types/                         # Tipos TypeScript
        ├── auth.ts                    # Tipos de autenticação
        ├── sports.ts                  # Tipos de esportes
        └── tips.ts                    # Tipos de tips
```

### 1.3 Ponto de Entrada

- **`src/main.tsx`** → monta `<App />` via `ReactDOM.createRoot` no `#root`
- **`src/App.tsx`** → define a árvore de providers e todas as rotas

---

## 2. Arquitetura de Componentes

### 2.1 Autenticação

O projeto usa **dois sistemas de autenticação completamente distintos**:

#### Autenticação do Usuário Final (Mock + Edge Function)
- **Arquivo:** `src/lib/auth.ts`, `src/mocks/user.ts`
- **Fluxo:**
  1. Usuário digita e-mail em `Login.tsx`
  2. Chama Edge Function `auth-login` que executa `get_or_create_user(email)` no DB
  3. Retorna dados do usuário (id, main_tier) e um token JWT
  4. Salva no `localStorage` via `mockLogin()` (chave: `mock_user`)
  5. Token armazenado separadamente via `storeToken()` (chave: `premier_token`)
- **Sem senha, sem OTP** — apenas e-mail é necessário para login de usuário
- **`isAuthenticated()`** → verifica se existe `mock_user` no localStorage
- **`clearAuth()`** → limpa todos os dados do localStorage

#### Autenticação Admin (Supabase Auth)
- **Arquivo:** `src/admin/hooks/useAdmin.ts`
- **Fluxo:**
  1. Admin acessa `/admin/login` → digita e-mail
  2. RPC `check_is_admin_email` verifica se e-mail está na tabela `admin_emails`
  3. Redireciona para `/admin/verify` → OTP via Supabase Auth
  4. Após verificação, `useAdmin()` checa `supabase.auth.getSession()` + RPC `is_admin()`
  5. `AdminGuard` protege todas as rotas `/admin/*`

### 2.2 Navegação Principal

#### BottomNav (`src/components/BottomNav.tsx`)
- Barra fixa no bottom da tela, visível em **todas as resoluções**
- 3 abas: **Tips** (`/sport/1`), **Cassino** (`/cassino`), **Perfil** (`/support`)
- Renderizada individualmente dentro de cada página (não no `App.tsx`)
- Usa `useLocation()` para determinar aba ativa via `matchPaths`
- Estilo: fundo preto 95% opacidade, borda verde, ícones verde/cinza

#### Header (inline em cada página)
- Não existe componente `Header` separado
- Cada página (Home, Sport, Casino) renderiza seu próprio header com logo, botões contextuais e menu hamburger
- Header do Admin é parte do `AdminLayout.tsx`

### 2.3 Home / Dashboard do Usuário (`src/pages/Home.tsx`)

**Estrutura:**
1. **Header** — Logo, botões Live/Vitalício, menu hamburger
2. **PromoCarousel** — Banners dinâmicos do DB (`content_banners`)
3. **Entradas Disponíveis** — Cards de categoria principal (futebol, cassino) via `useCardsBySlugs`
4. **Acesso Rápido** — Cards de acesso rápido via `useCards("quick_access")`
5. **Últimos Bilhetes** — Link para `/ultimos-greens`
6. **Footer** — Copyright e links
7. **Modais** — BasicPlan, Promoções, Vitalício, Termos, Funil, PayCard
8. **WelcomePopup** — Popup de boas-vindas por casa de apostas
9. **BottomNav** — Barra de navegação inferior

**Fluxo de dados:**
- `mockGetUser()` → dados do localStorage
- `useUserBettingHouse()` → casa de apostas vinculada
- `useCards()` / `useCardsBySlugs()` → cards do DB (tabela `cards`)
- `useUserAccess()` → tier + entitlements do usuário
- `usePayCardTrigger()` → trigger de pay cards por plano

### 2.4 Cards de Dicas (Tip Cards)

#### Sistema de Cards Dinâmicos
Os cards na Home e Casino são carregados dinamicamente da tabela `cards` do Supabase.

| Componente | Tipo | Descrição |
|-----------|------|-----------|
| `CardType1Lateral` | `type1_lateral` | Imagem lateral, título e subtítulo à direita |
| `CardType2Top` | `type2_top` | Imagem no topo, conteúdo embaixo, badge de "bloqueado" |
| `CardFunnelModal` | — | Modal com quiz/funil ao clicar em card bloqueado |

**Variações de acesso:**
- **Desbloqueado** → navega para a rota do card (futebol, cassino, etc.)
- **Bloqueado** → abre `PayCardFunnelModal` (se tem `pay_card_id`) ou `CardFunnelModal` (legacy)

#### Cards de Tips Esportivos (`src/pages/Sport.tsx`)
Usa a RPC `get_display_tips(email)` que retorna tips com `display_status`:
- **`unlocked`** → `PremiumBettingCard` (card completo com dados)
- **`locked`** → Card com overlay de cadeado e blur
- **`expired`** → Card expirado (oculto ou marcado)

| Componente | Arquivo | Uso |
|-----------|---------|-----|
| `PremiumBettingCard` | `src/components/PremiumBettingCard.tsx` | Tip desbloqueada com times, odd, mercado |
| `SpecialBettingCard` | `src/components/SpecialBettingCard.tsx` | Tip especial (múltipla, etc.) |
| `BettingTipCard` | `src/components/BettingTipCard.tsx` | Card legado de tip |
| `ShirtIcon` | `src/components/ShirtIcon.tsx` | Renderiza camisa do time com cores |

### 2.5 Painel de Administração

#### Estrutura
- **Guard:** `AdminGuard.tsx` → verifica `useAdmin()` (Supabase Auth + RPC `is_admin`)
- **Layout:** `AdminLayout.tsx` → Sidebar + Header + `<Outlet />`
- **Sidebar:** `AdminSidebar.tsx` → menu lateral com links para todas as seções

#### Páginas Admin (20+ páginas em `src/admin/pages/`)

| Rota | Página | Função |
|------|--------|--------|
| `/admin` | `AdminDashboard` | Dashboard com métricas |
| `/admin/analytics` | `AdminAnalytics` | Eventos e telemetria |
| `/admin/ranking` | `AdminRanking` | Ranking global XP |
| `/admin/revenue` | `AdminRevenue` | Inteligência financeira |
| `/admin/clients` | `AdminClientsManage` | CRM de clientes |
| `/admin/clients/create` | `AdminClientsCreate` | Cadastro de cliente |
| `/admin/tips/create` | `AdminTipsCreate` | Criar tip esportiva |
| `/admin/tips/list` | `AdminTipsList` | Listar tips |
| `/admin/banners` | `AdminBanners` | Gestão de banners |
| `/admin/betting-houses` | `AdminBettingHouses` | Casas de apostas |
| `/admin/teams` | `AdminTeams` | Times (logos, nomes) |
| `/admin/predictions` | `AdminPredictions` | Predições de mercado |
| `/admin/popups` | `AdminFunnelPopups` | Popups de marketing |
| `/admin/cards` | `AdminCards` | Cards dinâmicos |
| `/admin/pay-cards` | `AdminPayCards` | Pay cards (funis de aquisição) |
| `/admin/notifications` | `AdminNotifications` | Push notifications |
| `/admin/webhook` | `AdminWebhook` | Logs de webhook |
| `/admin/errors` | `AdminErrors` | Log de erros |
| `/admin/default-links` | `AdminDefaultLinks` | Links padrão |
| `/admin/cassino` | `AdminCassinoPlaceholder` | Placeholder futuro |

#### Contextos Admin
- **`AdminModeContext`** — controle de modo admin
- **`BettingHouseContext`** — seletor de casa de apostas ativa (filtra dados por casa)

### 2.6 Sistema de Popups/Modais

#### Popups de Funil (`FunnelPopupContext`)
- **Provider:** `src/context/FunnelPopupContext.tsx`
- Envolve toda a app em `App.tsx`
- `openPopup(type)` → busca popup ativo da tabela `popups` por tipo e casa
- Renderiza `<FunnelPopup />` com quiz de 3 perguntas + tela final com CTA

#### Pay Card Funnel
- **Hook:** `usePayCardTrigger()` — busca pay card por plano/audiência
- **Modal:** `PayCardFunnelModal` — quiz interativo + checkout embutido
- Tabela: `pay_cards` (config) + `funnel_steps` (perguntas)

#### Outros Modais
| Componente | Trigger |
|-----------|---------|
| `BasicPlanModal` | Upgrade para plano básico |
| `ProfileModal` | Click no card de perfil (Support) |
| `AchievementDetailModal` | Click em conquista |
| `MarketingPopup` | Trigger por delay/evento |
| `PaywallPopup` | Usuário free após login |
| `HousePopups` (WelcomePopup, UpgradePopup) | Por casa de apostas |

---

## 3. Gerenciamento de Estado e Fluxo de Dados

### 3.1 Estado Global

O projeto usa **React Context** para estado global (sem Redux/Zustand):

| Provider | Arquivo | Escopo | Dados |
|----------|---------|--------|-------|
| `QueryClientProvider` | `App.tsx` | App inteira | Cache de queries (React Query) |
| `GamificationProvider` | `src/contexts/GamificationContext.tsx` | App inteira | XP, nível, streak, conquistas |
| `FunnelPopupProvider` | `src/context/FunnelPopupContext.tsx` | App inteira | Popup de funil ativo |
| `AdminModeProvider` | `src/admin/context/AdminModeContext.tsx` | Rotas admin | Modo admin |
| `BettingHouseProvider` | `src/admin/context/BettingHouseContext.tsx` | Rotas admin | Casa selecionada |

**Hierarquia de providers em `App.tsx`:**
```
QueryClientProvider
  └─ TooltipProvider
       └─ GamificationProvider
            └─ FunnelPopupProvider
                 └─ BrowserRouter
                      └─ Routes
```

### 3.2 Estado Local

- **Autenticação do usuário:** `localStorage` (chave `mock_user`)
- **Token de tracking:** `localStorage` (chave `premier_token`)
- **Device ID:** `localStorage` (chave `premier_device_id`)
- **Session ID:** `localStorage` (chave `premier_session_id`, timeout 30min)
- **Casa de apostas selecionada:** `localStorage` (chave `selected_house_id`)
- **Paywall info:** `localStorage` (chaves `premier_show_paywall`, `premier_checkout_url`)

### 3.3 Comunicação com Backend (Supabase)

#### Cliente
- **Arquivo:** `src/integrations/supabase/client.ts` (auto-gerado, NÃO editar)
- **Import:** `import { supabase } from "@/integrations/supabase/client"`
- Chamadas feitas **diretamente nos componentes/hooks** — sem camada de serviço intermediária

#### Padrões de Acesso

**1. Queries diretas (maioria dos casos):**
```ts
const { data } = await supabase.from("tabela").select("*").eq("campo", valor);
```

**2. RPCs (funções do DB):**
```ts
const { data } = await supabase.rpc("get_display_tips", { p_email: email });
```

**3. Edge Functions:**
```ts
const { data } = await supabase.functions.invoke("auth-login", { body: { email } });
```

**4. Tracking de eventos (fetch direto):**
```ts
await fetch(`https://${projectId}.supabase.co/functions/v1/events`, { ... });
```

#### Tabelas Principais

| Tabela | Uso |
|--------|-----|
| `users` | Usuários (email, tier, casa, avatar) |
| `entitlements` | Acessos/planos ativos (product_key, status) |
| `content_entries` | Tips esportivos (title, odd, teams, tier) |
| `cards` | Cards dinâmicos (Home, Casino) |
| `pay_cards` | Funis de aquisição por plano |
| `funnel_steps` | Perguntas dos funis |
| `popups` | Popups de marketing |
| `content_banners` | Banners do carousel |
| `betting_houses` | Casas de apostas |
| `teams` | Times (nome, logo) |
| `market_predictions` | Predições de mercado |
| `events` | Eventos de tracking |
| `sessions` | Sessões de usuário |
| `orders` | Pedidos de pagamento |
| `financial_events` | Eventos financeiros |
| `webhook_logs` | Logs de webhook |
| `admin_emails` | E-mails de admin autorizados |
| `user_gamification` | XP, nível, streak |
| `achievements` | Definição de conquistas |
| `user_achievements` | Conquistas desbloqueadas |
| `xp_events` | Histórico de XP |
| `push_subscriptions` | Subscriptions push |
| `notifications` | Notificações |
| `funnel_analytics` | Analytics de funis |
| `banner_analytics` | Analytics de banners |
| `user_popup_views` | Controle de popup visto |
| `app_errors` | Erros da aplicação |
| `products_catalog` | Catálogo de produtos |
| `referrals` | Indicações |
| `raw_webhook_logs` | Logs brutos webhook |
| `special_achievement_entries` | Entries de conquistas especiais |

#### Enums do DB
- `main_tier`: `free | basic | pro | ultra`
- `product_key`: `alavancagem | desaltas | live_telegram | acesso_vitalicio`
- `entitlement_status`: `active | expired | revoked`
- `entitlement_source`: `purchase | manual | admin`
- `order_status`: `paid | refunded | chargeback`

#### Funções do DB (RPCs)
| Função | Uso |
|--------|-----|
| `get_or_create_user(email)` | Cria ou busca usuário |
| `get_display_tips(email)` | Retorna tips com display_status |
| `get_allowed_tiers(tier)` | Tiers permitidos por plano |
| `has_active_entitlement(user_id, product)` | Verifica entitlement ativo |
| `check_is_admin_email(email)` | Verifica se é admin |
| `is_admin()` | Verifica admin via auth session |

### 3.4 Dados do Usuário no Frontend

O usuário é gerenciado pelo sistema **mock**:

```ts
// Estrutura salva no localStorage (chave: mock_user)
interface MockUser {
  email: string;
  plan: 'ULTRA';     // Sempre ULTRA (legado)
  dbId?: string;      // UUID do DB
  mainTier?: string;  // free | basic | pro | ultra
  bettingHouseId?: string | null;
}
```

Para dados dinâmicos (entitlements, casa, gamificação), queries diretas ao Supabase usando o e-mail como chave.

---

## 4. Estilização

### 4.1 Tecnologia Principal
**Tailwind CSS** com componentes **shadcn/ui** (40+ componentes em `src/components/ui/`).

### 4.2 Design System (`src/index.css`)

Variáveis CSS definidas em `:root` usando HSL:

| Token | Valor HSL | Uso |
|-------|-----------|-----|
| `--background` | `217 19% 7%` | Fundo principal (quase preto) |
| `--foreground` | `210 17% 95%` | Texto principal (quase branco) |
| `--primary` | `18 100% 56%` | Cor primária (laranja) |
| `--secondary` | `160 100% 41%` | Cor secundária (verde) |
| `--accent` | `186 94% 53%` | Cor de destaque (ciano) |
| `--muted` | `217 19% 12%` | Fundo muted |
| `--success` | `160 100% 41%` | Verde sucesso |
| `--warning` | `38 92% 50%` | Amarelo aviso |
| `--vip` / `--ultra` | `280 100% 60%` | Roxo VIP |
| `--destructive` | `0 84.2% 60.2%` | Vermelho erro |

### 4.3 Configuração Tailwind (`tailwind.config.ts`)

- **Fonte:** `Inter` (sans-serif)
- **Cores:** Mapeadas dos CSS tokens via `hsl(var(--token))`
- **Border radius:** `0.75rem` base
- **Animações customizadas:** `gradient`, `shine`, `glow-pulse`, `slide-up`, `fade-in-scale`, `shake`, `bounce-micro`, `pulse-border`, `spin-slow`, `pulse-glow`, `pulse-glow-green`
- **Plugin:** `tailwindcss-animate`

### 4.4 Estilo Visual Dominante

O app usa um tema **"Matrix/Hacker"** com:
- Fundo preto (`#000000`)
- Verde neon (`#00FF00`) como cor dominante
- `text-shadow` e `box-shadow` com glow verde
- Efeito `MatrixRain` (chuva de caracteres) no background
- Bordas com `rgba(0,255,0,0.2-0.3)`
- Muitos estilos inline (não tokens) — débito técnico significativo

### 4.5 Animações CSS (`index.css`)
- `cta-pulse` — pulsação de CTA
- `border-pulse` — glow pulsante em bordas
- `particle-rise` — partículas subindo
- `lightning-strike` — relâmpago horizontal
- `border-fire` — gradiente animado
- `shimmer` — efeito shimmer
- `float-particles` — partículas flutuantes
- `liquid-gradient` — gradiente líquido
- `lightTrailMove1/2` — rastros de luz (login)

---

## 5. Roteamento e Navegação

### 5.1 Biblioteca
**React Router DOM v6** (`react-router-dom@6.30.1`)

### 5.2 Definição de Rotas
Todas as rotas são definidas em `src/App.tsx`.

### 5.3 Mapa de Rotas

#### Rotas Públicas (Usuário)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/login` | `Login` | Tela de login (e-mail) |
| `/` | `Home` | Dashboard principal |
| `/sport/:sportId` | `Sport` | Lista de tips esportivos |
| `/alavancagem` | `Sport` | Tips de alavancagem (mesmo componente) |
| `/odds-altas` | `Sport` | Tips de odds altas (mesmo componente) |
| `/cassino` | `Casino` | Lista de jogos de cassino |
| `/cassino/:gameId` | `CasinoGame` | Jogo individual (iframe) |
| `/ultimos-greens` | `UltimosGreens` | Histórico de greens |
| `/support` | `Support` | Perfil Hub (gamificação + plano) |
| `*` | `NotFound` | Página 404 |

#### Rotas Admin (protegidas por `AdminGuard`)

| Rota | Componente |
|------|-----------|
| `/admin/login` | `AdminLogin` |
| `/admin/verify` | `AdminVerify` |
| `/admin` | `AdminDashboard` (index) |
| `/admin/banners` | `AdminBanners` |
| `/admin/betting-houses` | `AdminBettingHouses` |
| `/admin/teams` | `AdminTeams` |
| `/admin/predictions` | `AdminPredictions` |
| `/admin/tips/create` | `AdminTipsCreate` |
| `/admin/tips/list` | `AdminTipsList` |
| `/admin/clients` | `AdminClientsManage` |
| `/admin/clients/create` | `AdminClientsCreate` |
| `/admin/notifications` | `AdminNotifications` |
| `/admin/analytics` | `AdminAnalytics` |
| `/admin/analytics/events` | `AdminEventsPage` |
| `/admin/ranking` | `AdminRanking` |
| `/admin/revenue` | `AdminRevenue` |
| `/admin/default-links` | `AdminDefaultLinks` |
| `/admin/popups` | `AdminFunnelPopups` |
| `/admin/funis` | Redirect → `/admin/popups` |
| `/admin/cards` | `AdminCards` |
| `/admin/pay-cards` | `AdminPayCards` |
| `/admin/errors` | `AdminErrors` |
| `/admin/webhook` | `AdminWebhook` |
| `/admin/cassino` | `AdminCassinoPlaceholder` |
| `/admin/cassino/analytics` | `AdminCassinoPlaceholder` |
| `/admin/cassino/revenue` | `AdminCassinoPlaceholder` |

### 5.4 Proteção de Rotas

- **Rotas do usuário:** verificação via `isAuthenticated()` (localStorage) no `useEffect` de cada página — redireciona para `/login` se não autenticado
- **Rotas admin:** `AdminGuard` com Supabase Auth + RPC `is_admin()` — redireciona para `/admin/login`

### 5.5 Navegação entre Seções

```
Login ──→ Home ──→ Sport (Tips)
                ──→ Casino (Jogos)
                ──→ Support (Perfil)
                ──→ UltimosGreens (Histórico)
                ──→ CasinoGame (Jogo individual)
```

A `BottomNav` está presente em: Home, Sport, Casino, CasinoGame, Support.

---

## 6. Edge Functions

| Função | Método | Descrição |
|--------|--------|-----------|
| `auth-login` | POST | Login do usuário (get_or_create_user + gera token) |
| `me` | GET | Dados do usuário autenticado |
| `entries` | GET/POST | CRUD de tips (content_entries) |
| `banners` | GET/POST | CRUD de banners |
| `events` | POST | Registra evento de tracking |
| `sessions` | POST | Gestão de sessões |
| `handle-xp-events` | POST | Processa eventos de XP |
| `payment-webhook` | POST | Webhook de pagamento LastLink |
| `save-push-subscription` | POST | Salva subscription push |
| `send-push-notification` | POST | Envia push notification |
| `vapid-public-key` | GET | Retorna chave VAPID pública |

---

## 7. Observações e Débitos Técnicos

1. **Estilos inline excessivos** — Muitas cores e sombras são definidas diretamente via `style={{}}` em vez de usar tokens do design system
2. **Dois sistemas de auth** — Usuário final usa mock/localStorage, admin usa Supabase Auth real
3. **Sem camada de serviço** — Chamadas ao Supabase diretamente nos componentes
4. **BottomNav repetida** — Renderizada dentro de cada página individualmente, em vez de no layout
5. **`index.css` extenso** — 357 linhas com animações que poderiam ser separadas
6. **Componentes de página grandes** — `Home.tsx` (473 linhas), `Sport.tsx` (850 linhas) — candidatos a refatoração

---

> ✅ **Confirmação:** Nenhuma alteração foi feita no código. Este documento é puramente descritivo.
