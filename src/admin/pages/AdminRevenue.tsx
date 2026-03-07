import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, ShoppingCart, TrendingUp, Users, AlertTriangle, Target } from "lucide-react";
import { RECOVERY_EVENTS, formatBRL } from "@/admin/components/revenue/constants";
import RecoveryTab from "@/admin/components/revenue/RecoveryTab";
import UpsellTab from "@/admin/components/revenue/UpsellTab";
import TransactionLogs from "@/admin/components/revenue/TransactionLogs";

interface KPIs {
  revenue30d: number;
  sales30d: number;
  ticketMedio: number;
  ltv: number;
  activeUsers: number;
  recoveryOps: number;
}

export default function AdminRevenue() {
  const [kpis, setKpis] = useState<KPIs>({
    revenue30d: 0, sales30d: 0, ticketMedio: 0, ltv: 0, activeUsers: 0, recoveryOps: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const REVENUE_EVENTS = ['Compra_Completa', 'Pagamento_de_Renovacao_Efetuado'];

      const [r30, rAll, activeRes, recoveryRes] = await Promise.all([
        (supabase.from as any)('financial_events')
          .select('value_cents, email')
          .in('event_name', REVENUE_EVENTS)
          .gte('created_at', thirtyDaysAgo),
        (supabase.from as any)('financial_events')
          .select('value_cents, email')
          .in('event_name', REVENUE_EVENTS),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('last_seen_at', sevenDaysAgo),
        (supabase.from as any)('financial_events')
          .select('id', { count: 'exact', head: true })
          .in('event_name', RECOVERY_EVENTS)
          .gte('created_at', thirtyDaysAgo),
      ]);

      const events30 = r30.data || [];
      const revenue30d = events30.reduce((s: number, e: any) => s + Number(e.value_cents || 0), 0) / 100;
      const sales30d = events30.length;

      const allEvents = rAll.data || [];
      const totalRevenue = allEvents.reduce((s: number, e: any) => s + Number(e.value_cents || 0), 0) / 100;
      const uniqueEmails = new Set(allEvents.filter((e: any) => e.email).map((e: any) => e.email)).size;

      setKpis({
        revenue30d,
        sales30d,
        ticketMedio: sales30d > 0 ? revenue30d / sales30d : 0,
        ltv: uniqueEmails > 0 ? totalRevenue / uniqueEmails : 0,
        activeUsers: activeRes.count || 0,
        recoveryOps: recoveryRes.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  const kpiCards = [
    {
      title: 'Faturamento Bruto (30d)',
      value: formatBRL(kpis.revenue30d),
      sub: 'Últimos 30 dias',
      icon: DollarSign,
      color: 'text-green-400',
    },
    {
      title: 'Vendas Realizadas (30d)',
      value: String(kpis.sales30d),
      sub: 'Transações pagas',
      icon: ShoppingCart,
      color: 'text-blue-400',
    },
    {
      title: 'Ticket Médio (30d)',
      value: formatBRL(kpis.ticketMedio),
      sub: 'Valor médio por venda',
      icon: TrendingUp,
      color: 'text-purple-400',
    },
    {
      title: 'LTV Financeiro',
      value: formatBRL(kpis.ltv),
      sub: 'Valor médio por cliente (histórico)',
      icon: Target,
      color: 'text-amber-400',
    },
    {
      title: 'Usuários Ativos (7d)',
      value: String(kpis.activeUsers),
      sub: 'Acessaram nos últimos 7 dias',
      icon: Users,
      color: 'text-cyan-400',
    },
    {
      title: 'Oportunidades de Recuperação',
      value: String(kpis.recoveryOps),
      sub: 'Receita a recuperar (30d)',
      icon: AlertTriangle,
      color: 'text-orange-400',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Central de Inteligência Financeira</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((k, i) => (
          <Card key={i} className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <k.icon className={`w-5 h-5 ${k.color}`} />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {k.title}
                </span>
              </div>
              <p className={`text-2xl font-bold ${loading ? 'animate-pulse' : ''}`}>
                {loading ? '...' : k.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recovery" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recovery">Recuperação de Vendas</TabsTrigger>
          <TabsTrigger value="upsell">Oportunidades de Upsell</TabsTrigger>
          <TabsTrigger value="logs">Logs de Transações</TabsTrigger>
        </TabsList>

        <TabsContent value="recovery">
          <RecoveryTab />
        </TabsContent>

        <TabsContent value="upsell">
          <UpsellTab />
        </TabsContent>

        <TabsContent value="logs">
          <TransactionLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
