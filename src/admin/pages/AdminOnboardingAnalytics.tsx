import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { ONB_STEPS, ONB_STEP_IDS } from "@/components/onboarding/onboardingFunnel";

type Period = "24h" | "7d" | "30d" | "all";

const VIDEO_STEP_IDS = new Set([ONB_STEPS[1].id, ONB_STEPS[3].id]); // passos 2 e 4 (vídeo)
const TELEGRAM_STEP_ID = ONB_STEPS[4].id; // onb_5_telegram
const DIRECT_LABEL = "(directo)"; // sessões sem utm_source

interface StepEvent {
  session_id: string;
  step_id: string | null;
  event_type: string;
  created_at: string;
}
interface FaSession {
  id: string;
  utm_source: string | null;
}

function fmtDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
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

function Kpi({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-primary/10 border border-primary/30" : "bg-gray-900 border border-gray-800"}`}>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-white"}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminOnboardingAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7d");
  const [utm, setUtm] = useState<string>("all");
  const [events, setEvents] = useState<StepEvent[]>([]);
  const [sessions, setSessions] = useState<FaSession[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let since: Date | null = null;
        const now = new Date();
        if (period === "24h") since = new Date(now.getTime() - 86400000);
        else if (period === "7d") since = new Date(now.getTime() - 7 * 86400000);
        else if (period === "30d") since = new Date(now.getTime() - 30 * 86400000);

        let evQ = (supabase.from("fa_step_events" as any) as any)
          .select("session_id, step_id, event_type, created_at")
          .in("step_id", ONB_STEP_IDS)
          .order("created_at", { ascending: true })
          .limit(50000);
        if (since) evQ = evQ.gte("created_at", since.toISOString());

        // Sessões do onboarding (pra cruzar a origem/UTM com os eventos).
        let ssQ = (supabase.from("fa_sessions" as any) as any)
          .select("id, utm_source")
          .eq("funnel_slug", "onboarding")
          .limit(50000);
        if (since) ssQ = ssQ.gte("created_at", since.toISOString());

        const [{ data: ev }, { data: ss }] = await Promise.all([evQ, ssQ]);
        setEvents((ev as StepEvent[]) ?? []);
        setSessions((ss as FaSession[]) ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  // session_id -> origem (utm_source, ou "(directo)" quando vazio).
  const sessionUtm = useMemo(() => {
    const m = new Map<string, string>();
    sessions.forEach((s) => m.set(s.id, s.utm_source || DIRECT_LABEL));
    return m;
  }, [sessions]);

  const utmOptions = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => set.add(s.utm_source || DIRECT_LABEL));
    return Array.from(set).sort();
  }, [sessions]);

  // Filtra os eventos pela origem selecionada (segmentação por campanha).
  const filteredEvents = useMemo(() => {
    if (utm === "all") return events;
    return events.filter((e) => sessionUtm.get(e.session_id) === utm);
  }, [events, utm, sessionUtm]);

  // Sessões distintas que alcançaram (loaded) cada passo, 1º timestamp por passo,
  // e engajamento (event_type "clicked": play do vídeo nos passos 2/4 e clique
  // no Telegram no passo 5).
  const { reached, firstAtBySession, engagedByStep } = useMemo(() => {
    const reachedSets = new Map<string, Set<string>>();
    const firstAt = new Map<string, Map<string, number>>();
    const engaged = new Map<string, Set<string>>();
    filteredEvents.forEach((e) => {
      if (!e.step_id) return;
      if (e.event_type === "clicked") {
        if (!engaged.has(e.step_id)) engaged.set(e.step_id, new Set());
        engaged.get(e.step_id)!.add(e.session_id);
        return;
      }
      if (e.event_type !== "loaded") return;
      if (!reachedSets.has(e.step_id)) reachedSets.set(e.step_id, new Set());
      reachedSets.get(e.step_id)!.add(e.session_id);

      if (!firstAt.has(e.session_id)) firstAt.set(e.session_id, new Map());
      const sm = firstAt.get(e.session_id)!;
      if (!sm.has(e.step_id)) sm.set(e.step_id, new Date(e.created_at).getTime());
    });
    const reachedArr = ONB_STEPS.map((s) => reachedSets.get(s.id)?.size ?? 0);
    const engagedCounts = new Map<string, number>();
    engaged.forEach((set, k) => engagedCounts.set(k, set.size));
    return { reached: reachedArr, firstAtBySession: firstAt, engagedByStep: engagedCounts };
  }, [filteredEvents]);

  // Tempo médio gasto em cada passo (do "alcançou passo i" até "alcançou i+1").
  const avgTimePerStep = useMemo(() => {
    const out: number[] = ONB_STEPS.map(() => NaN);
    for (let i = 0; i < ONB_STEPS.length - 1; i++) {
      const idA = ONB_STEPS[i].id;
      const idB = ONB_STEPS[i + 1].id;
      let sum = 0;
      let n = 0;
      firstAtBySession.forEach((sm) => {
        const a = sm.get(idA);
        const b = sm.get(idB);
        if (a != null && b != null && b > a) {
          sum += b - a;
          n++;
        }
      });
      out[i] = n > 0 ? sum / n : NaN;
    }
    return out;
  }, [firstAtBySession]);

  const base = reached[0] || 0;
  const completed = reached[reached.length - 1] || 0;
  const completionRate = base > 0 ? (completed / base) * 100 : 0;

  // Maior abandono: maior queda absoluta entre um passo e o seguinte.
  const maxExitIndex = useMemo(() => {
    let idx = -1;
    let worst = -1;
    for (let i = 0; i < reached.length - 1; i++) {
      const drop = Math.max(0, reached[i] - reached[i + 1]);
      if (drop > worst) {
        worst = drop;
        idx = i;
      }
    }
    return worst > 0 ? idx : -1;
  }, [reached]);

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Onboarding Analytics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Funil dos 5 passos do onboarding pós-acesso — onde os leads abandonam.
          </p>
        </div>
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
          {utmOptions.length > 0 && (
            <select
              value={utm}
              onChange={(e) => setUtm(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs"
              title="Filtrar por origem/campanha"
            >
              <option value="all">Todas as origens</option>
              {utmOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : base === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-sm text-gray-500">
          Nenhum dado de onboarding no período/origem. Os eventos começam a
          aparecer conforme os leads passam pelo funil após o deploy.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Iniciaram" value={base} sub="passo 1" />
            <Kpi label="Concluíram" value={completed} sub="último passo" />
            <Kpi label="Taxa de conclusão" value={`${completionRate.toFixed(1)}%`} highlight />
            <Kpi
              label="Maior abandono"
              value={maxExitIndex >= 0 ? `${ONB_STEPS[maxExitIndex].ordem}. ${ONB_STEPS[maxExitIndex].nome}` : "—"}
              sub={maxExitIndex >= 0 ? `${Math.max(0, reached[maxExitIndex] - reached[maxExitIndex + 1])} saíram aqui` : undefined}
            />
          </div>

          {/* Funil por etapa */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold">Funil de conversão</h2>
              <p className="text-xs text-gray-500 mt-1">
                % = sessões que chegaram no passo ÷ sessões do passo 1. A seta vermelha mostra quantos saíram antes do próximo passo.
              </p>
            </div>
            <div className="p-4 space-y-4">
              {ONB_STEPS.map((s, i) => {
                const count = reached[i];
                const pct = base > 0 ? (count / base) * 100 : 0;
                const isLast = i === ONB_STEPS.length - 1;
                const exitCount = isLast ? 0 : Math.max(0, count - reached[i + 1]);
                const exitPct = count > 0 ? (exitCount / count) * 100 : 0;
                const isMaxExit = i === maxExitIndex;
                const engaged = engagedByStep.get(s.id) ?? 0;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <Donut pct={pct} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-200">
                            {s.ordem}. {s.nome}
                          </span>
                          {isMaxExit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-400/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Maior abandono
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{count} chegaram</span>
                          {VIDEO_STEP_IDS.has(s.id) && (
                            <span className="text-xs text-[#00FF87]">▶ {engaged} deram play</span>
                          )}
                          {s.id === TELEGRAM_STEP_ID && (
                            <span className="text-xs text-[#229ED9]">📨 {engaged} clicaram no Telegram</span>
                          )}
                          {!isLast && exitCount > 0 && (
                            <span className="text-xs text-red-400">↗ {exitCount} saíram ({exitPct.toFixed(0)}%)</span>
                          )}
                          {!isLast && (
                            <span className="text-[10px] text-gray-600 whitespace-nowrap">
                              ⏱ {fmtDuration(avgTimePerStep[i])} no passo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 mt-1.5">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
