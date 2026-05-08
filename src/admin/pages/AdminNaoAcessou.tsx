import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Copy, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getTodayInChile } from "@/lib/timezone";

interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  main_tier: string;
  created_at: string;
  first_access_at: string | null;
}

interface ActivatedRow {
  id: string;
  first_access_at: string | null;
  created_at: string;
  main_tier: string;
}

const getDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

const quickFilters = [
  { label: "Hoy", from: getDateStr(0), to: getDateStr(0) },
  { label: "Ayer", from: getDateStr(1), to: getDateStr(1) },
  { label: "Anteayer", from: getDateStr(2), to: getDateStr(2) },
  { label: "Últimos 7 días", from: getDateStr(6), to: getDateStr(0) },
];

type SortKey = "email" | "phone" | "main_tier" | "created_at";

export default function AdminNaoAcessou() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activatedUsers, setActivatedUsers] = useState<ActivatedRow[]>([]);
  const [totalPagantes, setTotalPagantes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const [res, pagRes, activatedRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, email, phone, main_tier, created_at, first_access_at", { count: "exact" })
        .is("first_access_at", null)
        .neq("main_tier", "free")
        .order("created_at", { ascending: false }),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .neq("main_tier", "free"),
      supabase
        .from("users")
        .select("id, first_access_at, created_at, main_tier")
        .not("first_access_at", "is", null)
        .neq("main_tier", "free")
        .order("first_access_at", { ascending: false }),
    ]);
    setUsers((res.data as UserRow[]) ?? []);
    setTotalPagantes(pagRes.count ?? 0);
    setActivatedUsers((activatedRes.data as ActivatedRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered users
  const filtered = useMemo(() => {
    let list = users;
    if (filterFrom) list = list.filter((u) => u.created_at >= filterFrom);
    if (filterTo) list = list.filter((u) => u.created_at <= filterTo + "T23:59:59");
    return list;
  }, [users, filterFrom, filterTo]);

  // Sorted users
  const sortedUsers = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = (a[sortKey] ?? "") as string;
      const bVal = (b[sortKey] ?? "") as string;
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Date helpers
  const today = getTodayInChile();
  const yesterday = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().substring(0, 10);
  }, [today]);
  const sevenDaysAgo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d.toISOString().substring(0, 10);
  }, [today]);

  // KPIs — Situação atual
  const kpis = useMemo(() => {
    const total = filtered.length;
    const liberadosHoje = filtered.filter((u) => u.created_at.substring(0, 10) === today).length;
    const liberadosOntem = filtered.filter((u) => u.created_at.substring(0, 10) === yesterday).length;
    const taxa = totalPagantes > 0 ? ((users.length / totalPagantes) * 100).toFixed(1) : "0";
    return { total, liberadosHoje, liberadosOntem, taxa };
  }, [filtered, users.length, totalPagantes, today, yesterday]);

  // KPIs — Progresso
  const progressKpis = useMemo(() => {
    const ativadosHoje = activatedUsers.filter(
      (u) => u.first_access_at?.substring(0, 10) === today
    ).length;
    const ativadosOntem = activatedUsers.filter(
      (u) => u.first_access_at?.substring(0, 10) === yesterday
    ).length;
    const ativados7d = activatedUsers.filter(
      (u) => (u.first_access_at?.substring(0, 10) ?? "") >= sevenDaysAgo
    ).length;
    const totalAtivados = activatedUsers.length;
    return { ativadosHoje, ativadosOntem, ativados7d, totalAtivados };
  }, [activatedUsers, today, yesterday, sevenDaysAgo]);

  // Chart data — combined
  const chartData = useMemo(() => {
    const naoAcessouMap: Record<string, number> = {};
    const ativadosMap: Record<string, number> = {};

    for (const u of users) {
      const day = u.created_at?.substring(0, 10) ?? "desconhecido";
      naoAcessouMap[day] = (naoAcessouMap[day] || 0) + 1;
    }

    for (const u of activatedUsers) {
      const day = u.first_access_at?.substring(0, 10);
      if (day) {
        ativadosMap[day] = (ativadosMap[day] || 0) + 1;
      }
    }

    const allDates = new Set([...Object.keys(naoAcessouMap), ...Object.keys(ativadosMap)]);

    return Array.from(allDates)
      .map((date) => ({
        date: new Date(date).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
        rawDate: date,
        naoAcessou: naoAcessouMap[date] || 0,
        ativados: ativadosMap[date] || 0,
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .slice(-14);
  }, [users, activatedUsers]);

  // CSV export
  const exportCSV = useCallback(() => {
    const BOM = "\uFEFF";
    const headers = ["Correo", "Teléfono", "Plan", "Liberado el"];
    const rows = sortedUsers.map((u) => [
      u.email,
      u.phone ?? "",
      u.main_tier,
      new Date(u.created_at).toLocaleString("es-CL"),
    ]);
    const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cliente-inactivo-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado con ${sortedUsers.length} registros`);
  }, [sortedUsers, today]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("¡Copiado!");
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => toggleSort(field)}
      className="text-left px-4 py-2 text-xs text-muted-foreground font-medium cursor-pointer hover:text-white transition-colors select-none"
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === field && (
          <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
            Cliente Inactivo
          </h1>
          <button
            onClick={() => load()}
            className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Clientes liberados que aún no abrieron la app</p>
      </div>

      {/* KPIs Linha 1 — Situação atual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total inactivos", value: kpis.total, color: "text-red-400" },
          { label: "Nuevos hoy", value: kpis.liberadosHoje, color: "text-yellow-400" },
          { label: "Nuevos ayer", value: kpis.liberadosOntem, color: "text-yellow-400" },
          { label: "Tasa de no activación", value: `${kpis.taxa}%`, color: "text-red-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-muted/10 p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`} style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
              {loading ? "…" : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* KPIs Linha 2 — Progresso */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Activados hoy", value: progressKpis.ativadosHoje },
          { label: "Activados ayer", value: progressKpis.ativadosOntem },
          { label: "Activados 7 días", value: progressKpis.ativados7d },
          { label: "Total ya activados", value: progressKpis.totalAtivados },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-muted/10 p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-1">{k.label}</p>
            <p className="text-3xl font-bold text-green-400" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
              {loading ? "…" : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-muted/10 p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Inactivos vs Activados por día</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={chartData}
            onClick={(state: any) => {
              if (state?.activePayload?.[0]?.payload?.rawDate) {
                const rawDate = state.activePayload[0].payload.rawDate;
                setFilterFrom(rawDate);
                setFilterTo(rawDate);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend />
            <Bar dataKey="naoAcessou" name="Inactivos" fill="#ef4444" radius={[4, 4, 0, 0]} cursor="pointer" />
            <Bar dataKey="ativados" name="Activados" fill="#22c55e" radius={[4, 4, 0, 0]} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {quickFilters.map((qf) => (
          <button
            key={qf.label}
            onClick={() => { setFilterFrom(qf.from); setFilterTo(qf.to); }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filterFrom === qf.from && filterTo === qf.to
                ? "bg-red-600/30 text-red-400 ring-1 ring-red-400"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {qf.label}
          </button>
        ))}
        <button
          onClick={() => { setFilterFrom(""); setFilterTo(""); }}
          className="px-3 py-1 rounded-full text-xs font-bold bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Limpiar
        </button>
      </div>

      {/* Date Filters + Export */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Liberación</span>
        <Input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="bg-gray-800 border-gray-700 text-xs h-8 w-36"
        />
        <span className="text-xs text-muted-foreground">hasta</span>
        <Input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="bg-gray-800 border-gray-700 text-xs h-8 w-36"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              const emails = sortedUsers.map((u) => u.email).filter(Boolean).join(", ");
              if (!emails) { toast.error("Ningún correo para copiar."); return; }
              navigator.clipboard.writeText(emails).then(() => {
                toast.success(`¡${sortedUsers.length} correos copiados!`);
              }).catch(() => { toast.error("Error al copiar. Inténtalo de nuevo."); });
            }}
            className="flex items-center gap-1 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 px-3 py-1.5 rounded-md font-medium transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar correos ({sortedUsers.length})
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md"
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {users.length} clientes no activados
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <SortHeader label="Correo" field="email" />
              <SortHeader label="Teléfono" field="phone" />
              <SortHeader label="Plan" field="main_tier" />
              <SortHeader label="Liberado el" field="created_at" />
              <th className="text-center px-4 py-2 text-xs text-muted-foreground font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Cargando…</td></tr>
            ) : sortedUsers.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Ningún cliente encontrado</td></tr>
            ) : (
              sortedUsers.map((u) => (
                <tr key={u.id} className="border-b border-border hover:bg-muted/10">
                  <td className="px-4 py-2 text-white">
                    <div className="flex items-center gap-1">
                      <span className="truncate max-w-[200px]">{u.email}</span>
                      <button onClick={() => copyText(u.email)} className="text-muted-foreground hover:text-white shrink-0">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-white">
                    {u.phone ? (
                      <div className="flex items-center gap-1">
                        <span>{u.phone}</span>
                        <button onClick={() => copyText(u.phone!)} className="text-muted-foreground hover:text-white shrink-0">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.main_tier === "ultra" ? "bg-yellow-500/20 text-yellow-400" :
                      u.main_tier === "pro" ? "bg-purple-500/20 text-purple-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>
                      {u.main_tier}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => copyText(u.email)} className="text-muted-foreground hover:text-white">
                      <Copy className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
