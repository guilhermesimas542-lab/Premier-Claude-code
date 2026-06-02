import { UserPlus, ArrowUpCircle, MoonStar, Hand, type LucideIcon } from "lucide-react";

/**
 * Trigger_type das jornadas (mesmos valores do CHECK constraint em crm_journeys).
 */
export type TriggerKey = "onboarding" | "upgrade" | "churn_inactive" | "manual";

export interface TriggerConfig {
  key: TriggerKey;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  color: string;
  /** Resumo curto para exibir nos cards. */
  shortHint: string;
}

export const TRIGGERS: Record<TriggerKey, TriggerConfig> = {
  onboarding: {
    key: "onboarding",
    label: "Onboarding (novo cadastro)",
    shortLabel: "Onboarding",
    description: "Dispara quando um novo cadastro é confirmado.",
    icon: UserPlus,
    color: "#22C55E",
    shortHint: "Novo cadastro",
  },
  upgrade: {
    key: "upgrade",
    label: "Upgrade de plano",
    shortLabel: "Upgrade",
    description: "Dispara quando o lead troca de plano (free → premium, etc).",
    icon: ArrowUpCircle,
    color: "#60A5FA",
    shortHint: "Upgrade de plano",
  },
  churn_inactive: {
    key: "churn_inactive",
    label: "Churn por inatividade",
    shortLabel: "Churn",
    description: "Dispara quando o lead fica X dias sem login (configurável).",
    icon: MoonStar,
    color: "#F472B6",
    shortHint: "X dias sem login",
  },
  manual: {
    key: "manual",
    label: "Manual",
    shortLabel: "Manual",
    description: "Entrada manual via admin — útil para testes e campanhas pontuais.",
    icon: Hand,
    color: "#A855F7",
    shortHint: "Entrada manual",
  },
};

export const TRIGGER_LIST: TriggerConfig[] = Object.values(TRIGGERS);

/**
 * Status da jornada (mesmos valores do CHECK constraint em crm_journeys.status).
 */
export type JourneyStatus = "draft" | "active" | "paused" | "archived";

export const JOURNEY_STATUS_META: Record<
  JourneyStatus,
  { label: string; color: string; description: string }
> = {
  draft:    { label: "Rascunho", color: "#94A3B8", description: "Em construção, leads não entram ainda" },
  active:   { label: "Ativa",    color: "#22C55E", description: "Novos leads entram automaticamente" },
  paused:   { label: "Pausada",  color: "#FACC15", description: "Não aceita novos leads; ativos seguem no fluxo" },
  archived: { label: "Arquivada", color: "#64748B", description: "Fora de uso, apenas histórico" },
};
