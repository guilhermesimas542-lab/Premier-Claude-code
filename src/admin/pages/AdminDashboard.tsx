import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Activity, Clock, CalendarDays } from "lucide-react";

interface KPI {
  label: string;
  value: string;
  icon: React.ElementType;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [usersRes, sessionsRes, eventsRes, recentRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("duration_seconds").gte("session_start_at", d30),
        supabase.from("events").select("id", { count: "exact", head: true }).gte("created_at", d30),
        supabase.from("events").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const totalUsers = usersRes.count ?? 0;
      const sessions = sessionsRes.data ?? [];
      const totalSessions = sessions.length;
      const avgDuration = totalSessions > 0
        ? Math.round(sessions.reduce((s, r) => s + (r.duration_seconds ?? 0), 0) / totalSessions)
        : 0;
      const totalEvents = eventsRes.count ?? 0;

      setKpis([
        { label: "Usuários totais", value: String(totalUsers), icon: Users },
        { label: "Sessões (30d)", value: String(totalSessions), icon: Activity },
        { label: "Tempo médio (seg)", value: String(avgDuration), icon: Clock },
        { label: "Eventos (30d)", value: String(totalEvents), icon: CalendarDays },
      ]);

      setRecentEvents(recentRes.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-gray-900 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <kpi.icon className="w-4 h-4" />
              {kpi.label}
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Últimos eventos</h3>
        <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500">
                <th className="px-4 py-2">Evento</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((ev) => (
                <tr key={ev.id} className="border-b border-white/5 text-gray-300">
                  <td className="px-4 py-2 font-mono text-xs">{ev.event_name}</td>
                  <td className="px-4 py-2 text-xs">{ev.user_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{new Date(ev.created_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              {recentEvents.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-600">Nenhum evento</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
