import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Search, Trophy, Plus, X, Phone, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { getAvatarById, LEVEL_TITLES } from "@/lib/avatars";

interface RankingUser {
  id: string;
  email: string;
  phone: string | null;
  nickname: string | null;
  avatar_id: string | null;
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

type SortKey = 'total_xp' | 'email' | 'current_level' | 'total_logins' | 'current_streak' | 'achievement_count';
type SortDir = 'asc' | 'desc' | null;

const TIER_LABELS: Record<string, string> = { free: 'Gratuito', basic: 'Básico', pro: 'Pro', ultra: 'Ultra' };
const ADDON_LABELS: Record<string, string> = { alavancagem: 'Alavancagem', desaltas: 'Odds Altas', live_telegram: 'Live', acesso_vitalicio: 'Vitalício' };

export default function AdminRankingTab() {
  const [users, setUsers] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const [sortKey, setSortKey] = useState<SortKey>('total_xp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [specials, setSpecials] = useState<SpecialAchievement[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("⚽");
  const [newXp, setNewXp] = useState(200);
  const [newEntryId, setNewEntryId] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [entries, setEntries] = useState<{ id: string; title: string; date: string }[]>([]);
  const [creatingSpecial, setCreatingSpecial] = useState(false);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    const { data: usersData } = await supabase.from('users').select('id, email, phone, nickname, avatar_id') as any;
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
      total_xp: gamMap[u.id]?.total_xp ?? 0,
      current_level: gamMap[u.id]?.current_level ?? 1,
      current_streak: gamMap[u.id]?.current_streak ?? 0,
      total_logins: gamMap[u.id]?.total_logins ?? 0,
      achievement_count: achCountMap[u.id]?.size ?? 0,
    }));
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
        const aVal = a[sortKey] as number;
        const bVal = b[sortKey] as number;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return list;
  }, [users, search, sortKey, sortDir]);

  const paged = sortedFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedFiltered.length / PAGE_SIZE);

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
      sport_category: newCategory || null,
      event_date: newEventDate || null,
    };
    const { error } = await (supabase.from('achievements').insert(insertData) as any);
    if (!error) {
      await (supabase.from('special_achievement_entries').insert({ achievement_id: id, entry_id: newEntryId }) as any);
      toast.success("Achievement especial criado!");
      setShowCreate(false);
      setNewName(""); setNewIcon("⚽"); setNewXp(200); setNewEntryId(""); setNewCategory(""); setNewEventDate("");
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
      const { data } = await supabase.from('content_entries').select('id, title, date').eq('active', true).order('date', { ascending: false }).limit(50);
      setEntries((data ?? []) as any);
    };
    fetchEntries();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por email ou nickname..." className="pl-10 bg-gray-900 border-gray-700 text-white" />
        </div>
        <span className="text-xs text-gray-500">{sortedFiltered.length} usuários</span>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-gray-500" />}
      </div>

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
                    <div>
                      {u.nickname && <span className="font-bold text-white">@{u.nickname}</span>}
                      <div className="text-gray-500 text-[10px]">{u.email}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-yellow-400 font-bold">{u.current_level}</span>
                    <span className="text-gray-500 ml-1">— {levelTitle}</span>
                  </td>
                  <td className="px-3 py-2 font-bold" style={{ color: '#00FF00' }}>{u.total_xp.toLocaleString()}</td>
                  <td className="px-3 py-2">{u.total_logins}</td>
                  <td className="px-3 py-2">{u.current_streak}d</td>
                  <td className="px-3 py-2">{u.achievement_count}</td>
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
              <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-600">Sem dados</td></tr>
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
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-2">
                <option value="">Jogo / Categoria</option>
                {SPORT_CATEGORIES.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
              <select value={newEntryId} onChange={e => setNewEntryId(e.target.value)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-2">
                <option value="">Selecionar entrada...</option>
                {entries.map(e => (<option key={e.id} value={e.id}>{e.title} ({e.date})</option>))}
              </select>
            </div>
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
                      {s.sport_category && <span> · {s.sport_category}</span>}
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
