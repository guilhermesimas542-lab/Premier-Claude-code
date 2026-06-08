import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Period = "24h" | "7d" | "30d" | "all";

interface Session {
  id: string;
  funnel_slug: string;
  variant: string | null;
  created_at: string;
  utm_source: string | null;
  utm_campaign: string | null;
}
interface Step {
  id: string;
  funnel_slug: string;
  ordem: number | null;
  nome: string | null;
  tipo: string | null;
}
interface StepEvent {
  session_id: string;
  step_id: string | null;
  step_index: number | null;
  event_type: string;
  option_id: string | null;
  value: string | null;
  created_at: string;
}
interface Option {
  id: string;
  step_id: string;
  letra: string | null;
  indice: number | null;
  rotulo: string | null;
}

function humanize(stepId: string): string {
  return stepId
    .replace(/^(q-|fb-|cta-)/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Donut({ pct }: { pct: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";
  return (
    <div className="relative w-10 h-10 shrink-0">
      <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#1f2937" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
        {pct.toFixed(0)}%
      </div>
    </div>
  );
}

export default function AdminFunnelAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7d");
  const [variant, setVariant] = useState<string>("all");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [events, setEvents] = useState<StepEvent[]>([]);
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let since: Date | null = null;
        const now = new Date();
        if (period === "24h") since = new Date(now.getTime() - 86400000);
        else if (period === "7d") since = new Date(now.getTime() - 7 * 86400000);
        else if (period === "30d") since = new Date(now.getTime() - 30 * 86400000);

        let sessionsQ = (supabase.from("fa_sessions" as any) as any)
          .select("id, funnel_slug, variant, created_at, utm_source, utm_campaign")
          .order("created_at", { ascending: false })
          .limit(5000);
        if (since) sessionsQ = sessionsQ.gte("created_at", since.toISOString());

        const stepsQ = (supabase.from("fa_steps" as any) as any)
          .select("id, funnel_slug, ordem, nome, tipo");

        let eventsQ = (supabase.from("fa_step_events" as any) as any)
          .select("session_id, step_id, step_index, event_type, option_id, value, created_at")
          .order("created_at", { ascending: true })
          .limit(50000);
        if (since) eventsQ = eventsQ.gte("created_at", since.toISOString());

        const optionsQ = (supabase.from("fa_options" as any) as any)
          .select("id, step_id, letra, indice, rotulo");

        const [{ data: s }, { data: st }, { data: ev }, { data: op }] = await Promise.all([
          sessionsQ,
          stepsQ,
          eventsQ,
          optionsQ,
        ]);
        setSessions((s as Session[]) ?? []);
        setSteps((st as Step[]) ?? []);
        setEvents((ev as StepEvent[]) ?? []);
        setOptions((op as Option[]) ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const variants = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => s.variant && set.add(s.variant));
    return Array.from(set);
  }, [sessions]);

  const filteredSessions = useMemo(
    () => (variant === "all" ? sessions : sessions.filter((s) => s.variant === variant)),
    [sessions, variant]
  );
  const sessionIds = useMemo(() => new Set(filteredSessions.map((s) => s.id)), [filteredSessions]);
  const filteredEvents = useMemo(
    () => events.filter((e) => sessionIds.has(e.session_id)),
    [events, sessionIds]
  );

  // Derive ordered steps from events (fa_steps catalog is incomplete)
  const stepsByIdFromCatalog = useMemo(() => {
    const m = new Map<string, Step>();
    steps.forEach((s) => m.set(s.id, s));
    return m;
  }, [steps]);

  const orderedSteps = useMemo(() => {
    const seen = new Map<string, { step_id: string; step_index: number | null; name: string }>();
    filteredEvents.forEach((e) => {
      if (!e.step_id) return;
      if (!seen.has(e.step_id)) {
        const cat = stepsByIdFromCatalog.get(e.step_id);
        seen.set(e.step_id, {
          step_id: e.step_id,
          step_index: e.step_index ?? cat?.ordem ?? null,
          name: cat?.nome || humanize(e.step_id),
        });
      } else if (e.step_index != null && seen.get(e.step_id)!.step_index == null) {
        seen.get(e.step_id)!.step_index = e.step_index;
      }
    });
    return Array.from(seen.values()).sort((a, b) => {
      const ai = a.step_index ?? Number.MAX_SAFE_INTEGER;
      const bi = b.step_index ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }, [filteredEvents, stepsByIdFromCatalog]);

  // option_id -> option
  const optionsById = useMemo(() => {
    const m = new Map<string, Option>();
    options.forEach((o) => m.set(o.id, o));
    return m;
  }, [options]);

  // Per-session interaction map
  const sessionStepInteractions = useMemo(() => {
    const map = new Map<string, Map<string, StepEvent[]>>();
    filteredEvents.forEach((e) => {
      if (!e.step_id) return;
      if (!map.has(e.session_id)) map.set(e.session_id, new Map());
      const sm = map.get(e.session_id)!;
      if (!sm.has(e.step_id)) sm.set(e.step_id, []);
      sm.get(e.step_id)!.push(e);
    });
    return map;
  }, [filteredEvents]);

  // Distinct sessions per step (from events directly — includes sessions outside the period window)
  const stepReachCount = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    filteredEvents.forEach((e) => {
      if (!e.step_id) return;
      if (!counts.has(e.step_id)) counts.set(e.step_id, new Set());
      counts.get(e.step_id)!.add(e.session_id);
    });
    const out = new Map<string, number>();
    counts.forEach((set, k) => out.set(k, set.size));
    return out;
  }, [filteredEvents]);

  const baseReach = orderedSteps[0] ? stepReachCount.get(orderedSteps[0].step_id) || 0 : 0;

  const metrics = useMemo(() => {
    const totalVisits = filteredSessions.length;
    let leads = 0;
    let qualified = 0;
    let completed = 0;
    const lastStepId = orderedSteps[orderedSteps.length - 1]?.step_id;

    filteredSessions.forEach((s) => {
      const sm = sessionStepInteractions.get(s.id);
      if (!sm) return;
      let hasInteraction = false;
      let stepsTouched = 0;
      sm.forEach((evts, stepId) => {
        const interacted = evts.some((e) => e.event_type === "clicked" || e.event_type === "answered");
        if (interacted) {
          hasInteraction = true;
          stepsTouched++;
        }
        if (lastStepId && stepId === lastStepId && evts.length > 0) completed++;
      });
      if (hasInteraction) leads++;
      if (orderedSteps.length > 0 && stepsTouched / orderedSteps.length > 0.5) qualified++;
    });

    const interactionRate = totalVisits > 0 ? (leads / totalVisits) * 100 : 0;
    return { totalVisits, leads, interactionRate, qualified, completed };
  }, [filteredSessions, sessionStepInteractions, orderedSteps]);

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Funnel Analytics</h1>
        <div className="flex gap-2 items-center flex-wrap">
          {(["24h", "7d", "30d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-lg ${
                period === p ? "bg-primary text-primary-foreground" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {p === "24h" ? "24h" : p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "Tudo"}
            </button>
          ))}
          {variants.length > 0 && (
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs"
            >
              <option value="all">Todas variantes</option>
              {variants.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi label="Visitas" value={metrics.totalVisits} />
            <Kpi label="Leads" value={metrics.leads} sub="≥1 interação" />
            <Kpi label="Taxa de interação" value={`${metrics.interactionRate.toFixed(1)}%`} highlight />
            <Kpi label="Qualificados" value={metrics.qualified} sub=">50% etapas" />
            <Kpi label="Fluxos completos" value={metrics.completed} sub="última etapa" />
          </div>

          {/* Tabela lead × etapa */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold">Respostas</h2>
              <p className="text-xs text-gray-500 mt-1">
                % no topo de cada etapa = sessões que chegaram nela ÷ sessões da 1ª etapa.
              </p>
            </div>
            {orderedSteps.length === 0 ? (
              <p className="text-center text-gray-600 py-8 text-sm">Nenhuma etapa registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto relative">
                <table className="text-xs border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gray-950">
                      <th className="sticky left-0 z-20 bg-gray-950 border-b border-r border-gray-800 px-3 py-3 text-left font-medium text-gray-400 min-w-[100px]">
                        [ID] Lead
                      </th>
                      <th className="sticky left-[100px] z-20 bg-gray-950 border-b border-r border-gray-800 px-3 py-3 text-left font-medium text-gray-400 min-w-[110px]">
                        Data
                      </th>
                      {orderedSteps.map((st) => {
                        const reached = stepReachCount.get(st.step_id) || 0;
                        const pct = baseReach > 0 ? (reached / baseReach) * 100 : 0;
                        return (
                          <th
                            key={st.step_id}
                            className="border-b border-gray-800 px-3 py-3 text-left font-medium min-w-[180px] align-top"
                          >
                            <div className="flex items-start gap-2">
                              <Donut pct={pct} />
                              <div className="flex flex-col">
                                <span className="text-white text-[11px] leading-tight">
                                  {st.step_index != null ? `${st.step_index}. ` : ""}{st.name}
                                </span>
                                <span className="text-[10px] text-gray-500 mt-0.5">
                                  {reached} sessões
                                </span>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.slice(0, 300).map((s, rowIdx) => {
                      const sm = sessionStepInteractions.get(s.id);
                      const rowBg = rowIdx % 2 === 0 ? "bg-gray-900" : "bg-gray-900/50";
                      const date = new Date(s.created_at);
                      const dateStr = `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                      return (
                        <tr key={s.id} className="group">
                          <td className={`sticky left-0 z-10 ${rowBg} group-hover:bg-gray-800 border-b border-r border-gray-800 px-3 py-2 text-gray-300 font-mono text-[10px]`}>
                            [{s.id.slice(0, 6)}]
                          </td>
                          <td className={`sticky left-[100px] z-10 ${rowBg} group-hover:bg-gray-800 border-b border-r border-gray-800 px-3 py-2 text-gray-400 text-[10px] whitespace-nowrap`}>
                            {dateStr}
                          </td>
                          {orderedSteps.map((st) => {
                            const evts = sm?.get(st.step_id) || [];
                            const answered = evts.find((e) => e.event_type === "answered");
                            const clicked = evts.find((e) => e.event_type === "clicked");
                            const loaded = evts.find((e) => e.event_type === "loaded");
                            const optId = answered?.option_id || clicked?.option_id;
                            const opt = optId ? optionsById.get(optId) : undefined;

                            return (
                              <td key={st.step_id} className={`${rowBg} group-hover:bg-gray-800 border-b border-gray-800 px-3 py-2 align-middle`}>
                                {opt ? (
                                  <div className="flex items-center gap-1.5">
                                    {opt.letra && (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary/20 text-primary text-[10px] font-bold border border-primary/40">
                                        {opt.letra}
                                      </span>
                                    )}
                                    <span className="text-white text-[11px] truncate max-w-[120px]">
                                      {opt.rotulo || optId}
                                    </span>
                                    {opt.indice != null && (
                                      <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-gray-700 text-gray-300 text-[9px] font-mono">
                                        {opt.indice}
                                      </span>
                                    )}
                                  </div>
                                ) : answered ? (
                                  <span className="text-primary text-[11px]">{answered.value || "✓"}</span>
                                ) : clicked ? (
                                  <span className="inline-flex items-center gap-1 text-blue-400 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> clicked
                                  </span>
                                ) : loaded ? (
                                  <span className="inline-flex items-center gap-1 text-gray-500 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600" /> loaded
                                  </span>
                                ) : (
                                  <span className="text-gray-700">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredSessions.length > 300 && (
                  <p className="text-center text-gray-600 text-xs py-3">
                    Mostrando 300 de {filteredSessions.length} sessões
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-primary/10 border border-primary/30" : "bg-gray-900 border border-gray-800"}`}>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-white"}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}
