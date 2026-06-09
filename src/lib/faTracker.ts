// Funnel Analytics tracker — insert-only, anon-friendly.
// Persiste session_id em localStorage e grava sessões/etapas/opções/eventos
// nas tabelas fa_* via supabase client (RLS permite INSERT anônimo).

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "fa_session_id";
const SESSION_BOOTSTRAPPED_KEY = "fa_session_bootstrapped";
const STEPS_CREATED_KEY = "fa_steps_created";
const OPTIONS_CREATED_KEY = "fa_options_created";

type StepTipo = "button" | "options" | "loading" | "checkout" | "other";

export interface FaStep {
  id: string;
  ordem?: number;
  nome?: string;
  tipo?: StepTipo;
}

export interface FaOption {
  id: string;
  letra?: string;
  indice?: number;
  rotulo?: string;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  return "fa_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readSet(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  try {
    sessionStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* noop */
  }
}

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return uuid();
  }
}

function parseUtms() {
  try {
    const url = new URL(window.location.href);
    const get = (k: string) => url.searchParams.get(k) || undefined;
    return {
      src: get("src"),
      fbclid: get("fbclid"),
      utm_source: get("utm_source"),
      utm_medium: get("utm_medium"),
      utm_campaign: get("utm_campaign"),
      utm_id: get("utm_id"),
      utm_content: get("utm_content"),
      utm_term: get("utm_term"),
    };
  } catch {
    return {};
  }
}

function deviceMeta() {
  try {
    const nav = window.navigator;
    return {
      user_agent: nav.userAgent,
      platform: (nav as any).platform || null,
      language: nav.language,
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      viewport: `${window.innerWidth || 0}x${window.innerHeight || 0}`,
    };
  } catch {
    return {};
  }
}

export interface InitFaParams {
  funnelSlug?: string;
  variant?: string | null;
}

/** Cria a sessão no banco (uma única vez por session_id). Idempotente via upsert ignoreDuplicates. */
export async function initFunnelAnalytics(params: InitFaParams = {}): Promise<string> {
  const sessionId = getOrCreateSessionId();
  try {
    const bootstrapped = localStorage.getItem(SESSION_BOOTSTRAPPED_KEY);
    if (bootstrapped === sessionId) return sessionId;

    const utms = parseUtms();
    const device = deviceMeta();
    const payload = {
      id: sessionId,
      funnel_slug: params.funnelSlug || "premier",
      variant: params.variant ?? null,
      ...utms,
      ...device,
    };

    await (supabase.from("fa_sessions" as any) as any)
      .upsert(payload, { onConflict: "id", ignoreDuplicates: true });

    localStorage.setItem(SESSION_BOOTSTRAPPED_KEY, sessionId);
  } catch (e) {
    console.warn("[faTracker] initFunnelAnalytics falhou:", e);
  }
  return sessionId;
}

async function ensureStep(step: FaStep, funnelSlug = "premier") {
  const created = readSet(STEPS_CREATED_KEY);
  if (created.has(step.id)) return;
  try {
    await (supabase.from("fa_steps" as any) as any).upsert(
      {
        id: step.id,
        funnel_slug: funnelSlug,
        ordem: step.ordem ?? null,
        nome: step.nome ?? null,
        tipo: step.tipo ?? "other",
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    created.add(step.id);
    writeSet(STEPS_CREATED_KEY, created);
  } catch (e) {
    console.warn("[faTracker] ensureStep falhou:", e);
  }
}

async function ensureOption(stepId: string, option: FaOption) {
  const created = readSet(OPTIONS_CREATED_KEY);
  const key = `${stepId}::${option.id}`;
  if (created.has(key)) return;
  try {
    await (supabase.from("fa_options" as any) as any).upsert(
      {
        id: option.id,
        step_id: stepId,
        letra: option.letra ?? null,
        indice: option.indice ?? null,
        rotulo: option.rotulo ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    created.add(key);
    writeSet(OPTIONS_CREATED_KEY, created);
  } catch (e) {
    console.warn("[faTracker] ensureOption falhou:", e);
  }
}

type EventType = "loaded" | "clicked" | "answered";

export interface TrackStepParams {
  step: FaStep;
  eventType: EventType;
  option?: FaOption;
  value?: string | null;
  funnelSlug?: string;
}

export async function trackStep(params: TrackStepParams) {
  const { step, eventType, option, value, funnelSlug = "premier" } = params;
  try {
    const sessionId = await initFunnelAnalytics({ funnelSlug });
    await ensureStep(step, funnelSlug);
    if (option) await ensureOption(step.id, option);

    await (supabase.from("fa_step_events" as any) as any).insert({
      session_id: sessionId,
      step_id: step.id,
      step_index: step.ordem ?? null,
      event_type: eventType,
      option_id: option?.id ?? null,
      value: value ?? null,
    });
  } catch (e) {
    console.warn("[faTracker] trackStep falhou:", e);
  }
}

export const trackLoaded = (step: FaStep, funnelSlug = "premier") =>
  trackStep({ step, eventType: "loaded", funnelSlug });

export const trackClicked = (step: FaStep, funnelSlug = "premier") =>
  trackStep({ step, eventType: "clicked", funnelSlug });

export const trackAnswered = (
  step: FaStep,
  option: FaOption,
  value?: string | null,
  funnelSlug = "premier"
) => trackStep({ step, eventType: "answered", option, value, funnelSlug });
