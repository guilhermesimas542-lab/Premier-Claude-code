import { Sparkles, Plus } from "lucide-react";
import type { CombinedTip } from "@/hooks/useChatTipster";

function getTeamName(team: any): string {
  if (!team) return "";
  if (typeof team === "string") return team;
  if (typeof team === "object" && team !== null) return team.name ?? "";
  return String(team);
}

interface Props {
  combined: CombinedTip;
  sourceData?: any;
  /** Abre a casa de apostas (mesmo handler do botão "Ver apuesta"). */
  onOpenEsportiva?: () => void;
  /** Foca o input pra pedir outra análise. */
  onAskAnother?: () => void;
}

/**
 * Card "Output Adaptado" da IA Tipster (lâmina 3.95).
 * Renderiza a combinada: intro, badge do tipo, times, lista de mercados,
 * odd total, probabilidade e botões. Textos em espanhol.
 */
export function CombinedTipCard({ combined, sourceData, onOpenEsportiva, onAskAnother }: Props) {
  const home = getTeamName(sourceData?.fixture?.home);
  const away = getTeamName(sourceData?.fixture?.away);
  const league =
    sourceData?.fixture?.league?.name ??
    sourceData?.fixture?.league ??
    sourceData?.league_name ??
    null;

  let dateLabel: string | null = null;
  const kickoff = sourceData?.fixture?.kickoff_at;
  if (kickoff) {
    try {
      const d = new Date(kickoff);
      if (!isNaN(d.getTime())) {
        dateLabel = d.toLocaleString("es-CL", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch {
      /* fallback: sem data */
    }
  }

  const markets = Array.isArray(combined.markets) ? combined.markets : [];
  const totalOdd = Number(combined.total_odd);
  const totalOddLabel = Number.isFinite(totalOdd) ? `${totalOdd.toFixed(2)}x` : "—";
  const probability = Number(combined.probability);
  const hasProb = Number.isFinite(probability) && probability > 0;

  const accent = "#e9b949"; // dourado
  const green = "#6fb58c"; // odds verdes
  const mono = "'JetBrains Mono', monospace";

  return (
    <div className="w-full">
      {/* intro */}
      <div className="flex items-start gap-2 mb-3.5">
        <Sparkles className="shrink-0 mt-0.5" style={{ color: "#c3a068", width: 16, height: 16 }} />
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#EDEDED" }}>
          {combined.intro || `${combined.bet_type_label} · ${home} vs ${away}`}
        </div>
      </div>

      {/* card */}
      <div
        style={{
          background: "#151515",
          border: "1px solid #2A2A2A",
          borderRadius: 18,
          padding: 14,
        }}
      >
        {/* header: tipo + badge */}
        <div className="flex items-center justify-between" style={{ marginBottom: 13 }}>
          <div
            className="flex items-center gap-2"
            style={{
              fontSize: 10,
              letterSpacing: ".1em",
              color: "#8C8C8C",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: green }}>▣</span> {combined.bet_type_label}
          </div>
        </div>

        {/* times + competição + data */}
        {(home || away) && (
          <div
            className="flex items-center gap-2"
            style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3 }}
          >
            {home}
            <span style={{ color: "#5E5E5E", fontWeight: 500, margin: "0 1px" }}>·</span>
            {away}
          </div>
        )}
        {(league || dateLabel) && (
          <div style={{ fontSize: 11, color: "#8C8C8C", marginBottom: 13 }}>
            {[league, dateLabel].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* lista de mercados */}
        {markets.map((m, i) => (
          <div
            key={i}
            className="flex items-center justify-between"
            style={{ padding: "10px 0", borderTop: "1px solid #1d1d1d" }}
          >
            <div>
              <div
                style={{
                  fontSize: 9.5,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "#5E5E5E",
                  fontWeight: 600,
                }}
              >
                {m.market}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 2 }}>
                {m.selection}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: green, fontFamily: mono }}>
              {Number.isFinite(Number(m.odd)) ? Number(m.odd).toFixed(2) : m.odd}
            </div>
          </div>
        ))}

        {/* odd total + probabilidade */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "13px 0 4px", borderTop: "1px solid #262626", marginTop: 4 }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "#5E5E5E",
                fontWeight: 600,
              }}
            >
              Cuota total
            </div>
            {hasProb && (
              <div style={{ fontSize: 11, color: "#8C8C8C", marginTop: 3 }}>
                probabilidad combinada {Math.round(probability)}%
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: green,
              letterSpacing: "-.5px",
              fontFamily: mono,
            }}
          >
            {totalOddLabel}
          </div>
        </div>

        {/* botão añadir entrada */}
        <button
          onClick={onOpenEsportiva}
          style={{
            width: "100%",
            background: accent,
            color: "#14151a",
            border: "none",
            borderRadius: 12,
            padding: 14,
            fontSize: 14,
            fontWeight: 700,
            marginTop: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <Plus className="w-4 h-4" /> Añadir entrada
        </button>
      </div>
    </div>
  );
}
