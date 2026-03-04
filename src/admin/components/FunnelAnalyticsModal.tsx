import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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

type Period = "today" | "7d" | "30d" | "all";

export default function FunnelAnalyticsModal({ open, onClose, entityType, entityId, entityName }: Props) {
  const [data, setData] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      let q = (supabase.from("funnel_analytics" as any) as any)
        .select("event_type, step_index, step_option, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (period !== "all") {
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
  }, [open, entityType, entityId, period]);

  const metrics = useMemo(() => {
    const views = data.filter(r => r.event_type === "view").length;
    const finalViews = data.filter(r => r.event_type === "final_view").length;
    const checkouts = data.filter(r => r.event_type === "checkout_click").length;
    const exits = data.filter(r => r.event_type === "exit").length;
    const pctFinal = views > 0 ? ((finalViews / views) * 100).toFixed(1) : "0";
    const pctCheckout = views > 0 ? ((checkouts / views) * 100).toFixed(1) : "0";
    return { views, finalViews, checkouts, exits, pctFinal, pctCheckout };
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

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "all", label: "Tudo" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📊 Analytics — {entityName}</DialogTitle>
        </DialogHeader>

        {/* Period filter */}
        <div className="flex gap-1 mb-4">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${period === p.key ? "bg-primary text-primary-foreground" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Visualizações" value={metrics.views} />
              <KpiCard label="Tela Final" value={metrics.finalViews} sub={`${metrics.pctFinal}%`} />
              <KpiCard label="Checkout" value={metrics.checkouts} sub={`${metrics.pctCheckout}%`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Saídas" value={metrics.exits} />
              <KpiCard label="Conversão" value={`${metrics.pctCheckout}%`} highlight />
            </div>

            {/* Step-by-step funnel */}
            {stepData.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300">Funil por Etapa</h3>
                {stepData.map(s => {
                  const pct = metrics.views > 0 ? ((s.total / metrics.views) * 100).toFixed(1) : "0";
                  const sortedOptions = Object.entries(s.options).sort((a, b) => b[1] - a[1]);
                  return (
                    <div key={s.stepIndex} className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-300">Pergunta {s.stepIndex + 1}</span>
                        <span className="text-xs text-gray-500">{s.total} respostas ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
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
              <p className="text-center text-gray-600 py-6 text-sm">Nenhum dado de analytics ainda</p>
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
