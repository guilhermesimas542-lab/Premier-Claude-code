import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Search, Trophy, Plus, X, Phone, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getAvatarById, LEVEL_TITLES } from "@/lib/avatars";

interface RankingUser {
  id: string;
  email: string;
  phone: string | null;
  nickname: string | null;
  avatar_id: string | null;
  last_seen_at: string | null;
  first_access_at: string | null;
  total_xp: number;
  current_level: number;
  current_streak: number;
  total_logins: number;
  achievement_count: number;
}

interface SpecialAchievement {
  id: string;
  name: string;
  icon: string;
  xp_reward: number;
  sport_category?: string | null;
  event_date?: string | null;
  entry_title?: string;
  entry_id?: string;
  user_count?: number;
}

type SortKey = 'total_xp' | 'email' | 'current_level' | 'total_logins' | 'current_streak' | 'achievement_count' | 'last_seen_at';
type SortDir = 'asc' | 'desc' | null;

const TIER_LABELS: Record<string, string> = { free: 'Gratuito', basic: 'Básico', pro: 'Pro', ultra: 'Ultra' };
const ADDON_LABELS: Record<string, string> = { alavancagem: 'Alavancagem', desaltas: 'Odds Altas', live_telegram: 'Live', acesso_vitalicio: 'Vitalício' };

const PAGE_SIZE = 50;

const xpPresets = [
  { label: "0 XP", min: "0", max: "0" },
  { label: "1-100", min: "1", max: "100" },
  { label: "100-500", min: "100", max: "500" },
  { label: "500-1000", min: "500", max: "1000" },
  { label: "1000+", min: "1000", max: "" },
];

export default function AdminRankingTab() {
  const [users, setUsers] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [sortKey, setSortKey] = useState<SortKey>('total_xp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [xpMin, setXpMin] = useState<string>("");
  const [xpMax, setXpMax] = useState<string>("");
  const [activeXpPreset, setActiveXpPreset] = useState<string | null>(null);

  const [specials, setSpecials] = useState<SpecialAchievement[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("⚽");
  const [newXp, setNewXp] = useState(200);
  const [newEntryId, setNewEntryId] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [entries, setEntries] = useState<{ id: string; title: string; date: string; tier_required: string; addon_required: string | null }[]>([]);
  const [creatingSpecial, setCreatingSpecial] = useState(false);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    const { data: usersData } = await supabase.from('users').select('id, email, phone, nickname, avatar_id, last_seen_at, first_access_at') as any;
    const { data: gamData } = await supabase.from('user_gamification').select('user_id, total_xp, current_level, current_streak, total_logins') as any;
    const { data: achData } = await supabase.from('user_achievements').select('user_id, achievement_id') as any;

    const gamMap: Record<string, any> = {};
    (gamData ?? []).forEach((g: any) => { gamMap[g.user_id] = g; });
    const achCountMap: Record<string, Set<string>> = {};
    (achData ?? []).forEach((a: any) => {
      if (!achCountMap[a.user_id]) achCountMap[a.user_id] = new Set();
      achCountMap[a.user_id].add(a.achievement_id);
    });

    const combined: RankingUser[] = (usersData ?? []).map((u: any) => ({
      ...u,
      last_seen_at: u.last_seen_at ?? null,
      first_access_at: u.first_access_at ?? null,
      total_xp: gamMap[u.id]?.total_xp ?? 0,
      current_level: gamMap[u.id]?.current_level ?? 1,
      current_streak: gamMap[u.id]?.current_streak ?? 0,
      total_logins: gamMap[u.id]?.total_logins ?? 0,
      achievement_count: achCountMap[u.id]?.size ?? 0,
    })).filter((u: any) => u.first_access_at !== null);

    setUsers(combined);
    setLoading(false);
  }, []);

  const fetchSpecials = useCallback(async () => {
    const { data: specData } = await supabase.from('achievements').select('*').eq('category', 'special').eq('is_active', true) as any;
    const { data: linkData } = await supabase.from('special_achievement_entries').select('achievement_id, entry_id') as any;
    const { data: countData } = await supabase.from('user_achievements').select('achievement_id') as any;
    const linkMap: Record<string, string> = {};
    (linkData ?? []).forEach((l: any) => { linkMap[l.achievement_id] = l.entry_id; });
    const countMap: Record<string, number> = {};
    (countData ?? []).forEach((c: any) => { countMap[c.achievement_id] = (countMap[c.achievement_id] ?? 0) + 1; });
    setSpecials((specData ?? []).map((s: any) => ({
      ...s,
      entry_id: linkMap[s.id],
      user_count: countMap[s.id] ?? 0,
    })));
  }, []);

  useEffect(() => { fetchRanking(); fetchSpecials(); }, [fetchRanking, fetchSpecials]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'desc') setSortDir('asc');
      else if (sortDir === 'asc') { setSortDir('desc'); setSortKey('total_xp'); }
      else setSortDir('desc');
    } else {
      setSortKey(key);
      setSortDir(key === 'email' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const sortedFiltered = useMemo(() => {
    let list = users.filter(u => {
      if (!search) return true;
      const s = search.toLowerCase();
      return u.email.toLowerCase().includes(s) || (u.nickname?.toLowerCase().includes(s));
    });
    if (sortDir) {
      list = [...list].sort((a, b) => {
        if (sortKey === 'email') {
          const aVal = (a.nickname || a.email).toLowerCase();
          const bVal = (b.nickname || b.email).toLowerCase();
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (sortKey === 'last_seen_at') {
          const dateA = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
          const dateB = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
          return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
        }
        const aVal = a[sortKey] as number;
        const bVal = b[sortKey] as number;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return list;
  }, [users, search, sortKey, sortDir]);

  const xpFiltered = useMemo(() => {
    let list = sortedFiltered;
    const min = xpMin !== "" ? Number(xpMin) : null;
    const max = xpMax !== "" ? Number(xpMax) : null;
    if (min !== null) list = list.filter((u) => (u.total_xp ?? 0) >= min);
    if (max !== null) list = list.filter((u) => (u.total_xp ?? 0) <= max);
    return list;
  }, [sortedFiltered, xpMin, xpMax]);

  const paged = xpFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(xpFiltered.length / PAGE_SIZE);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const getMedal = (pos: number) => {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    if (pos === 2) return '🥉';
    return `${pos + 1}`;
  };

  const SortHeader = ({ label, sortKeyProp }: { label: string; sortKeyProp: SortKey }) => (
    <th
      className="px-3 py-2 cursor-pointer hover:text-white select-none transition-colors"
      onClick={() => handleSort(sortKeyProp)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === sortKeyProp && sortDir === 'asc' && <ArrowUp className="w-3 h-3" />}
        {sortKey === sortKeyProp && sortDir === 'desc' && <ArrowDown className="w-3 h-3" />}
      </span>
    </th>
  );

  const handleExportCSV = () => {
    const headers = ["Pos", "Email", "Nickname", "Nível", "XP", "Dias", "Streak", "Conquistas", "Último Acesso"];
    const rows = xpFiltered.map((u, i) => [
      String(i + 1),
      u.email ?? "",
      u.nickname ?? "",
      String(u.current_level ?? 1),
      String(u.total_xp ?? 0),
      String(u.total_logins ?? 0),
      `${u.current_streak ?? 0}d`,
      String(u.achievement_count ?? 0),
      u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString("pt-BR") : "—",
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking_premier_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateSpecial = async () => {
    if (!newName.trim() || !newEntryId) return;
    setCreatingSpecial(true);
    const id = `special_${Date.now()}`;
    const insertData: any = {
      id,
      name: newName,
      description: `Achievement especial: ${newName}`,
      icon: newIcon,
      xp_reward: newXp,
      category: 'special',
      condition_type: 'special_entry',
      is_active: true,
      event_date: newEventDate || null,
    };
    const { error } = await (supabase.from('achievements').insert(insertData) as any);
    if (!error) {
      await (supabase.from('special_achievement_entries').insert({ achievement_id: id, entry_id: newEntryId }) as any);
      toast.success("Achievement especial criado!");
      setShowCreate(false);
      setNewName(""); setNewIcon("⚽"); setNewXp(200); setNewEntryId(""); setNewEventDate("");
      fetchSpecials();
    } else {
      toast.error("Erro ao criar achievement");
    }
    setCreatingSpecial(false);
  };

  const handleDeactivate = async (achId: string) => {
    await (supabase.from('achievements').update({ is_active: false } as any).eq('id', achId) as any);
    toast.success("Achievement desativado");
    fetchSpecials();
  };

  useEffect(() => {
    const fetchEntries = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('content_entries').select('id, title, date, tier_required, addon_required').eq('active', true).gte('date', today).order('date', { ascending: true }).limit(50);
      setEntries((data ?? []) as any);
    };
    fetchEntries();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title + Refresh */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">🏆 Ranking de Usuários</h1>
        <button
          onClick={() => fetchRanking()}
          className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
          title="Atualizar ranking"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search + Count + CSV */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por email ou nickname..." className="pl-10 bg-gray-900 border-gray-700 text-white" />
        </div>
        <span className="text-xs text-gray-500">{xpFiltered.length} usuários</span>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm font-medium transition-colors"
        >
          Exportar CSV
        </button>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-gray-500" />}
      </div>

      {/* XP Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">XP:</span>
        {xpPresets.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setXpMin(p.min);
              setXpMax(p.max);
              setActiveXpPreset(p.label);
              setPage(0);
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              activeXpPreset === p.label
                ? "bg-purple-600/30 text-purple-400 ring-1 ring-purple-400"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            placeholder="Min"
            value={xpMin}
            onChange={(e) => { setXpMin(e.target.value); setActiveXpPreset(null); setPage(0); }}
            className="bg-gray-800 border-gray-700 text-xs h-8 w-20"
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Input
            type="number"
            placeholder="Max"
            value={xpMax}
            onChange={(e) => { setXpMax(e.target.value); setActiveXpPreset(null); setPage(0); }}
            className="bg-gray-800 border-gray-700 text-xs h-8 w-20"
          />
        </div>
        <button
          onClick={() => { setXpMin(""); setXpMax(""); setActiveXpPreset(null); setPage(0); }}
          className="px-3 py-1 rounded-full text-xs font-bold bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Limpar XP
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
              <SortHeader label="Pos" sortKeyProp="total_xp" />
              <th className="px-3 py-2 w-10">🎭</th>
              <SortHeader label="Usuário" sortKeyProp="email" />
              <SortHeader label="Nível" sortKeyProp="current_level" />
              <SortHeader label="XP" sortKeyProp="total_xp" />
              <SortHeader label="Dias" sortKeyProp="total_logins" />
              <SortHeader label="Streak" sortKeyProp="current_streak" />
              <SortHeader label="🏆" sortKeyProp="achievement_count" />
              <SortHeader label="Último Acesso" sortKeyProp="last_seen_at" />
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((u, i) => {
              const globalPos = page * PAGE_SIZE + i;
              const avatar = getAvatarById(u.avatar_id || 'avatar_default_1');
              const levelTitle = LEVEL_TITLES[u.current_level] || 'Novato';
              return (
                <tr key={u.id} className="border-b border-white/5 text-gray-300 text-xs hover:bg-white/5">
                  <td className="px-3 py-2 font-bold">{getMedal(globalPos)}</td>
                  <td className="px-3 py-2 text-lg">{avatar.emoji}</td>
                  <td className="px-3 py-2">
                    <span className="text-gray-300 text-xs">{u.email}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-yellow-400 font-bold">{u.current_level}</span>
                    <span className="text-gray-500 ml-1">— {levelTitle}</span>
                  </td>
                  <td className="px-3 py-2 font-bold" style={{ color: '#00FF00' }}>{u.total_xp.toLocaleString()}</td>
                  <td className="px-3 py-2">{u.total_logins}</td>
                  <td className="px-3 py-2">{u.current_streak}d</td>
                  <td className="px-3 py-2">{u.achievement_count}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => copyText(u.email, 'Email')} className="p-1 rounded hover:bg-white/10" title="Copiar email">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => u.phone && copyText(u.phone, 'Telefone')}
                        className={`p-1 rounded ${u.phone ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}
                        title={u.phone ? 'Copiar telefone' : 'Telefone não cadastrado'}
                        disabled={!u.phone}
                      >
                        <Phone className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-600">Sem dados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="border-gray-700 bg-gray-900 text-gray-300">Anterior</Button>
          <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="border-gray-700 bg-gray-900 text-gray-300">Próximo</Button>
        </div>
      )}

      {/* Special Achievements */}
      <div className="border-t border-white/10 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" /> Achievements Especiais
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)} className="border-gray-700 bg-gray-900 text-gray-300 gap-1">
            {showCreate ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showCreate ? 'Cancelar' : 'Criar'}
          </Button>
        </div>
        {showCreate && (
          <div className="bg-gray-900 rounded-xl border border-white/10 p-4 space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do achievement" className="bg-gray-800 border-gray-700 text-white" />
              <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="Emoji" className="bg-gray-800 border-gray-700 text-white w-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" value={newXp} onChange={e => setNewXp(Number(e.target.value))} placeholder="XP" className="bg-gray-800 border-gray-700 text-white" />
              <Input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <select value={newEntryId} onChange={e => setNewEntryId(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-2 w-full">
              <option value="">Selecionar entrada...</option>
              {entries.map(e => {
                const plan = e.addon_required ? (ADDON_LABELS[e.addon_required] || e.addon_required) : (TIER_LABELS[e.tier_required] || e.tier_required);
                const dateStr = new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR');
                return <option key={e.id} value={e.id}>{e.title} — {plan} — {dateStr}</option>;
              })}
            </select>
            <Button onClick={handleCreateSpecial} disabled={creatingSpecial || !newName || !newEntryId} className="w-full">
              {creatingSpecial ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Achievement'}
            </Button>
          </div>
        )}
        {specials.length > 0 ? (
          <div className="space-y-2">
            {specials.map(s => (
              <div key={s.id} className="bg-gray-900 rounded-lg border border-white/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <span className="text-sm font-bold text-white">{s.name}</span>
                    <div className="text-[10px] text-gray-500">
                      +{s.xp_reward} XP · {s.user_count ?? 0} usuários
                      {s.event_date && <span> · {new Date(s.event_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDeactivate(s.id)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">Desativar</Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-4">Nenhum achievement especial ativo</p>
        )}
      </div>
    </div>
  );
}
