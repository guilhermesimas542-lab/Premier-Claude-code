import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Bug, Download, ChevronDown, ChevronUp, Users, Hash, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AppError {
  id: string;
  created_at: string;
  house_id: string | null;
  user_email: string | null;
  error_message: string;
  error_stack: string | null;
  error_fingerprint: string;
  screen: string | null;
  component: string | null;
  properties: Record<string, unknown> | null;
}

interface GroupedError {
  fingerprint: string;
  message: string;
  count: number;
  uniqueUsers: number;
  screens: string[];
  lastOccurrence: string;
  lastStack: string | null;
  component: string | null;
}

const periods = [
  { label: "Hoy", days: 0 },
  { label: "Ayer", days: 1 },
  { label: "Anteayer", days: 2 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
];

export default function AdminErrors() {
  const { selectedHouseId, selectedHouse } = useBettingHouseAdmin();
  const [errors, setErrors] = useState<AppError[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(7);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expandedFp, setExpandedFp] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedHouseId) return;
    setLoading(true);

    let startISO: string;
    let endISO: string | null = null;

    if (periodDays === -1 && customFrom) {
      startISO = customFrom;
      endISO = customTo ? customTo + "T23:59:59" : null;
    } else if (periodDays <= 2) {
      const d = new Date();
      d.setDate(d.getDate() - periodDays);
      d.setHours(0, 0, 0, 0);
      startISO = d.toISOString();
      const e = new Date(d);
      e.setHours(23, 59, 59, 999);
      endISO = e.toISOString();
    } else {
      const d = new Date();
      d.setDate(d.getDate() - periodDays);
      startISO = d.toISOString();
    }

    let query = supabase
      .from("app_errors")
      .select("*")
      .gte("created_at", startISO)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (endISO) query = query.lte("created_at", endISO);
    query = query.or(`house_id.eq.${selectedHouseId},house_id.is.null`);

    const { data } = await query;
    setErrors((data as AppError[]) ?? []);
    setLoading(false);
  }, [selectedHouseId, periodDays, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo<GroupedError[]>(() => {
    const map = new Map<string, { items: AppError[] }>();
    for (const e of errors) {
      const existing = map.get(e.error_fingerprint);
      if (existing) {
        existing.items.push(e);
      } else {
        map.set(e.error_fingerprint, { items: [e] });
      }
    }

    return Array.from(map.entries())
      .map(([fp, { items }]) => {
        const emails = new Set(items.map((i) => i.user_email).filter(Boolean));
        const screens = [...new Set(items.map((i) => i.screen).filter(Boolean))] as string[];
        const latest = items[0];
        return {
          fingerprint: fp,
          message: latest.error_message,
          count: items.length,
          uniqueUsers: emails.size,
          screens,
          lastOccurrence: latest.created_at,
          lastStack: latest.error_stack,
          component: latest.component,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [errors]);

  const totalErrors = errors.length;
  const uniqueFingerprints = grouped.length;

  const exportCSV = () => {
    const header = "Fingerprint,Mensaje,Ocurrencias,Usuarios,Pantallas,Último Error\n";
    const rows = grouped
      .map(
        (g) =>
          `"${g.fingerprint}","${g.message.replace(/"/g, '""')}",${g.count},${g.uniqueUsers},"${g.screens.join("; ")}","${g.lastOccurrence}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `errores-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bug className="w-6 h-6 text-red-400" /> Errores de la App
            </h1>
            <button
              onClick={() => load()}
              className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Errores JavaScript capturados automáticamente en el frontend
            {selectedHouse && <span className="text-blue-400 ml-1">— {selectedHouse.name}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="w-4 h-4" /> CSV
        </Button>
      </div>

      {/* Period filter */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.days}
              onClick={() => { setPeriodDays(p.days); setCustomFrom(""); setCustomTo(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                periodDays === p.days
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPeriodDays(-1); }} className="bg-gray-800 border-gray-700 text-xs h-8 w-40" />
          <span className="text-xs text-muted-foreground">hasta</span>
          <Input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPeriodDays(-1); }} className="bg-gray-800 border-gray-700 text-xs h-8 w-40" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 font-normal">Total de Errores</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-400">{totalErrors}</span>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 font-normal">Errores Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-400">{uniqueFingerprints}</span>
          </CardContent>
        </Card>
      </div>

      {/* Error list */}
      {loading ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Ningún error encontrado en el período.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((g) => {
            const isExpanded = expandedFp === g.fingerprint;
            return (
              <div
                key={g.fingerprint}
                className="bg-gray-900 border border-white/10 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFp(isExpanded ? null : g.fingerprint)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-red-300 truncate">{g.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {g.count}x
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {g.uniqueUsers} usuario{g.uniqueUsers !== 1 ? "s" : ""}
                      </span>
                      {g.screens[0] && <span>📍 {g.screens[0]}</span>}
                      {g.component && (
                        <span className="text-gray-600">via {g.component}</span>
                      )}
                      <span>
                        {format(new Date(g.lastOccurrence), "dd/MM HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">
                      {g.count}x
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-1" />
                  )}
                </button>
                {isExpanded && g.lastStack && (
                  <div className="px-4 pb-4">
                    <pre className="text-xs text-gray-400 bg-black/40 rounded-md p-3 overflow-x-auto whitespace-pre-wrap max-h-60">
                      {g.lastStack}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
