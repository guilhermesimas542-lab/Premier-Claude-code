import { useState } from "react";

interface Props {
  onSelect: (betType: string) => void;
}

interface BetType {
  key: string;
  title: string;
  subtitle: string;
  range: string;
  /** quantas barrinhas (de 5) ficam acesas */
  bars: number;
  accent: string;
  rangeBg: string;
  recommended?: boolean;
  explanation: React.ReactNode;
  tag?: string;
}

const BET_TYPES: BetType[] = [
  {
    key: "simple",
    title: "Apuesta Simple",
    subtitle: "1 mercado · mayor probabilidad de green",
    range: "1.4x–2.2x",
    bars: 1,
    accent: "#34D399",
    rangeBg: "rgba(52,211,153,.12)",
    explanation: (
      <>
        La IA elige <b>un solo mercado</b>, el de mayor probabilidad de acertar
        (ej: doble oportunidad o más de 0.5 goles). Es la entrada más segura,
        paga menos pero verde con más frecuencia.
      </>
    ),
  },
  {
    key: "safe",
    title: "Combinadas Safe",
    subtitle: "2 a 3 mercados · equilibrio",
    range: "2x–3.5x",
    bars: 2,
    accent: "#8BD94B",
    rangeBg: "rgba(139,217,75,.14)",
    recommended: true,
    tag: "Equilibrio",
    explanation: (
      <>
        La IA junta <b>2 o 3 pronósticos</b> que combinan bien en el mismo
        partido (ej: Brasil gana + más de 1.5 goles). Paga más que la simple sin
        abrir mucho la guardia. El punto medio. Equilibrio.
      </>
    ),
  },
  {
    key: "ultra",
    title: "Combinadas Ultra",
    subtitle: "3 a 5 mercados · más arriesgado",
    range: "3.5x–6x",
    bars: 3,
    accent: "#F5C451",
    rangeBg: "rgba(245,196,81,.13)",
    explanation: (
      <>
        La IA combina <b>3 a 5 mercados</b> del mismo partido. Paga bastante
        más, pero basta que falle uno para perder. Para quien busca riesgo
        controlado.
      </>
    ),
  },
  {
    key: "multiple_partido",
    title: "Múltiple del Partido",
    subtitle: "varios mercados del mismo partido",
    range: "6x–15x",
    bars: 4,
    accent: "#F5933F",
    rangeBg: "rgba(245,147,63,.13)",
    explanation: (
      <>
        La IA arma una múltiple con <b>varios mercados del mismo partido</b>.
        Cuota alta concentrada en un solo juego. Más emoción, más riesgo.
      </>
    ),
  },
  {
    key: "multiple_jornada",
    title: "Múltiples de la Jornada",
    subtitle: "este partido + otros del día",
    range: "10x–100x",
    bars: 5,
    accent: "#F2555A",
    rangeBg: "rgba(242,85,90,.13)",
    explanation: (
      <>
        La IA mezcla <b>este partido con otros del día</b> para armar una cuota
        enorme. La entrada más arriesgada: paga mucho, pero acertar todo es
        difícil.
      </>
    ),
  },
];

function Bars({ accent, count }: { accent: string; count: number }) {
  const heights = [6, 9, 12, 15, 18];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 18, flex: "none" }}>
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: h,
            borderRadius: 1,
            background: i < count ? accent : "#2c2c2c",
          }}
        />
      ))}
    </div>
  );
}

export function BetTypeSelector({ onSelect }: Props) {
  const [selected, setSelected] = useState<string>("safe");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const toggleExpand = (key: string) => {
    if (confirmed) return;
    setExpanded((prev) => (prev === key ? null : key));
  };

  return (
    <div className="w-full">
      <div
        style={{
          fontSize: 10,
          letterSpacing: ".13em",
          textTransform: "uppercase",
          color: "#5E5E5E",
          fontWeight: 600,
          margin: "4px 2px 10px",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        Elige el tipo de entrada
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {BET_TYPES.map((bt) => {
          const isSelected = selected === bt.key;
          const isExpanded = expanded === bt.key;
          return (
            <div
              key={bt.key}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 15,
                border: isSelected
                  ? "1px solid rgba(52,211,153,.55)"
                  : "1px solid #222",
                borderLeft: `3px solid ${bt.accent}`,
                background: isSelected ? "#141d18" : "#151515",
                opacity: confirmed && !isSelected ? 0.5 : 1,
                transition: "opacity .2s, background .2s, border-color .2s",
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    right: -1,
                    width: 22,
                    height: 22,
                    borderRadius: "0 14px 0 12px",
                    background: "#34D399",
                    color: "#0D0D0D",
                    fontSize: 11,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  ✓
                </div>
              )}

              <button
                onClick={() => {
                  if (confirmed) return;
                  setSelected(bt.key);
                  toggleExpand(bt.key);
                }}
                disabled={confirmed}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 13px",
                  background: "transparent",
                  border: "none",
                  cursor: confirmed ? "default" : "pointer",
                  textAlign: "left",
                }}
              >
                <Bars accent={bt.accent} count={bt.bars} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    {bt.title}
                    {bt.recommended && (
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: ".07em",
                          background: "rgba(52,211,153,.16)",
                          color: "#34D399",
                          padding: "2px 6px",
                          borderRadius: 5,
                          fontWeight: 700,
                        }}
                      >
                        RECOMENDADO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#8C8C8C", marginTop: 3 }}>
                    {bt.subtitle}
                  </div>
                </div>
                <div
                  style={{
                    flex: "none",
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: "5px 9px",
                    borderRadius: 8,
                    background: bt.rangeBg,
                    color: bt.accent,
                    whiteSpace: "nowrap",
                  }}
                >
                  {bt.range}
                </div>
                <div
                  style={{
                    flex: "none",
                    color: isExpanded ? "#8C8C8C" : "#5E5E5E",
                    fontSize: 11,
                    transform: isExpanded ? "rotate(180deg)" : "none",
                    transition: "transform .2s",
                  }}
                >
                  ▾
                </div>
              </button>

              {isExpanded && (
                <div style={{ padding: "0 14px 14px 40px" }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.55,
                      color: "#B9B9B9",
                      borderTop: "1px solid rgba(255,255,255,.06)",
                      paddingTop: 11,
                    }}
                  >
                    {bt.explanation}
                    {bt.tag && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 9,
                          marginLeft: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          color: bt.accent,
                          background: bt.rangeBg,
                          padding: "3px 9px",
                          borderRadius: 99,
                        }}
                      >
                        {bt.tag}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          if (confirmed) return;
          setConfirmed(true);
          onSelect(selected);
        }}
        disabled={confirmed}
        style={{
          width: "100%",
          marginTop: 14,
          background: confirmed ? "rgba(255,255,255,.4)" : "#fff",
          color: "#0D0D0D",
          border: "none",
          borderRadius: 12,
          padding: 14,
          fontSize: 14,
          fontWeight: 700,
          cursor: confirmed ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          lineHeight: 1,
        }}
      >
        Confirmar tipo de entrada
        <span style={{ fontSize: 17, lineHeight: 1 }}>›</span>
      </button>
    </div>
  );
}
