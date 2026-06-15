import { useLiveMatches } from "@/hooks/useLiveMatches";
import { LiveMatchCard } from "./LiveMatchCard";
import { Radio, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OpenEsportivaPayload } from "./ChatMessage";

interface Props {
  onOpenEsportiva?: (payload: OpenEsportivaPayload) => void;
}

export function LiveMatchesSection({ onOpenEsportiva }: Props = {}) {
  const { data, loading, error, refetch } = useLiveMatches();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando partidos en vivo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground text-center">
          Error al cargar partidos: {error}
        </p>
        <Button onClick={refetch} variant="outline" size="sm">
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data?.matches?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
        <Radio className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm font-medium">No hay partidos en vivo</p>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          En este momento no hay partidos en vivo en las ligas cubiertas por CL Score.
        </p>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data.matches.length} jogo{data.matches.length > 1 ? "s" : ""} ao vivo
        </p>
        <Button onClick={refetch} variant="ghost" size="sm" className="h-7 px-2">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
      {data.matches.map((m) => (
        <LiveMatchCard key={m.fixture_id} match={m} onOpenEsportiva={onOpenEsportiva} />
      ))}
    </div>
  );
}
