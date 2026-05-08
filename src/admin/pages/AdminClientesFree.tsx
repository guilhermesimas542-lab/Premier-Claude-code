import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Copy, Download, RefreshCw, Phone } from "lucide-react";
import { toast } from "sonner";
import { getTodayInChile } from "@/lib/timezone";

interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  main_tier: string;
  created_at: string;
  first_access_at: string | null;
  last_seen_at: string | null;
}

interface GamRow {
  user_id: string;
  total_logins: number;
  total_xp: number;
}

interface EntRow {
  user_id: string;
  starts_at: string;
  source: string;
  product_key: string;
}

interface EnrichedUser extends UserRow {
  total_logins: number;
  total_xp: number;
}

const getDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

const getEngajamentoBadge = (daysInactive: number) => {
  if (daysInactive <= 2) return { label: "Caliente", class: "bg-green-600/30 text-green-400" };
  if (daysInactive <= 7) return { label: "Tibio", class: "bg-yellow-600/30 text-yellow-400" };
  if (daysInactive <= 30) return { label: "Frío", class: "bg-orange-600/30 text-orange-400" };
  return { label: "Perdido", class: "bg-red-600/30 text-red-400" };
};

const daysDiff = (d: string | null) => {
  if (!d) return Infinity;
  return (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24);
};

type SortKey = "email" | "phone" | "created_at" | "last_seen_at" | "days_inactive" | "total_logins" | "engajamento";

export default function AdminClientesFree() {
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [conversions, setConversions] = useState<EntRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [engajamento, setEngajamento] = useState<string | null>(null);
  const [criadoFrom, setCriadoFrom] = useState("");
  const [criadoTo, setCriadoTo] = useState("");
  const [acessoFrom, setAcessoFrom] = useState("");
  const [acessoTo, setAcessoTo] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("last_seen_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, gamRes, convRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, email, phone, main_tier, created_at, first_access_at, last_seen_at")
        .eq("main_tier", "free" as any)
        .not("first_access_at", "is", null)
        .order("last_seen_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("user_gamification")
        .select("user_id, total_logins, total_xp"),
      supabase
        .from("entitlements")
        .select("user_id, starts_at, source, product_key")
        .eq("source", "purchase")
        .order("starts_at", { ascending: false }),
    ]);

    const rawUsers = (usersRes.data as UserRow[]) ?? [];
    const gamData = (gamRes.data as GamRow[]) ?? [];
    const gamMap: Record<string, GamRow> = {};
    for (const g of gamData) gamMap[g.user_id] = g;

    setUsers(rawUsers.map((u) => ({
      ...u,
      total_logins: gamMap[u.id]?.total_logins ?? 0,
      total_xp: gamMap[u.id]?.total_xp ?? 0,
    })));
    setConversions((convRes.data as EntRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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

  // KPIs Linha 1
  const kpis1 = useMemo(() => ({
    total: users.length,
    hoje: users.filter((u) => u.created_at.substring(0, 10) === today).length,
    ontem: users.filter((u) => u.created_at.substring(0, 10) === yesterday).length,
    sevenD: users.filter((u) => u.created_at.substring(0, 10) >= sevenDaysAgo).length,
  }), [users, today, yesterday, sevenDaysAgo]);

  // KPIs Linha 2
  const kpis2 = useMemo(() => ({
    ativosHoje: users.filter((u) => u.last_seen_at?.substring(0, 10) === today).length,
    quentes: users.filter((u) => daysDiff(u.last_seen_at) <= 2).length,
    frios: users.filter((u) => daysDiff(u.last_seen_at) > 30).length,
    conversoes7d: conversions.filter((e) => e.starts_at?.substring(0, 10) >= sevenDaysAgo).length,
  }), [users, conversions, today, sevenDaysAgo]);

  // Chart
  const chartData = useMemo(() => {
    const novosMap: Record<string, number> = {};
    const ativosMap: Record<string, number> = {};
    for (const u of users) {
      const dayCreated = u.created_at?.substring(0, 10);
      if (dayCreated) novosMap[dayCreated] = (novosMap[dayCreated] || 0) + 1;
      const dayActive = u.last_seen_at?.substring(0, 10);
      if (dayActive) ativosMap[dayActive] = (ativosMap[dayActive] || 0) + 1;
    }
    const allDates = new Set([...Object.keys(novosMap), ...Object.keys(ativosMap)]);
    return Array.from(allDates)
      .map((date) => ({
        date: new Date(date).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
        rawDate: date,
        novos: novosMap[date] || 0,
        ativos: ativosMap[date] || 0,
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .slice(-14);
  }, [users]);

  // Filtered
  const filtered = useMemo(() => {
    let list = users;
    if (engajamento === "quente") list = list.filter((u) => daysDiff(u.last_seen_at) <= 2);
    if (engajamento === "morno") list = list.filter((u) => { const d = daysDiff(u.last_seen_at); return d > 2 && d <= 7; });
    if (engajamento === "frio") list = list.filter((u) => { const d = daysDiff(u.last_seen_at); return d > 7 && d <= 30; });
    if (engajamento === "perdido") list = list.filter((u) => daysDiff(u.last_seen_at) > 30);
    if (criadoFrom) list = list.filter((u) => u.created_at >= criadoFrom);
    if (criadoTo) list = list.filter((u) => u.created_at <= criadoTo + "T23:59:59");
    if (acessoFrom) list = list.filter((u) => u.last_seen_at && u.last_seen_at >= acessoFrom);
    if (acessoTo) list = list.filter((u) => u.last_seen_at && u.last_seen_at <= acessoTo + "T23:59:59");
    return list;
  }, [users, engajamento, criadoFrom, criadoTo, acessoFrom, acessoTo]);

  // Sort
  const sortedUsers = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "email") { av = a.email; bv = b.email; }
      else if (sortKey === "phone") { av = a.phone ?? ""; bv = b.phone ?? ""; }
      else if (sortKey === "created_at") { av = a.created_at; bv = b.created_at; }
      else if (sortKey === "last_seen_at") { av = a.last_seen_at ?? ""; bv = b.last_seen_at ?? ""; }
      else if (sortKey === "days_inactive") { av = daysDiff(a.last_seen_at); bv = daysDiff(b.last_seen_at); }
      else if (sortKey === "total_logins") { av = a.total_logins; bv = b.total_logins; }
      else if (sortKey === "engajamento") { av = daysDiff(a.last_seen_at); bv = daysDiff(b.last_seen_at); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("¡Copiado!");
  };

  const exportCSV = useCallback(() => {
    const BOM = "\uFEFF";
    const headers = ["Correo", "Teléfono", "Creado el", "Último acceso", "Días inactivo", "Logins", "Engagement"];
    const rows = sortedUsers.map((u) => {
      const days = Math.floor(daysDiff(u.last_seen_at));
      const badge = getEngajamentoBadge(days);
      return [
        u.email,
        u.phone ?? "",
        new Date(u.created_at).toLocaleString("es-CL"),
        u.last_seen_at ? new Date(u.last_seen_at).toLocaleString("es-CL") : "—",
        days === Infinity ? "Nunca" : String(days),
        String(u.total_logins),
        badge.label,
      ];
    });
    const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-gratis-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado con ${sortedUsers.length} registros`);
  }, [sortedUsers, today]);

  const engajamentoPills = [
    { key: "quente", label: "Calientes", color: "bg-green-600/30 text-green-400 ring-green-400" },
    { key: "morno", label: "Tibios", color: "bg-yellow-600/30 text-yellow-400 ring-yellow-400" },
    { key: "frio", label: "Fríos", color: "bg-orange-600/30 text-orange-400 ring-orange-400" },
    { key: "perdido", label: "Perdidos", color: "bg-red-600/30 text-red-400 ring-red-400" },
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
            Clientes Gratis
          </h1>
          <button
            onClick={() => load()}
            className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Gratis activos con potencial de conversión</p>
      </div>

      {/* KPIs Linha 1 — Base */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Gratis", value: kpis1.total, color: "text-blue-400" },
          { label: "Nuevos hoy", value: kpis1.hoje, color: "text-yellow-400" },
          { label: "Nuevos ayer", value: kpis1.ontem, color: "text-yellow-400" },
          { label: "Nuevos 7 días", value: kpis1.sevenD, color: "text-yellow-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-muted/10 p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`} style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
              {loading ? "…" : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* KPIs Linha 2 — Engajamento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Activos hoy", value: kpis2.ativosHoje, color: "text-green-400" },
          { label: "Calientes (≤2d)", value: kpis2.quentes, color: "text-green-400" },
          { label: "Fríos (30d+)", value: kpis2.frios, color: "text-red-400" },
          { label: "Conversiones 7d", value: kpis2.conversoes7d, color: "text-purple-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-muted/10 p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`} style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
              {loading ? "…" : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-muted/10 p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Nuevos Gratis vs Activos por día</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={chartData}
            onClick={(state: any) => {
              if (state?.activePayload?.[0]?.payload?.rawDate) {
                const rawDate = state.activePayload[0].payload.rawDate;
                setCriadoFrom(rawDate);
                setCriadoTo(rawDate);
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
            <Bar dataKey="novos" name="Nuevos Gratis" fill="#3b82f6" radius={[4, 4, 0, 0]} cursor="pointer" />
            <Bar dataKey="ativos" name="Activos" fill="#22c55e" radius={[4, 4, 0, 0]} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engajamento Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {engajamentoPills.map((p) => (
          <button
            key={p.key}
            onClick={() => setEngajamento((prev) => prev === p.key ? null : p.key)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              engajamento === p.key
                ? `${p.color} ring-1`
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => {
            setEngajamento(null);
            setCriadoFrom("");
            setCriadoTo("");
            setAcessoFrom("");
            setAcessoTo("");
          }}
          className="px-3 py-1 rounded-full text-xs font-bold bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Limpiar
        </button>
      </div>

      {/* Date Filters + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Creado el</span>
        <Input type="date" value={criadoFrom} onChange={(e) => setCriadoFrom(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8 w-36" />
        <span className="text-xs text-muted-foreground">hasta</span>
        <Input type="date" value={criadoTo} onChange={(e) => setCriadoTo(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8 w-36" />

        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">Último acceso</span>
        <Input type="date" value={acessoFrom} onChange={(e) => setAcessoFrom(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8 w-36" />
        <span className="text-xs text-muted-foreground">hasta</span>
        <Input type="date" value={acessoTo} onChange={(e) => setAcessoTo(e.target.value)} className="bg-gray-800 border-gray-700 text-xs h-8 w-36" />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              const emails = sortedUsers.map((u) => u.email).filter(Boolean).join(", ");
              if (!emails) { toast.error("Ningún correo para copiar."); return; }
              navigator.clipboard.writeText(emails).then(() => toast.success(`¡${sortedUsers.length} correos copiados!`));
            }}
            className="flex items-center gap-1 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 px-3 py-1.5 rounded-md font-medium transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar correos ({sortedUsers.length})
          </button>
          <button
            onClick={() => {
              const phones = sortedUsers.map((u) => u.phone).filter(Boolean).join(", ");
              if (!phones) { toast.error("Ningún teléfono para copiar."); return; }
              const count = sortedUsers.filter((u) => u.phone).length;
              navigator.clipboard.writeText(phones).then(() => toast.success(`¡${count} teléfonos copiados!`));
            }}
            className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-md font-medium transition-colors"
          >
            <Phone className="w-3.5 h-3.5" /> Copiar teléfonos
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
        Mostrando {filtered.length} de {users.length} clientes gratis
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <SortHeader label="Correo" field="email" />
              <SortHeader label="Teléfono" field="phone" />
              <SortHeader label="Creado el" field="created_at" />
              <SortHeader label="Último acceso" field="last_seen_at" />
              <SortHeader label="Días inactivo" field="days_inactive" />
              <SortHeader label="Logins" field="total_logins" />
              <SortHeader label="Engagement" field="engajamento" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Cargando…</td></tr>
            ) : sortedUsers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Ningún cliente encontrado</td></tr>
            ) : (
              sortedUsers.map((u) => {
                const days = Math.floor(daysDiff(u.last_seen_at));
                const badge = getEngajamentoBadge(days);
                return (
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
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleString("es-CL")}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {u.last_seen_at ? new Date(u.last_seen_at).toLocaleString("es-CL") : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs text-center">
                      {days === Infinity ? "—" : `${days}d`}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs text-center">
                      {u.total_logins}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.class}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
