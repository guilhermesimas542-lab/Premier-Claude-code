import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FinancialEvent, RECOVERY_EVENTS, getEventDisplay, formatBRL } from "./constants";

const PERIOD_OPTIONS = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
  { label: 'Todos', days: 0 },
];

export default function RecoveryTab() {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [eventFilter, setEventFilter] = useState<string[]>(RECOVERY_EVENTS);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = (supabase.from as any)('financial_events')
        .select('*')
        .in('event_name', eventFilter.length > 0 ? eventFilter : RECOVERY_EVENTS)
        .eq('is_test', false)
        .order('created_at', { ascending: false })
        .limit(200);

      if (period !== '0') {
        const since = new Date(Date.now() - Number(period) * 86400000).toISOString();
        query = query.gte('created_at', since);
      }

      const { data } = await query;
      setEvents((data as FinancialEvent[]) || []);
      setLoading(false);
    }
    load();
  }, [period, eventFilter]);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({ title: "Email copiado!", description: "Entre em contato com o cliente." });
  };

  const toggleEvent = (ev: string) => {
    setEventFilter(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(p => (
              <SelectItem key={p.days} value={String(p.days)}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 flex-wrap">
          {RECOVERY_EVENTS.map(ev => (
            <Badge
              key={ev}
              variant={eventFilter.includes(ev) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleEvent(ev)}
            >
              {getEventDisplay(ev)}
            </Badge>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhuma oportunidade de recuperação encontrada.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-sm">{ev.email || '—'}</TableCell>
                  <TableCell className="text-sm">{ev.product_name || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {ev.value_cents ? formatBRL(ev.value_cents / 100) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs">
                      {getEventDisplay(ev.event_name)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ev.email && (
                      <Button size="sm" variant="outline" onClick={() => copyEmail(ev.email!)}>
                        <Copy className="w-3 h-3 mr-1" /> Recuperar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
