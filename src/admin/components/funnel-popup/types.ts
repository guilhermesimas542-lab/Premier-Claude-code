export interface FunnelQuestion {
  text: string;
  options: string[];
}

export interface PopupFormState {
  type: string;
  is_active: boolean;
  target_audience: string;
  image_url: string;
  questions: FunnelQuestion[];
  final_title: string;
  final_benefits: string[];
  checkout_link: string;
  checkout_link_2: string;
  final_template: string;
  final_config: Record<string, any>;
  button_color: string;
}

export interface PopupRow {
  id: string;
  type: string;
  is_active: boolean;
  target_audience: string;
  image_url: string | null;
  question_1_text: string | null;
  question_1_options: string[] | null;
  question_2_text: string | null;
  question_2_options: string[] | null;
  question_3_text: string | null;
  question_3_options: string[] | null;
  final_title: string | null;
  final_benefits: string[] | null;
  checkout_link: string | null;
  checkout_link_2?: string | null;
  final_template: string | null;
  final_config: Record<string, any> | null;
  created_at: string;
}

export const POPUP_TYPES = [
  { value: "welcome_free", label: "🎉 Boas-Vindas (Free)", desc: "Primeira visita de usuário Free" },
  { value: "welcome_paid", label: "🎉 Boas-Vindas (Pago)", desc: "Primeira visita de usuário pagante" },
  { value: "casino_welcome", label: "🎰 Boas-Vindas (Cassino)", desc: "Primeira visita à aba de Cassino" },
  { value: "upgrade_basic", label: "🔓 Upgrade Básico", desc: "Para usuários Free" },
  { value: "upgrade_pro", label: "⭐ Upgrade Pro", desc: "Para Free e Básico" },
  { value: "upgrade_ultra", label: "👑 Upgrade Ultra", desc: "Para todos abaixo de Ultra" },
  { value: "addon_alavancagem", label: "⚓ Add-on Alavancagem", desc: "Sem add-on Alavancagem" },
  { value: "addon_odds", label: "🎯 Add-on Odds Altas", desc: "Sem add-on Odds Altas" },
  { value: "addon_telegram", label: "📱 Add-on Live Telegram", desc: "Sem Live Telegram" },
  { value: "promotional", label: "📣 Promocional", desc: "Pop-up avulso com alvo configurável" },
] as const;

/** Priority order for auto-display popups (lower index = higher priority) */
export const POPUP_PRIORITY: string[] = [
  "welcome_paid",
  "welcome_free",
  "casino_welcome",
  "upgrade_ultra",
  "upgrade_pro",
  "upgrade_basic",
  "addon_alavancagem",
  "addon_odds",
  "addon_telegram",
  "promotional",
];

export const AUDIENCE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "free", label: "Só Free" },
  { value: "basic", label: "Só Básico" },
  { value: "pro", label: "Só Pro" },
  { value: "ultra", label: "Só Ultra" },
];

export const typeLabel = (t: string) => POPUP_TYPES.find((p) => p.value === t)?.label ?? t;

export const emptyForm: PopupFormState = {
  type: "upgrade_pro",
  is_active: true,
  target_audience: "all",
  image_url: "",
  questions: [],
  final_title: "",
  final_benefits: [],
  checkout_link: "",
  checkout_link_2: "",
  final_template: "default",
  final_config: {},
  button_color: "",
};

export function formToPayload(form: PopupFormState, selectedHouseId: string | null): Record<string, unknown> {
  const q = form.questions;
  const triggerType = (form.type === "welcome_free" || form.type === "welcome_paid" || form.type === "casino_welcome") ? "on_load" : "manual";
  return {
    type: form.type,
    is_active: form.is_active,
    target_audience: form.target_audience,
    trigger_type: triggerType,
    image_url: form.image_url || null,
    question_1_text: q[0]?.text || null,
    question_1_options: q[0]?.options.filter(Boolean).length ? q[0].options.filter(Boolean) : null,
    question_2_text: q[1]?.text || null,
    question_2_options: q[1]?.options.filter(Boolean).length ? q[1].options.filter(Boolean) : null,
    question_3_text: q[2]?.text || null,
    question_3_options: q[2]?.options.filter(Boolean).length ? q[2].options.filter(Boolean) : null,
    final_title: form.final_title || null,
    final_benefits: form.final_benefits.filter(Boolean).length ? form.final_benefits.filter(Boolean) : null,
    checkout_link: form.checkout_link || null,
    final_template: form.final_template || "default",
    final_config: Object.keys(form.final_config || {}).length > 0 ? form.final_config : null,
    button_color: form.button_color || null,
    betting_house_id: selectedHouseId || null,
    updated_at: new Date().toISOString(),
  };
}

export function rowToForm(row: PopupRow): PopupFormState {
  const questions: FunnelQuestion[] = [];
  if (row.question_1_text) questions.push({ text: row.question_1_text, options: (row.question_1_options as string[]) ?? [""] });
  if (row.question_2_text) questions.push({ text: row.question_2_text, options: (row.question_2_options as string[]) ?? [""] });
  if (row.question_3_text) questions.push({ text: row.question_3_text, options: (row.question_3_options as string[]) ?? [""] });
  return {
    type: row.type,
    is_active: row.is_active,
    target_audience: row.target_audience,
    image_url: row.image_url ?? "",
    questions,
    final_title: row.final_title ?? "",
    final_benefits: (row.final_benefits as string[]) ?? [],
    checkout_link: row.checkout_link ?? "",
    final_template: row.final_template ?? "default",
    final_config: (row.final_config as Record<string, any>) ?? {},
    button_color: (row as any).button_color ?? "",
  };
}
