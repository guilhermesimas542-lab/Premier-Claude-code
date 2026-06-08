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
  event_type: string;
  option_id: string | null;
  value: string | null;
  created_at: string;
}

export default function AdminFunnelAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7d");
  const [variant, setVariant] = useState<string>("all");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [events, setEvents] = useState<StepEvent[]>([]);

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
          .select("id, funnel_slug, ordem, nome, tipo")
          .order("ordem", { ascending: true });

        let eventsQ = (supabase.from("fa_step_events" as any) as any)
          .select("session_id, step_id, event_type, option_id, value, created_at")
          .order("created_at", { ascending: true })
          .limit(50000);
        if (since) eventsQ = eventsQ.gte("created_at", since.toISOString());

        const [{ data: s }, { data: st }, { data: ev }] = await Promise.all([
          sessionsQ,
          stepsQ,
          eventsQ,
        ]);
        setSessions((s as Session[]) ?? []);
        setSteps((st as Step[]) ?? []);
        setEvents((ev as StepEvent[]) ?? []);
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

  const orderedSteps = useMemo(
    () => [...steps].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999)),
    [steps]
  );

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

  const metrics = useMemo(() => {
    const totalVisits = filteredSessions.length;

    // Leads: sessões com ≥1 clicked/answered
    let leads = 0;
    let qualified = 0;
    let completed = 0;
    const lastStepId = orderedSteps[orderedSteps.length - 1]?.id;

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
        if (lastStepId && stepId === lastStepId && evts.length > 0) {
          completed++;
        }
      });
      if (hasInteraction) leads++;
      if (orderedSteps.length > 0 && stepsTouched / orderedSteps.length > 0.5) qualified++;
    });

    const interactionRate = totalVisits > 0 ? (leads / totalVisits) * 100 : 0;

    return { totalVisits, leads, interactionRate, qualified, completed };
  }, [filteredSessions, sessionStepInteractions, orderedSteps]);

  // For column %: sessions that reached step / sessions that reached step 1
  const stepReachCount = useMemo(() => {
    const counts = new Map<string, number>();
    orderedSteps.forEach((st) => {
      let n = 0;
      filteredSessions.forEach((s) => {
        const sm = sessionStepInteractions.get(s.id);
        if (sm?.has(st.id)) n++;
      });
      counts.set(st.id, n);
    });
    return counts;
  }, [orderedSteps, filteredSessions, sessionStepInteractions]);

  const baseReach = orderedSteps[0] ? stepReachCount.get(orderedSteps[0].id) || 0 : 0;

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
              <h2 className="text-sm font-semibold">Respostas por lead × etapa</h2>
              <p className="text-xs text-gray-500 mt-1">
                % no cabeçalho = sessões que chegaram na etapa ÷ sessões que chegaram na etapa 1.
              </p>
            </div>
            {orderedSteps.length === 0 ? (
              <p className="text-center text-gray-600 py-8 text-sm">Nenhuma etapa registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-800/60 text-gray-400">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Sessão</th>
                      <th className="px-3 py-2 text-left font-medium">UTM source</th>
                      {orderedSteps.map((st) => {
                        const reached = stepReachCount.get(st.id) || 0;
                        const pct = baseReach > 0 ? (reached / baseReach) * 100 : 0;
                        return (
                          <th key={st.id} className="px-3 py-2 text-left font-medium">
                            <div className="text-white">{st.nome || st.id}</div>
                            <div className="text-[10px] text-gray-500">
                              {reached} · {pct.toFixed(0)}%
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.slice(0, 200).map((s) => {
                      const sm = sessionStepInteractions.get(s.id);
                      return (
                        <tr key={s.id} className="border-t border-gray-800">
                          <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{s.id.slice(0, 8)}…</td>
                          <td className="px-3 py-2 text-gray-500">{s.utm_source || "—"}</td>
                          {orderedSteps.map((st) => {
                            const evts = sm?.get(st.id) || [];
                            const answered = evts.find((e) => e.event_type === "answered");
                            const clicked = evts.find((e) => e.event_type === "clicked");
                            const loaded = evts.find((e) => e.event_type === "loaded");
                            let cell: string = "—";
                            let cls = "text-gray-700";
                            if (answered) {
                              cell = answered.value || answered.option_id || "✓";
                              cls = "text-primary";
                            } else if (clicked) {
                              cell = "✓ click";
                              cls = "text-blue-400";
                            } else if (loaded) {
                              cell = "·";
                              cls = "text-gray-500";
                            }
                            return (
                              <td key={st.id} className={`px-3 py-2 ${cls}`}>
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredSessions.length > 200 && (
                  <p className="text-center text-gray-600 text-xs py-3">
                    Mostrando 200 de {filteredSessions.length} sessões
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
