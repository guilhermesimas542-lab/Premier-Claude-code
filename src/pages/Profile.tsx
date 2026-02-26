import { ArrowLeft, Copy, Flame, Trophy, Users, Calendar, Star, Lock, Check, LogOut, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser, mockLogout } from "@/mocks/user";
import { useGamification, getXpProgress } from "@/hooks/useGamification";
import { AVATARS, getAvatarById, getAvailableAvatars, getLockedAvatars, LEVEL_TITLES } from "@/lib/avatars";
import { BottomNav } from "@/components/BottomNav";
import MatrixRain from "@/components/MatrixRain";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isAuthenticated } from "@/lib/auth";

const Profile = () => {
  const navigate = useNavigate();
  const mockUser = mockGetUser();
  const { data: gamification, loading, userId, sendXpEvent, refetch } = useGamification();
  const [nickname, setNickname] = useState("");
  const [currentAvatarId, setCurrentAvatarId] = useState("avatar_default_1");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login"); return; }
  }, [navigate]);

  // Fetch user profile data
  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('nickname, avatar_id')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setNickname((data as any).nickname || "");
        setCurrentAvatarId((data as any).avatar_id || "avatar_default_1");
      }
    };
    fetchProfile();
  }, [userId]);

  // Daily login XP on mount
  useEffect(() => {
    if (userId) sendXpEvent('DAILY_LOGIN');
  }, [userId, sendXpEvent]);

  const level = gamification?.current_level || 1;
  const totalXp = gamification?.total_xp || 0;
  const { xpInLevel, xpNeeded, progress } = getXpProgress(totalXp, level);
  const currentAvatar = getAvatarById(currentAvatarId);
  const levelTitle = LEVEL_TITLES[level] || 'Novato';

  const handleSaveNickname = async () => {
    if (!userId || !nicknameInput.trim()) return;
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(nicknameInput)) {
      toast.error("Nickname deve ter 3-20 caracteres (letras, números, _)");
      return;
    }
    setSavingNickname(true);
    const { error } = await supabase
      .from('users')
      .update({ nickname: nicknameInput } as any)
      .eq('id', userId);
    setSavingNickname(false);
    if (error) {
      toast.error(error.message.includes('unique') ? "Nickname já em uso!" : "Erro ao salvar nickname");
    } else {
      setNickname(nicknameInput);
      setShowNicknameModal(false);
      if (!nickname) sendXpEvent('COMPLETE_PROFILE'); // First time setting nickname
      toast.success("Nickname salvo!");
    }
  };

  const handleSelectAvatar = async (avatarId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('users')
      .update({ avatar_id: avatarId } as any)
      .eq('id', userId);
    if (!error) {
      setCurrentAvatarId(avatarId);
      setShowAvatarModal(false);
      toast.success("Avatar atualizado!");
    }
  };

  const referralLink = userId ? `${window.location.origin}/login?ref=${userId}` : '';

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado!");
  };

  const handleLogout = () => {
    mockLogout();
    navigate("/login", { replace: true });
  };

  if (!mockUser) return null;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <MatrixRain opacity={0.08} />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(0,255,0,0.1)' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: '#00FF00' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#00FF00' }}>Meu Perfil</h1>
      </div>

      <div className="relative z-10 px-4 pb-32 max-w-md mx-auto space-y-5">
        {/* Avatar & Level Card */}
        <div
          className="rounded-2xl p-6 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,255,0,0.08), rgba(0,100,0,0.15))',
            border: '1px solid rgba(0,255,0,0.2)',
          }}
        >
          {/* Avatar */}
          <button
            onClick={() => setShowAvatarModal(true)}
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-3 transition-transform hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,0,0.2), rgba(0,200,0,0.1))',
              border: '3px solid rgba(0,255,0,0.4)',
              boxShadow: '0 0 20px rgba(0,255,0,0.2)',
            }}
          >
            {currentAvatar.emoji}
          </button>
          <p className="text-xs opacity-60 mb-2">Toque para trocar avatar</p>

          {/* Nickname */}
          <button onClick={() => { setNicknameInput(nickname); setShowNicknameModal(true); }}>
            <h2 className="text-lg font-bold" style={{ color: '#00FF00' }}>
              {nickname ? `@${nickname}` : 'Definir Nickname'}
            </h2>
          </button>
          <p className="text-sm opacity-70 mt-1">{mockUser.email}</p>

          {/* Level Badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'rgba(0,255,0,0.15)', border: '1px solid rgba(0,255,0,0.3)' }}>
            <Star className="w-4 h-4" style={{ color: '#FFD700' }} />
            <span className="text-sm font-bold" style={{ color: '#FFD700' }}>Nível {level} — {levelTitle}</span>
          </div>

          {/* XP Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: '#00FF00' }}>{totalXp} XP total</span>
              <span className="opacity-60">{xpInLevel}/{xpNeeded} XP</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,255,0,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #00FF00, #00CC00)',
                  boxShadow: '0 0 10px rgba(0,255,0,0.5)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Flame, label: 'Streak', value: `${gamification?.current_streak || 0} dias`, color: '#FF6B35' },
            { icon: Trophy, label: 'Maior Streak', value: `${gamification?.longest_streak || 0} dias`, color: '#FFD700' },
            { icon: Calendar, label: 'Total Logins', value: `${gamification?.total_logins || 0}`, color: '#00BFFF' },
            { icon: Users, label: 'Convidados', value: `${gamification?.friends_invited || 0}`, color: '#A855F7' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{
                background: `linear-gradient(135deg, ${color}10, ${color}05)`,
                border: `1px solid ${color}30`,
              }}
            >
              <Icon className="w-5 h-5 mb-2" style={{ color }} />
              <p className="text-xs opacity-60">{label}</p>
              <p className="text-lg font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Referral Card */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(126,34,206,0.08))',
            border: '1px solid rgba(168,85,247,0.25)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Share2 className="w-5 h-5" style={{ color: '#A855F7' }} />
            <h3 className="font-bold" style={{ color: '#A855F7' }}>Convide Amigos</h3>
          </div>
          <p className="text-sm opacity-70 mb-3">Ganhe <span className="font-bold" style={{ color: '#00FF00' }}>+100 XP</span> para cada amigo convidado!</p>
          <button
            onClick={copyReferralLink}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
              boxShadow: '0 4px 15px rgba(168,85,247,0.3)',
            }}
          >
            <Copy className="w-4 h-4" /> Copiar Link de Convite
          </button>
        </div>

        {/* Streak Bonuses */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(200,60,20,0.05))',
            border: '1px solid rgba(255,107,53,0.2)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Flame className="w-5 h-5" style={{ color: '#FF6B35' }} />
            <h3 className="font-bold" style={{ color: '#FF6B35' }}>Bônus de Streak</h3>
          </div>
          <div className="space-y-2">
            {[
              { days: 3, xp: 5 }, { days: 7, xp: 15 }, { days: 14, xp: 25 },
              { days: 30, xp: 50 }, { days: 60, xp: 100 }, { days: 100, xp: 200 },
            ].map(({ days, xp }) => {
              const achieved = (gamification?.longest_streak || 0) >= days;
              return (
                <div key={days} className="flex items-center justify-between py-1.5">
                  <span className="text-sm">
                    {achieved ? <Check className="w-4 h-4 inline mr-1" style={{ color: '#00FF00' }} /> : <Lock className="w-3 h-3 inline mr-1 opacity-40" />}
                    {days} dias seguidos
                  </span>
                  <span className="text-sm font-bold" style={{ color: achieved ? '#00FF00' : '#888' }}>+{xp} XP</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium mt-4"
          style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)', color: '#FF5050' }}
        >
          <LogOut className="w-4 h-4" /> Sair da Conta
        </button>
      </div>

      {/* Avatar Selection Modal */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a3a1a] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: '#00FF00' }}>Escolha seu Avatar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs opacity-60">Desbloqueie novos avatares subindo de nível!</p>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((avatar) => {
                const isUnlocked = avatar.requiredLevel <= level;
                const isSelected = avatar.id === currentAvatarId;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => isUnlocked && handleSelectAvatar(avatar.id)}
                    disabled={!isUnlocked}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                    style={{
                      background: isSelected ? 'rgba(0,255,0,0.15)' : isUnlocked ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)',
                      border: isSelected ? '2px solid #00FF00' : '2px solid transparent',
                      opacity: isUnlocked ? 1 : 0.4,
                    }}
                  >
                    <span className="text-2xl">{isUnlocked ? avatar.emoji : '🔒'}</span>
                    <span className="text-[10px]">{avatar.label}</span>
                    {!isUnlocked && <span className="text-[9px] opacity-60">Nv.{avatar.requiredLevel}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nickname Modal */}
      <Dialog open={showNicknameModal} onOpenChange={setShowNicknameModal}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a3a1a] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: '#00FF00' }}>Definir Nickname</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs opacity-60">3-20 caracteres: letras, números e underscore</p>
            <Input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="seu_nickname"
              maxLength={20}
              className="bg-black/50 border-[#1a3a1a] text-white"
            />
            <Button
              onClick={handleSaveNickname}
              disabled={savingNickname}
              className="w-full"
              style={{ background: '#00CC00' }}
            >
              {savingNickname ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Profile;
