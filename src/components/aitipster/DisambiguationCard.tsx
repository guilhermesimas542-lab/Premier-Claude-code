import { useState } from "react";
import { DisambiguationMatch } from "@/hooks/useChatTipster";
import { Calendar, Trophy, Check } from "lucide-react";

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
    <div className="flex flex-col gap-3">
      <p
        className="text-[12.5px]"
        style={{ color: "#9a9ca4", lineHeight: 1.5 }}
      >
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
            style={{
              border: isChosen
                ? "1px solid rgba(233,185,73,.55)"
                : "1px solid rgba(235,235,245,.1)",
              borderRadius: 16,
              background: isChosen ? "rgba(233,185,73,.06)" : "rgba(17,18,23,.85)",
              padding: 14,
              opacity: isDisabled ? 0.4 : 1,
              transition: "opacity .2s, border-color .2s, background .2s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#ECEAE4",
                }}
              >
                {m.home}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: "#6a6c74",
                }}
              >
                ×
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#ECEAE4",
                }}
              >
                {m.away}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                marginTop: 9,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10.5,
                  color: "#6a6c74",
                }}
              >
                <Trophy className="w-3 h-3" />
                {m.league}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10.5,
                  color: "#6a6c74",
                }}
              >
                <Calendar className="w-3 h-3" />
                {m.kickoff_label}
              </span>
            </div>
            <button
              onClick={() => handleClick(m)}
              disabled={chosen !== null || rejected}
              style={{
                width: "100%",
                marginTop: 12,
                border: isChosen
                  ? "1px solid rgba(233,185,73,.6)"
                  : "1px solid rgba(235,235,245,.6)",
                background: isChosen
                  ? "rgba(233,185,73,.14)"
                  : "rgba(255,255,255,.1)",
                color: isChosen ? "#e9b949" : "#ECEAE4",
                borderRadius: 11,
                padding: 11,
                fontWeight: 700,
                fontSize: 13,
                cursor: chosen !== null || rejected ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              {isChosen && <Check className="w-4 h-4" />}
              {isChosen ? "Seleccionado" : "Sí, es este partido"}
            </button>
          </div>
        );
      })}
      {onReject && (
        <button
          onClick={handleReject}
          disabled={chosen !== null || rejected}
          style={{
            width: "100%",
            border: "1px solid rgba(235,235,245,.1)",
            background: "transparent",
            color: "#8a8c94",
            borderRadius: 11,
            padding: 11,
            fontWeight: 600,
            fontSize: 12.5,
            cursor: chosen !== null || rejected ? "default" : "pointer",
            opacity: chosen !== null || rejected ? 0.4 : 1,
          }}
        >
          No es este partido
        </button>
      )}
    </div>
  );
}
