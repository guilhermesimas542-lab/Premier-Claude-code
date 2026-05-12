import { useLiveMatches } from "@/hooks/useLiveMatches";
import { LiveMatchCard } from "./LiveMatchCard";
import { Radio, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LiveMatchesSection() {
  const { data, loading, error, refetch } = useLiveMatches();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando jogos ao vivo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground text-center">
          Erro ao carregar jogos: {error}
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
        <p className="text-sm font-medium">Nenhum jogo ao vivo</p>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          No momento não há jogos ao vivo nas ligas cobertas pelo Premier.
        </p>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data.matches.length} jogo{data.matches.length > 1 ? "s" : ""} ao vivo
          {data.cached && " · cached"}
        </p>
        <Button onClick={refetch} variant="ghost" size="sm" className="h-7 px-2">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
      {data.matches.map((m) => (
        <LiveMatchCard key={m.fixture_id} match={m} />
      ))}
    </div>
  );
}
