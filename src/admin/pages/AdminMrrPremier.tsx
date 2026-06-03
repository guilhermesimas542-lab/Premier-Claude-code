import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  ShoppingCart,
  Undo2,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatBRL } from "@/admin/components/revenue/constants";
import { useMrrReport, type MrrTimeframe } from "@/admin/hooks/mrr/useMrrReport";

const TIMEFRAMES: { value: MrrTimeframe; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "custom", label: "Personalizado" },
];

export default function AdminMrrPremier() {
  const [timeframe, setTimeframe] = useState<MrrTimeframe>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const { data, isLoading } = useMrrReport(timeframe, customStart, customEnd);

  const cards = [
    {
      title: "MRR Acumulado",
      value: formatBRL(data.mrrAcumulado),
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      title: "Nº de Vendas",
      value: String(data.numVendas),
      icon: ShoppingCart,
      color: "text-blue-400",
    },
    {
      title: "Reembolsadas",
      value: String(data.numReembolsadas),
      icon: Undo2,
      color: "text-orange-400",
    },
    {
      title: "Chargebacks",
      value: String(data.numChargebacks),
      icon: AlertTriangle,
      color: "text-red-400",
    },
    {
      title: "% Churn (reemb. + chargeback)",
      value: `${data.churnPct.toFixed(1)}%`,
      icon: TrendingDown,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MRR Premier</h1>
        <p className="text-sm text-muted-foreground">Assinatura e recorrência</p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Painel pronto. Os números aparecem assim que o produto de assinatura for
        cadastrado e começar a enviar eventos de venda/renovação ao financial_events.
      </div>

      {/* Timeframe selector */}
      <div className="flex flex-wrap items-center gap-2">
        {TIMEFRAMES.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant={timeframe === t.value ? "default" : "outline"}
            onClick={() => setTimeframe(t.value)}
          >
            {t.label}
          </Button>
        ))}
        {timeframe === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-auto"
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-auto"
            />
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((k, i) => (
          <Card key={i} className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <k.icon className={`w-5 h-5 ${k.color}`} />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {k.title}
                </span>
              </div>
              <p className={`text-2xl font-bold ${isLoading ? "animate-pulse" : ""}`}>
                {isLoading ? "..." : k.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="bg-card border border-border">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
            MRR por dia
          </h2>
          <div className="h-64">
            {data.serie.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem dados no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => formatBRL(v)}
                  />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
