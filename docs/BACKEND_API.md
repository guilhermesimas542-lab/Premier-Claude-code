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

**Response (usuário FREE):**
```json
{
  "success": true,
  "show_paywall_popup": true,
  "checkout": "https://checkout.premierfc.app",
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "free@teste.com",
    "main_tier": "free",
    "is_vitalicio": false,
    "vitalicio_since": null
  },
  "entitlements": [],
  "allowed_access": {
    "tiers": ["free"],
    "addons": []
  }
}
```

**Response (usuário PRO/ULTRA):**
```json
{
  "success": true,
  "show_paywall_popup": false,
  "checkout": null,
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "pro@teste.com",
    "main_tier": "pro",
    "is_vitalicio": false
  },
  "entitlements": [],
  "allowed_access": {
    "tiers": ["basic", "pro"],
    "addons": []
  }
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

---

### 3. Banners
**`GET /banners`**

Retorna banners ativos no momento.

---

### 4. Entries (ATUALIZADO - Locked/Unlocked)
**`GET /entries?date=YYYY-MM-DD`**

Retorna TODAS as entradas do dia com status locked/unlocked.

**Headers:**
```
Authorization: Bearer {token}
```

**Novo formato de resposta:**

```json
{
  "success": true,
  "date": "2026-02-06",
  "user_tier": "free",
  "allowed_tiers": ["free"],
  "active_addons": [],
  "entries": [
    {
      "id": "uuid",
      "date": "2026-02-06",
      "tier_required": "free",
      "addon_required": null,
      "locked": false,
      "display_title": "Flamengo x Fluminense",
      "display_market": "Resultado Final",
      "display_odd": 1.75,
      "metadata": { "team1": {...}, "team2": {...} },
      "created_at": "..."
    },
    {
      "id": "uuid",
      "date": "2026-02-06",
      "tier_required": "basic",
      "addon_required": null,
      "locked": true,
      "display_title": "Real Madrid x Barcelona",
      "display_market": null,
      "display_odd": null,
      "metadata": null,
      "created_at": "..."
    }
  ]
}
```

**Campos por entrada:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID único |
| `date` | string | Data da entrada |
| `tier_required` | string | Tier mínimo necessário |
| `addon_required` | string/null | Add-on necessário (se houver) |
| `locked` | boolean | Se está bloqueado para o usuário |
| `display_title` | string | Título (SEMPRE visível) |
| `display_market` | string/null | Mercado (null se locked) |
| `display_odd` | number/null | Odd (null se locked) |
| `metadata` | object/null | Dados extras (null se locked) |

---

## Regras de Permissão (LOCKED/UNLOCKED)

### Como calcular `locked`

Uma entry é **UNLOCKED** se:
1. `tier_required` está dentro de `allowed_tiers` do usuário **OU**
2. `addon_required` != null **E** está dentro de `active_addons` do usuário

Caso contrário: `locked = true`

### Regra "Excluir Free quando pago"

- Usuários pagos (basic/pro/ultra) **NÃO veem** entradas com `tier_required = free` (sem addon)
- Entradas de add-ons (alavancagem/desaltas) aparecem como **locked** para usuários que não têm o add-on

### Matriz de Visibilidade

| Tier do Usuário | Entries que VÊ (todas) | Entries UNLOCKED |
|-----------------|------------------------|------------------|
| **free** | free, basic, pro, ultra, addons | Apenas free |
| **basic** | basic, pro, ultra, addons | Apenas basic |
| **pro** | basic, pro, ultra, addons | basic + pro |
| **ultra** | basic, pro, ultra, addons | basic + pro + ultra |
| **free + alavancagem** | free, basic, pro, ultra, addons | free + alavancagem |
| **basic + desaltas** | basic, pro, ultra, addons | basic + desaltas |

---

## Exemplos de Resposta GET /entries

### FREE (sem add-on)
```json
{
  "user_tier": "free",
  "allowed_tiers": ["free"],
  "active_addons": [],
  "entries": [
    { "display_title": "Flamengo x Fluminense", "tier_required": "free", "locked": false, "display_market": "Resultado Final", "display_odd": 1.75 },
    { "display_title": "Corinthians x Santos", "tier_required": "free", "locked": false, "display_market": "Ambas Marcam", "display_odd": 1.85 },
    { "display_title": "Real Madrid x Barcelona", "tier_required": "basic", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Manchester City x Liverpool", "tier_required": "basic", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "PSG x Bayern", "tier_required": "pro", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Inter x Milan", "tier_required": "pro", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Juventus x Napoli", "tier_required": "ultra", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Alavancagem: Chelsea x Arsenal", "tier_required": "free", "addon_required": "alavancagem", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Alavancagem: Benfica x Porto", "tier_required": "free", "addon_required": "alavancagem", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Ajax x Feyenoord", "tier_required": "free", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Dortmund x Leipzig", "tier_required": "free", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null }
  ]
}
```
**Resumo:** 2 unlocked (free), 9 locked

---

### BASIC
```json
{
  "user_tier": "basic",
  "allowed_tiers": ["basic"],
  "active_addons": [],
  "entries": [
    { "display_title": "Real Madrid x Barcelona", "tier_required": "basic", "locked": false, "display_market": "Handicap Asiático", "display_odd": 2.1 },
    { "display_title": "Manchester City x Liverpool", "tier_required": "basic", "locked": false, "display_market": "Over 2.5", "display_odd": 1.95 },
    { "display_title": "PSG x Bayern", "tier_required": "pro", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Inter x Milan", "tier_required": "pro", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Juventus x Napoli", "tier_required": "ultra", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Alavancagem: Chelsea x Arsenal", "addon_required": "alavancagem", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Alavancagem: Benfica x Porto", "addon_required": "alavancagem", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Ajax x Feyenoord", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Dortmund x Leipzig", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null }
  ]
}
```
**Resumo:** 2 unlocked (basic), 7 locked (não mostra entries FREE)

---

### PRO
```json
{
  "user_tier": "pro",
  "allowed_tiers": ["basic", "pro"],
  "active_addons": [],
  "entries": [
    { "display_title": "Real Madrid x Barcelona", "tier_required": "basic", "locked": false, "display_market": "Handicap Asiático", "display_odd": 2.1 },
    { "display_title": "Manchester City x Liverpool", "tier_required": "basic", "locked": false, "display_market": "Over 2.5", "display_odd": 1.95 },
    { "display_title": "PSG x Bayern", "tier_required": "pro", "locked": false, "display_market": "Escanteios +8.5", "display_odd": 1.88 },
    { "display_title": "Inter x Milan", "tier_required": "pro", "locked": false, "display_market": "Empate Anula", "display_odd": 2.2 },
    { "display_title": "Juventus x Napoli", "tier_required": "ultra", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Alavancagem: Chelsea x Arsenal", "addon_required": "alavancagem", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Alavancagem: Benfica x Porto", "addon_required": "alavancagem", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Ajax x Feyenoord", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Dortmund x Leipzig", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null }
  ]
}
```
**Resumo:** 4 unlocked (basic + pro), 5 locked

---

### ULTRA
```json
{
  "user_tier": "ultra",
  "allowed_tiers": ["basic", "pro", "ultra"],
  "active_addons": [],
  "entries": [
    { "display_title": "Real Madrid x Barcelona", "tier_required": "basic", "locked": false, "display_market": "Handicap Asiático", "display_odd": 2.1 },
    { "display_title": "Manchester City x Liverpool", "tier_required": "basic", "locked": false, "display_market": "Over 2.5", "display_odd": 1.95 },
    { "display_title": "PSG x Bayern", "tier_required": "pro", "locked": false, "display_market": "Escanteios +8.5", "display_odd": 1.88 },
    { "display_title": "Inter x Milan", "tier_required": "pro", "locked": false, "display_market": "Empate Anula", "display_odd": 2.2 },
    { "display_title": "Juventus x Napoli", "tier_required": "ultra", "locked": false, "display_market": "Múltipla Especial", "display_odd": 3.5 },
    { "display_title": "Alavancagem: Chelsea x Arsenal", "addon_required": "alavancagem", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Alavancagem: Benfica x Porto", "addon_required": "alavancagem", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Ajax x Feyenoord", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Dortmund x Leipzig", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null }
  ]
}
```
**Resumo:** 5 unlocked (basic + pro + ultra), 4 locked (add-ons)

---

### FREE + Alavancagem
```json
{
  "user_tier": "free",
  "allowed_tiers": ["free"],
  "active_addons": ["alavancagem"],
  "entries": [
    { "display_title": "Flamengo x Fluminense", "tier_required": "free", "locked": false, "display_market": "Resultado Final", "display_odd": 1.75 },
    { "display_title": "Corinthians x Santos", "tier_required": "free", "locked": false, "display_market": "Ambas Marcam", "display_odd": 1.85 },
    { "display_title": "Real Madrid x Barcelona", "tier_required": "basic", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Manchester City x Liverpool", "tier_required": "basic", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "PSG x Bayern", "tier_required": "pro", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Inter x Milan", "tier_required": "pro", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Juventus x Napoli", "tier_required": "ultra", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Alavancagem: Chelsea x Arsenal", "addon_required": "alavancagem", "locked": false, "display_market": "Stake 5x", "display_odd": 2.85 },
    { "display_title": "Alavancagem: Benfica x Porto", "addon_required": "alavancagem", "locked": false, "display_market": "Stake 3x", "display_odd": 2.15 },
    { "display_title": "Odds Altas: Ajax x Feyenoord", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null },
    { "display_title": "Odds Altas: Dortmund x Leipzig", "addon_required": "desaltas", "locked": true, "display_market": null, "display_odd": null }
  ]
}
```
**Resumo:** 4 unlocked (free + alavancagem), 7 locked

---

## Frontend - Como exibir

```tsx
// Exemplo de renderização
{entries.map(entry => (
  <EntryCard 
    key={entry.id}
    title={entry.display_title}
    market={entry.display_market}
    odd={entry.display_odd}
    locked={entry.locked}
    tierRequired={entry.tier_required}
    addonRequired={entry.addon_required}
  />
))}

// EntryCard.tsx
function EntryCard({ title, market, odd, locked, tierRequired, addonRequired }) {
  if (locked) {
    return (
      <div className="grayscale opacity-60 relative">
        <Lock className="absolute top-2 right-2" />
        <h3>{title}</h3>
        <p className="blur-sm">Conteúdo bloqueado</p>
        <Badge>{tierRequired.toUpperCase()}</Badge>
        {addonRequired && <Badge variant="outline">{addonRequired}</Badge>}
        <Button>Desbloquear</Button>
      </div>
    );
  }
  
  return (
    <div>
      <h3>{title}</h3>
      <p>{market}</p>
      <span>{odd}</span>
    </div>
  );
}
```

---

## Decisão de Design

**Usuários pagos NÃO veem entries FREE (nem locked):**
- Motivo: Não faz sentido mostrar conteúdo "inferior" bloqueado
- O usuário pago já tem acesso a conteúdo melhor
- Evita confusão na interface

**Entries de add-ons aparecem locked para todos que não têm o add-on:**
- Incentiva conversão para comprar o add-on
- Mostra o valor que está "perdendo"

---

## Arquivos do Frontend

### Estrutura de Arquivos

```
src/
├── lib/
│   ├── api.ts              # Cliente API (login, getMe, getEntries, trackEvent, sessions)
│   └── checkoutLinks.ts    # Map centralizado de links de checkout
├── hooks/
│   ├── useAuth.ts          # Hook de autenticação
│   ├── useSession.ts       # Hook de sessão (heartbeat)
│   ├── useEntries.ts       # Hook para buscar entries
│   └── useTracking.ts      # Hook de eventos
├── components/
│   ├── EntryCard.tsx       # Card de entrada (locked/unlocked)
│   └── PaywallPopup.tsx    # Popup de paywall para free users
└── pages/
    ├── Login.tsx           # Tela de login (usa nova API)
    └── Home.tsx            # Home com entries do dia
```

### Checkout Links (src/lib/checkoutLinks.ts)

```typescript
export const CHECKOUT_LINKS = {
  // Tier upgrade links
  upgrade_basic: 'https://checkout.premierfc.app/basic',
  upgrade_pro: 'https://checkout.premierfc.app/pro',
  upgrade_ultra: 'https://checkout.premierfc.app/ultra',
  
  // Add-on purchase links
  addon_alavancagem: 'https://checkout.premierfc.app/alavancagem',
  addon_desaltas: 'https://checkout.premierfc.app/desaltas',
  
  // Lifetime/Vitalício
  vitalicio: 'https://checkout.premierfc.app/vitalicio',
  
  // Default paywall
  paywall_default: 'https://checkout.premierfc.app',
};

// Helper para obter link de desbloqueio
export function getUnlockLink(tierRequired: string, addonRequired: string | null): string;
```

### EntryCard Component

```tsx
<EntryCard
  id={entry.id}
  display_title={entry.display_title}
  display_market={entry.display_market}
  display_odd={entry.display_odd}
  locked={entry.locked}
  tier_required={entry.tier_required}
  addon_required={entry.addon_required}
/>
```

**Comportamento:**
- `locked=false`: Card verde, mostra todos os dados
- `locked=true`: Card cinza (grayscale), cadeado, dados mascarados, botão "Desbloquear"
- Ao clicar "Desbloquear": dispara evento + abre checkout apropriado

---

## Eventos Rastreados

| Evento | Quando | Metadata |
|--------|--------|----------|
| `app_open` | Ao abrir o app logado | - |
| `view_entries` | Ao carregar entradas do dia | `{ date }` |
| `open_paywall_popup` | Ao abrir popup de paywall | - |
| `click_buy_from_popup` | Ao clicar "Assinar agora" no popup | - |
| `click_continue_free` | Ao clicar "Continuar gratuito" | - |
| `click_locked_entry` | Ao clicar "Desbloquear" em entry | `{ entry_id, tier_required, addon_required }` |
| `click_banner` | Ao clicar em banner | `{ banner_id }` |

---

## Sessões (Tempo no App)

```typescript
// Ao iniciar o app
POST /sessions { action: "start" }
// Retorna: { session_id: "uuid" }

// A cada 60 segundos
POST /sessions { action: "heartbeat", session_id: "uuid" }

// Ao fechar/sair (best-effort via sendBeacon)
POST /sessions { action: "end", session_id: "uuid" }
```

---

## LocalStorage Keys

| Key | Descrição |
|-----|-----------|
| `premier_token` | JWT token |
| `premier_user` | Dados do usuário (JSON) |
| `premier_access` | Permissões { tiers, addons } |
| `premier_show_paywall` | Flag para mostrar paywall |
| `premier_checkout_url` | URL do checkout para paywall |
| `premier_session_id` | ID da sessão atual |

---

## Fluxo de Autenticação

1. Usuário digita email na tela de Login
2. `POST /auth-login { email }` → retorna token + user + access
3. Salva em localStorage
4. Se `show_paywall_popup=true` → abre PaywallPopup
5. Usuário pode assinar ou continuar free
6. Navega para Home

## Fluxo de Entries

1. Home monta e chama `useEntries(today)`
2. `GET /entries?date=YYYY-MM-DD` com token
3. Retorna array com todas entries (locked/unlocked)
4. Renderiza EntryCard para cada entry
5. Cards locked têm botão "Desbloquear" que abre checkout

---

## Arquivos Atualizados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/entries/index.ts` | Lógica locked/unlocked |
| `supabase/functions/auth-login/index.ts` | Login com paywall flag |
| `src/lib/api.ts` | Cliente API completo |
| `src/lib/checkoutLinks.ts` | Map de links de checkout |
| `src/hooks/useAuth.ts` | Hook de autenticação |
| `src/hooks/useSession.ts` | Hook de sessão |
| `src/hooks/useEntries.ts` | Hook de entries |
| `src/components/EntryCard.tsx` | Card locked/unlocked |
| `src/components/PaywallPopup.tsx` | Popup de paywall |
| `src/pages/Login.tsx` | Tela de login (nova API) |
| `src/pages/Home.tsx` | Home com entries |
| `docs/BACKEND_API.md` | Esta documentação |
