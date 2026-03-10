import { ArrowLeft, MessageCircle, Headphones, Star, Flame, Trophy, Users, Calendar, Share2, Copy, Rocket, Crown, LogOut, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isAuthenticated } from "@/lib/auth";
import { SUPPORT_WHATSAPP_URL } from "@/lib/userMock";
import { mockGetUser, mockLogout } from "@/mocks/user";
import { supabase } from "@/integrations/supabase/client";
import { useGamification, getXpProgress } from "@/hooks/useGamification";
import { useAchievements } from "@/hooks/useAchievements";
import { getAvatarById, LEVEL_TITLES } from "@/lib/avatars";
import { BottomNav } from "@/components/BottomNav";
import MatrixRain from "@/components/MatrixRain";
import ProfileModal from "@/components/ProfileModal";
import { useUserAccess } from "@/hooks/useUserAccess";
import { getUpgradeLinkForTier } from "@/lib/checkoutLinks";
import { usePayCardTrigger } from "@/hooks/usePayCardTrigger";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";

const TIER_LABELS: Record<string, string> = {
  free: 'Gratuito', basic: 'Basic', pro: 'Pro', ultra: 'Ultra',
};
const NEXT_TIER: Record<string, string> = {
  free: 'basic', basic: 'pro', pro: 'ultra',
};

const PlanUpgradeCard = () => {
  const { mainTier, loading } = useUserAccess();
  const { triggerPayCard, payCard, open: payCardOpen, closePayCard } = usePayCardTrigger();
  if (loading) return null;
  const isMaxTier = mainTier === 'ultra';
  const nextTier = NEXT_TIER[mainTier] || '';

  const handleUpgrade = async () => {
    // Smart upgrade: trigger pay card based on next tier
    const planMap: Record<string, string> = { basic: 'basic', pro: 'pro', ultra: 'ultra' };
    const planKey = planMap[nextTier];
    if (planKey) {
      const found = await triggerPayCard(planKey);
      if (found) return;
    }
    // Fallback to direct link
    window.open(getUpgradeLinkForTier(nextTier), '_blank');
  };

  return (
    <section
      className="backdrop-blur-sm rounded-2xl p-4 sm:p-5"
      style={{
        background: isMaxTier
          ? 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(200,160,0,0.08))'
          : 'linear-gradient(135deg, rgba(0,255,0,0.06), rgba(0,100,0,0.1))',
        border: isMaxTier ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(0,255,0,0.15)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Crown className="w-5 h-5" style={{ color: isMaxTier ? '#FFD700' : '#00FF00' }} />
        <h3 className="font-bold" style={{ color: '#FFFFFF' }}>Seu Plano</h3>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#CCCCCC' }}>
          Plano atual:{' '}
          <span className="font-bold" style={{ color: isMaxTier ? '#FFD700' : '#00FF00' }}>
            {TIER_LABELS[mainTier] || 'Gratuito'}
          </span>
        </p>
        {!isMaxTier && (
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, #00FF00, #00CC00)',
              color: '#000000',
              boxShadow: '0 4px 15px rgba(0,255,0,0.25)',
            }}
          >
            <Rocket className="w-4 h-4" />
            Upgrade
          </button>
        )}
      </div>
      {payCard && (
        <PayCardFunnelModal payCard={payCard} open={payCardOpen} onClose={closePayCard} />
      )}
    </section>
  );
};

const Support = () => {
  const navigate = useNavigate();
  const mockUser = mockGetUser();
  const { data: gamification, userId, sendXpEvent } = useGamification();
  const { permanentAchievements, isUnlocked, unlockedPermanentCount } = useAchievements(userId);
  const [nickname, setNickname] = useState("");
  const [currentAvatarId, setCurrentAvatarId] = useState("avatar_default_1");
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated()) { navigate("/login"); return; }
  }, [navigate]);

  // Fetch user profile
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

  // Daily login XP + navigation achievement
  useEffect(() => {
    if (userId) {
      sendXpEvent('DAILY_LOGIN');
      supabase.from('user_achievements').insert({ user_id: userId, achievement_id: 'open_support' } as any).select();
    }
  }, [userId, sendXpEvent]);

  const level = gamification?.current_level || 1;
  const totalXp = gamification?.total_xp || 0;
  const { xpInLevel, xpNeeded, progress } = getXpProgress(totalXp, level);
  const currentAvatar = getAvatarById(currentAvatarId);
  const levelTitle = LEVEL_TITLES[level] || 'Novato';
  const referralLink = userId ? `${window.location.origin}/login?ref=${userId}` : '';

  const handleOpenSupport = () => {
    window.open(SUPPORT_WHATSAPP_URL, "_blank");
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado!");
  };

  return (
    <div className="min-h-screen relative overflow-hidden pb-24" style={{ background: "#000000" }}>
      <MatrixRain opacity={0.18} />
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,255,0,0.03)" }} />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.92)", borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg transition-colors"
              style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.25)" }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: "#00FF00" }} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold" style={{ color: "#FFFFFF" }}>
              Meu Perfil
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 relative z-10">

        {/* Compact Profile Card - Clickable */}
        <section
          onClick={() => setProfileModalOpen(true)}
          className="backdrop-blur-sm rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "linear-gradient(135deg, rgba(0,255,0,0.08), rgba(0,100,0,0.15))",
            border: "1px solid rgba(0,255,0,0.2)",
            boxShadow: "0 0 20px rgba(0,255,0,0.05)",
          }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,0,0.2), rgba(0,200,0,0.1))',
                border: '3px solid rgba(0,255,0,0.4)',
                boxShadow: '0 0 15px rgba(0,255,0,0.2)',
              }}
            >
              {currentAvatar.emoji}
            </div>

            <div className="flex-1 min-w-0">
              {/* Nickname & Email */}
              <h2 className="text-base font-bold truncate" style={{ color: '#00FF00' }}>
                {nickname ? `@${nickname}` : mockUser?.email || '—'}
              </h2>
              {nickname && (
                <p className="text-xs opacity-60 truncate" style={{ color: '#CCCCCC' }}>{mockUser?.email}</p>
              )}

              {/* Level Badge */}
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(0,255,0,0.12)', border: '1px solid rgba(0,255,0,0.25)' }}>
                <Star className="w-3 h-3" style={{ color: '#FFD700' }} />
                <span className="text-xs font-bold" style={{ color: '#FFD700' }}>Nível {level} — {levelTitle}</span>
              </div>

              {/* XP Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: '#00FF00' }}>{totalXp} XP</span>
                  <span className="opacity-50" style={{ color: '#fff' }}>{xpInLevel}/{xpNeeded}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,255,0,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #00FF00, #00CC00)',
                      boxShadow: '0 0 8px rgba(0,255,0,0.4)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] mt-3 opacity-40" style={{ color: '#fff' }}>
            Toque para ver detalhes completos
          </p>
        </section>


        {/* Achievements Preview Card */}
        <section
          onClick={() => setProfileModalOpen(true)}
          className="backdrop-blur-sm rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(200,160,0,0.08))',
            border: '1px solid rgba(255,215,0,0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: '#FFD700' }} />
              <h3 className="font-bold text-sm" style={{ color: '#FFD700' }}>Conquistas</h3>
            </div>
            <span className="text-xs" style={{ color: '#FFD700' }}>{unlockedPermanentCount}/{permanentAchievements.length} →</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {permanentAchievements.slice(0, 6).map(ach => {
              const unlocked = isUnlocked(ach.id);
              return (
                <div
                  key={ach.id}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{
                    background: unlocked ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                    border: unlocked ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    opacity: unlocked ? 1 : 0.4,
                  }}
                >
                  {unlocked ? ach.icon : <Lock className="w-3 h-3 text-gray-500" />}
                </div>
              );
            })}
            {permanentAchievements.length > 6 && (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] text-gray-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                +{permanentAchievements.length - 6}
              </div>
            )}
          </div>
          <p className="text-center text-[10px] mt-3 opacity-40" style={{ color: '#fff' }}>
            Toque para ver todas as conquistas
          </p>
        </section>


        <PlanUpgradeCard />

        {/* Invite Friends Card */}
        <section
          className="backdrop-blur-sm rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(126,34,206,0.08))',
            border: '1px solid rgba(168,85,247,0.25)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Share2 className="w-5 h-5" style={{ color: '#A855F7' }} />
            <h3 className="font-bold" style={{ color: '#A855F7' }}>Convide Amigos</h3>
          </div>
          <p className="text-sm opacity-70 mb-3" style={{ color: '#CCCCCC' }}>
            Ganhe <span className="font-bold" style={{ color: '#00FF00' }}>+100 XP</span> para cada amigo convidado!
          </p>
          <button
            onClick={copyReferralLink}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
              color: '#FFFFFF',
              boxShadow: '0 4px 15px rgba(168,85,247,0.3)',
            }}
          >
            <Copy className="w-4 h-4" /> Copiar Link de Convite
          </button>
        </section>

        {/* Support Card */}
        <section className="backdrop-blur-sm rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: "rgba(0,15,0,0.6)", border: "1px solid rgba(0,255,0,0.15)" }}>
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5" style={{ color: '#00FF00' }} />
            <h2 className="text-base sm:text-lg font-semibold" style={{ color: "#FFFFFF" }}>
              Suporte
            </h2>
          </div>
          <p className="text-sm" style={{ color: "#CCCCCC" }}>
            Precisa de ajuda? Nossa equipe está pronta para atendê-lo.
          </p>
          <button
            onClick={handleOpenSupport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
            style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.35)", color: "#FFFFFF" }}
          >
            <MessageCircle className="w-4 h-4" />
            Falar com Suporte
          </button>
        </section>

        {/* Logout */}
        <section className="backdrop-blur-sm rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: "rgba(0,15,0,0.6)", border: "1px solid rgba(0,255,0,0.15)" }}>
          <p className="text-sm" style={{ color: "#CCCCCC" }}>
            Deseja sair da sua conta? Você precisará fazer login novamente.
          </p>
          <button
            onClick={() => { mockLogout(); navigate("/login", { replace: true }); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors border border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </section>
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />

      <BottomNav />
    </div>
  );
};

export default Support;
