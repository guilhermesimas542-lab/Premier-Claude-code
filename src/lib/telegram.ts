/**
 * Builder do deep-link do bot oficial CLSCORE no Telegram.
 *
 * URL real: `https://t.me/Clscore_bot?start=<trigger>`.
 * O `<trigger>` carrega identificação do lead pra que o atendimento humano
 * abra o atendimento contextualizado.
 */

const BOT_USERNAME = "Clscore_bot";

export function buildTelegramUrl(trigger: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(trigger)}`;
}
