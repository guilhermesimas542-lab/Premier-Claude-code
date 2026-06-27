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
import InstallPWA from "@/components/InstallPWA";
import EnablePushButton from "@/components/EnablePushButton";
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
      className="p-4 sm:p-5"
      style={{
        background: "#111217",
        border: "1px solid rgba(235,235,245,0.08)",
        borderRadius: 20,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Crown className="w-5 h-5" style={{ color: '#c9a56b' }} />
        <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#ECEAE4" }}>Tu Plan</h3>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: '#9a9ca4' }}>
          Plan actual:{' '}
          <span style={{ color: '#e9b949', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
            {planLabel}
          </span>
        </p>
        {/* CTA: "Gestionar" abre o modal de Planos. */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all hover:scale-[1.03]"
            style={{
              background: 'rgba(233,185,73,0.10)',
              border: '1px solid rgba(233,185,73,0.34)',
              color: '#e9b949',
              borderRadius: 999,
            }}
          >
            <Crown className="w-4 h-4" />
            Gestionar
          </button>
        </div>
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
    <div
      className="min-h-screen relative overflow-hidden pb-24"
      style={{
        background:
          "radial-gradient(130% 70% at 50% -8%, rgba(233,185,73,0.06), rgba(233,185,73,0) 55%), linear-gradient(180deg, #0d0e12 0%, #0a0b0e 32%, #090a0d 100%)",
      }}
    >
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(233,185,73,0.04)" }} />

      <AppHeader onShowLifetimeInfoModal={() => setShowLifetimeInfoModal(true)} />

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 relative z-10">

        {/* Compact Profile Card - Clickable */}
        <section
          onClick={() => setProfileModalOpen(true)}
          className="p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "#111217",
            border: "1px solid rgba(235,235,245,0.08)",
            borderRadius: 20,
          }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="rounded-full shrink-0"
              style={{
                width: 66,
                height: 66,
                padding: 3,
                background: 'conic-gradient(from 215deg, #efc662, #d6a93f 60%, rgba(255,255,255,0.08) 60%)',
              }}
            >
              <div
                className="w-full h-full rounded-full flex items-center justify-center text-3xl"
                style={{ background: '#0d0f15' }}
              >
                {currentAvatar.emoji}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Nickname & Email */}
              <h2 className="text-base font-bold truncate" style={{ color: '#ECEAE4', letterSpacing: '-0.01em' }}>
                {nickname ? `@${nickname}` : mockUser?.email || '—'}
              </h2>
              {nickname && (
                <p className="text-xs truncate" style={{ color: '#8a8c94', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>{mockUser?.email}</p>
              )}

              {/* Level Badge */}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {planLabel && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(233,185,73,0.10)', border: '1px solid rgba(233,185,73,0.34)' }}>
                    <Crown className="w-3 h-3" style={{ color: '#c9a56b' }} />
                    <span className="text-xs font-semibold" style={{ color: '#c9a56b' }}>Plan {planLabel}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(235,235,245,0.04)', border: '1px solid rgba(235,235,245,0.10)' }}>
                  <Star className="w-3 h-3" style={{ color: '#9a9ca4' }} />
                  <span className="text-xs font-semibold" style={{ color: '#c4c8e0' }}>Nivel {level} — {levelTitle}</span>
                </div>
              </div>

              {/* XP Bar */}
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span style={{ color: '#ECEAE4', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{totalXp} XP</span>
                  <span style={{ color: '#8a8c94', fontFamily: "'JetBrains Mono', monospace" }}>{xpInLevel}/{xpNeeded}</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 7, background: 'rgba(235,235,245,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #3a8a5a, #6fd18a)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] mt-3" style={{ color: '#6a6c74' }}>
            Toca para ver detalles completos
          </p>
        </section>


        {/* Achievements Preview Card */}
        <section
          onClick={() => setProfileModalOpen(true)}
          className="p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "#111217",
            border: "1px solid rgba(235,235,245,0.08)",
            borderRadius: 20,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: '#c9a56b' }} />
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#ECEAE4" }}>Logros</h3>
            </div>
            <span className="text-xs flex items-center gap-1.5" style={{ color: '#8a8c94' }}>
              <span style={{ color: '#c9a56b', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{unlockedPermanentCount}/{permanentAchievements.length}</span>
              <span>→</span>
            </span>
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
                    borderRadius: 11,
                    background: unlocked ? 'rgba(233,185,73,0.06)' : 'rgba(235,235,245,0.02)',
                    border: unlocked ? '1px solid rgba(233,185,73,0.3)' : '1px solid rgba(235,235,245,0.08)',
                    opacity: unlocked ? 1 : 0.5,
                  }}
                >
                  {unlocked ? ach.icon : <Lock className="w-3 h-3" style={{ color: '#5c5e66' }} />}
                </button>
              );
            })}
            {permanentAchievements.length > 6 && (
              <div className="flex items-center justify-center text-[12px] font-semibold" style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(235,235,245,0.02)', border: '1px solid rgba(235,235,245,0.08)', color: '#8a8c94', fontFamily: "'JetBrains Mono', monospace" }}>
                +{permanentAchievements.length - 6}
              </div>
            )}
          </div>
          <p className="text-center text-[11px] mt-3.5" style={{ color: '#6a6c74' }}>
            Toca para ver todos los logros
          </p>
        </section>


        <PlanUpgradeCard />

        {/* Feedback Card */}
        <section
          className="p-4 sm:p-5 space-y-4"
          style={{ background: "#111217", border: "1px solid rgba(235,235,245,0.08)", borderRadius: 20 }}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5" style={{ color: '#e9b949' }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#ECEAE4" }}>
              Feedback
            </h2>
          </div>
          <p className="text-sm" style={{ color: "#9a9ca4", lineHeight: 1.45 }}>
            ¿Encontraste un problema o tienes una sugerencia? Cuéntanos.
          </p>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full transition-all"
            style={{
              background: "rgba(235,235,245,0.03)",
              border: "1px solid rgba(235,235,245,0.12)",
              color: "#ECEAE4",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              padding: "12px 0",
              borderRadius: 12,
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
        <section className="p-4 sm:p-5 space-y-4" style={{ background: "#111217", border: "1px solid rgba(235,235,245,0.08)", borderRadius: 20 }}>
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5" style={{ color: '#e9b949' }} />
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: "#ECEAE4" }}>
              Soporte
            </h2>
          </div>
          <p className="text-sm" style={{ color: "#9a9ca4", lineHeight: 1.45 }}>
            ¿Necesitas ayuda? Nuestro equipo está listo para atenderte.
          </p>
          <button
            onClick={handleOpenSupport}
            className="w-full transition-all"
            style={{
              background: "rgba(37,211,102,0.08)",
              border: "1px solid rgba(37,211,102,0.35)",
              color: "#ECEAE4",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              padding: "12px 0",
              borderRadius: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <MessageCircle className="w-4 h-4" style={{ color: '#25d366' }} />
            Hablar con Soporte
          </button>
        </section>

        {/* App PWA + Notificaciones */}
        <EnablePushButton />
        <InstallPWA />

        {/* Logout */}
        <section className="p-4 sm:p-5 space-y-3" style={{ background: "rgba(229,72,77,0.03)", border: "1px solid rgba(229,72,77,0.18)", borderRadius: 20 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "#9a9ca4", lineHeight: 1.45 }}>
            ¿Quieres cerrar sesión? Tendrás que iniciar sesión de nuevo.
          </p>
          <button
            onClick={() => { mockLogout(); navigate("/login", { replace: true }); }}
            className="w-full flex items-center justify-center gap-2 transition-colors hover:bg-red-500/10"
            style={{
              border: "1px solid rgba(229,72,77,0.45)",
              background: "transparent",
              color: "#e5484d",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              padding: "13px 0",
              borderRadius: 12,
              cursor: "pointer",
            }}
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
