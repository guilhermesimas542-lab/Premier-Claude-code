import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Activity, Clock, UserPlus, TrendingUp, Bell, Target, FileText, Trophy, RefreshCw, Info } from "lucide-react";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface KPIs {
  uniqueUsers: number;
  totalSessions: number;
  avgDuration: number;
  newUsers: number;
  conversionRate: number;
  activeToday: number;
  notificationsSent: number;
}

interface DayData { day: string; sessions: number }
interface PlanData { name: string; value: number }
interface AddonData { name: string; count: number }

const PLAN_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#a855f7"];
const ADDON_COLOR = "#6366f1";

const PERIOD_SHORTCUTS = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const { selectedHouseId, selectedHouse } = useBettingHouseAdmin();
  const today = new Date();
  const [from, setFrom] = useState<Date>(subDays(today, 30));
  const [to, setTo] = useState<Date>(today);
  const [activeShortcut, setActiveShortcut] = useState(30);
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<KPIs>({ uniqueUsers: 0, totalSessions: 0, avgDuration: 0, newUsers: 0, conversionRate: 0, activeToday: 0, notificationsSent: 0 });
  const [sessionsByDay, setSessionsByDay] = useState<DayData[]>([]);
  const [planDist, setPlanDist] = useState<PlanData[]>([]);
  const [addonDist, setAddonDist] = useState<AddonData[]>([]);
  const [funnel, setFunnel] = useState<{ name: string; count: number }[]>([]);
  const [userTable, setUserTable] = useState<any[]>([]);
  const [tipsCount, setTipsCount] = useState(0);

  const applyShortcut = (days: number) => {
    setActiveShortcut(days);
    setFrom(days === 0 ? startOfDay(today) : subDays(today, days));
    setTo(today);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const since = startOfDay(from).toISOString();
    const until = endOfDay(to).toISOString();
    const todayStart = startOfDay(today).toISOString();

    // Get user IDs for the selected house
    let houseUserIds: string[] | null = null;
    if (selectedHouseId) {
      const { data: houseUsers } = await supabase
        .from("users")
        .select("id")
        .eq("betting_house_id", selectedHouseId);
      houseUserIds = (houseUsers ?? []).map((u: any) => u.id);
    }

    // Build queries with house filter
    const buildEventsQ = (q: any) => {
      if (houseUserIds && houseUserIds.length > 0) return q.in("user_id", houseUserIds.slice(0, 500));
      if (houseUserIds && houseUserIds.length === 0) return q.eq("user_id", "00000000-0000-0000-0000-000000000000"); // no results
      return q;
    };

    const buildUsersQ = (q: any) => {
      if (selectedHouseId) return q.eq("betting_house_id", selectedHouseId);
      return q;
    };

    const buildNotifsQ = (q: any) => {
      if (selectedHouseId) return q.eq("betting_house_id", selectedHouseId);
      return q;
    };

    // Parallel fetches
    const [
      { data: allEvents },
      { data: allUsers },
      { data: newUsersData },
      { data: funnelEvents },
      { data: notifs },
      { data: todayEvents },
      { data: entitlements },
      { data: tips },
    ] = await Promise.all([
      buildEventsQ(supabase.from("events").select("user_id, event_name, created_at, session_id, metadata, properties").gte("created_at", since).lte("created_at", until)),
      buildUsersQ(supabase.from("users").select("id, email, main_tier, last_seen_at")),
      buildUsersQ(supabase.from("users").select("id").gte("created_at", since).lte("created_at", until)),
      buildEventsQ(supabase.from("events").select("event_name, created_at").gte("created_at", since).lte("created_at", until).in("event_name", ["app_open", "view_entries", "click_locked_entry", "click_buy_from_popup", "card_click", "funnel_view"])),
      buildNotifsQ(supabase.from("notifications").select("id").not("sent_at", "is", null).gte("sent_at", since).lte("sent_at", until)),
      buildEventsQ(supabase.from("events").select("user_id").gte("created_at", todayStart)),
      (() => { const q = supabase.from("entitlements").select("user_id, product_key").eq("status", "active"); return houseUserIds && houseUserIds.length > 0 ? q.in("user_id", houseUserIds.slice(0, 500)) : houseUserIds && houseUserIds.length === 0 ? q.eq("user_id", "00000000-0000-0000-0000-000000000000") : q; })(),
      supabase.from("content_entries").select("id").gte("created_at", since).lte("created_at", until),
    ]);

    const s = allEvents ?? [];
    const uniqueUsers = new Set(s.map((r: any) => r.user_id).filter(Boolean)).size;
    
    // Sessions: count distinct session_id
    const totalSessions = new Set(s.map((r: any) => r.session_id).filter(Boolean)).size;
    
    // Avg duration from screen_time events
    const screenTimeEvents = s.filter((e: any) => e.event_name === "screen_time");
    const totalSeconds = screenTimeEvents.reduce((acc: number, e: any) => {
      const sec = Number(e.metadata?.seconds ?? e.properties?.seconds ?? 0);
      return acc + sec;
    }, 0);
    const sessionIdsInScreenTime = new Set(screenTimeEvents.map((e: any) => e.session_id).filter(Boolean));
    const avgDuration = sessionIdsInScreenTime.size > 0
      ? Math.round(totalSeconds / sessionIdsInScreenTime.size)
      : 0;

    // Conversion rate: buy clicks / unique users
    const buyClicks = (funnelEvents ?? []).filter((e: any) => e.event_name === "click_buy_from_popup").length;
    const conversionRate = uniqueUsers > 0 ? Math.round((buyClicks / uniqueUsers) * 100 * 10) / 10 : 0;

    // Active today
    const activeToday = new Set((todayEvents ?? []).map((r: any) => r.user_id).filter(Boolean)).size;

    setKpis({
      uniqueUsers,
      totalSessions,
      avgDuration,
      newUsers: (newUsersData ?? []).length,
      conversionRate,
      activeToday,
      notificationsSent: (notifs ?? []).length,
    });

    // Events by day
    const days = eachDayOfInterval({ start: from, end: to });
    const dayMap: Record<string, number> = {};
    days.forEach((d) => { dayMap[format(d, "yyyy-MM-dd")] = 0; });
    s.forEach((r) => {
      const day = r.created_at?.slice(0, 10);
      if (day && dayMap[day] !== undefined) dayMap[day]++;
    });
    setSessionsByDay(days.map((d) => ({
      day: format(d, "dd/MM", { locale: ptBR }),
      sessions: dayMap[format(d, "yyyy-MM-dd")],
    })));

    // Plan distribution
    const planCount: Record<string, number> = { free: 0, basic: 0, pro: 0, ultra: 0 };
    (allUsers ?? []).forEach((u: any) => { planCount[u.main_tier] = (planCount[u.main_tier] ?? 0) + 1; });
    setPlanDist([
      { name: "Free", value: planCount.free },
      { name: "Básico", value: planCount.basic },
      { name: "Pro", value: planCount.pro },
      { name: "Ultra", value: planCount.ultra },
    ]);

    // Addon distribution
    const addonCount: Record<string, number> = { alavancagem: 0, desaltas: 0, acesso_vitalicio: 0, live_telegram: 0 };
    (entitlements ?? []).forEach((e: any) => { if (addonCount[e.product_key] !== undefined) addonCount[e.product_key]++; });
    setAddonDist([
      { name: "Alavancagem", count: addonCount.alavancagem },
      { name: "Odds Altas", count: addonCount.desaltas },
      { name: "Vitalício", count: addonCount.acesso_vitalicio },
      { name: "Live", count: addonCount.live_telegram },
    ]);

    // Funnel
    const funnelEventNames = ["app_open", "view_entries", "card_click", "funnel_view", "click_locked_entry", "click_buy_from_popup"];
    const counts: Record<string, number> = {};
    funnelEventNames.forEach((e) => { counts[e] = 0; });
    (funnelEvents ?? []).forEach((ev) => { counts[ev.event_name] = (counts[ev.event_name] ?? 0) + 1; });
    setFunnel(funnelEventNames.map((name) => ({ name, count: counts[name] })));

    // User table
    const userMap: Record<string, { sessions: number; totalTime: number }> = {};
    s.forEach((r) => {
      if (!userMap[r.user_id]) userMap[r.user_id] = { sessions: 0, totalTime: 0 };
      userMap[r.user_id].sessions++;
    });
    const userIds = Object.keys(userMap);
    if (userIds.length > 0) {
      const { data: usersData } = await supabase.from("users").select("id, email, last_seen_at").in("id", userIds.slice(0, 100));
      setUserTable(
        (usersData ?? []).map((u: any) => ({ ...u, sessions: userMap[u.id]?.sessions ?? 0, totalTime: userMap[u.id]?.totalTime ?? 0 }))
          .sort((a: any, b: any) => b.sessions - a.sessions)
      );
    } else {
      setUserTable([]);
    }

    setTipsCount((tips ?? []).length);
    setLoading(false);
  }, [from, to, selectedHouseId]);

  useEffect(() => { load(); }, [load]);

  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  const fmtDate = (d: Date) => format(d, "dd/MM/yyyy");

  // KPI cards config
  const kpiCards = [
    { label: "Usuários únicos", value: kpis.uniqueUsers, icon: <Users className="w-4 h-4" />, color: "text-blue-400" },
    { label: "Sessões", value: kpis.totalSessions, icon: <Activity className="w-4 h-4" />, color: "text-purple-400" },
    { label: "Tempo médio", value: kpis.avgDuration > 0 ? `${Math.floor(kpis.avgDuration / 60)}m ${kpis.avgDuration % 60}s` : "—", icon: <Clock className="w-4 h-4" />, color: "text-yellow-400" },
    { label: "Novos cadastros", value: kpis.newUsers, icon: <UserPlus className="w-4 h-4" />, color: "text-green-400" },
    { label: "Taxa de conversão", value: `${kpis.conversionRate}%`, icon: <TrendingUp className="w-4 h-4" />, color: "text-orange-400" },
    { label: "Ativos hoje", value: kpis.activeToday, icon: <Target className="w-4 h-4" />, color: "text-pink-400" },
    { label: "Notificações enviadas", value: kpis.notificationsSent, icon: <Bell className="w-4 h-4" />, color: "text-indigo-400" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Analytics — {selectedHouse?.name ?? "Visão Geral"}</h2>



          {/* ── Date Filter ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_SHORTCUTS.map((s) => (
              <Button
                key={s.label}
                size="sm"
                variant={activeShortcut === s.days ? "default" : "outline"}
                className={cn("h-8 text-xs", activeShortcut !== s.days && "border-gray-700 text-gray-400 bg-gray-900")}
                onClick={() => applyShortcut(s.days)}
              >
                {s.label}
              </Button>
            ))}

            <span className="text-gray-600 text-xs">|</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs border-gray-700 bg-gray-900 text-gray-300 gap-1.5">
                  <CalendarIcon className="w-3 h-3" />
                  {fmtDate(from)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700" align="start">
                <Calendar
                  mode="single"
                  selected={from}
                  onSelect={(d) => { if (d) { setFrom(d); setActiveShortcut(-1); } }}
                  className={cn("p-3 pointer-events-auto text-white")}
                  classNames={{ day_selected: "bg-purple-600 text-white", day_today: "bg-gray-800" }}
                />
              </PopoverContent>
            </Popover>

            <span className="text-gray-500 text-xs">até</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs border-gray-700 bg-gray-900 text-gray-300 gap-1.5">
                  <CalendarIcon className="w-3 h-3" />
                  {fmtDate(to)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700" align="start">
                <Calendar
                  mode="single"
                  selected={to}
                  onSelect={(d) => { if (d) { setTo(d); setActiveShortcut(-1); } }}
                  className={cn("p-3 pointer-events-auto text-white")}
                  classNames={{ day_selected: "bg-purple-600 text-white", day_today: "bg-gray-800" }}
                />
              </PopoverContent>
            </Popover>

            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-500 ml-1" />}
          </div>

          {/* ── KPI Grid ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpiCards.map((k) => (
              <div key={k.label} className="bg-gray-900 rounded-xl p-4 border border-white/10 flex flex-col gap-2">
                <div className={cn("flex items-center gap-1.5 text-xs font-medium", k.color)}>
                  {k.icon}
                  {k.label}
                </div>
                <div className="text-2xl font-bold text-white">{k.value}</div>
              </div>
            ))}
            <div className="bg-gray-900 rounded-xl p-4 border border-white/10 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-teal-400">
                <FileText className="w-4 h-4" />
                Tips cadastradas
              </div>
              <div className="text-2xl font-bold text-white">{tipsCount}</div>
            </div>
          </div>

          {/* ── Sessions by Day ──────────────────────────────────────────── */}
          <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Eventos por dia</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sessionsByDay} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                  itemStyle={{ color: "#a78bfa", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="sessions" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Distributions ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Distribuição por plano</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={planDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {planDist.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                    itemStyle={{ fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Distribuição por upsell</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={addonDist} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                    itemStyle={{ color: "#818cf8", fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill={ADDON_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Funnel ───────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Funil de conversão</h3>
            <div className="space-y-2">
              {funnel.map((step) => (
                <div key={step.name} className="flex items-center gap-3">
                  <span className="w-44 text-xs text-gray-400 font-mono truncate">{step.name}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-blue-500/60 rounded-full flex items-center px-2"
                      style={{ width: `${Math.max((step.count / maxFunnel) * 100, 2)}%` }}
                    >
                      <span className="text-[10px] font-bold">{step.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── User Table ───────────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Uso por usuário</h3>
            <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Eventos</th>
                    <th className="px-3 py-2">Tempo total (seg)</th>
                    <th className="px-3 py-2">Último acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {userTable.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 text-gray-300 text-xs">
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.sessions}</td>
                      <td className="px-3 py-2">{u.totalTime}</td>
                      <td className="px-3 py-2">{u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString("pt-BR") : "—"}</td>
                    </tr>
                  ))}
                  {userTable.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-600">Sem dados no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


    </div>
  );
}
