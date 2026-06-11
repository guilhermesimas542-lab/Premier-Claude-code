import { Lock, TrendingUp, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUnlockLink } from '@/lib/checkoutLinks';

export interface EntryCardProps {
  id: string;
  display_title: string;
  display_market: string | null;
  display_odd: number | null;
  locked: boolean;
  tier_required: string;
  addon_required: string | null;
}

export function EntryCard({
  id,
  display_title,
  display_market,
  display_odd,
  locked,
  tier_required,
  addon_required,
}: EntryCardProps) {
  const handleUnlockClick = () => {
    const unlockLink = getUnlockLink(tier_required, addon_required);
    window.open(unlockLink, '_blank');
  };

  const tierColors: Record<string, string> = {
    free: 'bg-[#94A3B8]/20 text-[#94A3B8] border-[#94A3B8]/30',
    basic: 'bg-[#60A5FA]/20 text-[#60A5FA] border-[#60A5FA]/30',
    pro: 'bg-[#eac064]/20 text-[#eac064] border-[#eac064]/30',
    ultra: 'bg-[#7C3AED]/20 text-[#7C3AED] border-[#7C3AED]/30',
  };

  const tierBadgeClass = tierColors[tier_required] || tierColors.free;

  if (locked) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900/80 to-gray-800/60 p-4 grayscale">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10" />
        <div className="absolute top-3 right-3 z-20">
          <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center border border-white/20">
            <Lock className="w-4 h-4 text-white/70" />
          </div>
        </div>
        <div className="relative z-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${tierBadgeClass}`}>
            {tier_required}
            {addon_required && ` + ${addon_required}`}
          </span>
          <h3 className="mt-2 text-sm font-semibold text-white/80 line-clamp-2">{display_title}</h3>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Mercado:</span>
              <span className="text-xs text-white/30">••••••••</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Odd:</span>
              <span className="text-xs text-white/30">•.••</span>
            </div>
          </div>
        </div>
        <div className="relative z-20 mt-4">
          <Button onClick={handleUnlockClick} variant="outline" size="sm" className="w-full border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200">
            <Unlock className="w-3.5 h-3.5 mr-1.5" />
            Desbloquear
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#eac064]/30 bg-gradient-to-br from-[#eac064]/20 to-[#eac064]/10 p-4 hover:border-[#eac064]/50 transition-colors">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${tierBadgeClass}`}>
        {tier_required}
        {addon_required && ` + ${addon_required}`}
      </span>
      <h3 className="mt-2 text-sm font-semibold text-white line-clamp-2">{display_title}</h3>
      <div className="mt-3 space-y-1.5">
        {display_market && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Mercado:</span>
            <span className="text-xs text-[#eac064] font-medium">{display_market}</span>
          </div>
        )}
        {display_odd !== null && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-[#eac064]" />
            <span className="text-xs text-white/60">Odd:</span>
            <span className="text-sm text-[#eac064] font-bold">{display_odd.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
