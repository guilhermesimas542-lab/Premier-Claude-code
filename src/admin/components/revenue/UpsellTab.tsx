import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UPSELL_FILTERS, TIER_DISPLAY, ADDON_DISPLAY } from "./constants";

interface UserRow {
  id: string;
  email: string;
  main_tier: string;
  last_seen_at: string | null;
}

interface EntitlementRow {
  user_id: string;
  product_key: string;
}

export default function UpsellTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIdx, setFilterIdx] = useState('0');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: u }, { data: e }] = await Promise.all([
        supabase.from('users').select('id, email, main_tier, last_seen_at').not('origin', 'eq', 'test'),
        supabase.from('entitlements').select('user_id, product_key').eq('status', 'active'),
      ]);
      setUsers((u as UserRow[]) || []);
      setEntitlements((e as EntitlementRow[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const entMap = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const e of entitlements) {
      if (!m[e.user_id]) m[e.user_id] = new Set();
      m[e.user_id].add(e.product_key);
    }
    return m;
  }, [entitlements]);

  const ALL_ADDON_KEYS = ['alavancagem', 'desaltas', 'live_telegram', 'acesso_vitalicio'];

  const filtered = useMemo(() => {
    const f = UPSELL_FILTERS[Number(filterIdx)];
    if (!f) return [];

    // "Todas as Oportunidades" — any user missing at least one addon or vitalício
    if (f.tier === 'all') {
      return users.filter(u => {
        const addons = entMap[u.id] || new Set();
        const hasAll = ALL_ADDON_KEYS.every(k => addons.has(k));
        return !hasAll;
      });
    }

    return users.filter(u => {
      const tierMatch = f.tier === 'any_paid'
        ? ['free', 'basic', 'pro', 'ultra'].includes(u.main_tier)
        : u.main_tier === f.tier;
      if (!tierMatch) return false;

      if (f.checkVitalicio) return !u.is_vitalicio;

      const addons = entMap[u.id] || new Set();
      return !addons.has(f.missingKey);
    });
  }, [users, entMap, filterIdx]);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({ title: "Email copiado!", description: "Entre em contato para oferecer o upgrade." });
  };

  const currentFilter = UPSELL_FILTERS[Number(filterIdx)];

  return (
    <div className="space-y-4">
      <Select value={filterIdx} onValueChange={setFilterIdx}>
        <SelectTrigger className="w-80">
          <SelectValue placeholder="Selecione um filtro de upsell" />
        </SelectTrigger>
        <SelectContent>
          {UPSELL_FILTERS.map((f, i) => (
            <SelectItem key={i} value={String(i)}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum cliente encontrado para este filtro.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <p className="text-sm text-muted-foreground px-4 py-2 bg-muted/30">
            {filtered.length} cliente(s) encontrado(s)
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plano Atual</TableHead>
                <TableHead>Add-ons Ativos</TableHead>
                <TableHead>Upsell Sugerido</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(u => {
                const addons = entMap[u.id] || new Set();
                const addonList = Array.from(addons).map(k => ADDON_DISPLAY[k] || k);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{TIER_DISPLAY[u.main_tier] || u.main_tier}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {addonList.length > 0 ? addonList.join(', ') : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-orange-400">
                      {currentFilter ? (currentFilter.checkVitalicio ? 'Acesso Vitalício' : ADDON_DISPLAY[currentFilter.missingKey] || currentFilter.missingKey) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {u.last_seen_at ? new Date(u.last_seen_at).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => copyEmail(u.email)}>
                        <Copy className="w-3 h-3 mr-1" /> Oferecer
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
