import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("30");
  const [kpis, setKpis] = useState({ uniqueUsers: 0, totalSessions: 0, avgDuration: 0 });
  const [userTable, setUserTable] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = new Date(Date.now() - parseInt(period) * 86400000).toISOString();

      // Sessions KPIs
      const { data: sessions } = await supabase.from("sessions").select("user_id, duration_seconds").gte("session_start_at", since);
      const s = sessions ?? [];
      const uniqueUsers = new Set(s.map((r) => r.user_id)).size;
      const totalSessions = s.length;
      const avgDuration = totalSessions > 0 ? Math.round(s.reduce((a, r) => a + (r.duration_seconds ?? 0), 0) / totalSessions) : 0;
      setKpis({ uniqueUsers, totalSessions, avgDuration });

      // User table
      const userMap: Record<string, { sessions: number; totalTime: number }> = {};
      s.forEach((r) => {
        if (!userMap[r.user_id]) userMap[r.user_id] = { sessions: 0, totalTime: 0 };
        userMap[r.user_id].sessions++;
        userMap[r.user_id].totalTime += r.duration_seconds ?? 0;
      });
      const userIds = Object.keys(userMap);
      let userDetails: any[] = [];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from("users").select("id, email, last_seen_at").in("id", userIds.slice(0, 100));
        userDetails = (usersData ?? []).map((u: any) => ({
          ...u,
          sessions: userMap[u.id]?.sessions ?? 0,
          totalTime: userMap[u.id]?.totalTime ?? 0,
        }));
      }
      setUserTable(userDetails.sort((a, b) => b.sessions - a.sessions));

      // Funnel
      const funnelEvents = ["app_open", "view_entries", "click_locked_entry", "click_buy_from_popup"];
      const { data: events } = await supabase.from("events").select("event_name").gte("created_at", since).in("event_name", funnelEvents);
      const counts: Record<string, number> = {};
      funnelEvents.forEach((e) => { counts[e] = 0; });
      (events ?? []).forEach((ev) => { counts[ev.event_name] = (counts[ev.event_name] ?? 0) + 1; });
      setFunnel(funnelEvents.map((name) => ({ name, count: counts[name] })));

      setLoading(false);
    };
    load();
  }, [period]);

  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Analytics</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Usuários únicos", value: kpis.uniqueUsers },
          { label: "Sessões", value: kpis.totalSessions },
          { label: "Tempo médio (seg)", value: kpis.avgDuration },
        ].map((k) => (
          <div key={k.label} className="bg-gray-900 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className="text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
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

      {/* User table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Uso por usuário</h3>
        <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Sessões</th>
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
              {userTable.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-600">Sem dados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
