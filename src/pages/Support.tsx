import { MessageCircle, MessageSquare, Headphones, Star, Flame, Trophy, Users, Calendar, Rocket, Crown, LogOut, Lock } from "lucide-react";
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

import { PlansModal } from "@/components/PlansModal";
import AppHeader from "@/components/AppHeader";
import FeedbackModal from "@/components/FeedbackModal";
import logoImg from "@/assets/premier-logo-custom.png";

const TIER_LABELS: Record<string, string> = {
  free: 'Gratis',
  basic: 'Basic',
  pro: 'Pro',
  premium: 'Premium',
  diamante: 'Diamante',
  ultra: 'Diamante',
};
const NEXT_TIER: Record<string, string> = {
  free: 'premium',
  premium: 'diamante',
  basic: 'pro',
  pro: 'ultra',
};

const PlanUpgradeCard = () => {
  const { mainTier, loading } = useUserAccess();
  const [plansOpen, setPlansOpen] = useState(false);
  if (loading) return null;

  const isPremium = mainTier === 'premium';
  const isDiamante = mainTier === 'diamante' || mainTier === 'ultra';
  const planLabel = isDiamante ? 'Diamante' : isPremium ? 'Premium' : 'Gratuito';

  const handleClick = () => {
    setPlansOpen(true);
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
        <Crown className="w-5 h-5" style={{ color: '#10ff80' }} />
        <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>Tu Plan</h3>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#CCCCCC' }}>
          Plan actual:{' '}
          <span style={{ color: '#10ff80', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
            {planLabel}
          </span>
        </p>
        {!isDiamante && (
          <button
            onClick={handleClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, #10ff80, #00CC66)',
              color: '#000000',
              boxShadow: '0 4px 15px rgba(16, 255, 128,0.25)',
            }}
          >
            <Rocket className="w-4 h-4" />
            Upgrade
          </button>
        )}
      </div>
      <PlansModal open={plansOpen} onClose={() => setPlansOpen(false)} />
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
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedPreviewAch, setSelectedPreviewAch] = useState<any>(null);

  const [showLifetimeInfoModal, setShowLifetimeInfoModal] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);

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
        .select('nickname, avatar_id, main_tier')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setNickname((data as any).nickname || "");
        setCurrentAvatarId((data as any).avatar_id || "avatar_default_1");
        setCurrentTier((data as any).main_tier || null);
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
  // NOTA: LEVEL_TITLES vem de src/lib/avatars — todos os títulos de nível devem estar em es-CL nesse arquivo
  const planLabel = currentTier ? TIER_LABELS[currentTier] || currentTier : null;
  const { links } = useLinks();

  const handleOpenSupport = () => {
    window.open(links.support_whatsapp_url || SUPPORT_WHATSAPP_URL_FALLBACK, "_blank");
  };


  return (
    <div className="min-h-screen relative overflow-hidden pb-24" style={{ background: "#060D1E" }}>
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(16, 255, 128,0.04)" }} />

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
                background: 'linear-gradient(135deg, rgba(16, 255, 128,0.2), rgba(0,200,100,0.1))',
                border: '3px solid rgba(16, 255, 128,0.4)',
                boxShadow: '0 0 15px rgba(16, 255, 128,0.2)',
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
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {planLabel && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(16, 255, 128,0.16)', border: '1px solid rgba(16, 255, 128,0.35)' }}>
                    <Crown className="w-3 h-3" style={{ color: '#10ff80' }} />
                    <span className="text-xs font-bold" style={{ color: '#10ff80' }}>Plano {planLabel}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(16, 255, 128,0.12)', border: '1px solid rgba(16, 255, 128,0.25)' }}>
                  <Star className="w-3 h-3" style={{ color: '#94A3B8' }} />
                  <span className="text-xs font-bold" style={{ color: '#94A3B8' }}>Nivel {level} — {levelTitle}</span>
                </div>
              </div>

              {/* XP Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: '#10ff80' }}>{totalXp} XP</span>
                  <span style={{ color: '#94A3B8' }}>{xpInLevel}/{xpNeeded}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(16, 255, 128,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #10ff80, #00CC66)',
                      boxShadow: '0 0 8px rgba(16, 255, 128,0.4)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Toca para ver detalles completos
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
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>Logros</h3>
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
                    border: unlocked ? '1.5px solid rgba(16, 255, 128,0.3)' : '1.5px solid rgba(255,255,255,0.12)',
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
            Toca para ver todos los logros
          </p>
        </section>


        <PlanUpgradeCard />

        {/* Feedback Card */}
        <section
          className="rounded-2xl p-4 sm:p-5 space-y-4"
          style={{ background: "#112236", border: "1.5px solid rgba(255,255,255,0.30)", borderRadius: 16 }}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5" style={{ color: '#FFFFFF' }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>
              Feedback
            </h2>
          </div>
          <p className="text-sm" style={{ color: "#CCCCCC" }}>
            ¿Encontraste un problema o tienes una sugerencia? Cuéntanos.
          </p>
          <button
            onClick={() => setFeedbackOpen(true)}
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
            <MessageSquare className="w-4 h-4" />
            Enviar Feedback
          </button>
        </section>

        {/* Support Card */}
        <section className="rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: "#112236", border: "1.5px solid rgba(255,255,255,0.30)", borderRadius: 16 }}>
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5" style={{ color: '#FFFFFF' }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>
              Soporte
            </h2>
          </div>
          <p className="text-sm" style={{ color: "#CCCCCC" }}>
            ¿Necesitas ayuda? Nuestro equipo está listo para atenderte.
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
            Hablar con Soporte
          </button>
        </section>

        {/* Logout */}
        <section className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: "#112236", border: "1.5px solid rgba(255,255,255,0.30)", borderRadius: 16 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
            ¿Quieres cerrar sesión? Tendrás que iniciar sesión de nuevo.
          </p>
          <button
            onClick={() => { mockLogout(); navigate("/login", { replace: true }); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors border border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </section>
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        userId={userId || ""}
        userEmail={mockUser?.email || ""}
      />

      <AchievementDetailModal
        achievement={selectedPreviewAch}
        userAchievement={selectedPreviewAch ? userAchievements.find((ua: any) => ua.achievement_id === selectedPreviewAch.id) || null : null}
        isOpen={!!selectedPreviewAch}
        onClose={() => setSelectedPreviewAch(null)}
      />


      <BottomNav />
    </div>
  );
};

export default Support;
