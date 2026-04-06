import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { getTodayInBrazil } from "@/lib/timezone";

interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  main_tier: string;
  created_at: string;
  first_access_at: string | null;
}

const getDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

const quickFilters = [
  { label: "Hoje", from: getDateStr(0), to: getDateStr(0) },
  { label: "Ontem", from: getDateStr(1), to: getDateStr(1) },
  { label: "Anteontem", from: getDateStr(2), to: getDateStr(2) },
  { label: "Últimos 7 dias", from: getDateStr(6), to: getDateStr(0) },
];

type SortKey = "email" | "phone" | "main_tier" | "created_at";

export default function AdminNaoAcessou() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [totalPagantes, setTotalPagantes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const [res, pagRes] = await Promise.all([
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
    ]);
    setUsers((res.data as UserRow[]) ?? []);
    setTotalPagantes(pagRes.count ?? 0);
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

  // KPIs
  const today = getTodayInBrazil();
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

  const kpis = useMemo(() => {
    const total = filtered.length;
    const liberadosHoje = filtered.filter((u) => u.created_at.substring(0, 10) === today).length;
    const liberadosOntem = filtered.filter((u) => u.created_at.substring(0, 10) === yesterday).length;
    const liberados7d = filtered.filter((u) => u.created_at.substring(0, 10) >= sevenDaysAgo).length;
    const taxa = totalPagantes > 0 ? ((users.length / totalPagantes) * 100).toFixed(1) : "0";
    return { total, liberadosHoje, liberadosOntem, liberados7d, taxa };
  }, [filtered, users.length, totalPagantes, today, yesterday, sevenDaysAgo]);

  // Chart data (uses unfiltered `users` for full picture, highlights selected)
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of users) {
      const day = u.created_at?.substring(0, 10) ?? "desconhecido";
      map[day] = (map[day] || 0) + 1;
    }
    return Object.entries(map)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        rawDate: date,
        count,
        fill: (filterFrom === date && filterTo === date) ? "#f97316" : "#ef4444",
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .slice(-14);
  }, [users, filterFrom, filterTo]);

  // CSV export
  const exportCSV = useCallback(() => {
    const BOM = "\uFEFF";
    const headers = ["Email", "Telefone", "Plano", "Liberado em"];
    const rows = sortedUsers.map((u) => [
      u.email,
      u.phone ?? "",
      u.main_tier,
      new Date(u.created_at).toLocaleString("pt-BR"),
    ]);
    const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nao-acessou-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado com ${sortedUsers.length} registros`);
  }, [sortedUsers, today]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const kpiCards = [
    { label: "Total não acessou", value: kpis.total, color: "text-red-400" },
    { label: "Liberados hoje", value: kpis.liberadosHoje, color: "text-yellow-400" },
    { label: "Liberados ontem", value: kpis.liberadosOntem, color: "text-orange-400" },
    { label: "Últimos 7 dias", value: kpis.liberados7d, color: "text-blue-400" },
    { label: "Taxa não ativação", value: `${kpis.taxa}%`, color: "text-red-500" },
  ];

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
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
          Não Acessou
        </h1>
        <p className="text-sm text-muted-foreground">Clientes liberados que ainda não abriram o app</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-muted/10 p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`} style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
              {loading ? "…" : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-muted/10 p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Não acessou por dia de liberação</h2>
        <ResponsiveContainer width="100%" height={220}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#fff" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Não acessou" cursor="pointer">
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
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
          Limpar
        </button>
      </div>

      {/* Date Filters + Export */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Liberação</span>
        <Input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="bg-gray-800 border-gray-700 text-xs h-8 w-36"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <Input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="bg-gray-800 border-gray-700 text-xs h-8 w-36"
        />
        <button
          onClick={exportCSV}
          className="ml-auto flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Exibindo {filtered.length} de {users.length} clientes não ativados
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <SortHeader label="Email" field="email" />
              <SortHeader label="Telefone" field="phone" />
              <SortHeader label="Plano" field="main_tier" />
              <SortHeader label="Liberado em" field="created_at" />
              <th className="text-center px-4 py-2 text-xs text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Carregando…</td></tr>
            ) : sortedUsers.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</td></tr>
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
                    {new Date(u.created_at).toLocaleString("pt-BR")}
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
