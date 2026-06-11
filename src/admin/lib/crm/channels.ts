import {
  Mail,
  MessageSquare,
  Send,
  Users2,
  MessageCircle,
  Smartphone,
  LayoutTemplate,
  type LucideIcon,
} from "lucide-react";

/**
 * Identificador canônico dos 7 canais (mesmos valores do CHECK constraint em crm_schedules).
 */
export type ChannelKey =
  | "email"
  | "sms"
  | "telegram_group"
  | "telegram_x1"
  | "whatsapp"
  | "push"
  | "popup";

export interface ChannelConfig {
  key: ChannelKey;
  label: string;
  shortLabel: string;
  provider: string;
  icon: LucideIcon;
  /** Cor de destaque pra badges/chips. */
  color: string;
  /** Suporta segmentação por cliente? Telegram x1 = false (broadcast geral). */
  supportsFilter: boolean;
  /** Suporta builder HTML (Nano Banana)? Só Email e Popup. */
  supportsHtmlBuilder: boolean;
  /** Integração definida e ativa? Push e Popup ainda pending por padrão. */
  integrationStatus: "active" | "config_needed" | "blocked";
  /** Mensagem opcional pra exibir como aviso quando o canal é selecionado. */
  warning?: string;
}

/**
 * Catálogo central dos canais — fonte única de verdade pra UI.
 * Use CHANNELS[key] pra recuperar config ou CHANNEL_LIST pra iterar.
 */
export const CHANNELS: Record<ChannelKey, ChannelConfig> = {
  email: {
    key: "email",
    label: "Email",
    shortLabel: "Email",
    provider: "Resend",
    icon: Mail,
    color: "#60A5FA",
    supportsFilter: true,
    supportsHtmlBuilder: true,
    integrationStatus: "config_needed",
  },
  sms: {
    key: "sms",
    label: "SMS",
    shortLabel: "SMS",
    provider: "Comtele",
    icon: MessageSquare,
    color: "#FACC15",
    supportsFilter: true,
    supportsHtmlBuilder: false,
    integrationStatus: "active",
  },
  telegram_group: {
    key: "telegram_group",
    label: "Telegram (grupo)",
    shortLabel: "Tel. grupo",
    provider: "Telegram Direto",
    icon: Users2,
    color: "#0EA5E9",
    supportsFilter: true,
    supportsHtmlBuilder: false,
    integrationStatus: "config_needed",
  },
  telegram_x1: {
    key: "telegram_x1",
    label: "Telegram (x1)",
    shortLabel: "Tel. x1",
    provider: "SendPulse",
    icon: Send,
    color: "#38BDF8",
    supportsFilter: false,
    supportsHtmlBuilder: false,
    integrationStatus: "config_needed",
    warning:
      "Este canal não suporta filtro por cliente. A mensagem será enviada para toda a base SendPulse.",
  },
  whatsapp: {
    key: "whatsapp",
    label: "WhatsApp",
    shortLabel: "WhatsApp",
    provider: "API Oficial",
    icon: MessageCircle,
    color: "#22C55E",
    supportsFilter: true,
    supportsHtmlBuilder: false,
    integrationStatus: "config_needed",
  },
  push: {
    key: "push",
    label: "Push (app)",
    shortLabel: "Push",
    provider: "Web Push (VAPID)",
    icon: Smartphone,
    color: "#A855F7",
    supportsFilter: true,
    supportsHtmlBuilder: false,
    integrationStatus: "active",
  },
  popup: {
    key: "popup",
    label: "Popup in-app",
    shortLabel: "Popup",
    provider: "Popup interno (FunnelPopup)",
    icon: LayoutTemplate,
    color: "#F472B6",
    supportsFilter: true,
    supportsHtmlBuilder: true,
    integrationStatus: "active",
  },
};

export const CHANNEL_LIST: ChannelConfig[] = Object.values(CHANNELS);

/**
 * Status do schedule (mesmos valores do CHECK constraint em crm_schedules.status).
 */
export type ScheduleStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "paused";

export const SCHEDULE_STATUS_META: Record<
  ScheduleStatus,
  { label: string; color: string; description: string }
> = {
  draft: { label: "Rascunho", color: "#94A3B8", description: "Em edição, não disparado" },
  scheduled: { label: "Agendado", color: "#60A5FA", description: "Configurado pra envio futuro" },
  sending: { label: "Enviando", color: "#FACC15", description: "Processando disparos" },
  sent: { label: "Enviado", color: "#22C55E", description: "Disparo concluído" },
  failed: { label: "Falhou", color: "#EF4444", description: "Erro na integração com o canal" },
  paused: { label: "Pausado", color: "#A855F7", description: "Interrompido manualmente" },
};
