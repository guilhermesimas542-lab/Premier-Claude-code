import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { ClientProfileModal } from "../components/ClientProfileModal";

type SortKey = "event_name" | "email" | "created_at";
type SortDir = "asc" | "desc";

interface EventWithUser {
  id: string;
  event_name: string;
  user_id: string | null;
  created_at: string;
  users: { email: string } | null;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, event_name, user_id, created_at, users(email)")
        .limit(100);
      setEvents((data as unknown as EventWithUser[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortKey === "created_at") {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else if (sortKey === "email") {
        aVal = (a.users?.email ?? "").toLowerCase();
        bVal = (b.users?.email ?? "").toLowerCase();
      } else {
        aVal = String(a[sortKey] ?? "").toLowerCase();
        bVal = String(b[sortKey] ?? "").toLowerCase();
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [events, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="inline ml-1 opacity-40" size={13} />;
    return sortDir === "asc"
      ? <ArrowUp className="inline ml-1 text-primary" size={13} />
      : <ArrowDown className="inline ml-1 text-primary" size={13} />;
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Últimos Eventos</h2>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th
                className="px-4 py-2 cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort("event_name")}
              >
                Evento <SortIcon col="event_name" />
              </th>
              <th
                className="px-4 py-2 cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort("email")}
              >
                Email <SortIcon col="email" />
              </th>
              <th
                className="px-4 py-2 cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort("created_at")}
              >
                Data <SortIcon col="created_at" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ev) => (
              <tr key={ev.id} className="border-b border-border/50 text-muted-foreground">
                <td className="px-4 py-2 font-mono text-xs">{ev.event_name}</td>
                <td className="px-4 py-2 text-xs">
                  {ev.user_id && ev.users?.email ? (
                    <button
                      onClick={() => setSelectedUserId(ev.user_id)}
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors text-left"
                    >
                      {ev.users.email}
                    </button>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">{new Date(ev.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">Nenhum evento</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ClientProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}


