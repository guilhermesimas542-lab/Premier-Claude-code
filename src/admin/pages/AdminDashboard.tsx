import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, AlertTriangle, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PLAN_PRICES, ADDON_PRICES } from "@/lib/prices";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const PERIOD_OPTIONS = [
  { value: "1", label: "Hoje" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);

  // KPI data
  const [activeUsers, setActiveUsers] = useState(0);
  const [newSignups, setNewSignups] = useState(0);
  const [churnRisk, setChurnRisk] = useState(0);
  const [mrr, setMrr] = useState(0);

  // Chart data
  const [dauData, setDauData] = useState<{ date: string; users: number }[]>([]);
  const [planDist, setPlanDist] = useState<{ name: string; value: number }[]>([]);
  const [addonDist, setAddonDist] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const days = parseInt(period);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();

      // Parallel queries
      const [sessionsRes, newUsersRes, churnRes, allUsersRes, entitlementsRes] = await Promise.all([
        // Active users & DAU: sessions in period
        supabase.from("sessions").select("user_id, session_start_at").gte("session_start_at", since),
        // New signups in period
        supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", since),
        // Churn risk: paid users with no session in last 15 days
        supabase.from("users").select("id").neq("main_tier", "free"),
        // All users for plan distribution
        supabase.from("users").select("main_tier"),
        // Active entitlements for add-on distribution & MRR
        supabase.from("entitlements").select("product_key, user_id").eq("status", "active"),
      ]);

      const sessions = sessionsRes.data ?? [];
      const paidUsers = churnRes.data ?? [];
      const allUsers = allUsersRes.data ?? [];
      const entitlements = entitlementsRes.data ?? [];

      // KPI 1: Active users (distinct user_ids with sessions in period)
      const activeUserIds = new Set(sessions.map((s) => s.user_id));
      setActiveUsers(activeUserIds.size);

      // KPI 2: New signups
      setNewSignups(newUsersRes.count ?? 0);

      // KPI 3: Churn risk — paid users without session in last 15 days
      if (paidUsers.length > 0) {
        const paidIds = paidUsers.map((u) => u.id);
        const { data: recentSessions } = await supabase
          .from("sessions")
          .select("user_id")
          .gte("session_start_at", fifteenDaysAgo)
          .in("user_id", paidIds.slice(0, 500));
        const recentUserIds = new Set((recentSessions ?? []).map((s) => s.user_id));
        setChurnRisk(paidIds.filter((id) => !recentUserIds.has(id)).length);
      } else {
        setChurnRisk(0);
      }

      // KPI 4: MRR estimate
      const tierCounts: Record<string, number> = {};
      allUsers.forEach((u) => {
        tierCounts[u.main_tier] = (tierCounts[u.main_tier] ?? 0) + 1;
      });
      let estimatedMrr = 0;
      Object.entries(tierCounts).forEach(([tier, count]) => {
        estimatedMrr += (PLAN_PRICES[tier] ?? 0) * count;
      });
      const addonCounts: Record<string, number> = {};
      entitlements.forEach((e) => {
        addonCounts[e.product_key] = (addonCounts[e.product_key] ?? 0) + 1;
      });
      Object.entries(addonCounts).forEach(([key, count]) => {
        estimatedMrr += (ADDON_PRICES[key] ?? 0) * count;
      });
      setMrr(estimatedMrr);

      // DAU chart
      const dauMap: Record<string, Set<string>> = {};
      sessions.forEach((s) => {
        const day = s.session_start_at.slice(0, 10);
        if (!dauMap[day]) dauMap[day] = new Set();
        dauMap[day].add(s.user_id);
      });
      const dauArr = Object.entries(dauMap)
        .map(([date, set]) => ({ date, users: set.size }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setDauData(dauArr);

      // Plan distribution (exclude free)
      const planData = Object.entries(tierCounts)
        .filter(([t]) => t !== "free")
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
      setPlanDist(planData);

      // Add-on distribution
      const addonData = Object.entries(addonCounts).map(([name, value]) => ({
        name: name === "desaltas" ? "Odds Altas" : name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
      setAddonDist(addonData);

      setLoading(false);
    };
    load();
  }, [period]);

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  const kpis = [
    { label: "Usuários Ativos", value: activeUsers, icon: Users, color: "text-blue-400" },
    { label: "Novos Cadastros", value: newSignups, icon: UserPlus, color: "text-green-400" },
    { label: "Churn (Risco)", value: churnRisk, icon: AlertTriangle, color: "text-amber-400" },
    {
      label: "Receita (MRR est.)",
      value: `R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard — Futebol</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 bg-gray-900 border-gray-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-gray-900 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              {kpi.label}
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Line Chart */}
        <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Usuários Ativos Diários (DAU)</h3>
          {dauData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dauData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sem dados no período</div>
          )}
        </div>

        {/* Plan Distribution */}
        <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Distribuição de Planos & Add-ons</h3>
          {planDist.length > 0 || addonDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[...planDist, ...addonDist]}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {[...planDist, ...addonDist].map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sem dados de planos</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          onClick={() => navigate("/admin/clients?filter=churn")}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Ver Clientes em Risco
        </Button>
        <Button
          variant="outline"
          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          onClick={() => navigate("/admin/notifications")}
        >
          Enviar Notificação
        </Button>
      </div>
    </div>
  );
}
