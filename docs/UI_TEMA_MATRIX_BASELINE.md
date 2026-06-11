# UI / Tema baseline — "Matrix Premier FC"

> Snapshot do tema atual do app, salvo em **11/06/2026** ANTES da troca para o tema "Copa do Mundo".
> Serve como referência para restaurar a identidade visual original quando necessário.

---

## 1. Identidade geral

- **Nome interno do tema:** Matrix / Premier FC
- **Mood:** Hacker financeiro, escuro, neon verde, sensação de "terminal de apostas elite"
- **Background global do app:** `#060D1E` (azul-marinho quase preto)
- **Background dos cards:** `#112236`
- **Cor primária (CTAs, destaques, bordas vivas):** `#00FF7F` (verde Matrix / neon)
- **Cor secundária / luxo:** Dourado `#EAB308` (badges, achievements desbloqueadas)
- **Cor Ultra / VIP:** Roxo `#A855F7` / `hsl(263 90% 58%)`
- **Texturas de fundo:** padrão SVG triangular sutil + radial glow verde no topo
- **Efeito assinatura:** Matrix Rain (chuva de caracteres verdes) em telas de destaque

---

## 2. Tipografia

| Uso | Fonte | Peso |
|---|---|---|
| Títulos / display | **Barlow Condensed** | 600–900 |
| Corpo / UI | **DM Sans** | 300–600 |

Importadas via Google Fonts no topo de `src/index.css`.

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
```

---

## 3. Tokens de cor (HSL — `src/index.css`)

```css
:root {
  --background: 220 65% 7%;          /* #060D1E */
  --foreground: 210 17% 95%;

  --card: 215 35% 14%;               /* #112236 */
  --card-foreground: 210 17% 95%;

  --popover: 215 45% 10%;
  --popover-foreground: 210 17% 95%;

  --primary: 146 100% 50%;           /* #00FF7F verde Matrix */
  --primary-foreground: 0 0% 100%;

  --secondary: 146 100% 40%;
  --secondary-foreground: 0 0% 100%;

  --muted: 220 30% 12%;
  --muted-foreground: 218 11% 61%;

  --accent: 146 100% 50%;
  --accent-foreground: 0 0% 100%;

  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;

  --border: 220 30% 14%;
  --input: 220 30% 14%;
  --ring: 146 100% 50%;

  --success: 146 100% 50%;
  --warning: 42 88% 55%;
  --vip: 280 100% 60%;
  --ultra: 280 100% 60%;

  --radius: 0.75rem;

  --brand-green: 146 100% 50%;
  --brand-gold: 42 88% 55%;
  --brand-purple-ultra: 263 90% 58%;
  --card-bg: 215 35% 14%;
  --navy-dark: 220 65% 7%;

  --gradient-card: linear-gradient(135deg, hsl(215, 45%, 12%) 0%, hsl(220, 65%, 7%) 100%);
  --shadow-glow-primary: 0 0 20px hsl(146 100% 50% / 0.3);
  --shadow-glow-accent: 0 0 20px hsl(146 100% 50% / 0.2);
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

---

## 4. Background do body

```css
body {
  background-color: #060D1E;
  background-image:
    radial-gradient(circle at 50% 0%, rgba(0, 255, 127, 0.1) 0%, rgba(0, 255, 127, 0) 30%),
    url("data:image/svg+xml,%3Csvg width='40' height='40' ...%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E ...");
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
}
```

---

## 5. Animações / efeitos assinatura

Definidas em `src/index.css` e `tailwind.config.ts`:

- **`border-pulse`** — borda pulsante verde+azul (cards quentes / "Hot Entry Alert")
- **`telegramPulse`** — botão Telegram pulsando verde
- **`particle-rise`** — partículas verdes subindo (até 5 delays escalonados)
- **`lightning-strike`** — raio horizontal verde atravessando cards
- **`border-fire`** — gradiente verde/azul rotacionando em borda
- **`liquid-gold-bar`** — barra azul liquid metálica (`#000636 → #0033C6`)
- **`shimmer`** — brilho diagonal atravessando cards (3s)
- **`card-highlight-pulse`** — destaque do card Futebol na Home (5px borda verde pulsante)
- **`pulse-glow-green` / `pulse-glow`** — pulsar laranja/verde para CTAs urgentes
- **`lightTrailMove1` / `lightTrailMove2`** — trilhas de luz no fundo do login (24-28s)
- **Matrix Rain** — componente `<MatrixRain />` em telas selecionadas

---

## 6. Componentes-chave que carregam o tema

| Componente | Papel visual |
|---|---|
| `src/components/AppHeader.tsx` | Header unificado (pílulas CANAL / VITALÍCIO, logo) |
| `src/components/BottomNav.tsx` | Nav inferior, ícones brancos, ativo `#00FF7F`, backdrop-blur |
| `src/components/MatrixRain.tsx` | Chuva de código verde (assinatura visual) |
| `src/components/BackgroundLightTrail.tsx` | Trilhas de luz animadas no login |
| `src/components/EntryCard.tsx` / `BettingTipCard.tsx` | Cards de tips no padrão Matrix |
| `src/components/QuickAccessCards.tsx` | Cards de acesso rápido (1:1 quadrados) |
| `src/components/cards/CardType1Lateral.tsx` / `CardType2Top.tsx` | Cards dinâmicos da Home |
| `src/pages/Home.tsx` | Ordem fixa: Entradas → Acesso Rápido → Últimos Greens/Bilhetes |
| `src/pages/Login.tsx` | Fundo com light trails, logo Premier centralizada |

---

## 7. Assets de marca (em `src/assets/`)

- `premier-logo.svg` — logo oficial vetorial
- `premier-logo.png`, `premier-logo-new.png`, `premier-logo-new2.png`, `premier-logo-custom.png`
- `logo.jpg`
- `robo-premier.png` — mascote robô (usado em `AnimatedFootballIcon`)
- `robo-cassino.png` — mascote cassino
- `robot-football.png` — mascote AI Tipster
- `ia-tipster-cartoon.png`
- `selo-garantia-30.png`
- `formas-pagamento.png` / `.webp`
- `popups/` — imagens de popups promocionais

Logo de e-mail (CRM): `https://jdzndbkimjwtxpldmigi.supabase.co/storage/v1/object/public/email-assets/premier-logo.svg`

---

## 8. Paleta de tiers (cores fixas)

Definida em `src/lib/tierColors.ts`:

- **Free / Básico:** cinza
- **Pro:** verde primário `#00FF7F`
- **Ultra / VIP:** roxo `#A855F7`
- **Alavancagem:** laranja
- **Odds Altas:** dourado / amarelo
- **Vitalício:** dourado + selo especial

---

## 9. PWA / Branding sistema

- `theme-color` (HTML / manifest): `#060D1E`
- Ícones PWA: variantes do `premier-logo`
- Service Worker em `public/sw.js`

---

## 10. Como restaurar este tema

1. Reverter `src/index.css` para os tokens `--background: 220 65% 7%`, `--primary: 146 100% 50%` (este arquivo).
2. Reverter `tailwind.config.ts` para `fontFamily.display: Barlow Condensed` e `sans: DM Sans`.
3. Garantir `body` com background `#060D1E` + radial verde + padrão SVG.
4. Restaurar componentes `MatrixRain`, `BackgroundLightTrail` em Login/Home.
5. Manter logos originais em `src/assets/premier-logo*`.
6. `theme-color` no `index.html` = `#060D1E`.

---

**Arquivos de referência canônicos (NÃO sobrescrever sem precisar):**
- `src/index.css`
- `tailwind.config.ts`
- `src/components/AppHeader.tsx`
- `src/components/BottomNav.tsx`
- `src/pages/Home.tsx`
- `src/pages/Login.tsx`

Snapshot criado em 11/06/2026 antes da migração para o tema **Copa do Mundo**.
