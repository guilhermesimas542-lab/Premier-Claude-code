import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Users,
  Trophy,
  Layers,
  Loader2,
  RefreshCw,
  Monitor,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useBehaviorReport,
  type Bucket,
  type Window,
} from "../hooks/useBehaviorReport";
import type { AudienceBehaviorFilter } from "../hooks/crm/useAudiences";

const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const WINDOW_DAYS: Record<Window, number> = { "7d": 7, "30d": 30, "90d": 90 };

export default function AdminBehavior() {
  const { data, loading, window, setWindow, refresh } = useBehaviorReport("30d");
  const navigate = useNavigate();
  const windowDays = WINDOW_DAYS[window];

  const goToAudience = (behavior: AudienceBehaviorFilter) => {
    navigate("/admin/crm/audiences", {
      state: { prefillBehavior: { window_days: windowDays, ...behavior } },
    });
  };



  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Comportamento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Como os leads usam a IA Tipster — campeonatos, mercados e times mais
            analisados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WindowTabs value={window} onChange={setWindow} />
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Recarregar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={BarChart3}
          label="Análises geradas"
          value={data.total_analyses}
          color="#60A5FA"
        />
        <Kpi
          icon={Users}
          label="Usuários distintos"
          value={data.distinct_users}
          color="#22C55E"
        />
        <Kpi
          icon={Trophy}
          label="Jogos distintos"
          value={data.distinct_fixtures}
          color="#FACC15"
        />
        <Kpi
          icon={Layers}
          label="Campeonatos"
          value={data.distinct_leagues}
          color="#A855F7"
        />
      </div>

      {loading && data.total_analyses === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : data.total_analyses === 0 ? (
        <EmptyState window={window} />
      ) : (
        <>
          {/* Top campeonatos + top mercados */}
          <div className="grid lg:grid-cols-2 gap-3">
            <RankingCard
              title="Top campeonatos"
              hint="Clique numa linha pra criar uma audiência"
              buckets={data.top_leagues}
              color="#A855F7"
              onPick={(label) => goToAudience({ league_names: [label] })}
            />
            <RankingCard
              title="Top mercados"
              hint="Clique numa linha pra criar uma audiência"
              buckets={data.top_markets}
              color="#22C55E"
              onPick={(label) => goToAudience({ markets: [label] })}
            />
          </div>

          {/* Top jogos + breakdown source/os */}
          <div className="grid lg:grid-cols-2 gap-3">
            <RankingCard
              title="Jogos mais analisados"
              hint="Clique numa linha pra criar audiência com os 2 times"
              buckets={data.top_teams}
              color="#FACC15"
              onPick={(label) => {
                const parts = label.split(/\s+x\s+/i).map((s) => s.trim()).filter(Boolean);
                if (parts.length === 0) return;
                goToAudience({ team_names: parts });
              }}
            />

            <div className="space-y-3">
              <RankingCard
                title="Chat vs Ao Vivo"
                hint="Origem da análise"
                buckets={data.by_source}
                color="#60A5FA"
                compact
              />
              <RankingCard
                title="Sistemas operacionais"
                hint="OS dos usuários"
                buckets={data.by_os}
                color="#F472B6"
                compact
              />
            </div>
          </div>

          {/* Heatmap dia × hora */}
          <Heatmap matrix={data.heatmap} />
        </>
      )}
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function WindowTabs({
  value,
  onChange,
}: {
  value: Window;
  onChange: (w: Window) => void;
}) {
  const opts: { v: Window; label: string }[] = [
    { v: "7d", label: "7 dias" },
    { v: "30d", label: "30 dias" },
    { v: "90d", label: "90 dias" },
  ];
  return (
    <div className="flex gap-1">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded transition ${
            value === o.v
              ? "bg-primary text-primary-foreground"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">
        {value.toLocaleString("pt-BR")}
      </div>
    </div>
  );
}

function RankingCard({
  title,
  hint,
  buckets,
  color,
  compact,
  onPick,
}: {
  title: string;
  hint?: string;
  buckets: Bucket[];
  color: string;
  compact?: boolean;
  onPick?: (label: string) => void;
}) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {hint && (
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
      {buckets.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sem dados nesse período.</p>
      ) : (
        <div className={compact ? "space-y-1.5" : "space-y-2"}>
          {buckets.map((b, idx) => {
            const clickable = !!onPick;
            const content = (
              <>
                <div className="flex items-center justify-between gap-2 mb-1 text-xs">
                  <span className="text-foreground truncate flex items-center gap-1" title={clickable ? `Usar "${b.label}" em audiência` : b.label}>
                    <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                    {b.label}
                    {clickable && (
                      <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    <strong className="text-foreground">{b.count.toLocaleString("pt-BR")}</strong>
                    <span className="ml-1 text-[10px]">
                      ({Math.round(b.share * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(b.count / max) * 100}%`, background: color }}
                  />
                </div>
              </>
            );
            return clickable ? (
              <button
                key={b.label + idx}
                type="button"
                onClick={() => onPick!(b.label)}
                className="group w-full text-left rounded-lg px-2 -mx-2 py-1 hover:bg-primary/10 transition"
                title={`Usar "${b.label}" em audiência`}
              >
                {content}
              </button>
            ) : (
              <div key={b.label + idx}>{content}</div>
            );
          })}
        </div>

      )}
    </div>
  );
}

function Heatmap({ matrix }: { matrix: number[][] }) {
  // Max valor pra normalizar a cor
  let max = 0;
  for (const row of matrix) for (const v of row) if (v > max) max = v;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground">Hora do dia</h2>
        <p className="text-[11px] text-muted-foreground">
          Quando os leads geram análise — quanto mais escuro, mais uso.
        </p>
      </div>

      {max === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Sem dados nesse período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header de horas */}
            <div className="flex pl-10">
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  className="text-[9px] text-muted-foreground text-center"
                  style={{ width: 20 }}
                >
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>
            {matrix.map((row, dow) => (
              <div key={dow} className="flex items-center">
                <span className="text-[10px] text-muted-foreground w-10 shrink-0">
                  {DOW_LABELS[dow]}
                </span>
                {row.map((v, h) => {
                  const intensity = v / max;
                  return (
                    <div
                      key={h}
                      style={{
                        width: 20,
                        height: 20,
                        margin: 1,
                        borderRadius: 3,
                        background:
                          intensity > 0
                            ? `rgba(96, 165, 250, ${0.15 + intensity * 0.85})`
                            : "rgba(255,255,255,0.04)",
                      }}
                      title={`${DOW_LABELS[dow]} ${h}h: ${v} análises`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ window }: { window: Window }) {
  const label =
    window === "7d" ? "7 dias" : window === "30d" ? "30 dias" : "90 dias";
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
        <BarChart3 className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1">
        Sem análises nos últimos {label}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">
        Os dados aparecem aqui assim que leads começarem a gerar análises na IA
        Tipster — o tracking enriquecido já está ativo.
      </p>
      <p className="text-[11px] text-muted-foreground italic">
        Evento monitorado: <code>ia_tipster_analysis_opened</code>
      </p>
    </div>
  );
}
