import type { ChannelKey } from "./channels";
import type { TriggerKey } from "./triggers";

/**
 * Templates de jornada — agora canal único (uma jornada = um canal).
 * Cada template define `channel`, e todos os `steps[].channel` são iguais a ele.
 *
 * Não temos templates para `whatsapp` (canal parado) nem `popup`/`telegram_*`
 * por enquanto — só email, push e sms, que são os canais mais usados.
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
  /** Canal fixo deste template — todos os steps usam esse canal. */
  channel: ChannelKey;
  trigger_type: TriggerKey;
  trigger_config: Record<string, any>;
  steps: TemplateStep[];
}

// ============================================================
// Helpers para construção
// ============================================================
function emailStep(delay_value: number, subject: string, body: string): TemplateStep {
  return {
    channel: "email",
    delay_value,
    delay_unit: "day",
    content: { subject, body },
  };
}

function pushStep(delay_value: number, title: string, body: string): TemplateStep {
  return {
    channel: "push",
    delay_value,
    delay_unit: "day",
    content: { title, body },
  };
}

function smsStep(delay_value: number, body: string): TemplateStep {
  return {
    channel: "sms",
    delay_value,
    delay_unit: "day",
    content: { body },
  };
}

// ============================================================
// Templates
// ============================================================
export const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  // ---------- ONBOARDING ----------
  {
    key: "onboarding_email",
    name: "Onboarding (Email)",
    description: "Recepção de novos cadastros por email: boas-vindas + check-in na primeira semana.",
    channel: "email",
    trigger_type: "onboarding",
    trigger_config: {},
    steps: [
      emailStep(
        0,
        "Bem-vindo(a) ao Premier, {nome} 🚀",
        "Oi {nome}!\n\nQue bom ter você aqui. O Premier foi feito pra te dar uma vantagem real nas suas apostas.\n\n" +
          "Você já pode acessar sua área completa de tips, análises e ferramentas.\n\n" +
          "Se tiver qualquer dúvida, é só responder este email.\n\nNos vemos lá!\n— Time Premier"
      ),
      emailStep(
        3,
        "Dica rápida: como tirar o máximo do Premier",
        "Oi {nome},\n\nTrês coisas que valem a pena experimentar nessa primeira semana:\n\n" +
          "1. Filtro de odds altas — encontre valor em segundos\n" +
          "2. IA Tipster — peça análise sob demanda\n" +
          "3. Notificações em tempo real — não perca tip de última hora\n\n— Time Premier"
      ),
      emailStep(
        7,
        "Sua primeira semana no Premier — recap",
        "Oi {nome},\n\nUma semana de Premier, e a gente queria saber o que você achou até aqui.\n\n" +
          "Plano atual: {plano}\nDias com a gente: 7\n\n" +
          "Se ainda tá explorando, esse é um bom momento pra dar uma volta nas seções de odds altas e IA Tipster.\n\n" +
          "Bora pra próxima semana!\n— Time Premier"
      ),
    ],
  },
  {
    key: "onboarding_push",
    name: "Onboarding (Push)",
    description: "Recepção de novos cadastros por push: boas-vindas curto + lembretes na primeira semana.",
    channel: "push",
    trigger_type: "onboarding",
    trigger_config: {},
    steps: [
      pushStep(0, "Bem-vindo(a) ao Premier 🚀", "Suas tips e análises já estão liberadas. Toque pra explorar."),
      pushStep(1, "Você ainda não voltou hoje 👀", "Tem análise nova esperando você. Toque pra ver."),
      pushStep(7, "Uma semana com a gente 🎯", "Bora ver o que rolou de melhor essa semana?"),
    ],
  },

  // ---------- UPGRADE ----------
  {
    key: "upgrade_email",
    name: "Upgrade confirmado (Email)",
    description: "Recepção pós-upgrade por email: confirmação + tutorial em 5 dias.",
    channel: "email",
    trigger_type: "upgrade",
    trigger_config: {},
    steps: [
      emailStep(
        0,
        "Seu upgrade foi confirmado, {nome} 🎉",
        "Oi {nome}!\n\nSeu plano agora é {plano}. Acesso liberado pra todas as features premium.\n\n" +
          "O que você pode fazer agora:\n• IA Tipster com créditos ampliados\n• Alertas em tempo real\n• Dashboard com odds altas exclusivas\n\nBons jogos!\n— Time Premier"
      ),
      emailStep(
        5,
        "Tutorial: tirando o máximo do seu {plano}",
        "Oi {nome},\n\nUma semana de plano {plano} e a gente preparou um guia rápido com as features que mais geram resultado:\n\n" +
          "1. Filtro de odds altas — encontre valor em segundos\n2. IA Tipster — peça análise sob demanda\n3. Notificações em tempo real — não perca tip de última hora\n\nQualquer dúvida é só responder.\n— Time Premier"
      ),
    ],
  },
  {
    key: "upgrade_push",
    name: "Upgrade confirmado (Push)",
    description: "Confirmação + reminder de features pelo push.",
    channel: "push",
    trigger_type: "upgrade",
    trigger_config: {},
    steps: [
      pushStep(0, "Upgrade confirmado 🎉", "Seu plano {plano} já tá ativo. Toque e aproveita."),
      pushStep(1, "Já experimentou seu plano novo? 🎯", "Tem features que você ainda não testou. Toque pra ver."),
    ],
  },

  // ---------- CHURN ----------
  {
    key: "churn_reactivation_email",
    name: "Reativação de churn (Email)",
    description: "Email pra quem ficou inativo (padrão: 7 dias sem login).",
    channel: "email",
    trigger_type: "churn_inactive",
    trigger_config: { days_inactive: 7 },
    steps: [
      emailStep(
        0,
        "{nome}, você ainda tá com a gente?",
        "Oi {nome},\n\nA gente notou que faz uns dias que você não acessa o Premier.\n\n" +
          "Nessa semana rolou:\n• Várias odds altas valendo a pena\n• Updates no IA Tipster\n• Greens novos no histórico\n\n" +
          "Que tal dar uma passada e ver o que tá em alta agora?\n\n— Time Premier"
      ),
      emailStep(
        7,
        "Última chamada — a gente quer te ter de volta",
        "Oi {nome},\n\nFaz quase duas semanas que não te vemos. Se tem algo travando seu acesso ou precisa de ajuda, é só responder este email.\n\nA gente quer te ter de volta.\n\n— Time Premier"
      ),
    ],
  },
  {
    key: "churn_reactivation_push",
    name: "Reativação de churn (Push)",
    description: "Push pra quem ficou inativo (padrão: 7 dias sem login).",
    channel: "push",
    trigger_type: "churn_inactive",
    trigger_config: { days_inactive: 7 },
    steps: [
      pushStep(0, "Tá perdendo as tips, {nome}", "Faz {dias_sem_login} dias que você não dá uma passada. Toque e volte pro jogo."),
      pushStep(7, "Voltamos com novidades 👀", "Atualizações no IA Tipster e novas tips esperando você."),
    ],
  },
  {
    key: "churn_reactivation_sms",
    name: "Reativação de churn (SMS)",
    description: "SMS curto pra quem ficou inativo.",
    channel: "sms",
    trigger_type: "churn_inactive",
    trigger_config: { days_inactive: 7 },
    steps: [
      smsStep(0, "Premier: {nome}, faz dias que não te vemos. Volta lá: tem tip nova esperando."),
      smsStep(10, "Premier: a gente quer te ter de volta, {nome}. Acesse e veja as novidades."),
    ],
  },
];

/**
 * Helper pra encontrar template pelo key.
 */
export function getTemplate(key: string): JourneyTemplate | undefined {
  return JOURNEY_TEMPLATES.find((t) => t.key === key);
}
