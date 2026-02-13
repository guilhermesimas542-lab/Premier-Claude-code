import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setEvents(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Últimos Eventos</h2>
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
            {events.map((ev) => (
              <tr key={ev.id} className="border-b border-white/5 text-gray-300">
                <td className="px-4 py-2 font-mono text-xs">{ev.event_name}</td>
                <td className="px-4 py-2 text-xs">{ev.user_id?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{new Date(ev.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-600">Nenhum evento</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
