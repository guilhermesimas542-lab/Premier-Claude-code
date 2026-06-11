import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Check } from "lucide-react";
import type { Achievement, UserAchievement } from "@/hooks/useAchievements";

interface Props {
  achievement: Achievement | null;
  userAchievement: UserAchievement | null;
  isOpen: boolean;
  onClose: () => void;
}

function getUnlockHint(ach: Achievement): string {
  if (ach.category === 'daily') return 'Complete esta ação hoje';
  if (ach.category === 'special') return 'Achievement especial — fique atento às promoções!';
  if (ach.category === 'streak') {
    const days = ach.condition_value?.days ?? 0;
    return `Mantenha um streak de ${days} dias consecutivos`;
  }
  // permanent
  switch (ach.condition_type) {
    case 'first_login': return 'Já desbloqueado no primeiro login';
    case 'profile_complete': return 'Defina seu nickname e escolha um avatar';
    case 'has_plan': {
      const plans = ach.condition_value?.plans ?? [];
      const names: Record<string, string> = { basico: 'Básico', basic: 'Básico', pro: 'Pro', ultra: 'Ultra' };
      return `Assine o plano ${plans.map((p: string) => names[p] || p).join(' ou ')}`;
    }
    case 'has_entitlement': {
      const key = ach.condition_value?.key ?? '';
      const names: Record<string, string> = { alavancagem: 'Alavancagem', multiplas_bingo: 'Múltiplas / Bingo', live_telegram: 'Live Telegram', acesso_vitalicio: 'Acesso Vitalício' };
      return `Adquira o add-on ${names[key] || key}`;
    }
    case 'navigation': {
      const screen = ach.condition_value?.screen ?? '';
      const names: Record<string, string> = {
        casino: 'o Cassino', aviator: 'o Aviator', roleta: 'a Roleta',
        mines: 'o Mines', football_studio: 'o Football Studio',
        support: 'o Suporte', last_tickets: 'os Últimos Bilhetes',
      };
      return `Acesse ${names[screen] || screen} no app`;
    }
    default: return ach.description;
  }
}

export default function AchievementDetailModal({ achievement, userAchievement, isOpen, onClose }: Props) {
  if (!achievement) return null;

  const unlocked = !!userAchievement;
  const unlockedDate = userAchievement?.unlocked_at
    ? new Date(userAchievement.unlocked_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xs p-0 border-0 [&>button]:bg-white/10 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:border [&>button]:border-white/20 [&>button]:opacity-100 [&>button]:top-3 [&>button]:right-3 [&>button]:text-white [&>button:hover]:bg-white/20"
        style={{ background: '#0a0a0a', border: unlocked ? '1px solid rgba(234, 192, 100,0.3)' : '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="p-6 text-center space-y-4">
          {/* Icon */}
          <div
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl relative"
            style={{
              background: unlocked ? 'rgba(234, 192, 100,0.1)' : 'rgba(255,255,255,0.05)',
              border: unlocked ? '2px solid rgba(234, 192, 100,0.3)' : '2px solid rgba(255,255,255,0.1)',
            }}
          >
            {unlocked ? achievement.icon : <span style={{ filter: 'grayscale(1)', opacity: 0.4 }}>{achievement.icon}</span>}
            {!unlocked && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Lock className="w-3 h-3 text-gray-500" />
              </div>
            )}
          </div>

          {/* Name & Description */}
          <div>
            <h3 className="text-lg font-bold text-white">{achievement.name}</h3>
            <p className="text-xs text-gray-400 mt-1">{achievement.description}</p>
          </div>

          {/* Status */}
          {unlocked ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(234, 192, 100,0.08)', border: '1px solid rgba(234, 192, 100,0.2)' }}>
                <Check className="w-4 h-4" style={{ color: '#eac064' }} />
                <span className="text-sm" style={{ color: '#eac064' }}>Desbloqueado em {unlockedDate}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: '#FFD700' }}>+{achievement.xp_reward} XP recebidos</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-1 text-gray-500">Como desbloquear</p>
                <p className="text-sm text-gray-300">{getUnlockHint(achievement)}</p>
              </div>
              <p className="text-sm" style={{ color: '#FFD700' }}>Recompensa: +{achievement.xp_reward} XP</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
