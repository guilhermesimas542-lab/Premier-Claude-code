import { useLiveMatches } from "@/hooks/useLiveMatches";
import { LiveMatchCard } from "./LiveMatchCard";
import { Radio, RefreshCw, AlertCircle } from "lucide-react";
import type { OpenEsportivaPayload } from "./ChatMessage";

interface Props {
  onOpenEsportiva?: (payload: OpenEsportivaPayload) => void;
}

export function LiveMatchesSection({ onOpenEsportiva }: Props = {}) {
  const { data, loading, error, refetch } = useLiveMatches();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#8c93c8" }} />
        <p className="text-sm" style={{ color: "#9a9ca4" }}>
          Cargando partidos en vivo...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
        <AlertCircle className="w-8 h-8" style={{ color: "#e5484d" }} />
        <p className="text-sm text-center" style={{ color: "#9a9ca4" }}>
          Error al cargar partidos: {error}
        </p>
        <button
          onClick={refetch}
          className="px-4 py-2 rounded-xl text-[13px] font-bold transition-all hover:scale-[1.02] active:scale-[0.99]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#ECEAE4",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.4px",
            textTransform: "uppercase",
          }}
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (!data?.matches?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-1"
          style={{ background: "rgba(229,72,77,0.1)", border: "1px solid rgba(229,72,77,0.3)" }}
        >
          <Radio className="w-6 h-6" style={{ color: "#e5484d" }} />
        </div>
        <p
          className="text-sm font-bold"
          style={{ color: "#ECEAE4", fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          No hay partidos en vivo
        </p>
        <p className="text-xs text-center max-w-sm leading-relaxed" style={{ color: "#9a9ca4" }}>
          En este momento no hay partidos en vivo en las ligas cubiertas por CL Ultra.
        </p>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all hover:scale-[1.02] active:scale-[0.99]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#ECEAE4",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.4px",
            textTransform: "uppercase",
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase"
          style={{
            color: "#6a6c74",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.22em",
          }}
        >
          Partidos en vivo
        </span>
        <button
          onClick={refetch}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{ color: "#9a9ca4", background: "rgba(255,255,255,0.04)" }}
          aria-label="Actualizar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {data.matches.map((m) => (
        <LiveMatchCard key={m.fixture_id} match={m} onOpenEsportiva={onOpenEsportiva} />
      ))}
    </div>
  );
}
