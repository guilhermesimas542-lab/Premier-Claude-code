import { Lock, Check, ChevronRight } from "lucide-react";
import { Achievement } from "@/hooks/useAchievements";

interface AchievementsSectionProps {
  permanentAchievements: Achievement[];
  streakAchievements: Achievement[];
  dailyAchievements: Achievement[];
  specialAchievements: Achievement[];
  isUnlocked: (id: string) => boolean;
  isUnlockedToday: (id: string) => boolean;
  currentStreak: number;
}

const AchievementsSection = ({
  permanentAchievements,
  streakAchievements,
  dailyAchievements,
  specialAchievements,
  isUnlocked,
  isUnlockedToday,
  currentStreak,
}: AchievementsSectionProps) => {
  // Find next streak milestone
  const nextStreakMilestone = streakAchievements.find(a => !isUnlocked(a.id));
  const nextStreakDays = nextStreakMilestone?.condition_value?.days ?? null;
  const daysUntilNext = nextStreakDays ? nextStreakDays - currentStreak : 0;

  return (
    <div className="space-y-4">
      {/* Permanent Achievements */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,0,0.06), rgba(0,100,0,0.08))',
          border: '1px solid rgba(0,255,0,0.15)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: '#00FF00' }}>🏆 Conquistas Permanentes</h3>
          <span className="text-xs opacity-60 text-white">
            {permanentAchievements.filter(a => isUnlocked(a.id)).length}/{permanentAchievements.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {permanentAchievements.map((ach) => {
            const unlocked = isUnlocked(ach.id);
            return (
              <div
                key={ach.id}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-center"
                style={{
                  background: unlocked ? 'rgba(0,255,0,0.08)' : 'rgba(255,255,255,0.03)',
                  border: unlocked ? '1px solid rgba(0,255,0,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <span className="text-2xl">{unlocked ? ach.icon : '🔒'}</span>
                <span className="text-[10px] font-medium text-white leading-tight">{ach.name}</span>
                <span className="text-[9px]" style={{ color: unlocked ? '#00FF00' : '#666' }}>
                  +{ach.xp_reward} XP
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak Achievements */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,107,53,0.06), rgba(200,60,20,0.04))',
          border: '1px solid rgba(255,107,53,0.15)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: '#FF6B35' }}>🔥 Conquistas de Streak</h3>
          <span className="text-xs opacity-60 text-white">
            {streakAchievements.filter(a => isUnlocked(a.id)).length}/{streakAchievements.length}
          </span>
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
              <div key={ach.id} className="flex items-center gap-2 py-1">
                <span className="text-sm w-6 text-center">{unlocked ? ach.icon : '🔒'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white">{ach.name} — {days} dias</span>
                    <span className="text-[10px] font-bold" style={{ color: unlocked ? '#00FF00' : '#666' }}>
                      {unlocked ? <Check className="w-3 h-3 inline" /> : `+${ach.xp_reward} XP`}
                    </span>
                  </div>
                  {!unlocked && (
                    <div className="w-full h-1 rounded-full mt-0.5" style={{ background: 'rgba(255,107,53,0.1)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${streakProgress}%`, background: '#FF6B35' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Achievements */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(0,191,255,0.06), rgba(0,100,200,0.04))',
          border: '1px solid rgba(0,191,255,0.15)',
        }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: '#00BFFF' }}>📅 Conquistas Diárias</h3>
        <div className="grid grid-cols-3 gap-2">
          {dailyAchievements.map((ach) => {
            const doneToday = isUnlockedToday(ach.id);
            return (
              <div
                key={ach.id}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-center"
                style={{
                  background: doneToday ? 'rgba(0,255,0,0.08)' : 'rgba(0,191,255,0.05)',
                  border: doneToday ? '1px solid rgba(0,255,0,0.25)' : '1px solid rgba(0,191,255,0.1)',
                }}
              >
                <span className="text-xl">{ach.icon}</span>
                {doneToday && <Check className="w-3 h-3" style={{ color: '#00FF00' }} />}
                <span className="text-[10px] font-medium text-white leading-tight">{ach.name}</span>
                <span className="text-[9px]" style={{ color: doneToday ? '#00FF00' : '#00BFFF' }}>
                  +{ach.xp_reward} XP
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Special Achievements */}
      {specialAchievements.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(126,34,206,0.04))',
            border: '1px solid rgba(168,85,247,0.15)',
          }}
        >
          <h3 className="font-bold text-sm mb-3" style={{ color: '#A855F7' }}>⭐ Conquistas Especiais</h3>
          <div className="grid grid-cols-3 gap-2">
            {specialAchievements.map((ach) => {
              const unlocked = isUnlocked(ach.id);
              return (
                <div
                  key={ach.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl text-center"
                  style={{
                    background: unlocked ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                    border: unlocked ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-2xl">{unlocked ? ach.icon : '🔒'}</span>
                  <span className="text-[10px] font-medium text-white">{ach.name}</span>
                  <span className="text-[9px]" style={{ color: unlocked ? '#A855F7' : '#666' }}>+{ach.xp_reward} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementsSection;
