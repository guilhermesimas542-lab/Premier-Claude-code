import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClientProfileModal } from "../components/ClientProfileModal";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

type SortKey = "event_name" | "email" | "created_at";
type SortDir = "asc" | "desc";

const getDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

const quickFilters = [
  { label: "Hoy", from: getDateStr(0), to: getDateStr(0), key: 0 },
  { label: "Ayer", from: getDateStr(1), to: getDateStr(1), key: 1 },
  { label: "Anteayer", from: getDateStr(2), to: getDateStr(2), key: 2 },
  { label: "7 días", from: getDateStr(6), to: getDateStr(0), key: 7 },
  { label: "30 días", from: getDateStr(29), to: getDateStr(0), key: 30 },
];

export default function AdminEventsPage() {
  const { selectedHouseId } = useBettingHouseAdmin();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterEvent, setFilterEvent] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [activeShortcut, setActiveShortcut] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("events")
      .select("id, event_name, user_id, created_at, users(email, betting_house_id)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (selectedHouseId) {
      const { data: houseUsers } = await supabase
        .from("users").select("id").eq("betting_house_id", selectedHouseId);
      const userIds = (houseUsers ?? []).map((u: any) => u.id);
      if (userIds.length > 0) {
        q = q.in("user_id", userIds);
      } else {
        setEvents([]);
        setLoading(false);
        return;
      }
    }

    if (filterFrom) q = q.gte("created_at", filterFrom);
    if (filterTo) q = q.lte("created_at", filterTo + "T23:59:59");
    if (filterEvent) q = q.eq("event_name", filterEvent);

    const { data } = await q;
    setEvents((data as any[]) ?? []);
    setLoading(false);
  }, [selectedHouseId, filterFrom, filterTo, filterEvent]);

  useEffect(() => { load(); }, [load]);

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

  const handleExportCSV = () => {
    const dataToExport = sorted.length > 0 ? sorted : events;
    const headers = ["Evento", "Correo", "Fecha"];
    const rows = dataToExport.map((ev: any) => [
      ev.event_name ?? "",
      ev.users?.email ?? "—",
      ev.created_at ? new Date(ev.created_at).toLocaleString("es-CL") : "",
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventos_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Últimos Eventos</h1>
        <button
          onClick={() => load()}
          className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {quickFilters.map((qf) => (
            <button
              key={qf.key}
              onClick={() => {
                setFilterFrom(qf.from);
                setFilterTo(qf.to);
                setActiveShortcut(qf.key);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                activeShortcut === qf.key
                  ? "bg-blue-600/30 text-blue-400 ring-1 ring-blue-400"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {qf.label}
            </button>
          ))}
          <button
            onClick={() => { setFilterFrom(""); setFilterTo(""); setFilterEvent(""); setActiveShortcut(null); }}
            className="px-3 py-1 rounded-full text-xs font-bold bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Limpiar
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Desde</span>
            <Input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setActiveShortcut(null); }} className="bg-gray-800 border-gray-700 text-xs h-8 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Hasta</span>
            <Input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setActiveShortcut(null); }} className="bg-gray-800 border-gray-700 text-xs h-8 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Acción</span>
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-xs h-8 px-2 rounded-md"
            >
              <option value="">Todas</option>
              <option value="app_open">app_open</option>
              <option value="screen_view">screen_view</option>
              <option value="screen_time">screen_time</option>
              <option value="view_entries">view_entries</option>
              <option value="card_click">card_click</option>
              <option value="session_start">session_start</option>
              <option value="user_login">user_login</option>
              <option value="payment_purchase">payment_purchase</option>
              <option value="funnel_view">funnel_view</option>
              <option value="click_locked_entry">click_locked_entry</option>
              <option value="click_buy_from_popup">click_buy_from_popup</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm font-medium transition-colors"
          >
            Exportar CSV
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          Mostrando {events.length} eventos
        </span>
      </div>

      {/* Table */}
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
                Correo <SortIcon col="email" />
              </th>
              <th
                className="px-4 py-2 cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort("created_at")}
              >
                Fecha <SortIcon col="created_at" />
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
                <td className="px-4 py-2 text-xs">{new Date(ev.created_at).toLocaleString("es-CL")}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">Ningún evento</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ClientProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}
