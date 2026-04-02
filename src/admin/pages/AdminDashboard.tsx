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

const PLAN_COLORS: Record<string, string> = { Free: "#3b82f6", "Básico": "#10b981", Pro: "#f59e0b", Ultra: "#8b5cf6" };
const ADDON_COLORS: Record<string, string> = { Alavancagem: "#10b981", "Odds Altas": "#ef4444", "Live Telegram": "#3b82f6", "Acesso Vitalício": "#f59e0b" };

/* ── Tooltip texts ── */
const KPI_TOOLTIPS: Record<string, string> = {
  "Usuários Totais": "Total de usuários cadastrados no Premier, incluindo usuários free e pagos. Este número não é afetado pelo filtro de período.",
  "Usuários Ativos": "Usuários únicos que abriram o aplicativo no período selecionado. Contabiliza qualquer sessão registrada dentro do intervalo de datas.",
  "Usuários Online": "Usuários que estão usando o aplicativo neste exato momento. Considera sessões iniciadas nos últimos 5 minutos. Atualiza automaticamente a cada 30 segundos.",
  "Churn (Risco)": "Usuários com plano pago (Básico, Pro ou Ultra) que não abriram o aplicativo nos últimos 15 dias. Estes clientes estão em risco de cancelamento. Este número não é afetado pelo filtro de período.",
};

const PCT_TOOLTIPS: Record<string, string> = {
  "% Ativos / Total": "Porcentagem de usuários que abriram o app no período selecionado em relação ao total de usuários cadastrados. Quanto maior, melhor o engajamento geral da base.",
  "% Novos no Período": "Porcentagem de novos cadastros no período selecionado em relação ao total de usuários. Indica o ritmo de crescimento da base.",
  "% Online / Ativos": "Porcentagem de usuários online agora em relação aos usuários ativos no período. Mostra o nível de uso em tempo real.",
  "% Churn / Pagos": "Porcentagem de usuários pagos em risco de cancelamento (sem abrir o app há 15+ dias) em relação ao total de usuários pagos. Quanto menor, melhor a retenção.",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

type PlanFilter = "geral" | "free" | "basic" | "pro" | "ultra" | "alavancagem" | "desaltas" | "live_telegram" | "acesso_vitalicio";

const PLAN_FILTERS_MAIN: { key: PlanFilter; label: string }[] = [
  { key: "geral", label: "Geral" },
  { key: "free", label: "Free" },
  { key: "basic", label: "Básico" },
  { key: "pro", label: "Pro" },
  { key: "ultra", label: "Ultra" },
];
const PLAN_FILTERS_ADDONS: { key: PlanFilter; label: string }[] = [
  { key: "alavancagem", label: "Alavancagem" },
  { key: "desaltas", label: "Odds Altas" },
  { key: "live_telegram", label: "Live Telegram" },
  { key: "acesso_vitalicio", label: "Acesso Vitalício" },
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
  const [dateFrom, setDateFrom] = useState<Date>(subDays(now, 7));
  const [dateTo, setDateTo] = useState<Date>(now);
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [activeShortcut, setActiveShortcut] = useState("7d");

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

      // Build user queries filtered by house
      let usersQ = supabase.from("users").select("id, email, nickname, main_tier, created_at, last_seen_at") as any;
      let newUsersQ = supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", since).lte("created_at", until) as any;
      let paidQ = supabase.from("users").select("id").neq("main_tier", "free") as any;

      if (selectedHouseId) {
        usersQ = usersQ.eq("betting_house_id", selectedHouseId);
        newUsersQ = newUsersQ.eq("betting_house_id", selectedHouseId);
        paidQ = paidQ.eq("betting_house_id", selectedHouseId);
      }

      const [newUsersRes, usersRes, paidUsersRes] = await Promise.all([newUsersQ, usersQ, paidQ]);

      const users = usersRes.data ?? [];
      const paid = paidUsersRes.data ?? [];

      // Fetch events for DAU chart (more reliable than sessions)
      const allEventsData: { user_id: string; created_at: string }[] = [];
      let eventsPage = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        let eq = supabase.from("events").select("user_id, created_at").gte("created_at", since).lte("created_at", until).not("user_id", "is", null);
        if (selectedHouseId) eq = eq.eq("house_id", selectedHouseId);
        const { data: eventsChunk } = await eq.range(eventsPage * PAGE_SIZE, (eventsPage + 1) * PAGE_SIZE - 1);
        if (!eventsChunk || eventsChunk.length === 0) break;
        allEventsData.push(...(eventsChunk as any[]));
        if (eventsChunk.length < PAGE_SIZE) break;
        eventsPage++;
        if (eventsPage > 10) break;
      }
      setSessionsData(allEventsData.map((e: any) => ({ user_id: e.user_id, session_start_at: e.created_at })));

      // Entitlements
      const houseUserIds = users.map((u: any) => u.id);
      let entitlementsData: any[] = [];

      if (houseUserIds.length > 0) {
        const { data } = await supabase.from("entitlements").select("product_key, user_id").eq("status", "active").in("user_id", houseUserIds.slice(0, 500));
        entitlementsData = data ?? [];
      } else if (!selectedHouseId) {
        const { data } = await supabase.from("entitlements").select("product_key, user_id").eq("status", "active");
        entitlementsData = data ?? [];
      }

      setAllUsers(users);
      setAllEntitlements(entitlementsData);
      setNewSignups(newUsersRes.count ?? 0);
      setPaidIds(paid.map((u: any) => u.id));

      // Churn — paid users whose last_seen_at is older than 15 days
      if (paid.length > 0) {
        const ids = paid.map((u: any) => u.id);
        const { data: recentUsers } = await supabase
          .from("users").select("id")
          .gte("last_seen_at", fifteenDaysAgo)
          .in("id", ids.slice(0, 500));
        const recentIds = new Set((recentUsers ?? []).map((u: any) => u.id));
        setChurnIds(ids.filter((id) => !recentIds.has(id)));
      } else {
        setChurnIds([]);
      }

      setLoading(false);
    };
    load();
  }, [dateFrom, dateTo, selectedHouseId]);

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  /* ── Compute filtered user IDs based on plan filter ── */
  let filteredUserIds: Set<string> | null = null; // null = no filter (geral)

  if (planFilter !== "geral") {
    if (["alavancagem", "desaltas", "live_telegram", "acesso_vitalicio"].includes(planFilter)) {
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
  const tierLabels: Record<string, string> = { free: "Free", basic: "Básico", pro: "Pro", ultra: "Ultra" };
  const planDist = tierOrder
    .filter((t) => (tierCounts[t] ?? 0) > 0)
    .map((t) => ({ name: tierLabels[t], value: tierCounts[t] }));

  const relevantEntitlements = filteredUserIds
    ? allEntitlements.filter((e) => filteredUserIds!.has(e.user_id))
    : allEntitlements;
  const addonCounts: Record<string, number> = {};
  relevantEntitlements.forEach((e) => { addonCounts[e.product_key] = (addonCounts[e.product_key] ?? 0) + 1; });
  const addonLabels: Record<string, string> = { alavancagem: "Alavancagem", desaltas: "Odds Altas", live_telegram: "Live Telegram", acesso_vitalicio: "Acesso Vitalício" };
  const addonDist = Object.entries(addonCounts).map(([name, value]) => ({
    name: addonLabels[name] ?? name,
    value,
  }));

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
    { key: "15d", label: "Últimos 15 dias" },
    { key: "30d", label: "Últimos 30 dias" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard — Futebol</h2>
        <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white gap-2"
          disabled={loading}
          onClick={() => { setDateFrom(new Date(dateFrom)); }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
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
          <span className="text-gray-500 text-sm">até</span>
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
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Usuários dos Planos Principais</h3>
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
                        <span>{item.name} — {item.value} usuário{item.value !== 1 ? "s" : ""} — {pct}%</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sem dados de planos</div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Usuários dos Planos Adicionais</h3>
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
                        <span>{item.name} — {item.value} usuário{item.value !== 1 ? "s" : ""} — {pct}%</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-600">Sem planos adicionais ativos</div>
          )}
        </div>
      </div>

    </div>
  );
}
