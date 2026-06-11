import { Lock, Check, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Achievement, UserAchievement } from "@/hooks/useAchievements";
import AchievementDetailModal from "./AchievementDetailModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AchievementsSectionProps {
  permanentAchievements: Achievement[];
  streakAchievements: Achievement[];
  dailyAchievements: Achievement[];
  specialAchievements: Achievement[];
  isUnlocked: (id: string) => boolean;
  isUnlockedToday: (id: string) => boolean;
  currentStreak: number;
  userAchievements?: UserAchievement[];
}

const AchievementsSection = ({
  permanentAchievements,
  streakAchievements,
  dailyAchievements,
  specialAchievements,
  isUnlocked,
  isUnlockedToday,
  currentStreak,
  userAchievements = [],
}: AchievementsSectionProps) => {
  const [selectedAch, setSelectedAch] = useState<Achievement | null>(null);
  const [showAllPermanent, setShowAllPermanent] = useState(false);

  const getUserAchievement = (achId: string): UserAchievement | null => {
    return userAchievements.find(ua => ua.achievement_id === achId) || null;
  };

  const nextStreakMilestone = streakAchievements.find(a => !isUnlocked(a.id));
  const nextStreakDays = nextStreakMilestone?.condition_value?.days ?? null;
  const daysUntilNext = nextStreakDays ? nextStreakDays - currentStreak : 0;

  // Show first 3: prioritize unlocked, then locked
  const unlockedPermanent = permanentAchievements.filter(a => isUnlocked(a.id));
  const lockedPermanent = permanentAchievements.filter(a => !isUnlocked(a.id));
  const preview3 = [...unlockedPermanent, ...lockedPermanent].slice(0, 3);

  const AchievementButton = ({ ach, unlocked, size = 'normal' }: { ach: Achievement; unlocked: boolean; size?: 'normal' | 'small' }) => (
    <button
      onClick={() => setSelectedAch(ach)}
      className="flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all hover:scale-[1.03] active:scale-95"
      style={{
        background: unlocked ? 'rgba(234, 192, 100,0.08)' : 'rgba(255,255,255,0.03)',
        border: unlocked ? '1px solid rgba(234, 192, 100,0.25)' : '1px solid rgba(255,255,255,0.06)',
        opacity: unlocked ? 1 : 0.5,
      }}
    >
      <span className={size === 'small' ? 'text-xl' : 'text-2xl'}>{unlocked ? ach.icon : '🔒'}</span>
      <span className="text-[10px] font-medium text-white leading-tight">{ach.name}</span>
      <span className="text-[9px]" style={{ color: unlocked ? '#eac064' : '#666' }}>+{ach.xp_reward} XP</span>
    </button>
  );

  return (
    <>
      <div className="space-y-4">
        {/* Permanent Achievements - Preview (3 items) */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(234, 192, 100,0.06), rgba(0,100,0,0.08))', border: '1px solid rgba(234, 192, 100,0.15)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm" style={{ color: '#eac064' }}>🏆 Conquistas Permanentes</h3>
            <span className="text-xs opacity-60 text-white">{unlockedPermanent.length}/{permanentAchievements.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {preview3.map((ach) => (
              <AchievementButton key={ach.id} ach={ach} unlocked={isUnlocked(ach.id)} />
            ))}
          </div>
          <button
            onClick={() => setShowAllPermanent(true)}
            className="w-full mt-3 flex items-center justify-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: '#eac064' }}
          >
            Ver todas ({unlockedPermanent.length}/{permanentAchievements.length}) <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Streak Achievements */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.06), rgba(200,60,20,0.04))', border: '1px solid rgba(255,107,53,0.15)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm" style={{ color: '#FF6B35' }}>🔥 Conquistas de Streak</h3>
            <span className="text-xs opacity-60 text-white">{streakAchievements.filter(a => isUnlocked(a.id)).length}/{streakAchievements.length}</span>
          </div>
          {nextStreakMilestone && daysUntilNext > 0 && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)' }}>
              <span className="text-white">Próximo: </span>
              <span style={{ color: '#FF6B35' }} className="font-bold">{nextStreakMilestone.name}</span>
              <span className="text-white"> — faltam </span>
              <span style={{ color: '#FF6B35' }} className="font-bold">{daysUntilNext} dias</span>
            </div>
          )}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {streakAchievements.slice(0, 12).map((ach) => {
              const unlocked = isUnlocked(ach.id);
              const days = ach.condition_value?.days ?? 0;
              const streakProgress = Math.min((currentStreak / days) * 100, 100);
              return (
                <button key={ach.id} onClick={() => setSelectedAch(ach)} className="flex items-center gap-2 py-1 w-full text-left hover:bg-white/5 rounded px-1 transition-colors">
                  <span className="text-sm w-6 text-center">{unlocked ? ach.icon : '🔒'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">{ach.name} — {days} dias</span>
                      <span className="text-[10px] font-bold" style={{ color: unlocked ? '#eac064' : '#666' }}>
                        {unlocked ? <Check className="w-3 h-3 inline" /> : `+${ach.xp_reward} XP`}
                      </span>
                    </div>
                    {!unlocked && (
                      <div className="w-full h-1 rounded-full mt-0.5" style={{ background: 'rgba(255,107,53,0.1)' }}>
                        <div className="h-full rounded-full" style={{ width: `${streakProgress}%`, background: '#FF6B35' }} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Achievements */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(0,191,255,0.06), rgba(0,100,200,0.04))', border: '1px solid rgba(0,191,255,0.15)' }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: '#00BFFF' }}>📅 Conquistas Diárias</h3>
          <div className="grid grid-cols-3 gap-2">
            {dailyAchievements.map((ach) => {
              const doneToday = isUnlockedToday(ach.id);
              return (
                <button
                  key={ach.id}
                  onClick={() => setSelectedAch(ach)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all hover:scale-[1.03] active:scale-95"
                  style={{
                    background: doneToday ? 'rgba(234, 192, 100,0.08)' : 'rgba(0,191,255,0.05)',
                    border: doneToday ? '1px solid rgba(234, 192, 100,0.25)' : '1px solid rgba(0,191,255,0.1)',
                  }}
                >
                  <span className="text-xl">{ach.icon}</span>
                  {doneToday && <Check className="w-3 h-3" style={{ color: '#eac064' }} />}
                  <span className="text-[10px] font-medium text-white leading-tight">{ach.name}</span>
                  <span className="text-[9px]" style={{ color: doneToday ? '#eac064' : '#00BFFF' }}>+{ach.xp_reward} XP</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Special Achievements */}
        {specialAchievements.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(126,34,206,0.04))', border: '1px solid rgba(168,85,247,0.15)' }}>
            <h3 className="font-bold text-sm mb-3" style={{ color: '#A855F7' }}>⭐ Conquistas Especiais</h3>
            <div className="grid grid-cols-3 gap-2">
              {specialAchievements.map((ach) => {
                const unlocked = isUnlocked(ach.id);
                return (
                  <button
                    key={ach.id}
                    onClick={() => setSelectedAch(ach)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all hover:scale-[1.03] active:scale-95"
                    style={{
                      background: unlocked ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                      border: unlocked ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span className="text-2xl">{unlocked ? ach.icon : '🔒'}</span>
                    <span className="text-[10px] font-medium text-white">{ach.name}</span>
                    <span className="text-[9px]" style={{ color: unlocked ? '#A855F7' : '#666' }}>+{ach.xp_reward} XP</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AchievementDetailModal
        achievement={selectedAch}
        userAchievement={selectedAch ? getUserAchievement(selectedAch.id) : null}
        isOpen={!!selectedAch}
        onClose={() => setSelectedAch(null)}
      />

      {/* All Permanent Achievements Modal */}
      <Dialog open={showAllPermanent} onOpenChange={setShowAllPermanent}>
        <DialogContent
          className="max-w-md max-h-[80vh] overflow-y-auto p-0 border-0 [&>button]:bg-white/10 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:border [&>button]:border-white/20 [&>button]:opacity-100 [&>button]:top-3 [&>button]:right-3 [&>button]:text-white [&>button:hover]:bg-white/20"
          style={{ background: '#0a0a0a', border: '1px solid rgba(234, 192, 100,0.2)' }}
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: '#eac064' }}>🏆 Todas as Conquistas</h3>
              <span className="text-xs opacity-60 text-white">{unlockedPermanent.length}/{permanentAchievements.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {permanentAchievements.map((ach) => (
                <AchievementButton key={ach.id} ach={ach} unlocked={isUnlocked(ach.id)} size="small" />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AchievementsSection;
