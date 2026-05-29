import type { ChannelKey } from "./channels";
import type { TriggerKey } from "./triggers";

/**
 * Definição das 3 jornadas template do brief original
 * (PRD seção 6 sub-fase 2.6 e seção 10 anexo brief).
 *
 * Cada template = 1 journey + N steps. Conteúdo pré-preenchido pra demo,
 * editável depois pelo builder.
 */

export type DelayUnit = "minute" | "hour" | "day" | "week";

export interface TemplateStep {
  channel: ChannelKey;
  content: Record<string, any>;
  delay_value: number;
  delay_unit: DelayUnit;
}

export interface JourneyTemplate {
  key: string;
  name: string;
  description: string;
  trigger_type: TriggerKey;
  trigger_config: Record<string, any>;
  steps: TemplateStep[];
}

export const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  {
    key: "onboarding",
    name: "Onboarding",
    description:
      "Recepção de novos cadastros: boas-vindas, lembrete, conversa próxima e check-in na primeira semana.",
    trigger_type: "onboarding",
    trigger_config: {},
    steps: [
      {
        channel: "email",
        delay_value: 0,
        delay_unit: "day",
        content: {
          subject: "Bem-vindo(a) ao Premier, {nome} 🚀",
          body:
            "Oi {nome}!\n\nQue bom ter você aqui. O Premier foi feito pra te dar uma vantagem real nas suas apostas.\n\n" +
            "Você já pode acessar sua área completa de tips, análises e ferramentas.\n\n" +
            "Se tiver qualquer dúvida, é só responder este email.\n\nNos vemos lá!\n— Time Premier",
        },
      },
      {
        channel: "push",
        delay_value: 1,
        delay_unit: "day",
        content: {
          title: "Você ainda não voltou hoje 👀",
          body: "Tem análise nova esperando você. Toque pra ver.",
        },
      },
      {
        channel: "whatsapp",
        delay_value: 3,
        delay_unit: "day",
        content: {
          body:
            "Oi {nome}! Aqui é do time Premier 👋\n\n" +
            "Tô só passando pra ver se você tá curtindo a plataforma e se conseguiu acessar as tips de hoje.\n\n" +
            "Qualquer coisa que precisar é só falar aqui.",
        },
      },
      {
        channel: "email",
        delay_value: 7,
        delay_unit: "day",
        content: {
          subject: "Sua primeira semana no Premier — recap",
          body:
            "Oi {nome},\n\nUma semana de Premier, e a gente queria saber o que você achou até aqui.\n\n" +
            "Plano atual: {plano}\nDias com a gente: 7\n\n" +
            "Se ainda tá explorando, esse é um bom momento pra dar uma volta nas seções de odds altas e IA Tipster.\n\n" +
            "Bora pra próxima semana!\n— Time Premier",
        },
      },
    ],
  },
  {
    key: "upgrade",
    name: "Upgrade confirmado",
    description:
      "Recepção pós-upgrade de plano: confirmação, próximos passos e tutorial.",
    trigger_type: "upgrade",
    trigger_config: {},
    steps: [
      {
        channel: "email",
        delay_value: 0,
        delay_unit: "day",
        content: {
          subject: "Seu upgrade foi confirmado, {nome} 🎉",
          body:
            "Oi {nome}!\n\nSeu plano agora é {plano}. Acesso liberado pra todas as features premium.\n\n" +
            "O que você pode fazer agora:\n• IA Tipster com créditos ampliados\n• Alertas em tempo real\n• Dashboard com odds altas exclusivas\n\nBons jogos!\n— Time Premier",
        },
      },
      {
        channel: "push",
        delay_value: 1,
        delay_unit: "day",
        content: {
          title: "Já experimentou seu plano novo? 🎯",
          body: "Tem features que você ainda não testou. Toque pra ver.",
        },
      },
      {
        channel: "email",
        delay_value: 5,
        delay_unit: "day",
        content: {
          subject: "Tutorial: tirando o máximo do seu {plano}",
          body:
            "Oi {nome},\n\nUma semana de plano {plano} e a gente preparou um guia rápido com as features que mais geram resultado:\n\n" +
            "1. Filtro de odds altas — encontre valor em segundos\n2. IA Tipster — peça análise sob demanda\n3. Notificações em tempo real — não perca tip de última hora\n\nQualquer dúvida é só responder.\n— Time Premier",
        },
      },
    ],
  },
  {
    key: "churn_reactivation",
    name: "Reativação de churn",
    description:
      "Recupera leads que ficaram inativos. Trigger configurável (padrão: 7 dias sem login).",
    trigger_type: "churn_inactive",
    trigger_config: { days_inactive: 7 },
    steps: [
      {
        channel: "push",
        delay_value: 0,
        delay_unit: "day",
        content: {
          title: "Tá perdendo as tips, {nome}",
          body: "Faz {dias_sem_login} dias que você não dá uma passada. Toque e volte pro jogo.",
        },
      },
      {
        channel: "email",
        delay_value: 7,
        delay_unit: "day",
        content: {
          subject: "{nome}, você ainda tá com a gente?",
          body:
            "Oi {nome},\n\nA gente notou que faz uns dias que você não acessa o Premier.\n\n" +
            "Nessa semana rolou:\n• Várias odds altas valendo a pena\n• Updates no IA Tipster\n• Greens novos no histórico\n\n" +
            "Que tal dar uma passada e ver o que tá em alta agora?\n\n— Time Premier",
        },
      },
      {
        channel: "whatsapp",
        delay_value: 16,
        delay_unit: "day",
        content: {
          body:
            "Oi {nome} 👋 Aqui é do Premier.\n\nFaz quase um mês que a gente não te vê. Tá tudo bem? Se tiver algo travando seu acesso ou se precisa de ajuda, é só falar aqui.\n\nA gente quer te ter de volta.",
        },
      },
    ],
  },
];

/**
 * Helper pra encontrar template pelo key.
 */
export function getTemplate(key: string): JourneyTemplate | undefined {
  return JOURNEY_TEMPLATES.find((t) => t.key === key);
}
