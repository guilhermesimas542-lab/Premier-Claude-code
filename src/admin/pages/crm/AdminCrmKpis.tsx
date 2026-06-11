import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, BarChart3, Users, Repeat, Radio } from "lucide-react";
import { CHANNELS, type ChannelKey } from "../../lib/crm/channels";
import {
  useConversionFreeToPremium,
  useDauMau,
  useChurnRiskCount,
  useOddsClicksByPlan,
  useRfmDistribution,
  useChannelDeliveryRate,
} from "../../hooks/crm/useCrmKpis";

type KpiCardProps = {
  title: string;
  value?: React.ReactNode;
  hint?: string;
  loading?: boolean;
  placeholder?: boolean;
  /** Marca como "parcial" (cinza claro), separado de "Aguardando rastreio" (cinza). */
  partial?: boolean;
};

function KpiCard({ title, value, hint, loading, placeholder, partial }: KpiCardProps) {
  return (
    <Card className="p-4 bg-gray-900 border-white/10">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
        {title}
      </div>
      <div className="min-h-[44px] flex items-end">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        ) : placeholder ? (
          <Badge className="bg-gray-700 text-gray-200 hover:bg-gray-700 border-0">
            Aguardando rastreio
          </Badge>
        ) : partial ? (
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-white">{value ?? "—"}</div>
            <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">
              parcial
            </Badge>
          </div>
        ) : (
          <div className="text-3xl font-bold text-white">{value ?? "—"}</div>
        )}
      </div>
      {hint && <div className="text-xs text-gray-500 mt-2">{hint}</div>}
    </Card>
  );
}

function fmt(n: number | null | undefined, suffix = "") {
  if (n == null || Number.isNaN(n)) return "—";
  if (suffix === "%") return `${n.toFixed(1)}%`;
  return n.toLocaleString("pt-BR");
}

// ============ ABA 1 ============
function TabFunil() {
  const conv = useConversionFreeToPremium();
  const c = conv.data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        title="Conversão Free → Premium (D+1)"
        loading={conv.isLoading}
        value={c ? fmt(c.d1, "%") : "—"}
        hint={c ? `coorte: ${c.cohort} usuários (30d)` : "% que comprou em 24h"}
        partial
      />
      <KpiCard
        title="Conversão Free → Premium (D+7)"
        loading={conv.isLoading}
        value={c ? fmt(c.d7, "%") : "—"}
        hint={c ? `coorte: ${c.cohort} usuários (30d)` : "% que comprou em 7 dias"}
        partial
      />
      <KpiCard
        title="Conversão Premium → Diamante"
        placeholder
        hint="depende de mapear upsell por order"
      />
      <KpiCard
        title="CTR Régua Onboarding"
        placeholder
        hint="cliques reais ainda não rastreados"
      />
      <KpiCard
        title="Recuperação de Carrinho"
        placeholder
        hint="abandono → compra via campanha"
      />
    </div>
  );
}

// ============ ABA 2 ============
function TabEngajamento() {
  const dauMau = useDauMau();
  const churn = useChurnRiskCount();
  const odds = useOddsClicksByPlan();

  const ratio =
    dauMau.data && dauMau.data.mau
      ? (dauMau.data.dau / dauMau.data.mau) * 100
      : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="DAU"
          loading={dauMau.isLoading}
          value={dauMau.data ? fmt(dauMau.data.dau) : "—"}
          hint="usuários ativos hoje"
        />
        <KpiCard
          title="MAU"
          loading={dauMau.isLoading}
          value={dauMau.data ? fmt(dauMau.data.mau) : "—"}
          hint="ativos nos últimos 30 dias"
        />
        <KpiCard
          title="DAU / MAU"
          loading={dauMau.isLoading}
          value={ratio != null ? fmt(ratio, "%") : "—"}
          hint="grau de aderência da base"
        />
        <KpiCard
          title="Risco de Churn (pagos)"
          loading={churn.isLoading}
          value={churn.data != null ? fmt(churn.data) : "—"}
          hint="premium/diamante ativos mas sem usar IA há 3 dias"
        />
      </div>

      <Card className="p-4 bg-gray-900 border-white/10">
        <div className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
          Cliques em Odds por Plano (últimos 7 dias)
        </div>
        {odds.isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {(["free", "premium", "diamante"] as const).map((t) => (
              <div key={t} className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-[11px] uppercase text-gray-500">{t}</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {odds.data ? fmt(odds.data[t]) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiCard
          title="Transbordo p/ Telegram"
          placeholder
          hint="resgates de telegram por usuários free"
        />
      </div>
    </div>
  );
}

// ============ ABA 3 ============
function TabRetencao() {
  const rfm = useRfmDistribution();
  const [cac, setCac] = useState("");

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-900 border-white/10">
        <div className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
          Recência da Base (RFM)
        </div>
        {rfm.isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        ) : rfm.data ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { k: "ativos", label: "Ativos (<3d)", color: "bg-green-500" },
              { k: "alerta", label: "Em Alerta (4-7d)", color: "bg-yellow-500" },
              { k: "inativos", label: "Inativos (8-15d)", color: "bg-orange-500" },
              { k: "churn", label: "Churn Crítico (>16d)", color: "bg-red-500" },
              { k: "nunca", label: "Nunca acessaram", color: "bg-gray-500" },
            ].map(({ k, label, color }) => {
              const v = rfm.data!.counts[k] ?? 0;
              const pct = rfm.data!.total ? (v / rfm.data!.total) * 100 : 0;
              return (
                <div key={k} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-[11px] uppercase text-gray-400">{label}</div>
                  <div className="text-2xl font-bold text-white mt-1">{fmt(v)}</div>
                  <div className="text-xs text-gray-500">{pct.toFixed(1)}%</div>
                  <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500">—</div>
        )}
        {rfm.data && (
          <div className="text-xs text-gray-500 mt-3">
            Base total: {fmt(rfm.data.total)} usuários
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiCard
          title="Win-back Rate"
          placeholder
          hint="inativos >8d que voltaram pós-campanha"
        />
        <Card className="p-4 bg-gray-900 border-white/10">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
            CAC de Reativação
          </div>
          <div className="flex items-end gap-2 mb-2">
            <Badge className="bg-gray-700 text-gray-200 hover:bg-gray-700 border-0">
              Aguardando rastreio
            </Badge>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-400">
              Custo do período (R$)
            </label>
            <Input
              type="number"
              value={cac}
              onChange={(e) => setCac(e.target.value)}
              placeholder="0,00"
              className="bg-gray-800 border-white/10 text-white"
            />
            <div className="text-xs text-gray-500">
              Será dividido pelo nº de reativados quando o rastreio estiver pronto.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============ ABA 4 ============
function TabCanais() {
  const delivery = useChannelDeliveryRate();

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-900 border-white/10">
        <div className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
          Taxa de Entrega Corrigida (últimos 30 dias)
        </div>
        <div className="text-[11px] text-gray-500 mb-3">
          delivered / (delivered + failed). Excluímos falhas por número/email inválido.
        </div>
        {delivery.isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        ) : delivery.data && delivery.data.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {delivery.data.map((r) => {
              const meta = CHANNELS[r.channel as ChannelKey];
              return (
                <div key={r.channel} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-[11px] uppercase text-gray-400">
                    {meta?.label ?? r.channel}
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {fmt(r.rate, "%")}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {fmt(r.delivered)} ok · {fmt(r.failed)} falhas reais
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Sem eventos no período.</div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard title="Open Rate (Email/Push)" placeholder hint="evento de abertura ainda não capturado" />
        <KpiCard title="CTR por Canal" placeholder hint="cliques por canal ainda não rastreados" />
        <KpiCard title="Taxa de Opt-out" placeholder hint="descadastros ainda não rastreados" />
      </div>
    </div>
  );
}

// ============ Página ============
export default function AdminCrmKpis() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Indicadores (KPIs)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão consolidada de funil, engajamento, retenção e canais. Métricas marcadas como{" "}
          <span className="text-gray-300">"Aguardando rastreio"</span> ficarão prontas conforme novos eventos forem ligados.
        </p>
      </div>

      <Tabs defaultValue="funil" className="w-full">
        <TabsList className="bg-gray-900 border border-white/10">
          <TabsTrigger value="funil" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
            <BarChart3 className="w-4 h-4 mr-1.5" /> Funil & Upgrade
          </TabsTrigger>
          <TabsTrigger value="engajamento" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
            <Users className="w-4 h-4 mr-1.5" /> Engajamento
          </TabsTrigger>
          <TabsTrigger value="retencao" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
            <Repeat className="w-4 h-4 mr-1.5" /> Retenção
          </TabsTrigger>
          <TabsTrigger value="canais" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
            <Radio className="w-4 h-4 mr-1.5" /> Canais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funil" className="mt-4">
          <TabFunil />
        </TabsContent>
        <TabsContent value="engajamento" className="mt-4">
          <TabEngajamento />
        </TabsContent>
        <TabsContent value="retencao" className="mt-4">
          <TabRetencao />
        </TabsContent>
        <TabsContent value="canais" className="mt-4">
          <TabCanais />
        </TabsContent>
      </Tabs>
    </div>
  );
}
