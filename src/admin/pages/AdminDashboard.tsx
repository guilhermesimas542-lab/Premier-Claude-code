import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, AlertTriangle, DollarSign, Info, CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PLAN_PRICES, ADDON_PRICES } from "@/lib/prices";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "1", label: "Hoje" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "custom", label: "Personalizado" },
];

const KPI_TOOLTIPS: Record<string, string> = {
  "Usuários Ativos": "Quantidade de usuários únicos que abriram o aplicativo no período selecionado.",
  "Novos Cadastros": "Quantidade de novos usuários que se cadastraram no aplicativo no período selecionado.",
  "Churn (Risco)": "Quantidade de usuários com plano pago (Básico, Pro ou Ultra) que não abriram o aplicativo nos últimos 15 dias. Estes são clientes em risco de cancelamento.",
  "Receita (MRR est.)": "Estimativa de receita mensal recorrente, calculada com base nos planos e add-ons ativos. Este valor será atualizado automaticamente quando a integração com a plataforma de pagamento for implementada.",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

function getPercentColor(pct: number, inverted = false) {
  if (inverted) {
    if (pct >= 50) return "text-red-400";
    if (pct >= 25) return "text-amber-400";
    return "text-green-400";
  }
  if (pct >= 50) return "text-green-400";
  if (pct >= 25) return "text-amber-400";
  return "text-red-400";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(true);

  // KPI data
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [newSignups, setNewSignups] = useState(0);
  const [prevSignups, setPrevSignups] = useState(0);
  const [churnRisk, setChurnRisk] = useState(0);
  const [paidUsersCount, setPaidUsersCount] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [addonCount, setAddonCount] = useState(0);

  // Chart data
  const [dauData, setDauData] = useState<{ date: string; users: number }[]>([]);
  const [planDist, setPlanDist] = useState<{ name: string; value: number }[]>([]);
  const [addonDist, setAddonDist] = useState<{ name: string; value: number }[]>([]);

  // Compute date range
  const getDateRange = () => {
    if (period === "custom" && customRange.from) {
      const from = new Date(customRange.from);
      from.setHours(0, 0, 0, 0);
      const to = customRange.to ? new Date(customRange.to) : new Date();
      to.setHours(23, 59, 59, 999);
      const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
      return { since: from.toISOString(), days };
    }
    const days = parseInt(period);
    return { since: new Date(Date.now() - days * 86400000).toISOString(), days };
  };

  useEffect(() => {
    if (period === "custom" && !customRange.from) return;

    const load = async () => {
      setLoading(true);
      const { since, days } = getDateRange();
      const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();

      // Previous period for comparison
      const prevSince = new Date(new Date(since).getTime() - days * 86400000).toISOString();

      const [sessionsRes, newUsersRes, prevUsersRes, churnRes, allUsersRes, entitlementsRes] = await Promise.all([
        supabase.from("sessions").select("user_id, session_start_at").gte("session_start_at", since),
        supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", since),
        // Previous period signups
        supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", prevSince).lt("created_at", since),
        supabase.from("users").select("id").neq("main_tier", "free"),
        supabase.from("users").select("main_tier"),
        supabase.from("entitlements").select("product_key, user_id").eq("status", "active"),
      ]);

      const sessions = sessionsRes.data ?? [];
      const paidUsers = churnRes.data ?? [];
      const allUsers = allUsersRes.data ?? [];
      const entitlements = entitlementsRes.data ?? [];

      // KPI 1
      const activeUserIds = new Set(sessions.map((s) => s.user_id));
      setActiveUsers(activeUserIds.size);
      setTotalUsers(allUsers.length);

      // KPI 2
      setNewSignups(newUsersRes.count ?? 0);
      setPrevSignups(prevUsersRes.count ?? 0);

      // KPI 3
      setPaidUsersCount(paidUsers.length);
      if (paidUsers.length > 0) {
        const paidIds = paidUsers.map((u) => u.id);
        const { data: recentSessions } = await supabase
          .from("sessions").select("user_id")
          .gte("session_start_at", fifteenDaysAgo)
          .in("user_id", paidIds.slice(0, 500));
        const recentUserIds = new Set((recentSessions ?? []).map((s) => s.user_id));
        setChurnRisk(paidIds.filter((id) => !recentUserIds.has(id)).length);
      } else {
        setChurnRisk(0);
      }

      // KPI 4
      const tierCounts: Record<string, number> = {};
      allUsers.forEach((u) => { tierCounts[u.main_tier] = (tierCounts[u.main_tier] ?? 0) + 1; });
      let estimatedMrr = 0;
      let paidPlanCount = 0;
      Object.entries(tierCounts).forEach(([tier, count]) => {
        estimatedMrr += (PLAN_PRICES[tier] ?? 0) * count;
        if (tier !== "free") paidPlanCount += count;
      });
      const addonCounts: Record<string, number> = {};
      entitlements.forEach((e) => { addonCounts[e.product_key] = (addonCounts[e.product_key] ?? 0) + 1; });
      let totalAddons = 0;
      Object.entries(addonCounts).forEach(([key, count]) => {
        estimatedMrr += (ADDON_PRICES[key] ?? 0) * count;
        totalAddons += count;
      });
      setMrr(estimatedMrr);
      setPlanCount(paidPlanCount);
      setAddonCount(totalAddons);

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

      // Plans
      setPlanDist(
        Object.entries(tierCounts)
          .filter(([t]) => t !== "free")
          .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      );
      setAddonDist(
        Object.entries(addonCounts).map(([name, value]) => ({
          name: name === "desaltas" ? "Odds Altas" : name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );

      setLoading(false);
    };
    load();
  }, [period, customRange.from, customRange.to]);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val === "custom") {
      setShowCalendar(true);
    } else {
      setShowCalendar(false);
    }
  };

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  // Context lines
  const activeUsersPct = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  const signupDelta = prevSignups > 0 ? ((newSignups - prevSignups) / prevSignups) * 100 : newSignups > 0 ? 100 : 0;
  const churnPct = paidUsersCount > 0 ? (churnRisk / paidUsersCount) * 100 : 0;

  const kpis = [
    {
      label: "Usuários Ativos",
      value: activeUsers,
      icon: Users,
      color: "text-blue-400",
      context: `${activeUsersPct.toFixed(1)}% do total de usuários`,
      contextColor: getPercentColor(activeUsersPct),
    },
    {
      label: "Novos Cadastros",
      value: newSignups,
      icon: UserPlus,
      color: "text-green-400",
      context: signupDelta > 0
        ? `↑ ${signupDelta.toFixed(0)}% vs. período anterior`
        : signupDelta < 0
          ? `↓ ${Math.abs(signupDelta).toFixed(0)}% vs. período anterior`
          : "— sem variação",
      contextColor: signupDelta > 0 ? "text-green-400" : signupDelta < 0 ? "text-red-400" : "text-gray-500",
    },
    {
      label: "Churn (Risco)",
      value: churnRisk,
      icon: AlertTriangle,
      color: "text-amber-400",
      context: `${churnPct.toFixed(0)}% dos usuários pagos`,
      contextColor: getPercentColor(churnPct, true),
    },
    {
      label: "Receita (MRR est.)",
      value: `R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-emerald-400",
      context: `${planCount} planos + ${addonCount} add-ons ativos`,
      contextColor: "text-gray-500",
    },
  ];

  const periodLabel = period === "custom" && customRange.from
    ? `${format(customRange.from, "dd/MM")}${customRange.to ? ` – ${format(customRange.to, "dd/MM")}` : ""}`
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold">Dashboard — Futebol</h2>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-44 bg-gray-900 border-gray-800">
              <SelectValue>{periodLabel || PERIOD_OPTIONS.find((o) => o.value === period)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {period === "custom" && (
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  {customRange.from ? format(customRange.from, "dd/MM") : "Início"}
                  {" – "}
                  {customRange.to ? format(customRange.to, "dd/MM") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange.from ? { from: customRange.from, to: customRange.to } : undefined}
                  onSelect={(range) => {
                    setCustomRange({ from: range?.from, to: range?.to });
                    if (range?.from && range?.to) setShowCalendar(false);
                  }}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
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
            <div className={`text-[11px] mt-1 ${kpi.contextColor}`}>{kpi.context}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
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
