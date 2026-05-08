import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  entityType: "popup" | "paycard";
  entityId: string;
  entityName: string;
}

interface AnalyticsRow {
  event_type: string;
  step_index: number | null;
  step_option: string | null;
  created_at: string;
}

type Period = "today" | "7d" | "30d" | "all" | "custom";

export default function FunnelAnalyticsModal({ open, onClose, entityType, entityId, entityName }: Props) {
  const [data, setData] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      let q = (supabase.from("funnel_analytics" as any) as any)
        .select("event_type, step_index, step_option, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (period === "custom") {
        if (customFrom && customTo) {
          q = q.gte("created_at", new Date(customFrom).toISOString());
          q = q.lte("created_at", new Date(customTo + "T23:59:59").toISOString());
        } else {
          // Don't filter yet if both dates aren't set
          setLoading(false);
          return;
        }
      } else if (period !== "all") {
        const now = new Date();
        let from: Date;
        if (period === "today") {
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === "7d") {
          from = new Date(now.getTime() - 7 * 86400000);
        } else {
          from = new Date(now.getTime() - 30 * 86400000);
        }
        q = q.gte("created_at", from.toISOString());
      }

      const { data: rows } = await q.limit(5000);
      setData((rows as AnalyticsRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, [open, entityType, entityId, period, customFrom, customTo]);

  const metrics = useMemo(() => {
    const views = data.filter(r => r.event_type === "view").length;
    const finalViews = data.filter(r => r.event_type === "final_view").length;
    const checkouts = data.filter(r => r.event_type === "checkout_click").length;
    const exits = data.filter(r => r.event_type === "exit").length;
    const step0Count = data.filter(r => r.event_type === "step" && r.step_index === 0).length;
    const entryExits = Math.max(0, views - step0Count);
    const pctEntryExits = views > 0 ? ((entryExits / views) * 100).toFixed(1) : "0";
    const pctFinal = views > 0 ? ((finalViews / views) * 100).toFixed(1) : "0";
    const pctCheckout = views > 0 ? ((checkouts / views) * 100).toFixed(1) : "0";
    return { views, finalViews, checkouts, exits, entryExits, pctEntryExits, pctFinal, pctCheckout };
  }, [data]);

  const stepData = useMemo(() => {
    const steps = data.filter(r => r.event_type === "step" && r.step_index !== null);
    const maxStep = steps.reduce((m, r) => Math.max(m, r.step_index!), -1);
    const result: { stepIndex: number; total: number; options: Record<string, number> }[] = [];
    for (let i = 0; i <= maxStep; i++) {
      const stepRows = steps.filter(r => r.step_index === i);
      const options: Record<string, number> = {};
      stepRows.forEach(r => {
        const opt = r.step_option || "—";
        options[opt] = (options[opt] || 0) + 1;
      });
      result.push({ stepIndex: i, total: stepRows.length, options });
    }
    return result;
  }, [data]);

  // Build funnel stages: steps + final_view + checkout
  const funnelStages = useMemo(() => {
    const stages: { label: string; count: number; isEntry?: boolean }[] = [];
    // Entry stage
    stages.push({ label: "Visualización del Pop-up", count: metrics.views, isEntry: true });
    // Add each step
    stepData.forEach(s => {
      stages.push({ label: `Pregunta ${s.stepIndex + 1}`, count: s.total });
    });
    // Add final view and checkout
    stages.push({ label: "Pantalla Final", count: metrics.finalViews });
    stages.push({ label: "Checkout", count: metrics.checkouts });
    return stages;
  }, [stepData, metrics]);

  // Calculate exits per stage
  const stageExits = useMemo(() => {
    if (funnelStages.length === 0) return [];
    const exits: { label: string; count: number; exitCount: number; exitPct: string; isEntry?: boolean }[] = [];
    let maxExitCount = 0;
    let maxExitIdx = -1;

    for (let i = 0; i < funnelStages.length; i++) {
      const current = funnelStages[i].count;
      const next = i < funnelStages.length - 1 ? funnelStages[i + 1].count : 0;
      const exitCount = Math.max(0, current - next);
      const exitPct = metrics.views > 0 ? ((exitCount / metrics.views) * 100).toFixed(1) : "0";
      
      if (exitCount > maxExitCount && i < funnelStages.length - 1) {
        maxExitCount = exitCount;
        maxExitIdx = i;
      }
      
      exits.push({ ...funnelStages[i], exitCount, exitPct });
    }

    return exits.map((e, i) => ({ ...e, isMaxExit: i === maxExitIdx && maxExitCount > 0 }));
  }, [funnelStages, metrics.views]);

  const handlePeriodClick = (p: Period) => {
    if (p !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
    setPeriod(p);
  };

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Hoy" },
    { key: "7d", label: "7 días" },
    { key: "30d", label: "30 días" },
    { key: "all", label: "Todo" },
    { key: "custom", label: "Personalizado" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📊 Analytics — {entityName}</DialogTitle>
        </DialogHeader>

        {/* Period filter */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-1 flex-wrap">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => handlePeriodClick(p.key)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${period === p.key ? "bg-primary text-primary-foreground" : "bg-gray-800 text-gray-400 hover:text-white"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Desde:</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-white [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Hasta:</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-white [color-scheme:dark]"
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Visualizaciones" value={metrics.views} />
              <KpiCard label="Pantalla Final" value={metrics.finalViews} sub={`${metrics.pctFinal}%`} />
              <KpiCard label="Checkout" value={metrics.checkouts} sub={`${metrics.pctCheckout}%`} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Salidas en la Entrada" value={metrics.entryExits} sub={`${metrics.pctEntryExits}%`} />
              <KpiCard label="Salidas (total)" value={metrics.exits} />
              <KpiCard label="Conversión" value={`${metrics.pctCheckout}%`} highlight />
            </div>

            {/* Funnel with exit indicators */}
            {stageExits.length > 0 && stageExits.some(s => s.count > 0) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300">Embudo de Conversión</h3>
                {stageExits.map((s, i) => {
                  const pct = metrics.views > 0 ? ((s.count / metrics.views) * 100).toFixed(1) : "0";
                  const isLast = i === stageExits.length - 1;
                  return (
                    <div key={i} className={`rounded-lg p-3 space-y-1.5 ${s.isEntry ? "bg-blue-900/30 border border-blue-500/20" : "bg-gray-800"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {s.isEntry && <span className="text-xs">👁️</span>}
                          <span className="text-xs font-medium text-gray-300">{s.label}</span>
                          {s.isMaxExit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-400/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Mayor abandono
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{s.count} {isLast ? "hicieron clic" : "llegaron"}</span>
                          {!isLast && s.exitCount > 0 && (
                            <span className="text-xs text-red-400">
                              ↗ {s.exitCount} salieron ({s.exitPct}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step-by-step detail with options */}
            {stepData.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300">Detalles por Pregunta</h3>
                {stepData.map(s => {
                  const sortedOptions = Object.entries(s.options).sort((a, b) => b[1] - a[1]);
                  return (
                    <div key={s.stepIndex} className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <span className="text-xs font-medium text-gray-300">Pregunta {s.stepIndex + 1}</span>
                      <div className="space-y-1 pt-1">
                        {sortedOptions.map(([opt, count]) => {
                          const optPct = s.total > 0 ? ((count / s.total) * 100).toFixed(0) : "0";
                          return (
                            <div key={opt} className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 truncate max-w-[60%]">{opt}</span>
                              <span className="text-gray-500">{count} ({optPct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {stepData.length === 0 && metrics.views === 0 && (
              <p className="text-center text-gray-600 py-6 text-sm">Aún no hay datos de analytics</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? "bg-primary/10 border border-primary/30" : "bg-gray-800"}`}>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
