import { useState } from "react";
import { LiveMatch } from "@/hooks/useLiveMatches";
import { LiveTipModal } from "./LiveTipModal";
import type { OpenEsportivaPayload } from "./ChatMessage";
import { Radio } from "lucide-react";
import { useActivationLock } from "@/components/onboarding/ActivationGateProvider";

interface Props {
  match: LiveMatch;
  onOpenEsportiva?: (payload: OpenEsportivaPayload) => void;
}

export function LiveMatchCard({ match, onOpenEsportiva }: Props) {
  const [open, setOpen] = useState(false);
  const { isLocked, requestActivation } = useActivationLock();

  return (
    <>
      <button
        onClick={() => { if (isLocked) { requestActivation(); return; } setOpen(true); }}
        className="w-full rounded-lg border bg-card p-3 hover:bg-accent transition-colors text-left"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate max-w-[60%]">
            {match.league.name}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Radio className="w-3 h-3 animate-pulse" />
            AO VIVO
            {match.status.minute !== null && (
              <span className="text-muted-foreground"> · {match.status.minute}'</span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <div className="flex items-center gap-2 min-w-0">
            {match.home.logo && (
              <img src={match.home.logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{match.home.name}</span>
          </div>

          <div className="text-base font-bold tabular-nums px-2">
            {match.home.score ?? 0} - {match.away.score ?? 0}
          </div>

          <div className="flex items-center gap-2 min-w-0 justify-end">
            <span className="text-sm font-medium truncate text-right">
              {match.away.name}
            </span>
            {match.away.logo && (
              <img src={match.away.logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
            )}
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground text-center">
            Toque para análise IA
          </p>
        </div>
      </button>

      <LiveTipModal
        open={open}
        onOpenChange={setOpen}
        match={match}
        onOpenEsportiva={onOpenEsportiva}
      />
    </>
  );
}
