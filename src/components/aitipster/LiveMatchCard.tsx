import { useState } from "react";
import { LiveMatch } from "@/hooks/useLiveMatches";
import { LiveTipModal } from "./LiveTipModal";
import type { OpenEsportivaPayload } from "./ChatMessage";
import { ChevronRight } from "lucide-react";
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
        onClick={() => {
          if (isLocked) {
            requestActivation();
            return;
          }
          setOpen(true);
        }}
        className="w-full rounded-[18px] overflow-hidden text-left transition-all hover:scale-[1.005] active:scale-[0.995]"
        style={{
          border: "1px solid rgba(235,235,245,0.08)",
          background:
            "radial-gradient(130% 170% at 50% -25%, rgba(47,124,73,0.18), rgba(47,124,73,0) 55%), #101218",
        }}
      >
        {/* Cabeçalho: AO VIVO · liga + CTA */}
        <div
          className="flex items-center justify-between px-3.5 py-2.5"
          style={{ borderBottom: "1px solid rgba(235,235,245,0.06)" }}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-[7px] h-[7px] rounded-full flex-none animate-pulse"
              style={{ background: "#e5484d" }}
            />
            <span
              className="text-[10px] font-semibold flex-none"
              style={{
                color: "#e5484d",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.14em",
              }}
            >
              EN VIVO
            </span>
            <span
              className="text-[9px] truncate"
              style={{
                color: "#6a6c74",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.12em",
              }}
            >
              · {match.league.name}
            </span>
          </span>
          <span
            className="flex items-center gap-0.5 text-[11px] font-semibold flex-none"
            style={{ color: "#c9a56b" }}
          >
            Ver análisis
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Placar */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {match.home.logo && (
              <img
                src={match.home.logo}
                alt=""
                className="w-7 h-7 rounded-full object-contain flex-none"
              />
            )}
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "#ECEAE4", letterSpacing: "-0.01em" }}
            >
              {match.home.name}
            </span>
          </div>

          <div className="flex flex-col items-center gap-0.5 flex-none px-2">
            <span
              className="font-bold text-[22px] whitespace-nowrap"
              style={{ color: "#ECEAE4", letterSpacing: "0.02em" }}
            >
              {match.home.score ?? 0}{" "}
              <span style={{ color: "#5c5e66", fontWeight: 400 }}>-</span>{" "}
              {match.away.score ?? 0}
            </span>
            {match.status.minute !== null && (
              <span
                className="text-[9px] font-semibold"
                style={{ color: "#e5484d", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {match.status.minute}'
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 min-w-0 justify-end">
            <span
              className="text-sm font-semibold truncate text-right"
              style={{ color: "#ECEAE4", letterSpacing: "-0.01em" }}
            >
              {match.away.name}
            </span>
            {match.away.logo && (
              <img
                src={match.away.logo}
                alt=""
                className="w-7 h-7 rounded-full object-contain flex-none"
              />
            )}
          </div>
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
