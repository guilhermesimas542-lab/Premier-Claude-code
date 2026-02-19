import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortKey = "event_name" | "user_id" | "created_at";
type SortDir = "asc" | "desc";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .limit(100);
      setEvents(data ?? []);
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
      let aVal = a[sortKey] ?? "";
      let bVal = b[sortKey] ?? "";
      if (sortKey === "created_at") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
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
                onClick={() => handleSort("user_id")}
              >
                User <SortIcon col="user_id" />
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
                <td className="px-4 py-2 text-xs">{ev.user_id?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{new Date(ev.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">Nenhum evento</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

