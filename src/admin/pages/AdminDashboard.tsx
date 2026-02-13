import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, AlertTriangle, Wifi, Info, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PLAN_PRICES, ADDON_PRICES } from "@/lib/prices";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";

const KPI_TOOLTIPS: Record<string, string> = {
  "Usuários Totais": "Total de usuários cadastrados no Premier, incluindo usuários free e pagos.",
  "Usuários Ativos": "Usuários únicos que abriram o aplicativo no período selecionado.",
  "Usuários Online": "Usuários que estão usando o aplicativo neste momento.",
  "Churn (Risco)": "Usuários com plano pago (Básico, Pro ou Ultra) que não abriram o aplicativo nos últimos 15 dias. Estes clientes estão em risco de cancelamento.",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const now = new Date();

  // Period filter — default "Últimos 7 dias"
  const [dateFrom, setDateFrom] = useState<Date>(subDays(now, 7));
  const [dateTo, setDateTo] = useState<Date>(now);
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [activeShortcut, setActiveShortcut] = useState("7d");

  const [loading, setLoading] = useState(true);

  // KPIs
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [churnRisk, setChurnRisk] = useState(0);
  const [paidUsersCount, setPaidUsersCount] = useState(0);
  const [newSignups, setNewSignups] = useState(0);

  // Charts
  const [dauData, setDauData] = useState<{ date: string; users: number }[]>([]);
  const [planDist, setPlanDist] = useState<{ name: string; value: number }[]>([]);
  const [addonDist, setAddonDist] = useState<{ name: string; value: number }[]>([]);

  const applyShortcut = (key: string) => {
    setActiveShortcut(key);
    const today = new Date();
    let from: Date, to: Date;
    switch (key) {
      case "today":
        from = startOfDay(today);
        to = today;
        break;
      case "yesterday":
        from = startOfDay(subDays(today, 1));
        to = endOfDay(subDays(today, 1));
        break;
      case "week":
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = today;
        break;
      case "month":
        from = startOfMonth(today);
        to = today;
        break;
      case "7d":
      default:
        from = subDays(today, 7);
        to = today;
        break;
    }
    setDateFrom(from);
    setDateTo(to);
  };

  // Fetch online users separately (polled every 30s)
  const fetchOnline = useCallback(async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("sessions")
      .select("user_id")
      .gte("session_start_at", fiveMinAgo);
    const unique = new Set((data ?? []).map((s) => s.user_id));
    setOnlineUsers(unique.size);
  }, []);

  useEffect(() => {
    fetchOnline();
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, [fetchOnline]);

  // Main data load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = dateFrom.toISOString();
      const until = dateTo.toISOString();
      const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();

      const [totalRes, sessionsRes, newUsersRes, churnRes, allUsersRes, entitlementsRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("user_id, session_start_at").gte("session_start_at", since).lte("session_start_at", until),
        supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", since).lte("created_at", until),
        supabase.from("users").select("id").neq("main_tier", "free"),
        supabase.from("users").select("main_tier"),
        supabase.from("entitlements").select("product_key, user_id").eq("status", "active"),
      ]);

      const sessions = sessionsRes.data ?? [];
      const paidUsers = churnRes.data ?? [];
      const allUsers = allUsersRes.data ?? [];
      const entitlements = entitlementsRes.data ?? [];

      setTotalUsers(totalRes.count ?? 0);
      const activeIds = new Set(sessions.map((s) => s.user_id));
      setActiveUsers(activeIds.size);
      setNewSignups(newUsersRes.count ?? 0);
      setPaidUsersCount(paidUsers.length);

      // Churn
      if (paidUsers.length > 0) {
        const paidIds = paidUsers.map((u) => u.id);
        const { data: recentSessions } = await supabase
          .from("sessions").select("user_id")
          .gte("session_start_at", fifteenDaysAgo)
          .in("user_id", paidIds.slice(0, 500));
        const recentIds = new Set((recentSessions ?? []).map((s) => s.user_id));
        setChurnRisk(paidIds.filter((id) => !recentIds.has(id)).length);
      } else {
        setChurnRisk(0);
      }

      // DAU
      const dauMap: Record<string, Set<string>> = {};
      sessions.forEach((s) => {
        const day = s.session_start_at.slice(0, 10);
        if (!dauMap[day]) dauMap[day] = new Set();
        dauMap[day].add(s.user_id);
      });
      setDauData(
        Object.entries(dauMap)
          .map(([date, set]) => ({ date, users: set.size }))
          .sort((a, b) => a.date.localeCompare(b.date))
      );

      // Plan distribution
      const tierCounts: Record<string, number> = {};
      allUsers.forEach((u) => { tierCounts[u.main_tier] = (tierCounts[u.main_tier] ?? 0) + 1; });
      setPlanDist(
        Object.entries(tierCounts)
          .filter(([t]) => t !== "free")
          .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      );

      const addonCounts: Record<string, number> = {};
      entitlements.forEach((e) => { addonCounts[e.product_key] = (addonCounts[e.product_key] ?? 0) + 1; });
      setAddonDist(
        Object.entries(addonCounts).map(([name, value]) => ({
          name: name === "desaltas" ? "Odds Altas" : name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );

      setLoading(false);
    };
    load();
  }, [dateFrom, dateTo]);

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  // Percentage calculations
  const pctActiveTotal = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  const pctNewPeriod = totalUsers > 0 ? (newSignups / totalUsers) * 100 : 0;
  const pctOnlineActive = activeUsers > 0 ? (onlineUsers / activeUsers) * 100 : 0;
  const pctChurnPaid = paidUsersCount > 0 ? (churnRisk / paidUsersCount) * 100 : 0;

  const kpis = [
    { label: "Usuários Totais", value: totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Usuários Ativos", value: activeUsers, icon: UserPlus, color: "text-green-400" },
    { label: "Usuários Online", value: onlineUsers, icon: Wifi, color: "text-cyan-400" },
    { label: "Churn (Risco)", value: churnRisk, icon: AlertTriangle, color: "text-amber-400" },
  ];

  const pctCards = [
    { label: "% Ativos / Total", value: pctActiveTotal, colorClass: getColorClass(pctActiveTotal, [25, 50]) },
    { label: "% Novos no Período", value: pctNewPeriod, colorClass: getColorClass(pctNewPeriod, [5, 10]) },
    { label: "% Online / Ativos", value: pctOnlineActive, colorClass: getColorClass(pctOnlineActive, [5, 20]) },
    { label: "% Churn / Pagos", value: pctChurnPaid, colorClass: getColorClass(pctChurnPaid, [25, 50], true) },
  ];

  const shortcuts = [
    { key: "today", label: "Hoje" },
    { key: "yesterday", label: "Ontem" },
    { key: "week", label: "Esta Semana" },
    { key: "month", label: "Este Mês" },
    { key: "7d", label: "Últimos 7 dias" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard — Futebol</h2>

      {/* Period Filter */}
      <div className="bg-gray-900 rounded-xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Popover open={openFrom} onOpenChange={setOpenFrom}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-gray-700 text-gray-300 gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(dateFrom, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(d) => { if (d) { setDateFrom(d); setActiveShortcut(""); setOpenFrom(false); } }}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <span className="text-gray-500 text-sm">até</span>

          <Popover open={openTo} onOpenChange={setOpenTo}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-gray-700 text-gray-300 gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(dateTo, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(d) => { if (d) { setDateTo(d); setActiveShortcut(""); setOpenTo(false); } }}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2 flex-wrap">
          {shortcuts.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={activeShortcut === s.key ? "default" : "outline"}
              className={activeShortcut === s.key
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "border-gray-700 text-gray-400 hover:text-white"
              }
              onClick={() => applyShortcut(s.key)}
            >
              {s.label}
            </Button>
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
              <UiTooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-gray-600 hover:text-gray-300 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs">
                  {KPI_TOOLTIPS[kpi.label]}
                </TooltipContent>
              </UiTooltip>
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Percentage Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pctCards.map((card) => (
          <div key={card.label} className="bg-gray-900/60 rounded-xl p-3 border border-white/5">
            <div className="text-[11px] text-gray-500 mb-1">{card.label}</div>
            <div className={`text-lg font-bold ${card.colorClass}`}>
              {card.value.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Usuários Ativos Diários (DAU)</h3>
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
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sem dados no período</div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Distribuição de Planos & Add-ons</h3>
          {planDist.length > 0 || addonDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[...planDist, ...addonDist]} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                  {[...planDist, ...addonDist].map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sem dados de planos</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => navigate("/admin/clients?filter=churn")}>
          <AlertTriangle className="w-4 h-4 mr-2" />
          Ver Clientes em Risco
        </Button>
        <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => navigate("/admin/notifications")}>
          Enviar Notificação
        </Button>
      </div>
    </div>
  );
}
