import { useState } from "react";
import { DisambiguationMatch } from "@/hooks/useChatTipster";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy } from "lucide-react";

interface Props {
  matches: DisambiguationMatch[];
  confidence: "high" | "medium";
  onConfirm: (fixtureId: number, label: string) => void;
  onReject?: (fixtureIds: number[]) => void;
}

export function DisambiguationCard({ matches, confidence, onConfirm, onReject }: Props) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [rejected, setRejected] = useState(false);

  const handleClick = (m: DisambiguationMatch) => {
    if (chosen !== null || rejected) return;
    setChosen(m.fixture_id);
    onConfirm(m.fixture_id, `${m.home} x ${m.away}`);
  };

  const handleReject = () => {
    if (chosen !== null || rejected) return;
    setRejected(true);
    onReject?.(matches.map((m) => m.fixture_id));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {confidence === "high"
          ? "Encontré este partido. ¿Confirmas?"
          : "¿Cuál de estos partidos quisiste decir?"}
      </p>
      {matches.map((m) => {
        const isChosen = chosen === m.fixture_id;
        const isDisabled = (chosen !== null && !isChosen) || rejected;
        return (
          <div
            key={m.fixture_id}
            className={`rounded-lg border p-3 ${isChosen ? "border-primary bg-primary/5" : "bg-card"} ${isDisabled ? "opacity-40" : ""}`}
          >
            <div className="font-medium text-sm mb-1">
              {m.home} <span className="text-muted-foreground">x</span> {m.away}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {m.league}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {m.kickoff_label}
              </span>
            </div>
            <Button
              onClick={() => handleClick(m)}
              disabled={chosen !== null || rejected}
              size="sm"
              variant="default"
              className="w-full bg-primary text-black font-semibold hover:bg-primary/90"
            >
              {isChosen ? "Seleccionado" : "Sí, es este partido"}
            </Button>
          </div>
        );
      })}
      {onReject && (
        <Button
          onClick={handleReject}
          disabled={chosen !== null || rejected}
          size="sm"
          variant="outline"
          className="w-full text-xs"
        >
          No es este partido
        </Button>
      )}
    </div>
  );
}
