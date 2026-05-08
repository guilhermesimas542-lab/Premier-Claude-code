import { useEffect, useState, useCallback } from "react";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays, eachDayOfInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useBettingHouseAdmin } from "@/admin/context/BettingHouseContext";
import { Users, UserPlus, AlertTriangle, Wifi, Info, CalendarIcon, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

const PLAN_COLORS: Record<string, string> = { Gratis: "#3b82f6", "Básico": "#10b981", Pro: "#f59e0b", Ultra: "#8b5cf6" };
const ADDON_COLORS: Record<string, string> = { Apalancamiento: "#10b981", "Múltiples / Bingo": "#ef4444", "Live Telegram": "#3b82f6", "Acceso Vitalicio": "#f59e0b" };

/* ── Tooltip texts ── */
const KPI_TOOLTIPS: Record<string, string> = {
  "Usuarios Totales": "Total de usuarios registrados en Premier, incluyendo usuarios gratis y pagados. Este número no se ve afectado por el filtro de período.",
  "Usuarios Activos": "Usuarios únicos que abrieron la aplicación en el período seleccionado. Contabiliza cualquier sesión registrada dentro del intervalo de fechas.",
  "Usuarios En Línea": "Usuarios que están usando la aplicación en este momento exacto. Considera sesiones iniciadas en los últimos 5 minutos. Se actualiza automáticamente cada 30 segundos.",
  "Churn (Riesgo)": "Usuarios con plan pagado (Básico, Pro o Ultra) que no abrieron la aplicación en los últimos 15 días. Estos clientes están en riesgo de cancelación. Este número no se ve afectado por el filtro de período.",
};

const PCT_TOOLTIPS: Record<string, string> = {
  "% Activos / Total": "Porcentaje de usuarios que abrieron la app en el período seleccionado en relación al total de usuarios registrados. Cuanto mayor, mejor el engagement general de la base.",
  "% Nuevos en el Período": "Porcentaje de nuevos registros en el período seleccionado en relación al total de usuarios. Indica el ritmo de crecimiento de la base.",
  "% En Línea / Activos": "Porcentaje de usuarios en línea ahora en relación a los usuarios activos en el período. Muestra el nivel de uso en tiempo real.",
  "% Churn / Pagados": "Porcentaje de usuarios pagados en riesgo de cancelación (sin abrir la app hace 15+ días) en relación al total de usuarios pagados. Cuanto menor, mejor la retención.",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

type PlanFilter = "geral" | "free" | "basic" | "pro" | "ultra" | "alavancagem" | "multiplas_bingo" | "live_telegram" | "acesso_vitalicio";

const PLAN_FILTERS_MAIN: { key: PlanFilter; label: string }[] = [
  { key: "geral", label: "General" },
  { key: "free", label: "Gratis" },
  { key: "basic", label: "Básico" },
  { key: "pro", label: "Pro" },
  { key: "ultra", label: "Ultra" },
];
const PLAN_FILTERS_ADDONS: { key: PlanFilter; label: string }[] = [
  { key: "alavancagem", label: "Apalancamiento" },
  { key: "multiplas_bingo", label: "Múltiples / Bingo" },
  { key: "live_telegram", label: "Live Telegram" },
  { key: "acesso_vitalicio", label: "Acceso Vitalicio" },
];

function getColorClass(pct: number, thresholds: [number, number], inverted = false) {
  if (inverted) {
    if (pct >= thresholds[1]) return "text-red-400";
    if (pct >= thresholds[0]) return "text-amber-400";
    return "text-green-400";
  }
  if (pct >= thresholds[1]) return "text-green-400";
  if (pct >= thresholds[0]) return "text-amber-400";
  return "text-red-400";
}

/* ── Info Button component ── */
function InfoPopup({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="ml-auto shrink-0">
        <Info className="w-3.5 h-3.5 text-gray-600 hover:text-gray-300 transition-colors" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-sm">{title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 leading-relaxed">{text}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminDashboard() {
  const now = new Date();
  const { selectedHouseId } = useBettingHouseAdmin();

  // Period filter
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(now));
  const [dateTo, setDateTo] = useState<Date>(now);
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [activeShortcut, setActiveShortcut] = useState("today");

  // Plan filter
  const [planFilter, setPlanFilter] = useState<PlanFilter>("geral");

  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Raw data
  const [allUsers, setAllUsers] = useState<{ id: string; email?: string; nickname?: string | null; main_tier: string; created_at?: string; last_seen_at: string | null }[]>([]);
  const [allEntitlements, setAllEntitlements] = useState<{ product_key: string; user_id: string }[]>([]);
  const [newSignups, setNewSignups] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [churnIds, setChurnIds] = useState<string[]>([]);
  const [paidIds, setPaidIds] = useState<string[]>([]);
  const [sessionsData, setSessionsData] = useState<{ user_id: string; session_start_at: string }[]>([]);

  const applyShortcut = (key: string) => {
    setActiveShortcut(key);
    const today = new Date();
    let from: Date, to: Date;
    switch (key) {
      case "today": from = startOfDay(today); to = today; break;
      case "yesterday": from = startOfDay(subDays(today, 1)); to = endOfDay(subDays(today, 1)); break;
      case "week": from = startOfWeek(today, { weekStartsOn: 1 }); to = today; break;
      case "month": from = startOfMonth(today); to = today; break;
      case "15d": from = subDays(today, 15); to = today; break;
      case "30d": from = subDays(today, 30); to = today; break;
      case "all": from = new Date(2026, 0, 1); to = today; break;
      case "7d": default: from = subDays(today, 7); to = today; break;
    }
    setDateFrom(from);
    setDateTo(to);
  };

  // Online polling — use users.last_seen_at
  const fetchOnline = useCallback(async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    let q = supabase.from("users").select("id", { count: "exact", head: true }).gte("last_seen_at", fiveMinAgo);
    if (selectedHouseId) q = q.eq("betting_house_id", selectedHouseId);
    const { count } = await q;
    setOnlineCount(count ?? 0);
  }, [selectedHouseId]);

  useEffect(() => {
    fetchOnline();
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, [fetchOnline]);

  // Main data load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = startOfDay(dateFrom).toISOString();
      const until = endOfDay(dateTo).toISOString();
      const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();
      const PAGE_SIZE = 1000;

      // Helper: paginate any Supabase query to fetch ALL rows beyond the 1000 default cap
      const fetchAllPaginated = async <T,>(
        builder: () => any,
      ): Promise<T[]> => {
        const all: T[] = [];
        let page = 0;
        while (true) {
          const { data, error } = await builder().range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
          if (error || !data || data.length === 0) break;
          all.push(...(data as T[]));
          if (data.length < PAGE_SIZE) break;
          page++;
          if (page > 100) break; // safety cap (~100k rows)
        }
        return all;
      };

      // ── Users (paginated full fetch) ───────────────────────────────────────
      const usersBuilder = () => {
        let q = supabase.from("users").select("id, email, nickname, main_tier, created_at, last_seen_at, betting_house_id");
        if (selectedHouseId) q = q.eq("betting_house_id", selectedHouseId);
        return q;
      };
      // ── New signups in period (count only, no row fetch) ───────────────────
      let newUsersQ = supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .lte("created_at", until) as any;
      if (selectedHouseId) newUsersQ = newUsersQ.eq("betting_house_id", selectedHouseId);

      // ── Paid users (paginated full fetch — needed for churn intersection) ──
      const paidBuilder = () => {
        let q = supabase.from("users").select("id").neq("main_tier", "free");
        if (selectedHouseId) q = q.eq("betting_house_id", selectedHouseId);
        return q;
      };

      const [newUsersRes, users, paid] = await Promise.all([
        newUsersQ,
        fetchAllPaginated<{ id: string; email?: string; nickname?: string | null; main_tier: string; created_at?: string; last_seen_at: string | null }>(usersBuilder),
        fetchAllPaginated<{ id: string }>(paidBuilder),
      ]);

      // ── Events for DAU chart (paginated) ───────────────────────────────────
      const allEventsData = await fetchAllPaginated<{ user_id: string; created_at: string }>(() => {
        let q = supabase
          .from("events")
          .select("user_id, created_at")
          .gte("created_at", since)
          .lte("created_at", until)
          .not("user_id", "is", null);
        if (selectedHouseId) q = q.eq("house_id", selectedHouseId);
        return q;
      });
      setSessionsData(allEventsData.map((e) => ({ user_id: e.user_id, session_start_at: e.created_at })));

      // ── Entitlements (paginated; filter by user_id chunks if house-scoped) ─
      let entitlementsData: { product_key: string; user_id: string }[] = [];
      if (selectedHouseId) {
        // House-scoped: intersect with current house users in chunks of 500 ids
        const houseUserIds = users.map((u) => u.id);
        const CHUNK = 500;
        for (let i = 0; i < houseUserIds.length; i += CHUNK) {
          const slice = houseUserIds.slice(i, i + CHUNK);
          const chunkData = await fetchAllPaginated<{ product_key: string; user_id: string }>(() =>
            supabase.from("entitlements").select("product_key, user_id").eq("status", "active").in("user_id", slice),
          );
          entitlementsData.push(...chunkData);
        }
      } else {
        entitlementsData = await fetchAllPaginated<{ product_key: string; user_id: string }>(() =>
          supabase.from("entitlements").select("product_key, user_id").eq("status", "active"),
        );
      }

      setAllUsers(users);
      setAllEntitlements(entitlementsData);
      setNewSignups(newUsersRes.count ?? 0);
      setPaidIds(paid.map((u) => u.id));

      // ── Churn — paid users whose last_seen_at is older than 15 days ───────
      if (paid.length > 0) {
        const ids = paid.map((u) => u.id);
        // Fetch all paid users seen recently (paginated, chunked by 500 ids to avoid URL length limits)
        const recentIds = new Set<string>();
        const CHUNK = 500;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const slice = ids.slice(i, i + CHUNK);
          const chunk = await fetchAllPaginated<{ id: string }>(() =>
            supabase.from("users").select("id").gte("last_seen_at", fifteenDaysAgo).in("id", slice),
          );
          chunk.forEach((u) => recentIds.add(u.id));
        }
        setChurnIds(ids.filter((id) => !recentIds.has(id)));
      } else {
        setChurnIds([]);
      }

      setLoading(false);
    };
    load();
  }, [dateFrom, dateTo, selectedHouseId]);

  if (loading) return <div className="text-gray-400">Cargando…</div>;

  /* ── Compute filtered user IDs based on plan filter ── */
  let filteredUserIds: Set<string> | null = null; // null = no filter (geral)

  if (planFilter !== "geral") {
    if (["alavancagem", "multiplas_bingo", "live_telegram", "acesso_vitalicio"].includes(planFilter)) {
      filteredUserIds = new Set(allEntitlements.filter((e) => e.product_key === planFilter).map((e) => e.user_id));
    } else {
      filteredUserIds = new Set(allUsers.filter((u) => u.main_tier === planFilter).map((u) => u.id));
    }
  }

  const totalUsers = filteredUserIds ? filteredUserIds.size : allUsers.length;

  // Active users = users whose last_seen_at falls within the selected period
  const since = dateFrom.toISOString();
  const until = dateTo.toISOString();
  const activeUsersList = allUsers.filter((u) => {
    if (!u.last_seen_at) return false;
    if (filteredUserIds && !filteredUserIds.has(u.id)) return false;
    return u.last_seen_at >= since && u.last_seen_at <= until;
  });
  const activeUsers = activeUsersList.length;

  // Online — already a simple count, apply plan filter
  const onlineUsers = onlineCount; // plan filter not applicable to count-only query

  // DAU based on sessions table — unique users per day across the full date range
  const dauMap: Record<string, Set<string>> = {};
  // Initialize all days in range with empty sets
  const allDays = eachDayOfInterval({ start: startOfDay(dateFrom), end: startOfDay(dateTo) });
  allDays.forEach((d) => { dauMap[format(d, "yyyy-MM-dd")] = new Set(); });
  // Fill from sessions data
  sessionsData.forEach((s) => {
    if (filteredUserIds && !filteredUserIds.has(s.user_id)) return;
    const day = s.session_start_at.slice(0, 10);
    if (dauMap[day]) dauMap[day].add(s.user_id);
  });
  const dauData = allDays.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: format(d, "MM-dd"), users: dauMap[key]?.size ?? 0 };
  });

  const relevantPaidIds = filteredUserIds
    ? paidIds.filter((id) => filteredUserIds!.has(id))
    : paidIds;
  const churnRisk = planFilter === "free" ? 0 : (filteredUserIds
    ? churnIds.filter((id) => filteredUserIds!.has(id)).length
    : churnIds.length);
  const paidUsersCount = relevantPaidIds.length;

  // Percentages
  const pctActiveTotal = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  const pctNewPeriod = totalUsers > 0 ? (newSignups / totalUsers) * 100 : 0;
  const pctOnlineActive = activeUsers > 0 ? (onlineUsers / activeUsers) * 100 : 0;
  const pctChurnPaid = paidUsersCount > 0 ? (churnRisk / paidUsersCount) * 100 : 0;

  const relevantUsers = filteredUserIds
    ? allUsers.filter((u) => filteredUserIds!.has(u.id))
    : allUsers;
  const tierCounts: Record<string, number> = {};
  relevantUsers.forEach((u) => { tierCounts[u.main_tier] = (tierCounts[u.main_tier] ?? 0) + 1; });
  const tierOrder = ["free", "basic", "pro", "ultra"];
  const tierLabels: Record<string, string> = { free: "Gratis", basic: "Básico", pro: "Pro", ultra: "Ultra" };
  const planDist = tierOrder
    .filter((t) => (tierCounts[t] ?? 0) > 0)
    .map((t) => ({ name: tierLabels[t], value: tierCounts[t] }));

  const relevantEntitlements = filteredUserIds
    ? allEntitlements.filter((e) => filteredUserIds!.has(e.user_id))
    : allEntitlements;
  const addonCounts: Record<string, number> = {};
  relevantEntitlements.forEach((e) => { addonCounts[e.product_key] = (addonCounts[e.product_key] ?? 0) + 1; });
  const addonLabels: Record<string, string> = { alavancagem: "Apalancamiento", multiplas_bingo: "Múltiples / Bingo", live_telegram: "Live Telegram", acesso_vitalicio: "Acceso Vitalicio" };
  const addonDist = Object.entries(addonCounts).map(([name, value]) => ({
    name: addonLabels[name] ?? name,
    value,
  }));

  const kpis = [
    { label: "Usuarios Totales", value: totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Usuarios Activos", value: activeUsers, icon: UserPlus, color: "text-green-400" },
    { label: "Usuarios En Línea", value: onlineUsers, icon: Wifi, color: "text-cyan-400" },
    { label: "Churn (Riesgo)", value: churnRisk, icon: AlertTriangle, color: "text-amber-400" },
  ];

  const pctCards = [
    { label: "% Activos / Total", value: pctActiveTotal, colorClass: getColorClass(pctActiveTotal, [25, 50]) },
    { label: "% Nuevos en el Período", value: pctNewPeriod, colorClass: getColorClass(pctNewPeriod, [5, 10]) },
    { label: "% En Línea / Activos", value: pctOnlineActive, colorClass: getColorClass(pctOnlineActive, [5, 20]) },
    { label: "% Churn / Pagados", value: pctChurnPaid, colorClass: getColorClass(pctChurnPaid, [25, 50], true) },
  ];

  const shortcuts = [
    { key: "today", label: "Hoy" },
    { key: "yesterday", label: "Ayer" },
    { key: "week", label: "Esta Semana" },
    { key: "month", label: "Este Mes" },
    { key: "7d", label: "Últimos 7 días" },
    { key: "15d", label: "Últimos 15 días" },
    { key: "30d", label: "Últimos 30 días" },
    { key: "all", label: "Todo el Tiempo" },
  ];

  const exportUsersCSV = (users: typeof allUsers, filename: string) => {
    const csvTotalUsers = allUsers.length;
    const csvActiveCount = relevantUsers.length;
    const csvPctAtivos = csvTotalUsers > 0 ? ((csvActiveCount / csvTotalUsers) * 100).toFixed(1) : '0.0';
    const csvPctNovos = csvTotalUsers > 0 ? ((newSignups / csvTotalUsers) * 100).toFixed(1) : '0.0';
    const csvPctOnline = csvActiveCount > 0 ? ((onlineCount / csvActiveCount) * 100).toFixed(1) : '0.0';
    const csvPctChurn = paidIds.length > 0 ? ((churnIds.length / paidIds.length) * 100).toFixed(1) : '0.0';

    const summary: any[][] = [
      ['Exportado el', new Date().toLocaleString('es-CL')],
      ['Período', `${dateFrom.toISOString().split('T')[0]} hasta ${dateTo.toISOString().split('T')[0]}`],
      ['Filtro de Plan', planFilter],
      [],
      ['MÉTRICAS'],
      ['Usuarios Totales', csvTotalUsers],
      ['Usuarios Activos', csvActiveCount],
      ['Usuarios En Línea', onlineCount],
      ['Churn (Riesgo)', churnIds.length],
      [],
      ['PORCENTAJES'],
      ['% Activos / Total', `${csvPctAtivos}%`],
      ['% Nuevos en el Período', `${csvPctNovos}%`],
      ['% En Línea / Activos', `${csvPctOnline}%`],
      ['% Churn / Pagados', `${csvPctChurn}%`],
      [],
      ['CLIENTES'],
      ['ID', 'Correo', 'Nombre', 'Plan', 'Registro', 'Último Acceso'],
    ];

    const rows = users.map((u: any) => [
      u.id ?? '', u.email ?? '', u.nickname ?? '', u.main_tier ?? '',
      u.created_at ? u.created_at.substring(0, 10) : '',
      u.last_seen_at ? u.last_seen_at.substring(0, 10) : ''
    ]);

    const allRows = [...summary, ...rows];
    const csvContent = allRows
      .map((row) => (row as any[]).map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFiltered = () => {
    exportUsersCSV(
      relevantUsers,
      `clientes_filtrado_${dateFrom.toISOString().split('T')[0]}_${planFilter}.csv`
    );
  };

  const handleExportAll = () => {
    exportUsersCSV(
      allUsers,
      `clientes_completo_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Panel — Fútbol</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white gap-2"
            disabled={loading}
            onClick={() => { setDateFrom(new Date(dateFrom)); }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white gap-2"
              onClick={() => setShowExportMenu((v) => !v)}>
              <Download className="w-4 h-4" />
              Exportar CSV ▾
            </Button>
            {showExportMenu && (
              <div
                className="absolute right-0 mt-1 w-52 bg-popover border border-border rounded-lg shadow-lg z-50"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  onClick={() => { handleExportFiltered(); setShowExportMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/50 rounded-t-lg"
                >
                  Exportar filtrado
                </button>
                <button
                  onClick={() => { handleExportAll(); setShowExportMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/50 rounded-b-lg"
                >
                  Exportar todo (todo el tiempo)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Period + Plan Filters */}
      <div className="bg-gray-900 rounded-xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Popover open={openFrom} onOpenChange={setOpenFrom}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-gray-700 text-gray-300 gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(dateFrom, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => { if (d) { setDateFrom(d); setActiveShortcut(""); setOpenFrom(false); } }} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-gray-500 text-sm">hasta</span>
          <Popover open={openTo} onOpenChange={setOpenTo}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-gray-700 text-gray-300 gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(dateTo, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => { if (d) { setDateTo(d); setActiveShortcut(""); setOpenTo(false); } }} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          {shortcuts.map((s) => (
            <Button key={s.key} size="sm" variant={activeShortcut === s.key ? "default" : "outline"}
              className={activeShortcut === s.key ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-700 text-gray-400 hover:text-white"}
              onClick={() => applyShortcut(s.key)}>{s.label}</Button>
          ))}
        </div>

        {/* Plan / Add-on filter */}
        <div className="flex gap-2 flex-wrap pt-1 border-t border-white/5 justify-center items-center">
          {PLAN_FILTERS_MAIN.map((f) => (
            <Button key={f.key} size="sm" variant={planFilter === f.key ? "default" : "outline"}
              className={planFilter === f.key ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-gray-700 text-gray-400 hover:text-white"}
              onClick={() => setPlanFilter(f.key)}>{f.label}</Button>
          ))}
          <div className="w-px h-6 bg-white/20 mx-1" />
          {PLAN_FILTERS_ADDONS.map((f) => (
            <Button key={f.key} size="sm" variant={planFilter === f.key ? "default" : "outline"}
              className={planFilter === f.key ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-gray-700 text-gray-400 hover:text-white"}
              onClick={() => setPlanFilter(f.key)}>{f.label}</Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-gray-900 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span>{kpi.label}</span>
              <InfoPopup title={kpi.label} text={KPI_TOOLTIPS[kpi.label]} />
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Percentage Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pctCards.map((card) => (
          <div key={card.label} className="bg-gray-900/60 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[11px] text-gray-500">{card.label}</span>
              <InfoPopup title={card.label} text={PCT_TOOLTIPS[card.label]} />
            </div>
            <div className={`text-lg font-bold ${card.colorClass}`}>{card.value.toFixed(1)}%</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Usuarios Activos Diarios (DAU)</h3>
          {dauData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dauData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#9ca3af" }} />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sin datos en el período</div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Usuarios de los Planes Principales</h3>
          {planDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={planDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                    {planDist.map((entry) => (<Cell key={entry.name} fill={PLAN_COLORS[entry.name] ?? "#6b7280"} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1">
                {(() => {
                  const total = planDist.reduce((s, i) => s + i.value, 0);
                  return planDist.map((item) => {
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={item.name} className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PLAN_COLORS[item.name] ?? "#6b7280" }} />
                        <span>{item.name} — {item.value} usuario{item.value !== 1 ? "s" : ""} — {pct}%</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sin datos de planes</div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Usuarios de los Planes Adicionales</h3>
          {addonDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={addonDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                    {addonDist.map((entry) => (<Cell key={entry.name} fill={ADDON_COLORS[entry.name] ?? "#8b5cf6"} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1">
                {(() => {
                  const total = addonDist.reduce((s, i) => s + i.value, 0);
                  return addonDist.map((item) => {
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={item.name} className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ADDON_COLORS[item.name] ?? "#8b5cf6" }} />
                        <span>{item.name} — {item.value} usuario{item.value !== 1 ? "s" : ""} — {pct}%</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sin planes adicionales activos</div>
          )}
        </div>
      </div>

    </div>
  );
}
