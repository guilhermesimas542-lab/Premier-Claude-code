import { Loader2 } from "lucide-react";
import { useUserBehavior, type BehaviorBucket, type TimelineItem } from "@/admin/hooks/crm/useUserBehavior";

const GREEN = "#24c660";

interface Props { userId: string | null; enabled: boolean; }

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-800/60 border border-white/5 rounded-lg p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-bold text-white leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarList({ title, items }: { title: string; items: BehaviorBucket[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">{title}</p>
      <div className="space-y-1">
        {items.map((b) => (
          <div key={b.label} className="relative">
            <div className="flex items-center justify-between text-xs relative z-10 px-2 py-1">
              <span className="text-gray-200 truncate pr-2">{b.label}</span>
              <span className="text-gray-400 font-mono shrink-0">{b.count}</span>
            </div>
            <div
              className="absolute inset-y-0 left-0 rounded"
              style={{ width: `${Math.max(b.share * 100, 4)}%`, background: `${GREEN}33` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const isEsportiva = item.event_name === "ia_tipster_open_esportiva";
  const dotColor = isEsportiva ? GREEN : "#3b82f6";
  return (
    <div className="flex gap-2 text-xs">
      <span
        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
        style={{ background: dotColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-gray-200 truncate">
            {item.fixture ?? item.league_name ?? item.event_name}
          </span>
          <span className="text-gray-500 text-[10px] shrink-0">{fmtDate(item.created_at)}</span>
        </div>
        <div className="text-[10px] text-gray-500 truncate">
          {[item.league_name, item.main_market, item.main_odd ? `@${item.main_odd.toFixed(2)}` : null]
            .filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}

export function UserBehaviorPanel({ userId, enabled }: Props) {
  const { data, loading, error } = useUserBehavior(userId, enabled);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }
  if (error) {
    return <p className="text-red-400 text-xs text-center py-4">Erro: {error}</p>;
  }
  if (data.total_analyses === 0 && data.total_esportiva_clicks === 0) {
    return <p className="text-gray-500 text-sm text-center py-6">Sem dados de comportamento ainda</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Análises" value={String(data.total_analyses)} sub={`${data.analyses_30d} nos últimos 30d`} />
        <Kpi
          label="Recência"
          value={data.recency_days === null ? "—" : data.recency_days === 0 ? "hoje" : `${data.recency_days}d`}
        />
        <Kpi
          label="Frequência"
          value={data.per_week !== null ? `${Math.round(data.per_week)}/sem` : "—"}
        />
        <Kpi
          label="Odd média"
          value={data.avg_main_odd !== null ? data.avg_main_odd.toFixed(2) : "—"}
        />
      </div>

      {data.by_source.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.by_source.map((b) => (
            <span
              key={b.label}
              className="px-2 py-1 rounded-full text-[11px] font-medium border"
              style={{ borderColor: `${GREEN}66`, color: GREEN, background: `${GREEN}14` }}
            >
              {b.label} · {b.count}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-3 border-t border-white/10 pt-3">
        <BarList title="Top ligas" items={data.top_leagues} />
        <BarList title="Top mercados" items={data.top_markets} />
        <BarList title="Top jogos" items={data.top_teams} />
      </div>

      {data.timeline.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Linha do tempo</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data.timeline.map((it, i) => <TimelineRow key={i} item={it} />)}
          </div>
        </div>
      )}
    </div>
  );
}
