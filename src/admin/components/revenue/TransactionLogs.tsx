import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ChevronLeft, ChevronRight, Check, RefreshCw } from "lucide-react";
import { FinancialEvent, getEventDisplay, getEventCategory, formatCLP } from "./constants";

const PAGE_SIZE = 50;
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'Ingresos', label: 'Ingresos' },
  { value: 'Pérdida', label: 'Pérdida' },
  { value: 'Recuperación', label: 'Recuperación' },
  { value: 'Info', label: 'Info' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Ingresos': 'bg-green-500/10 text-green-400 border-green-500/30',
  'Pérdida': 'bg-red-500/10 text-red-400 border-red-500/30',
  'Recuperación': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'Info': 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

export default function TransactionLogs() {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [emailSearch, setEmailSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<FinancialEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = (supabase.from as any)('financial_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (emailSearch.trim()) query = query.ilike('email', `%${emailSearch.trim()}%`);
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());

    const { data, count } = await query;
    let filtered = (data as FinancialEvent[]) || [];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => getEventCategory(e.event_name).label === categoryFilter);
    }

    setEvents(filtered);
    setTotal(count || 0);
    setLoading(false);
  }, [page, emailSearch, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const openHistory = async (email: string) => {
    setSelectedEmail(email);
    setHistoryLoading(true);
    const { data } = await (supabase.from as any)('financial_events')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: true })
      .limit(200);
    setEmailHistory((data as FinancialEvent[]) || []);
    setHistoryLoading(false);
  };

  const exportCSV = async () => {
    let query = (supabase.from as any)('financial_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (emailSearch.trim()) query = query.ilike('email', `%${emailSearch.trim()}%`);
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
    const { data } = await query;
    const rows = (data as FinancialEvent[]) || [];

    const headers = ['ID', 'Fecha', 'Evento', 'Categoría', 'Email', 'Producto', 'Valor', 'Recurrente'];
    const csv = [
      headers.join(','),
      ...rows.map(e => [
        e.id,
        new Date(e.created_at).toLocaleString('es-CL'),
        `"${getEventDisplay(e.event_name)}"`,
        `"${getEventCategory(e.event_name).label}"`,
        e.email || '',
        `"${e.product_name || ''}"`,
        e.value_cents ? (e.value_cents / 100).toFixed(2) : '',
        e.is_recurring ? 'Sí' : 'No',
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" className="w-40" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" className="w-40" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Categoría</label>
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Buscar email</label>
          <Input
            placeholder="nombre@email.com"
            value={emailSearch}
            onChange={e => { setEmailSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Cargando...</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No se encontró ningún evento.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Rec.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(ev => {
                const cat = getEventCategory(ev.event_name);
                return (
                  <TableRow
                    key={ev.id}
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => ev.email && openHistory(ev.email)}
                  >
                    <TableCell className="text-xs text-muted-foreground">{ev.id}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell className="text-sm">{getEventDisplay(ev.event_name)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[cat.label] || ''}`}>
                        {cat.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{ev.email || '—'}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{ev.product_name || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {ev.value_cents ? formatCLP(ev.value_cents / 100) : '—'}
                    </TableCell>
                    <TableCell>
                      {ev.is_recurring && <Check className="w-4 h-4 text-green-400" />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} registro(s) — Página {page + 1}/{totalPages}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Email history dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Historial — {selectedEmail}</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <p className="text-muted-foreground py-4">Cargando...</p>
          ) : emailHistory.length === 0 ? (
            <p className="text-muted-foreground py-4">No se encontró ningún evento.</p>
          ) : (
            <div className="space-y-2">
              {emailHistory.map(ev => {
                const cat = getEventCategory(ev.event_name);
                return (
                  <div key={ev.id} className="flex items-center gap-3 border-b pb-2 last:border-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString('es-CL')}
                    </span>
                    <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[cat.label] || ''}`}>
                      {cat.label}
                    </Badge>
                    <span className="text-sm font-medium">{getEventDisplay(ev.event_name)}</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {ev.value_cents ? formatCLP(ev.value_cents / 100) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
