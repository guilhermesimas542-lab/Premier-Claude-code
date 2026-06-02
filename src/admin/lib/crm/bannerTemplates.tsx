// ============================================================
// bannerTemplates — catálogo de modelos de banner usados pelo
// ImageComposer. Cada modelo expõe um React component (render) que
// recebe os valores preenchidos pelo operador e desenha o banner
// num <div> que depois é capturado em PNG por html2canvas.
//
// Dimensões recomendadas por canal:
//   - push:           1024 × 512   (paisagem, modo expandido Android)
//   - popup:          1080 × 1350  (retrato 4:5, banner in-app)
//   - email:           600 × 314   (header inline em emails — máx 600px)
//   - telegram_group: 1080 × 1080  (quadrado, ótimo no balão do Telegram)
//   - telegram_x1:    1080 × 1080
//
// Modelos disponíveis:
//   promo_odds, boas_vindas, reativacao, evento_jogo, generico
// ============================================================

import type { CSSProperties, ReactNode } from "react";
import type { ChannelKey } from "./channels";

export type BannerChannelKey = Extract<
  ChannelKey,
  "email" | "push" | "popup" | "telegram_group" | "telegram_x1"
>;

export interface BannerFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "color" | "image";
  placeholder?: string;
  default?: string;
  optional?: boolean;
}

export interface BannerValues {
  title?: string;
  subtitle?: string;
  cta?: string;
  accent_color?: string;
  logo_url?: string;
  bg_image_url?: string;
  [key: string]: string | undefined;
}

export interface BannerTemplate {
  key: string;
  name: string;
  description: string;
  fields: BannerFieldDef[];
  defaults: BannerValues;
  /** Renderiza o banner num nó capturável pelo html2canvas. */
  render: (props: { values: BannerValues; width: number; height: number }) => ReactNode;
}

// Tamanhos recomendados (largura, altura em px) por canal.
export const CHANNEL_BANNER_SIZE: Record<BannerChannelKey, { w: number; h: number; label: string }> = {
  push: { w: 1024, h: 512, label: "1024×512 — banner do push (Android expandido)" },
  popup: { w: 1080, h: 1350, label: "1080×1350 — banner do popup (4:5)" },
  email: { w: 600, h: 314, label: "600×314 — header de email (máx 600px)" },
  telegram_group: { w: 1080, h: 1080, label: "1080×1080 — foto do Telegram (quadrado)" },
  telegram_x1: { w: 1080, h: 1080, label: "1080×1080 — foto do Telegram (quadrado)" },
};

export function getCanvasSize(channel: BannerChannelKey): { w: number; h: number } {
  return CHANNEL_BANNER_SIZE[channel];
}

// ============================================================
// Cores e helpers comuns
// ============================================================

const PREMIER_BG = "#060D1E";
const PREMIER_CARD = "#112236";
const PREMIER_GREEN = "#00FF7F";

const TITLE_FONT = "'Barlow Condensed', Impact, sans-serif";
const BODY_FONT = "'DM Sans', Inter, system-ui, sans-serif";

function bgStyle(values: BannerValues): CSSProperties {
  if (values.bg_image_url) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(6,13,30,0.55) 0%, rgba(6,13,30,0.85) 100%), url("${values.bg_image_url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: PREMIER_BG };
}

// ============================================================
// Render dos 5 modelos
// ============================================================

function PromoOddsBanner({ values, width, height }: { values: BannerValues; width: number; height: number }) {
  const accent = values.accent_color || PREMIER_GREEN;
  const scale = Math.min(width, height) / 600;
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        fontFamily: BODY_FONT,
        ...bgStyle(values),
        padding: `${48 * scale}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: width * 0.55,
          height: "100%",
          background: `linear-gradient(135deg, ${accent}00, ${accent}33)`,
          clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0% 100%)",
        }}
      />
      <div
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          padding: `${10 * scale}px ${20 * scale}px`,
          background: accent,
          color: "#0a0a0a",
          fontWeight: 900,
          fontSize: `${22 * scale}px`,
          letterSpacing: `${2 * scale}px`,
          textTransform: "uppercase",
          borderRadius: `${6 * scale}px`,
          marginBottom: `${24 * scale}px`,
        }}
      >
        Odds Altas
      </div>
      <h1
        style={{
          fontFamily: TITLE_FONT,
          fontSize: `${88 * scale}px`,
          fontWeight: 900,
          lineHeight: 0.95,
          textTransform: "uppercase",
          margin: 0,
          letterSpacing: `${-1 * scale}px`,
        }}
      >
        {values.title || "ODDS DE 5.0+ HOJE"}
      </h1>
      {values.subtitle && (
        <p
          style={{
            fontSize: `${28 * scale}px`,
            marginTop: `${20 * scale}px`,
            color: "#cbd5e1",
            maxWidth: "85%",
          }}
        >
          {values.subtitle}
        </p>
      )}
      {values.cta && (
        <div
          style={{
            marginTop: `${28 * scale}px`,
            alignSelf: "flex-start",
            background: "#fff",
            color: "#0a0a0a",
            padding: `${16 * scale}px ${32 * scale}px`,
            fontWeight: 800,
            fontSize: `${22 * scale}px`,
            borderRadius: `${999 * scale}px`,
            textTransform: "uppercase",
            letterSpacing: `${1.5 * scale}px`,
          }}
        >
          {values.cta}
        </div>
      )}
    </div>
  );
}

function BoasVindasBanner({ values, width, height }: { values: BannerValues; width: number; height: number }) {
  const accent = values.accent_color || PREMIER_GREEN;
  const scale = Math.min(width, height) / 600;
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        fontFamily: BODY_FONT,
        ...bgStyle(values),
        padding: `${56 * scale}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: `${110 * scale}px`,
          height: `${110 * scale}px`,
          borderRadius: "50%",
          background: accent,
          color: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: TITLE_FONT,
          fontWeight: 900,
          fontSize: `${64 * scale}px`,
          marginBottom: `${28 * scale}px`,
        }}
      >
        P
      </div>
      <h1
        style={{
          fontFamily: TITLE_FONT,
          fontSize: `${72 * scale}px`,
          fontWeight: 900,
          textTransform: "uppercase",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {values.title || "BEM-VINDO À PREMIER"}
      </h1>
      <p style={{ fontSize: `${26 * scale}px`, marginTop: `${20 * scale}px`, color: "#cbd5e1", maxWidth: "90%" }}>
        {values.subtitle || "Sua jornada de apostas inteligentes começa agora."}
      </p>
      {values.cta && (
        <div
          style={{
            marginTop: `${32 * scale}px`,
            background: accent,
            color: "#0a0a0a",
            padding: `${16 * scale}px ${36 * scale}px`,
            fontWeight: 800,
            fontSize: `${24 * scale}px`,
            borderRadius: `${999 * scale}px`,
            textTransform: "uppercase",
            letterSpacing: `${1.5 * scale}px`,
          }}
        >
          {values.cta}
        </div>
      )}
    </div>
  );
}

function ReativacaoBanner({ values, width, height }: { values: BannerValues; width: number; height: number }) {
  const accent = values.accent_color || "#FF6B35";
  const scale = Math.min(width, height) / 600;
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        fontFamily: BODY_FONT,
        ...bgStyle(values),
        padding: `${48 * scale}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          padding: `${10 * scale}px ${20 * scale}px`,
          background: accent,
          color: "#fff",
          fontWeight: 900,
          fontSize: `${20 * scale}px`,
          letterSpacing: `${2 * scale}px`,
          textTransform: "uppercase",
          borderRadius: `${6 * scale}px`,
          marginBottom: `${24 * scale}px`,
        }}
      >
        Sentimos sua falta
      </div>
      <h1
        style={{
          fontFamily: TITLE_FONT,
          fontSize: `${78 * scale}px`,
          fontWeight: 900,
          lineHeight: 0.95,
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {values.title || "VOLTA, A GENTE TEM\nNOVIDADE."}
      </h1>
      {values.subtitle && (
        <p style={{ fontSize: `${26 * scale}px`, marginTop: `${20 * scale}px`, color: "#e2e8f0" }}>
          {values.subtitle}
        </p>
      )}
      {values.cta && (
        <div
          style={{
            marginTop: `${28 * scale}px`,
            alignSelf: "flex-start",
            background: "#fff",
            color: "#0a0a0a",
            padding: `${16 * scale}px ${32 * scale}px`,
            fontWeight: 800,
            fontSize: `${22 * scale}px`,
            borderRadius: `${999 * scale}px`,
            textTransform: "uppercase",
          }}
        >
          {values.cta}
        </div>
      )}
    </div>
  );
}

function EventoJogoBanner({ values, width, height }: { values: BannerValues; width: number; height: number }) {
  const accent = values.accent_color || PREMIER_GREEN;
  const scale = Math.min(width, height) / 600;
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        fontFamily: BODY_FONT,
        ...bgStyle(values),
        padding: `${48 * scale}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: `${22 * scale}px`,
          letterSpacing: `${4 * scale}px`,
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
          marginBottom: `${16 * scale}px`,
        }}
      >
        {values.subtitle || "HOJE • 21H30"}
      </div>
      <h1
        style={{
          fontFamily: TITLE_FONT,
          fontSize: `${90 * scale}px`,
          fontWeight: 900,
          textTransform: "uppercase",
          margin: 0,
          lineHeight: 0.95,
        }}
      >
        {values.title || "FLAMENGO X PALMEIRAS"}
      </h1>
      <div
        style={{
          marginTop: `${32 * scale}px`,
          padding: `${14 * scale}px ${28 * scale}px`,
          background: PREMIER_CARD,
          border: `${2 * scale}px solid ${accent}`,
          borderRadius: `${12 * scale}px`,
          fontSize: `${24 * scale}px`,
          fontWeight: 700,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: `${1.5 * scale}px`,
        }}
      >
        {values.cta || "VER ANÁLISE COMPLETA"}
      </div>
    </div>
  );
}

function GenericoBanner({ values, width, height }: { values: BannerValues; width: number; height: number }) {
  const accent = values.accent_color || PREMIER_GREEN;
  const scale = Math.min(width, height) / 600;
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        fontFamily: BODY_FONT,
        ...bgStyle(values),
        padding: `${56 * scale}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ height: `${4 * scale}px`, width: `${80 * scale}px`, background: accent, marginBottom: `${20 * scale}px` }} />
      <h1
        style={{
          fontFamily: TITLE_FONT,
          fontSize: `${72 * scale}px`,
          fontWeight: 900,
          textTransform: "uppercase",
          margin: 0,
          lineHeight: 0.95,
        }}
      >
        {values.title || "PREMIER FC"}
      </h1>
      {values.subtitle && (
        <p style={{ fontSize: `${24 * scale}px`, marginTop: `${16 * scale}px`, color: "#cbd5e1", maxWidth: "80%" }}>
          {values.subtitle}
        </p>
      )}
      {values.cta && (
        <div
          style={{
            marginTop: `${24 * scale}px`,
            alignSelf: "flex-start",
            background: accent,
            color: "#0a0a0a",
            padding: `${14 * scale}px ${28 * scale}px`,
            fontWeight: 800,
            fontSize: `${20 * scale}px`,
            borderRadius: `${999 * scale}px`,
            textTransform: "uppercase",
          }}
        >
          {values.cta}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Catálogo
// ============================================================

const COMMON_FIELDS: BannerFieldDef[] = [
  { key: "title", label: "Título", type: "text", placeholder: "Frase principal", default: "" },
  { key: "subtitle", label: "Subtítulo / chamada", type: "textarea", placeholder: "Frase de apoio (opcional)", optional: true, default: "" },
  { key: "cta", label: "Texto do botão (opcional)", type: "text", placeholder: "Ex: QUERO VER", optional: true, default: "" },
  { key: "accent_color", label: "Cor de destaque", type: "color", default: PREMIER_GREEN },
  { key: "bg_image_url", label: "Imagem de fundo (URL ou upload)", type: "image", optional: true, default: "" },
];

export const BANNER_TEMPLATES: BannerTemplate[] = [
  {
    key: "promo_odds",
    name: "Promo de Odds Altas",
    description: "Banner agressivo pra promo de odds altas / casino.",
    fields: COMMON_FIELDS,
    defaults: { title: "ODDS DE 5.0+ HOJE", subtitle: "Análise completa liberada agora.", cta: "VER AGORA", accent_color: PREMIER_GREEN },
    render: PromoOddsBanner,
  },
  {
    key: "boas_vindas",
    name: "Boas-vindas",
    description: "Banner de boas-vindas / onboarding.",
    fields: COMMON_FIELDS,
    defaults: { title: "BEM-VINDO À PREMIER", subtitle: "Sua jornada começa agora.", cta: "COMEÇAR", accent_color: PREMIER_GREEN },
    render: BoasVindasBanner,
  },
  {
    key: "reativacao",
    name: "Reativação (churn)",
    description: "Banner pra reativar quem sumiu há dias.",
    fields: COMMON_FIELDS,
    defaults: { title: "VOLTA, A GENTE TEM NOVIDADE.", subtitle: "Análises novas todos os dias.", cta: "REATIVAR", accent_color: "#FF6B35" },
    render: ReativacaoBanner,
  },
  {
    key: "evento_jogo",
    name: "Evento / Jogo",
    description: "Banner anunciando um jogo ou campeonato.",
    fields: COMMON_FIELDS,
    defaults: { title: "FLAMENGO X PALMEIRAS", subtitle: "HOJE • 21H30", cta: "VER ANÁLISE", accent_color: PREMIER_GREEN },
    render: EventoJogoBanner,
  },
  {
    key: "generico",
    name: "Genérico",
    description: "Banner limpo, serve pra qualquer comunicação.",
    fields: COMMON_FIELDS,
    defaults: { title: "PREMIER FC", subtitle: "", cta: "", accent_color: PREMIER_GREEN },
    render: GenericoBanner,
  },
];

export function getTemplate(key: string): BannerTemplate {
  return BANNER_TEMPLATES.find((t) => t.key === key) ?? BANNER_TEMPLATES[0];
}

export const SUPPORTED_BANNER_CHANNELS: BannerChannelKey[] = [
  "email",
  "push",
  "popup",
  "telegram_group",
  "telegram_x1",
];

export function isImageSupportedChannel(channel: ChannelKey): channel is BannerChannelKey {
  return (SUPPORTED_BANNER_CHANNELS as ChannelKey[]).includes(channel);
}
