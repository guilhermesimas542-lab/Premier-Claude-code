import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

interface AltenarOddsReaderProps {
  onSelectionMade: (payload: {
    wsdkPayload: Record<string, unknown>;
    eventName: string;
    marketName: string;
    oddName: string;
    oddPrice: number;
    team1Name: string;
    team2Name: string;
    startDate?: string;
  }) => void;
}

export default function AltenarOddsReader({ onSelectionMade }: AltenarOddsReaderProps) {
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [selected, setSelected] = useState(false);
  const [marketSearch, setMarketSearch] = useState("");

  const fetchEvent = async () => {
    if (!eventId.trim()) {
      toast.error("Digite o Event ID");
      return;
    }
    setLoading(true);
    setEventData(null);
    setSelectedMarket(null);
    setSelected(false);
    try {
      const { data, error } = await supabase.functions.invoke("altenar-proxy", {
        body: { eventId: eventId.trim() },
      });
      if (error) throw error;
      if (!data || !data.competitors || data.competitors.length === 0) {
        toast.error("Evento não encontrado ou sem dados.");
        setLoading(false);
        return;
      }
      setEventData(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar evento.");
    }
    setLoading(false);
  };

  const buildSelectionPayload = (odd: any, market: any) => {
    const ev = eventData;
    const competitors = (ev.competitors || []).map((c: any) => ({
      id: c.id,
      name: c.name,
    }));

    const oddIds = (market.odds || []).map((o: any) => o.id);

    const competitorId =
      odd.typeId === 1
        ? competitors[0]?.id
        : odd.typeId === 3
          ? competitors[1]?.id
          : undefined;

    const selection: Record<string, unknown> = {
      odd: {
        id: odd.id,
        name: odd.name || odd.shortName || "",
        typeId: odd.typeId ?? 0,
        price: odd.price,
        isMB: odd.isMB || false,
        oddStatus: odd.oddStatus ?? 0,
        offers: [],
        ...(competitorId != null ? { competitorId } : {}),
      },
      market: {
        id: market.id,
        name: market.name || market.shortName || "",
        typeId: market.typeId ?? 0,
        isMB: false,
        sportMarketId: market.sportMarketId ?? 0,
        oddIds,
      },
      event: {
        id: ev.id,
        name: ev.competitors?.map((c: any) => c.name).join(" vs ") || "",
        sportId: ev.sport?.id ?? 0,
        catId: ev.category?.id ?? 0,
        champId: ev.champ?.id ?? 0,
        startDate: ev.startDate || "",
        status: 0,
        marketIds: [market.id],
        isBooked: false,
        isParlay: ev.isParlay || false,
        hasStream: false,
        sc: competitors.length,
        mc: 0,
        hasStats: false,
        et: 0,
        rc: false,
        pitchers: [],
        extraInfo: "",
        competitorIds: competitors.map((c: any) => c.id),
      },
      competitors,
      championship: { id: ev.champ?.id ?? 0, name: ev.champ?.name || "" },
      category: { id: ev.category?.id ?? 0, name: ev.category?.name || "" },
      sport: { id: ev.sport?.id ?? 0, typeId: ev.sport?.typeId ?? 0, name: ev.sport?.name || "" },
      widgetInfo: {
        widget: 97,
        page: null,
        tabIndex: null,
        tipsterId: null,
        suggestionType: null,
      },
    };

    return selection;
  };

  const handleSelectOdd = (odd: any) => {
    const payload = buildSelectionPayload(odd, selectedMarket);
    const team1 = eventData.competitors?.[0]?.name || "";
    const team2 = eventData.competitors?.[1]?.name || "";
    const eventName = `${team1} vs ${team2}`;

    onSelectionMade({
      wsdkPayload: payload,
      eventName,
      marketName: selectedMarket.name || selectedMarket.shortName || "",
      oddName: odd.name || odd.shortName || "",
      oddPrice: odd.price,
      team1Name: team1,
      team2Name: team2,
      startDate: eventData.startDate || "",
    });

    setSelected(true);
    toast.success(`Odd selecionada: ${odd.name || odd.shortName} @ ${odd.price}`);
  };

  // Extrair mercados com odds reidratadas a partir do array data.odds
  const getMarkets = () => {
    if (!eventData) return [];

    // Montar mapa de odds por ID
    const oddsMap = new Map<number, any>();
    if (eventData.odds && Array.isArray(eventData.odds)) {
      for (const odd of eventData.odds) {
        oddsMap.set(odd.id, odd);
      }
    }

    const allMarkets: any[] = [];

    const processMarkets = (marketsArr: any[] | undefined) => {
      if (!marketsArr || !Array.isArray(marketsArr)) return;
      for (const m of marketsArr) {
        const oddIds: number[] = [
          ...(m.desktopOddIds || []).flat(),
          ...(m.mobileOddIds || []).flat(),
        ];
        const uniqueOddIds = [...new Set(oddIds)];
        const resolvedOdds = uniqueOddIds
          .map((id: number) => oddsMap.get(id))
          .filter(Boolean);

        if (resolvedOdds.length > 0) {
          allMarkets.push({ ...m, odds: resolvedOdds });
        }
      }
    };

    processMarkets(eventData.markets);

    if (eventData.marketGroups && Array.isArray(eventData.marketGroups)) {
      for (const mg of eventData.marketGroups) {
        processMarkets(mg.markets);
      }
    }

    if (eventData.childMarketGroups && Array.isArray(eventData.childMarketGroups)) {
      for (const cmg of eventData.childMarketGroups) {
        processMarkets(cmg.markets);
      }
    }

    return allMarkets;
  };

  const markets = getMarkets();

  return (
    <div className="border border-primary/30 rounded-lg p-3 space-y-3 bg-primary/5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-primary font-semibold uppercase">
          🤖 Importar Odd do Altenar
        </span>
        {selected && <Check className="w-4 h-4 text-primary" />}
      </div>

      {/* Estado 1: Input eventId */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Cole o Event ID (ex: 12345678)"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="bg-muted/30 border-border flex-1"
        />
        <Button type="button" onClick={fetchEvent} disabled={loading} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </Button>
      </div>

      {/* Estado 2: Mercados */}
      {eventData && !selectedMarket && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-white">
              {eventData.competitors?.map((c: any) => c.name).join(" vs ")}
            </span>
            {" — "}
            {markets.length} mercados disponíveis
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {markets.map((m: any, idx: number) => (
              <button
                key={`${m.id}-${idx}`}
                type="button"
                onClick={() => setSelectedMarket(m)}
                className="px-3 py-1.5 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white text-xs font-medium transition-colors border border-border/50"
              >
                {m.shortName || m.name || `Mercado ${m.id}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado 3: Odds do mercado selecionado */}
      {selectedMarket && !selected && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMarket(null)}
              className="p-1 rounded hover:bg-muted/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-xs font-semibold text-white">
              {selectedMarket.shortName || selectedMarket.name}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(selectedMarket.odds || [])
              .filter((o: any) => o.price > 0)
              .map((odd: any) => (
                <button
                  key={odd.id}
                  type="button"
                  onClick={() => handleSelectOdd(odd)}
                  className="flex flex-col items-center p-3 rounded-lg bg-muted/20 border border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-colors"
                >
                  <span className="text-xs text-muted-foreground truncate max-w-full">
                    {odd.name || odd.shortName || `Odd ${odd.id}`}
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5">
                    {odd.price?.toFixed(2)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Estado 4: Selecionado */}
      {selected && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-primary">
            ✅ Odd importada com sucesso
          </span>
          <button
            type="button"
            onClick={() => {
              setSelected(false);
              setSelectedMarket(null);
              setEventData(null);
              setEventId("");
            }}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Refazer
          </button>
        </div>
      )}
    </div>
  );
}
