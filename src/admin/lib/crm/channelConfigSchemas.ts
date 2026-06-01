import type { ChannelKey } from "./channels";

/**
 * Schema de configuração por canal — quais campos o form deve renderizar
 * e quais hints o usuário precisa ver pra cadastrar credenciais.
 *
 * Mock-first: nenhum valor é validado contra o provider real.
 */

export type ConfigFieldType = "text" | "password" | "email" | "url" | "tel";

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export interface ChannelConfigSchema {
  fields: ConfigField[];
  /** Tip a mostrar no topo do card sobre como obter credenciais. */
  providerHint?: string;
  /** Documentação útil quando rolar a integração real (Pilar 4). */
  docsUrl?: string;
}

export const CHANNEL_CONFIG_SCHEMAS: Record<ChannelKey, ChannelConfigSchema> = {
  email: {
    providerHint:
      "Resend é o provider de email. Você precisa criar uma conta, verificar um domínio e gerar uma API key.",
    docsUrl: "https://resend.com/docs",
    fields: [
      {
        key: "api_key",
        label: "Resend API Key",
        type: "password",
        placeholder: "re_xxxxxxxxxxxxxxxxxxxxxxxxxx",
        required: true,
      },
      {
        key: "from_email",
        label: "Email remetente",
        type: "email",
        placeholder: "noreply@seudominio.com",
        hint: "Precisa ser de um domínio verificado no Resend.",
        required: true,
      },
      {
        key: "from_name",
        label: "Nome remetente",
        type: "text",
        placeholder: "Premier FC",
      },
      {
        key: "reply_to",
        label: "Email de resposta (opcional)",
        type: "email",
        placeholder: "suporte@seudominio.com",
      },
    ],
  },
  sms: {
    providerHint:
      "SMS Dev (smsdev.com.br) — pegue a Key em Minha Conta no painel.",
    fields: [
      {
        key: "api_key",
        label: "SMS Dev — Chave de API (Key)",
        type: "password",
        placeholder: "",
        required: true,
      },
    ],
  },
  telegram_group: {
    providerHint:
      "Telegram direto via bot. Crie um bot no @BotFather, adicione ao grupo como admin e copie o token + ID do grupo.",
    fields: [
      {
        key: "bot_token",
        label: "Bot Token",
        type: "password",
        placeholder: "123456789:ABCdef...",
        required: true,
      },
      {
        key: "chat_id",
        label: "ID do grupo",
        type: "text",
        placeholder: "-1001234567890",
        hint: "Use @getidsbot pra descobrir o ID do grupo.",
        required: true,
      },
    ],
  },
  telegram_x1: {
    providerHint:
      "SendPulse cuida do broadcast 1-a-1 no Telegram. Crie conta, copie API ID e Secret.",
    fields: [
      {
        key: "api_id",
        label: "SendPulse API ID",
        type: "password",
        required: true,
      },
      {
        key: "api_secret",
        label: "SendPulse API Secret",
        type: "password",
        required: true,
      },
      {
        key: "channel_id",
        label: "ID do canal SendPulse",
        type: "text",
        hint: "Identificador do canal Telegram x1 dentro da SendPulse.",
      },
    ],
  },
  whatsapp: {
    providerHint:
      "WhatsApp Business API oficial. Aprovação demorada — números verificados via Meta Business.",
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
    fields: [
      {
        key: "phone_number_id",
        label: "Phone Number ID",
        type: "text",
        required: true,
      },
      {
        key: "access_token",
        label: "Access Token",
        type: "password",
        placeholder: "EAAxxxxxxxxx",
        required: true,
      },
      {
        key: "business_account_id",
        label: "Business Account ID",
        type: "text",
      },
    ],
  },
  push: {
    providerHint:
      "Web Push via VAPID (RFC 8291/8292). As chaves VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT já estão configuradas nas env secrets — nenhum campo adicional é necessário aqui.",
    fields: [],
  },
  popup: {
    providerHint:
      "Popup in-app é renderizado pelo próprio frontend Premier. Sem provider externo, mas dá pra configurar limites globais.",
    fields: [
      {
        key: "max_per_session",
        label: "Máximo de popups por sessão",
        type: "text",
        placeholder: "1",
      },
      {
        key: "cooldown_minutes",
        label: "Cooldown entre popups (min)",
        type: "text",
        placeholder: "15",
      },
    ],
  },
};
