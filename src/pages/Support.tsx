import { MessageCircle, Headphones, Star, Flame, Trophy, Users, Calendar, Rocket, Crown, LogOut, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isAuthenticated } from "@/lib/auth";
import { SUPPORT_WHATSAPP_URL_FALLBACK } from "@/lib/userMock";
import { useLinks } from "@/contexts/LinksContext";
import { mockGetUser, mockLogout } from "@/mocks/user";
import { supabase } from "@/integrations/supabase/client";
import { useGamification, getXpProgress } from "@/contexts/GamificationContext";
import { useAchievements } from "@/hooks/useAchievements";
import AchievementDetailModal from "@/components/AchievementDetailModal";
import { getAvatarById, LEVEL_TITLES } from "@/lib/avatars";
import { BottomNav } from "@/components/BottomNav";

import ProfileModal from "@/components/ProfileModal";
import { useUserAccess } from "@/hooks/useUserAccess";
import { getUpgradeLinkForTier } from "@/lib/checkoutLinks";
import { usePayCardTrigger } from "@/hooks/usePayCardTrigger";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import AppHeader from "@/components/AppHeader";
import logoImg from "@/assets/premier-logo-custom.png";

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
    const planMap: Record<string, string> = { basic: 'basic', pro: 'pro', ultra: 'ultra' };
    const planKey = planMap[nextTier];
    if (planKey) {
      const found = await triggerPayCard(planKey);
      if (found) return;
    }
    window.open(getUpgradeLinkForTier(nextTier), '_blank');
  };

  return (
    <section
      className="rounded-2xl p-4 sm:p-5"
      style={{
        background: "#112236",
        border: "1.5px solid rgba(255,255,255,0.30)",
        borderRadius: 16,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Crown className="w-5 h-5" style={{ color: isMaxTier ? '#7C3AED' : '#00FF7F' }} />
        <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>Seu Plano</h3>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#CCCCCC' }}>
          Plano atual:{' '}
          <span style={{ color: isMaxTier ? '#7C3AED' : '#00FF7F', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
            {TIER_LABELS[mainTier] || 'Gratuito'}
          </span>
        </p>
        {!isMaxTier && (
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, #00FF7F, #00CC66)',
              color: '#000000',
              boxShadow: '0 4px 15px rgba(0,255,127,0.25)',
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
  const { permanentAchievements, isUnlocked, unlockedPermanentCount, userAchievements } = useAchievements(userId);
  const [nickname, setNickname] = useState("");
  const [currentAvatarId, setCurrentAvatarId] = useState("avatar_default_1");
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedPreviewAch, setSelectedPreviewAch] = useState<any>(null);

  const [showLifetimeInfoModal, setShowLifetimeInfoModal] = useState(false);

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

  // Navigation achievement
  useEffect(() => {
    if (userId) {
      supabase.from('user_achievements').insert({ user_id: userId, achievement_id: 'open_support' } as any).select();
    }
  }, [userId]);

  const level = gamification?.current_level || 1;
  const totalXp = gamification?.total_xp || 0;
  const { xpInLevel, xpNeeded, progress } = getXpProgress(totalXp, level);
  const currentAvatar = getAvatarById(currentAvatarId);
  const levelTitle = LEVEL_TITLES[level] || 'Novato';
  const { links } = useLinks();

  const handleOpenSupport = () => {
    window.open(links.support_whatsapp_url || SUPPORT_WHATSAPP_URL_FALLBACK, "_blank");
  };


  return (
    <div className="min-h-screen relative overflow-hidden pb-24" style={{ background: "#060D1E" }}>
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,255,127,0.04)" }} />

      <AppHeader onShowLifetimeInfoModal={() => setShowLifetimeInfoModal(true)} />

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 relative z-10">

        {/* Compact Profile Card - Clickable */}
        <section
          onClick={() => setProfileModalOpen(true)}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "#112236",
            border: "1.5px solid rgba(255,255,255,0.30)",
            borderRadius: 16,
          }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,127,0.2), rgba(0,200,100,0.1))',
                border: '3px solid rgba(0,255,127,0.4)',
                boxShadow: '0 0 15px rgba(0,255,127,0.2)',
              }}
            >
              {currentAvatar.emoji}
            </div>

            <div className="flex-1 min-w-0">
              {/* Nickname & Email */}
              <h2 className="text-base font-bold truncate" style={{ color: '#FFFFFF' }}>
                {nickname ? `@${nickname}` : mockUser?.email || '—'}
              </h2>
              {nickname && (
                <p className="text-xs truncate" style={{ color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>{mockUser?.email}</p>
              )}

              {/* Level Badge */}
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(0,255,127,0.12)', border: '1px solid rgba(0,255,127,0.25)' }}>
                <Star className="w-3 h-3" style={{ color: '#94A3B8' }} />
                <span className="text-xs font-bold" style={{ color: '#94A3B8' }}>Nível {level} — {levelTitle}</span>
              </div>

              {/* XP Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: '#00FF7F' }}>{totalXp} XP</span>
                  <span style={{ color: '#94A3B8' }}>{xpInLevel}/{xpNeeded}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,255,127,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #00FF7F, #00CC66)',
                      boxShadow: '0 0 8px rgba(0,255,127,0.4)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Toque para ver detalhes completos
          </p>
        </section>


        {/* Achievements Preview Card */}
        <section
          onClick={() => setProfileModalOpen(true)}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "#112236",
            border: "1.5px solid rgba(255,255,255,0.30)",
            borderRadius: 16,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: '#FFFFFF' }} />
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>Conquistas</h3>
            </div>
            <span className="text-xs" style={{ color: '#FFFFFF' }}>{unlockedPermanentCount}/{permanentAchievements.length} →</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {permanentAchievements.slice(0, 6).map(ach => {
              const unlocked = isUnlocked(ach.id);
              return (
                <button
                  key={ach.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedPreviewAch(ach); }}
                  className="flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: '#0D1929',
                    border: unlocked ? '1.5px solid rgba(240,180,41,0.3)' : '1.5px solid rgba(255,255,255,0.12)',
                    opacity: unlocked ? 1 : 0.4,
                  }}
                >
                  {unlocked ? ach.icon : <Lock className="w-3 h-3 text-gray-500" />}
                </button>
              );
            })}
            {permanentAchievements.length > 6 && (
              <div className="flex items-center justify-center text-[10px] text-gray-400" style={{ width: 40, height: 40, borderRadius: 8, background: '#0D1929', border: '1.5px solid rgba(255,255,255,0.12)' }}>
                +{permanentAchievements.length - 6}
              </div>
            )}
          </div>
          <p className="text-center text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Toque para ver todas as conquistas
          </p>
        </section>


        <PlanUpgradeCard />


        {/* Support Card */}
        <section className="rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: "#112236", border: "1.5px solid rgba(255,255,255,0.30)", borderRadius: 16 }}>
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5" style={{ color: '#FFFFFF' }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>
              Suporte
            </h2>
          </div>
          <p className="text-sm" style={{ color: "#CCCCCC" }}>
            Precisa de ajuda? Nossa equipe está pronta para atendê-lo.
          </p>
          <button
            onClick={handleOpenSupport}
            className="w-full transition-all"
            style={{
              background: "transparent",
              border: "1.5px solid rgba(255,255,255,0.3)",
              color: "#FFFFFF",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              padding: "10px 0",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Falar com Suporte
          </button>
        </section>

        {/* Logout */}
        <section className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: "#112236", border: "1.5px solid rgba(255,255,255,0.30)", borderRadius: 16 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
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

      <AchievementDetailModal
        achievement={selectedPreviewAch}
        userAchievement={selectedPreviewAch ? userAchievements.find((ua: any) => ua.achievement_id === selectedPreviewAch.id) || null : null}
        isOpen={!!selectedPreviewAch}
        onClose={() => setSelectedPreviewAch(null)}
      />

      {pcHeaderData && (
        <PayCardFunnelModal payCard={pcHeaderData} open={pcHeaderOpen} onClose={closePayCardHeader} />
      )}

      <BottomNav />
    </div>
  );
};

export default Support;
