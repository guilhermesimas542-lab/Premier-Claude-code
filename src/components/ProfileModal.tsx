import { Copy, Flame, Trophy, Users, Calendar, Star, Lock, Check, LogOut, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser, mockLogout } from "@/mocks/user";
import { useGamification, getXpProgress } from "@/contexts/GamificationContext";
import { useAchievements } from "@/hooks/useAchievements";
import { AVATARS, getAvatarById, LEVEL_TITLES } from "@/lib/avatars";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AchievementsSection from "@/components/AchievementsSection";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const navigate = useNavigate();
  const mockUser = mockGetUser();
  const { data: gamification, loading, userId, sendXpEvent } = useGamification();
  const {
    permanentAchievements, streakAchievements, dailyAchievements, specialAchievements,
    isUnlocked, isUnlockedToday, userAchievements, refetch: refetchAchievements,
  } = useAchievements(userId);
  const [nickname, setNickname] = useState("");
  const [currentAvatarId, setCurrentAvatarId] = useState("avatar_default_1");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);

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

  const level = gamification?.current_level || 1;
  const totalXp = gamification?.total_xp || 0;
  const { xpInLevel, xpNeeded, progress } = getXpProgress(totalXp, level);
  const currentAvatar = getAvatarById(currentAvatarId);
  const levelTitle = LEVEL_TITLES[level] || 'Novato';
  const referralLink = userId ? `${window.location.origin}/login?ref=${userId}` : '';

  const handleSaveNickname = async () => {
    if (!userId || !nicknameInput.trim()) {
      if (!userId) {
        toast.error("Erro: Usuário não encontrado. Tente fazer login novamente.");
      }
      return;
    }
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
      if (!nickname) sendXpEvent('COMPLETE_PROFILE');
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
      sendXpEvent('COMPLETE_PROFILE');
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado!");
  };

  const handleLogout = () => {
    mockLogout();
    onClose();
    navigate("/login", { replace: true });
  };

  if (!mockUser) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="max-w-md max-h-[90vh] overflow-y-auto p-0 border-0 [&>button]:bg-white/10 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:border [&>button]:border-white/20 [&>button]:opacity-100 [&>button]:top-3 [&>button]:right-3 [&>button]:text-white [&>button:hover]:bg-white/20"
          style={{ background: '#0a0a0a', border: '1px solid rgba(0,255,0,0.2)' }}
        >
          <div className="p-5 space-y-5">
            {/* Avatar & Level */}
            <div
              className="rounded-2xl p-6 text-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,0,0.08), rgba(0,100,0,0.15))',
                border: '1px solid rgba(0,255,0,0.2)',
              }}
            >
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
              <p className="text-xs opacity-60 mb-2 text-white">Toque para trocar avatar</p>

              <button onClick={() => { setNicknameInput(nickname); setShowNicknameModal(true); }}>
                <h2 className="text-lg font-bold" style={{ color: '#00FF00' }}>
                  {nickname ? `@${nickname}` : 'Definir Nickname'}
                </h2>
              </button>
              <p className="text-sm opacity-70 mt-1 text-white">{mockUser.email}</p>

              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'rgba(0,255,0,0.15)', border: '1px solid rgba(0,255,0,0.3)' }}>
                <Star className="w-4 h-4" style={{ color: '#FFD700' }} />
                <span className="text-sm font-bold" style={{ color: '#FFD700' }}>Nível {level} — {levelTitle}</span>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: '#00FF00' }}>{totalXp} XP total</span>
                  <span className="opacity-60 text-white">{xpInLevel}/{xpNeeded} XP</span>
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
                  <p className="text-xs opacity-60 text-white">{label}</p>
                  <p className="text-lg font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Achievements Section */}
            <AchievementsSection
              permanentAchievements={permanentAchievements}
              streakAchievements={streakAchievements}
              dailyAchievements={dailyAchievements}
              specialAchievements={specialAchievements}
              isUnlocked={isUnlocked}
              isUnlockedToday={isUnlockedToday}
              currentStreak={gamification?.current_streak || 0}
              userAchievements={userAchievements}
            />

            {/* Referral */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(126,34,206,0.08))',
                border: '1px solid rgba(168,85,247,0.25)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Share2 className="w-5 h-5" style={{ color: '#A855F7' }} />
                <h3 className="font-bold text-white" style={{ color: '#A855F7' }}>Convide Amigos</h3>
              </div>
              <p className="text-sm opacity-70 mb-3 text-white">Ganhe <span className="font-bold" style={{ color: '#00FF00' }}>+100 XP</span> para cada amigo!</p>
              <button
                onClick={copyReferralLink}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                  boxShadow: '0 4px 15px rgba(168,85,247,0.3)',
                }}
              >
                <Copy className="w-4 h-4" /> Copiar Link de Convite
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Selection Sub-Modal */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a3a1a] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: '#00FF00' }}>Escolha seu Avatar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs opacity-60">Desbloqueie novos avatares subindo de nível!</p>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((avatar) => {
                const isUnlockedAvatar = avatar.requiredLevel <= level;
                const isSelected = avatar.id === currentAvatarId;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => isUnlockedAvatar && handleSelectAvatar(avatar.id)}
                    disabled={!isUnlockedAvatar}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                    style={{
                      background: isSelected ? 'rgba(0,255,0,0.15)' : isUnlockedAvatar ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)',
                      border: isSelected ? '2px solid #00FF00' : '2px solid transparent',
                      opacity: isUnlockedAvatar ? 1 : 0.4,
                    }}
                  >
                    <span className="text-2xl">{isUnlockedAvatar ? avatar.emoji : '🔒'}</span>
                    <span className="text-[10px]">{avatar.label}</span>
                    {!isUnlockedAvatar && <span className="text-[9px] opacity-60">Nv.{avatar.requiredLevel}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nickname Sub-Modal */}
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
    </>
  );
};

export default ProfileModal;
