# Premier Ultra - Backend API Documentation

## Visão Geral

Backend completo para o app Premier Ultra com controle de permissões por plano, add-ons e analytics.

---

## Endpoints Disponíveis

### 1. Auth Login
**`POST /auth-login`**

Faz login com email (sem senha). Cria usuário se não existir.

**Request:**
```json
{
  "email": "usuario@exemplo.com"
}
```

**Response (usuário FREE - sem compra):**
```json
{
  "success": true,
  "redirect": true,
  "checkout": "https://checkout.premierfc.app",
  "message": "Usuário não possui plano ativo"
}
```

**Response (usuário com plano ativo):**
```json
{
  "success": true,
  "redirect": false,
  "user": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "main_tier": "ultra",
    "is_vitalicio": true,
    "vitalicio_since": "2026-02-06T15:34:52.972339+00:00",
    "created_at": "2026-02-06T15:33:56.061231+00:00",
    "last_seen_at": "2026-02-06T15:33:56.061231+00:00"
  },
  "entitlements": [
    {
      "product_key": "alavancagem",
      "starts_at": "2026-02-06T15:33:56.061231+00:00",
      "ends_at": null,
      "status": "active"
    }
  ],
  "allowed_access": {
    "tiers": ["basic", "pro", "ultra"],
    "addons": ["alavancagem"]
  },
  "token": "eyJ..."
}
```

---

### 2. Get Me
**`GET /me`**

Retorna dados do usuário logado e permissões atualizadas.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "main_tier": "ultra",
    "is_vitalicio": true,
    "vitalicio_since": "2026-02-06T15:34:52.972339+00:00",
    "created_at": "2026-02-06T15:33:56.061231+00:00",
    "last_seen_at": "2026-02-06T15:35:00.000000+00:00"
  },
  "entitlements": [],
  "allowed_access": {
    "tiers": ["basic", "pro", "ultra"],
    "addons": []
  }
}
```

---

### 3. Banners
**`GET /banners`**

Retorna banners ativos no momento.

**Response:**
```json
{
  "success": true,
  "banners": [
    {
      "id": "uuid",
      "title": "Promoção Especial",
      "image_url": "https://...",
      "button_text": "Saiba mais",
      "button_link": "https://...",
      "starts_at": "2026-02-06T00:00:00.000Z",
      "ends_at": "2026-02-28T23:59:59.000Z"
    }
  ]
}
```

---

### 4. Entries
**`GET /entries?date=YYYY-MM-DD`**

Retorna entradas filtradas por tier e add-ons do usuário.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
- `date` (opcional): Data no formato YYYY-MM-DD. Default: data atual.

**Response:**
```json
{
  "success": true,
  "date": "2026-02-06",
  "user_tier": "ultra",
  "allowed_tiers": ["basic", "pro", "ultra"],
  "active_addons": ["alavancagem"],
  "entries": [
    {
      "id": "uuid",
      "date": "2026-02-06",
      "title": "Flamengo x Palmeiras",
      "market": "Ambas Marcam",
      "odd": 1.85,
      "tier_required": "pro",
      "addon_required": null,
      "metadata": {
        "team1": { "name": "Flamengo", "logo": "https://..." },
        "team2": { "name": "Palmeiras", "logo": "https://..." }
      },
      "created_at": "2026-02-06T10:00:00.000Z"
    }
  ]
}
```

---

### 5. Events
**`POST /events`**

Registra eventos de analytics.

**Headers (opcional):**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "event_name": "click_banner",
  "metadata": {
    "banner_id": "uuid",
    "position": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "uuid"
}
```

**Eventos sugeridos:**
- `app_open` - Usuário abriu o app
- `click_banner` - Clicou em banner
- `view_entries` - Visualizou entradas
- `click_entry` - Clicou em uma entrada
- `open_popup_vitalicio` - Abriu popup vitalício
- `click_buy_vitalicio` - Clicou para comprar vitalício
- `click_buy_plan` - Clicou para comprar plano
- `view_sport` - Visualizou página de esporte
- `view_casino` - Visualizou página de cassino
- `click_telegram` - Clicou no link do Telegram
- `click_betsite` - Clicou no link da casa de apostas

---

### 6. Sessions
**`POST /sessions`**

Gerencia sessões de uso para medir tempo no app.

**Headers:**
```
Authorization: Bearer {token}
```

**Iniciar sessão:**
```json
{
  "action": "start"
}
```

Response:
```json
{
  "success": true,
  "session_id": "uuid",
  "started_at": "2026-02-06T15:35:00.000Z"
}
```

**Encerrar sessão:**
```json
{
  "action": "end",
  "session_id": "uuid"
}
```

Response:
```json
{
  "success": true,
  "session_id": "uuid",
  "duration_seconds": 3600
}
```

**Heartbeat (manter sessão ativa):**
```json
{
  "action": "heartbeat",
  "session_id": "uuid"
}
```

---

## Modelo de Dados

### users
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| email | TEXT | Email único |
| main_tier | ENUM | free/basic/pro/ultra |
| is_vitalicio | BOOLEAN | Se é vitalício |
| vitalicio_since | TIMESTAMPTZ | Quando virou vitalício |
| created_at | TIMESTAMPTZ | Data de criação |
| last_seen_at | TIMESTAMPTZ | Último acesso |
| last_event_at | TIMESTAMPTZ | Última interação |

### entitlements
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| user_id | UUID | FK para users |
| product_key | ENUM | alavancagem/desaltas |
| source | ENUM | purchase/manual/admin |
| starts_at | TIMESTAMPTZ | Início da validade |
| ends_at | TIMESTAMPTZ | Fim (null = sem fim) |
| status | ENUM | active/expired/revoked |

### orders
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| provider | TEXT | Lastlink/PerfectPay/etc |
| provider_order_id | TEXT | ID na plataforma |
| buyer_email | TEXT | Email do comprador |
| amount | DECIMAL | Valor |
| status | ENUM | paid/refunded/chargeback |
| paid_at | TIMESTAMPTZ | Data do pagamento |
| raw_payload | JSONB | Payload original |

### content_banners
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| title | TEXT | Título |
| image_url | TEXT | URL da imagem |
| button_text | TEXT | Texto do botão |
| button_link | TEXT | Link do botão |
| active | BOOLEAN | Se está ativo |
| starts_at | TIMESTAMPTZ | Início exibição |
| ends_at | TIMESTAMPTZ | Fim exibição |

### content_entries
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| date | DATE | Data da entrada |
| title | TEXT | Título |
| market | TEXT | Mercado |
| odd | DECIMAL | Odd |
| tier_required | ENUM | Tier mínimo |
| addon_required | ENUM | Add-on necessário |
| active | BOOLEAN | Se está ativa |
| metadata | JSONB | Dados extras |

### events
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| user_id | UUID | FK para users |
| event_name | TEXT | Nome do evento |
| metadata | JSONB | Dados extras |
| created_at | TIMESTAMPTZ | Timestamp |

### sessions
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| user_id | UUID | FK para users |
| session_start_at | TIMESTAMPTZ | Início |
| session_end_at | TIMESTAMPTZ | Fim |
| duration_seconds | INTEGER | Duração |
| last_heartbeat_at | TIMESTAMPTZ | Último heartbeat |

---

## Regras de Permissão

### Tiers (SEM Free quando pago)
- **free**: Só vê conteúdo `tier_required = free`
- **basic**: Só vê conteúdo `tier_required = basic` (NÃO free)
- **pro**: Vê conteúdo `tier_required IN (basic, pro)` (NÃO free)
- **ultra**: Vê conteúdo `tier_required IN (basic, pro, ultra)` (NÃO free)

### Add-ons
- Se `addon_required = alavancagem/desaltas`, só retorna se o usuário tiver entitlement ativo correspondente.

### Vitalício
- `is_vitalicio` é apenas um flag para UI
- Se false: mostrar CTA para comprar
- Se true: mostrar "Você é vitalício"
- NÃO afeta permissões de conteúdo

---

## Integração no Frontend

### Usando a biblioteca `src/lib/api.ts`

```typescript
import { 
  login, 
  getMe, 
  getBanners, 
  getEntries,
  trackEvent,
  isAuthenticated,
  canAccessTier,
  hasAddon,
  isVitalicio,
  getUserTier,
  clearAuth
} from '@/lib/api';

// Login
const response = await login('usuario@exemplo.com');
if (response.redirect) {
  window.location.href = response.checkout;
  return;
}
// Token salvo automaticamente no localStorage

// Verificar autenticação
if (!isAuthenticated()) {
  navigate('/login');
}

// Verificar permissões
if (canAccessTier('pro')) {
  // Pode ver conteúdo PRO
}

if (hasAddon('alavancagem')) {
  // Pode ver área de alavancagem
}

if (isVitalicio()) {
  // Mostrar badge "Você é vitalício"
} else {
  // Mostrar CTA para comprar vitalício
}

// Buscar conteúdo
const banners = await getBanners();
const entries = await getEntries('2026-02-06');

// Tracking
await trackEvent('click_banner', { banner_id: '123' });

// Logout
clearAuth();
navigate('/login');
```

### Usando hooks

```typescript
import { useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';

function App() {
  // Gerencia sessão automaticamente
  const { sessionId, endSession } = useSession();
  
  // Tracking de eventos
  const { track } = useTracking();
  
  const handleBannerClick = (bannerId: string) => {
    track('click_banner', { banner_id: bannerId });
  };
}
```

---

## Preparação para Webhook (futura implementação)

A tabela `orders` está pronta para receber webhooks de:
- Lastlink
- PerfectPay
- Outras plataformas

Fluxo esperado:
1. Webhook recebe `POST /webhook/{provider}`
2. Valida assinatura/segredo
3. Insere em `orders`
4. Atualiza `users.main_tier` baseado no produto
5. Cria `entitlements` se for add-on
6. Atualiza `users.is_vitalicio` se for vitalício

---

## Arquivos Criados/Alterados

### Edge Functions
- `supabase/functions/auth-login/index.ts`
- `supabase/functions/me/index.ts`
- `supabase/functions/banners/index.ts`
- `supabase/functions/entries/index.ts`
- `supabase/functions/events/index.ts`
- `supabase/functions/sessions/index.ts`

### Frontend
- `src/lib/api.ts` - Cliente API completo
- `src/hooks/useSession.ts` - Hook de sessão
- `src/hooks/useTracking.ts` - Hook de tracking

### Banco de Dados
- Tabelas: `users`, `entitlements`, `orders`, `content_banners`, `content_entries`, `events`, `sessions`
- Enums: `main_tier`, `entitlement_status`, `entitlement_source`, `order_status`, `product_key`
- Funções: `get_allowed_tiers()`, `has_active_entitlement()`, `get_or_create_user()`
